package httpapi

import (
	"context"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/NURU-AI-FC/nuru/services/api/internal/auth"
)

// NURU HQ is the internal dashboard for the NURU team. Every figure here is
// counted from the database or measured live; nothing is modelled. HQ never
// returns a customer's name, email, balance or chat text: only counts, and
// for support the reason and reference of a ticket.

func (s *Server) hqRoutes(r chi.Router) {
	r.Group(func(r chi.Router) {
		r.Use(func(h http.Handler) http.Handler { return auth.RequireRole("hq", h) })
		in := func(area string) func(http.Handler) http.Handler { return s.gate("hq", hqAreas, area) }
		r.With(in("overview"), s.cached(45*time.Second)).Get("/hq/overview", s.hqOverview)
		r.With(in("health")).Get("/hq/health", s.hqHealth)
		r.With(in("support")).Get("/hq/support", s.hqSupport)
		r.With(in("support")).Post("/hq/support", s.hqNewTicket)
		r.With(in("support")).Patch("/hq/support/{id}", s.hqTicket)
		r.With(in("emails")).Get("/hq/emails", s.hqEmails)
		r.With(in("team")).Get("/hq/team", s.teamList(hqTeam))
		r.With(in("team")).Post("/hq/team", s.teamInvite(hqTeam))
		r.With(in("team")).Patch("/hq/team/{id}", s.teamUpdate(hqTeam))
		r.With(in("team")).Delete("/hq/team/{id}", s.teamUpdate(hqTeam))
	})
}

// hqDays reads the range picker: today, 7 days or 30 days.
func hqDays(r *http.Request) int {
	if d, err := strconv.Atoi(r.URL.Query().Get("days")); err == nil && (d == 1 || d == 7 || d == 30) {
		return d
	}
	return 7
}

// since is the start of the range: midnight in Lagos for today, else N days back.
func since(days int) time.Time {
	now := time.Now().In(lagos)
	if days == 1 {
		return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, lagos)
	}
	return now.AddDate(0, 0, -days)
}

// activity is every sign of a customer using NURU after $1: signing in, using
// a session (sessions last 12 hours, which leaves out seeded device history),
// asking NURU or sending money.
const activity = `
	with a as (
	  select user_id, created_at at from sessions where created_at>=$1
	  union all select user_id, last_seen_at from sessions where last_seen_at>=$1 and last_seen_at<=created_at+interval '13 hours'
	  union all select user_id, created_at from chats where role='user' and created_at>=$1
	  union all select user_id, created_at from transactions where category='Transfer' and direction='debit' and created_at>=$1 and created_at<=now()
	) select a.user_id, a.at from a join users u on u.id=a.user_id and u.role='customer'`

// pilotTargets are the bank pilot goals, kept here until they move to settings.
var pilotTargets = struct {
	WeeklyActive float64
	ActedPct     float64
	LocalPct     float64
	ReplySeconds float64
}{1000, 40, 30, 2}

