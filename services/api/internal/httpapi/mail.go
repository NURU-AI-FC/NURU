package httpapi

import (
	"context"
	"log"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/NURU-AI-FC/nuru/services/api/internal/email"
)

// Every email goes through sendEmail. It returns at once: rendering is done
// by the caller, the send and the email_log row happen in the background so
// a slow provider never holds up a request. provider_id records the outcome:
// Resend's message id, or skipped:demo, skipped:no_key or failed.

const (
	mailSkippedDemo  = "skipped:demo"
	mailSkippedNoKey = "skipped:no_key"
	mailFailed       = "failed"
)

// sendEmail sends m to a user. Either userID or to may be empty; the other is
// looked up.
func (s *Server) sendEmail(userID, to string, m email.Message) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if to == "" && userID != "" {
			s.db.QueryRow(ctx, `select email from users where id=$1`, userID).Scan(&to)
		}
		if to == "" {
			return
		}
		var outcome string
		switch {
		case email.Demo(to):
			outcome = mailSkippedDemo
		case !s.mail.Enabled():
			outcome = mailSkippedNoKey
		default:
			id, err := s.mail.Send(ctx, to, m)
			if err != nil {
				log.Printf("email %s not sent: %v", m.Template, err)
				outcome = mailFailed
			} else {
				outcome = id
			}
		}
		if outcome != mailSkippedDemo && outcome != mailSkippedNoKey && outcome != mailFailed {
			log.Printf("email %s sent (%s)", m.Template, outcome)
		} else if outcome != mailFailed {
			log.Printf("email %s logged, not sent (%s)", m.Template, strings.TrimPrefix(outcome, "skipped:"))
		}
		if _, err := s.db.Exec(ctx, `insert into email_log(template,user_id,provider_id)
			values($1, coalesce(nullif($2,'')::uuid, (select id from users where email=$3)), $4)`, m.Template, userID, to, outcome); err != nil {
			log.Printf("email log: %v", err)
		}
	}()
}

// mailWeekly sends the weekly recap at most once every 7 days, to accounts at
// least a week old that keep the recap switched on.
func (s *Server) mailWeekly(ctx context.Context, user string) {
	var due bool
	s.db.QueryRow(ctx, `select u.created_at<now()-interval '7 days' and not exists (select 1 from email_log e where e.user_id=u.id and e.template='weekly_recap'
		and e.sent_at>now()-interval '7 days') from users u where u.id=$1 and u.role='customer'`, user).Scan(&due)
	if !due {
		return
	}
	w := email.Week{}
	since := time.Now().AddDate(0, 0, -7)
	s.db.QueryRow(ctx, `select u.name,
		coalesce(sum(t.amount) filter (where t.direction='credit' and t.created_at>=$2),0)::float8,
		coalesce(sum(t.amount) filter (where t.direction='debit' and t.category<>'Savings' and t.created_at>=$2),0)::float8,
		coalesce(sum(t.amount) filter (where t.direction='debit' and t.category='Savings' and t.created_at>=$2),0)::float8,
		coalesce(sum(t.amount) filter (where t.direction='debit' and t.category<>'Savings' and t.created_at<$2),0)::float8
		from users u left join transactions t on t.user_id=u.id and t.created_at>=$3`+personal+` where u.id=$1 group by u.name`,
		user, since, since.AddDate(0, 0, -7)).Scan(&w.Name, &w.In, &w.Out, &w.Saved, &w.PrevOut)
	s.db.QueryRow(ctx, `select category, sum(amount)::float8 from transactions t where user_id=$1 and direction='debit' and category<>'Savings' and created_at>=$2`+personal+`
		group by 1 order by 2 desc limit 1`, user, since).Scan(&w.Top, &w.TopAmount)
	if w.In == 0 && w.Out == 0 {
		return
	}
	if w.Top != "" && w.Out > 0 {
		w.Tip = w.Top + " took " + strconv.Itoa(int(math.Round(w.TopAmount/w.Out*100))) + "% of what you spent. Ask NURU for a budget that fits."
	}
	s.sendEmail(user, "", email.WeeklyRecap(w))
}