func (s *Server) hqOverview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	days := hqDays(r)
	from := since(days)
	q := func(sql string, args ...any) float64 {
		var v float64
		s.db.QueryRow(ctx, sql, args...).Scan(&v)
		return v
	}
	customers := q(`select count(*)::float8 from users where role='customer'`)
	fresh := q(`select count(*)::float8 from users where role='customer' and created_at>=$1`, from)
	active := q(`select count(distinct user_id)::float8 from (`+activity+`) x`, from)
	weekly := q(`select count(distinct user_id)::float8 from (`+activity+`) x`, since(7))
	answers := q(`select count(*)::float8 from chats c join users u on u.id=c.user_id and u.role='customer' where c.role='assistant' and c.created_at>=$1`, from)
	asked := q(`select count(*)::float8 from chats where role='user' and created_at>=$1`, from)
	local := q(`select count(*)::float8 from chats where role='user' and lang<>'en' and created_at>=$1`, from)
	moved := q(`select coalesce(sum(amount),0)::float8 from transactions where category='Transfer' and direction='debit' and created_at>=$1 and created_at<=now()`, from)
	transfers := q(`select count(*)::float8 from transactions where category='Transfer' and direction='debit' and created_at>=$1 and created_at<=now()`, from)
	stopped := q(`select count(*)::float8 from security_events where kind in ('transfer_paused','transfers_locked') and created_at>=$1`, from)

	// daily active customers for the last 7 days and the 7 before
	daily := map[string]float64{}
	rows, err := s.db.Query(ctx, `select to_char(at at time zone 'Africa/Lagos','YYYY-MM-DD'), count(distinct user_id)::float8 from (`+activity+`) x group by 1`, since(14))
	if err == nil {
		for rows.Next() {
			var d string
			var n float64
			rows.Scan(&d, &n)
			daily[d] = n
		}
		rows.Close()
	}
	today := time.Now().In(lagos)
	series := []map[string]any{}
	for i := 6; i >= 0; i-- {
		d := today.AddDate(0, 0, -i)
		series = append(series, map[string]any{"label": d.Format("Mon"), "value": daily[d.Format("2006-01-02")], "last_week": daily[d.AddDate(0, 0, -7).Format("2006-01-02")]})
	}

	// sign up funnel, all time
	funnel := []map[string]any{
		{"key": "signed_up", "label": "Signed up", "value": customers},
		{"key": "kyc", "label": "Verified BVN or NIN", "value": q(`select count(*)::float8 from users where role='customer' and kyc_verified`)},
		{"key": "linked", "label": "Linked an account", "value": q(`select count(distinct e.user_id)::float8 from security_events e join users u on u.id=e.user_id and u.role='customer' where e.kind='account_linked'`)},
		{"key": "asked", "label": "Asked NURU", "value": q(`select count(distinct c.user_id)::float8 from chats c join users u on u.id=c.user_id and u.role='customer' where c.role='user'`)},
		{"key": "acted", "label": "Acted on a tip", "value": q(`select count(distinct e.user_id)::float8 from security_events e join users u on u.id=e.user_id and u.role='customer' where e.kind='tip_acted'`)},
	}
	askedEver, acted := funnel[3]["value"].(float64), funnel[4]["value"].(float64)

	localMonth := q(`select coalesce(avg(case when lang<>'en' then 100 else 0 end),0)::float8 from chats where role='user' and created_at>now()-interval '30 days'`)
	var reply *float64
	var replyN float64
	s.db.QueryRow(ctx, `select avg(latency_ms)/1000.0, count(latency_ms)::float8 from chats where role='assistant' and latency_ms is not null and created_at>now()-interval '7 days'`).Scan(&reply, &replyN)
	goal := func(label string, value, target float64, unit string, lowerBetter, measured bool) map[string]any {
		p := 0.0
		if measured && target > 0 {
			p = value / target * 100
			if lowerBetter {
				p = 100
				if value > target {
					p = target / value * 100
				}
			}
		}
		return map[string]any{"label": label, "value": math.Round(value*10) / 10, "target": target, "unit": unit, "pct": math.Round(math.Min(p, 100)), "measured": measured}
	}
	replyVal := 0.0
	if reply != nil {
		replyVal = *reply
	}
	goals := []map[string]any{
		goal("Weekly active customers", weekly, pilotTargets.WeeklyActive, "", false, true),
		goal("Insights acted on", pct(acted, askedEver), pilotTargets.ActedPct, "%", false, askedEver > 0),
		goal("Questions in local languages", localMonth, pilotTargets.LocalPct, "%", false, true),
		goal("Average reply time", replyVal, pilotTargets.ReplySeconds, "s", true, replyN > 0),
	}

	checks := s.liveChecks(ctx)
	// voice with no keys is off by choice, not down, so it is left out
	up, total := 0, 0
	for _, c := range checks {
		switch c["status"] {
		case "up", "warn", "configured":
			up++
			total++
		case "down":
			total++
		}
	}
	uptime := map[string]any{"checks_up": up, "checks": total}
	if ur := s.uptimeRobot(ctx); ur.Connected {
		uptime["uptimerobot"] = ur.Average
	}

	writeJSON(w, 200, map[string]any{
		"days": days, "customers": customers, "new": fresh, "active": active, "weekly_active": weekly,
		"answers": answers, "local_share": math.Round(pct(local, asked)), "moved": moved, "transfers": transfers, "stopped": stopped,
		"daily": series, "funnel": funnel, "goals": goals, "uptime": uptime, "attention": s.hqAttention(ctx, checks),
	})
}

// hqAttention lists what is worth a look right now, from real signals only.
func (s *Server) hqAttention(ctx context.Context, checks []map[string]any) []map[string]any {
	out := []map[string]any{}
	for _, c := range checks {
		if c["status"] == "down" {
			out = append(out, map[string]any{"icon": "alert", "tone": "red", "title": c["name"].(string) + " is not answering", "sub": c["note"], "area": "health"})
		}
	}
	var claude, template float64
	s.db.QueryRow(ctx, `select count(*) filter (where engine='claude')::float8, count(*) filter (where engine='template')::float8 from chats
		where role='assistant' and created_at>=$1`, since(1)).Scan(&claude, &template)
	if template > 0 && claude > 0 {
		out = append(out, map[string]any{"icon": "alert", "tone": "amber", "title": "AI fallback used for " + strconv.Itoa(int(math.Round(pct(template, claude+template)))) + "% of replies today",
			"sub": "Claude did not answer, or quoted a figure NURU could not trace", "area": "health"})
	}
	var waiting float64
	var oldest string
	s.db.QueryRow(ctx, `select count(*)::float8, coalesce((select subject from support_tickets where status='open' order by created_at limit 1),'')
		from support_tickets where status='open' and created_at<now()-interval '24 hours'`).Scan(&waiting, &oldest)
	if waiting > 0 {
		out = append(out, map[string]any{"icon": "headphones", "tone": "amber", "title": plural(int(waiting), "report") + " waiting over 24 hours",
			"sub": "Oldest: " + strings.ToLower(oldest), "area": "support"})
	}
	var now, prev, nNow, nPrev float64
	s.db.QueryRow(ctx, `select coalesce(avg(case when opened_at is not null then 100 else 0 end) filter (where sent_at>now()-interval '7 days'),0)::float8,
		coalesce(avg(case when opened_at is not null then 100 else 0 end) filter (where sent_at<=now()-interval '7 days'),0)::float8,
		count(*) filter (where sent_at>now()-interval '7 days')::float8, count(*) filter (where sent_at<=now()-interval '7 days')::float8
		from email_log where sent_at>now()-interval '14 days' and `+delivered).Scan(&now, &prev, &nNow, &nPrev)
	if nNow >= 20 && nPrev >= 20 && prev-now >= 5 {
		out = append(out, map[string]any{"icon": "mail", "tone": "blue", "title": "Email open rate fell to " + strconv.Itoa(int(now)) + "%",
			"sub": "Down from " + strconv.Itoa(int(prev)) + "% last week", "area": "emails"})
	}
	return out
}

func plural(n int, word string) string {
	if n == 1 {
		return "1 " + word
	}
	return strconv.Itoa(n) + " " + word + "s"
}

// ---- Support and reports ----

var ticketKinds = map[string]string{"dispute": "Dispute", "report": "Report", "security": "Security", "question": "Question", "feedback": "Feedback"}

func (s *Server) hqSupport(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	kind := r.URL.Query().Get("kind")
	if ticketKinds[kind] == "" {
		kind = ""
	}
	var open, late, resolved, opened float64
	var firstReply *float64
	s.db.QueryRow(ctx, `select count(*) filter (where status='open')::float8,
		count(*) filter (where status='open' and created_at<now()-interval '24 hours')::float8,
		count(*) filter (where resolved_at>now()-interval '7 days')::float8,
		count(*) filter (where created_at>now()-interval '7 days')::float8,
		(percentile_cont(0.5) within group (order by extract(epoch from first_reply_at-created_at)/60) filter (where first_reply_at is not null))::float8
		from support_tickets`).Scan(&open, &late, &resolved, &opened, &firstReply)

	rows, err := s.db.Query(ctx, `select t.id, t.ref, t.kind, t.subject, t.status, t.created_at, t.resolved_at, coalesce(o.name,''), coalesce(t.owner_id::text=$2,false)
		from support_tickets t left join users o on o.id=t.owner_id
		where ($1='' or t.kind=$1) order by t.status='resolved', t.created_at limit 50`, kind, uid(r))
	if err != nil {
		fail(w, 500, "could not load the queue")
		return
	}
	queue := []map[string]any{}
	for rows.Next() {
		var id, ref, k, subject, status, owner string
		var at time.Time
		var done *time.Time
		var mine bool
		rows.Scan(&id, &ref, &k, &subject, &status, &at, &done, &owner, &mine)
		queue = append(queue, map[string]any{"id": id, "ref": ref, "kind": k, "kind_label": ticketKinds[k], "subject": subject, "status": status,
			"created_at": at, "resolved_at": done, "owner": owner, "mine": mine})
	}
	rows.Close()

	topics := []map[string]any{}
	rows, err = s.db.Query(ctx, `select subject, count(*)::float8 from support_tickets where created_at>now()-interval '30 days' group by 1 order by 2 desc limit 5`)
	if err == nil {
		for rows.Next() {
			var t string
			var n float64
			rows.Scan(&t, &n)
			topics = append(topics, map[string]any{"subject": t, "count": n})
		}
		rows.Close()
	}
	out := map[string]any{"open": open, "late": late, "resolved_week": resolved, "opened_week": opened, "queue": queue, "topics": topics}
	if firstReply != nil {
		out["first_reply_minutes"] = math.Round(*firstReply)
	}
	writeJSON(w, 200, out)
}

// hqNewTicket logs a ticket that came in another way, such as a phone call.
// It is not linked to a customer, so it holds no personal details.
func (s *Server) hqNewTicket(w http.ResponseWriter, r *http.Request) {
	var in struct{ Kind, Subject string }
	if !decode(w, r, &in) {
		return
	}
	in.Subject = strings.TrimSpace(in.Subject)
	if ticketKinds[in.Kind] == "" || in.Kind == "dispute" {
		fail(w, 400, "pick a question, feedback, security or report ticket")
		return
	}
	if in.Subject == "" || len([]rune(in.Subject)) > 80 {
		fail(w, 400, "write a short subject, up to 80 characters")
		return
	}
	if digits.MatchString(in.Subject) || strings.Contains(in.Subject, "@") {
		fail(w, 400, "leave account numbers and emails out of the subject")
		return
	}
	var ref string
	s.db.QueryRow(r.Context(), `insert into support_tickets(ref,kind,subject,owner_id,first_reply_at) values('',$1,$2,$3,now()) returning ref`, in.Kind, in.Subject, uid(r)).Scan(&ref)
	s.audit(r.Context(), "hq", uid(r), "ticket_created", ref)
	s.hqSupport(w, r)
}

// hqTicket takes a ticket (the first reply clock stops) or resolves it.
func (s *Server) hqTicket(w http.ResponseWriter, r *http.Request) {
	var in struct{ Action string }
	if !decode(w, r, &in) {
		return
	}
	var sql string
	switch in.Action {
	case "take":
		sql = `update support_tickets set owner_id=$2, first_reply_at=coalesce(first_reply_at,now()) where id::text=$1 and status='open' returning ref`
	case "resolve":
		sql = `update support_tickets set status='resolved', resolved_at=now(), owner_id=coalesce(owner_id,$2), first_reply_at=coalesce(first_reply_at,now())
			where id::text=$1 and status='open' returning ref`
	default:
		fail(w, 400, "unknown action")
		return
	}
	var ref string
	if err := s.db.QueryRow(r.Context(), sql, chi.URLParam(r, "id"), uid(r)).Scan(&ref); err != nil {
		fail(w, 409, "this ticket is already closed")
		return
	}
	s.audit(r.Context(), "hq", uid(r), "ticket_"+map[string]string{"take": "taken", "resolve": "resolved"}[in.Action], ref)
	r.URL.RawQuery = ""
	s.hqSupport(w, r)
}

// ---- Emails and nudges ----

var emailNames = map[string]string{
	"welcome": "Welcome and verify", "transfer_sent": "Transfer sent", "describe_payment": "What was this payment for?",
	"weekly_recap": "Weekly money recap", "budget_alert": "Budget almost used", "winback": "We miss you",
	"signin_code": "Sign-in code", "pin_reset": "Password reset code", "new_device": "New device sign-in",
	"transfer_received": "Money received", "staff_invite": "Team invite",
}

// delivered matches email_log rows that really went out, not the ones logged
// while sending was off, for a demo account, or that the provider refused.
const delivered = `provider_id not like 'skipped:%' and provider_id<>'failed'`

func (s *Server) hqEmails(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	days := hqDays(r)
	from := since(days)
	var sent, opened, clicked, total, templates, skipped, failed float64
	s.db.QueryRow(ctx, `select count(*) filter (where sent_at>=$1 and `+delivered+`)::float8, count(*) filter (where sent_at>=$1 and opened_at is not null)::float8,
		count(*) filter (where sent_at>=$1 and clicked_at is not null)::float8, count(*)::float8, count(distinct template) filter (where sent_at>=$1)::float8,
		count(*) filter (where sent_at>=$1 and provider_id like 'skipped:%')::float8, count(*) filter (where sent_at>=$1 and provider_id='failed')::float8 from email_log`, from).
		Scan(&sent, &opened, &clicked, &total, &templates, &skipped, &failed)
	// came back: customers with a sign in or question within 7 days after a win back email
	back := 0.0
	s.db.QueryRow(ctx, `select count(distinct e.user_id)::float8 from email_log e where e.template='winback' and e.sent_at>=$1
		and (exists (select 1 from sessions x where x.user_id=e.user_id and x.created_at between e.sent_at and e.sent_at+interval '7 days')
		  or exists (select 1 from chats c where c.user_id=e.user_id and c.role='user' and c.created_at between e.sent_at and e.sent_at+interval '7 days'))`, from).Scan(&back)
	rows, err := s.db.Query(ctx, `select template, count(*) filter (where `+delivered+`)::float8, count(opened_at)::float8, count(clicked_at)::float8,
		count(*) filter (where not (`+delivered+`))::float8 from email_log where sent_at>=$1 group by 1 order by 2 desc, 5 desc`, from)
	if err != nil {
		fail(w, 500, "could not load emails")
		return
	}
	defer rows.Close()
	list := []map[string]any{}
	for rows.Next() {
		var t string
		var n, o, c, sk float64
		rows.Scan(&t, &n, &o, &c, &sk)
		name := emailNames[t]
		if name == "" {
			name = t
		}
		list = append(list, map[string]any{"template": t, "name": name, "sent": n, "not_sent": sk, "open_rate": math.Round(pct(o, n)), "click_rate": math.Round(pct(c, n))})
	}
	writeJSON(w, 200, map[string]any{"days": days, "sent": sent, "open_rate": math.Round(pct(opened, sent)), "click_rate": math.Round(pct(clicked, sent)),
		"came_back": back, "ever": total, "skipped": skipped, "failed": failed, "templates": templates, "emails": list, "provider": map[bool]string{true: "Resend", false: ""}[resendReady()]})
}
