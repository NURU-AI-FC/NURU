package httpapi

import (
	"encoding/json"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/NURU-AI-FC/nuru/services/api/internal/auth"
)

// transfer moves money between a user's account and a payee. It needs the
// transaction PIN and a face match against the enrolled template. Three
// failures pause transfers for 30 minutes.
func (s *Server) transfer(w http.ResponseWriter, r *http.Request) {
	var in struct {
		From, PayeeID, ToName, ToBank, ToAccount, Note, PIN string
		Amount                                              float64
		Face                                                []float64
	}
	if !decode(w, r, &in) {
		return
	}
	if in.PayeeID != "" {
		if err := s.db.QueryRow(r.Context(), `select name,bank,account from payees where id=$1 and user_id=$2`, in.PayeeID, uid(r)).Scan(&in.ToName, &in.ToBank, &in.ToAccount); err != nil {
			fail(w, 404, "payee not found")
			return
		}
	}
	if in.Amount <= 0 || in.Amount > 5_000_000 || in.ToName == "" || len(in.ToAccount) != 10 {
		fail(w, 400, "check the amount and the 10 digit account number")
		return
	}
	var pinHash string
	var hasFace bool
	var locked *time.Time
	var fails int
	s.db.QueryRow(r.Context(), `select pin_hash, face_template is not null, transfer_locked_until, transfer_fails from users where id=$1`, uid(r)).Scan(&pinHash, &hasFace, &locked, &fails)
	if locked != nil && locked.After(time.Now()) {
		fail(w, 423, "transfers are paused until "+locked.Format("3:04 pm")+" after 3 failed checks")
		return
	}
	if pinHash == "" || !hasFace {
		fail(w, 428, "create a PIN and enrol your face first")
		return
	}
	failed := func(kind, msg string) {
		fails++
		if fails >= 3 {
			s.db.Exec(r.Context(), `update users set transfer_fails=0, transfer_locked_until=now()+interval '30 minutes' where id=$1`, uid(r))
			s.event(r.Context(), uid(r), "transfers_locked", kind)
			msg += ". Transfers are paused for 30 minutes"
		} else {
			s.db.Exec(r.Context(), `update users set transfer_fails=$1 where id=$2`, fails, uid(r))
			left := 3 - fails
			msg += ". " + strconv.Itoa(left) + map[bool]string{true: " try left", false: " tries left"}[left == 1]
		}
		s.event(r.Context(), uid(r), kind, naira(in.Amount)+" to "+in.ToName)
		fail(w, 403, msg)
	}
	if ok, _ := auth.Verify(in.PIN, pinHash); !ok {
		failed("pin_failed", "wrong PIN")
		return
	}
	if ok, _ := s.matchFace(r, in.Face); !ok {
		failed("face_failed", "the face did not match")
		return
	}
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		fail(w, 500, "try again")
		return
	}
	defer tx.Rollback(r.Context())
	var bal float64
	if err := tx.QueryRow(r.Context(), `select balance::float8 from accounts where id=$1 and user_id=$2 for update`, in.From, uid(r)).Scan(&bal); err != nil {
		fail(w, 404, "account not found")
		return
	}
	if bal < in.Amount {
		fail(w, 400, "not enough money in this account")
		return
	}
	var id string
	var at time.Time
	tx.Exec(r.Context(), `update accounts set balance=balance-$1 where id=$2`, in.Amount, in.From)
	if err := tx.QueryRow(r.Context(), `insert into transactions(user_id,account_id,direction,amount,category,merchant,narration,created_at)
		values($1,$2,'debit',$3,'Transfer',$4,$5,now()) returning id, created_at`, uid(r), in.From, in.Amount,
		in.ToName+", "+in.ToBank, strings.TrimSpace(in.Note)+" ••••"+in.ToAccount[6:]).Scan(&id, &at); err != nil {
		fail(w, 500, "transfer failed")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		fail(w, 500, "transfer failed")
		return
	}
	s.db.Exec(r.Context(), `update users set transfer_fails=0 where id=$1`, uid(r))
	s.db.Exec(r.Context(), `insert into payees(user_id,name,bank,account) values($1,$2,$3,$4) on conflict do nothing`, uid(r), in.ToName, in.ToBank, in.ToAccount)
	writeJSON(w, 201, map[string]any{"id": id, "at": at, "amount": in.Amount, "to": in.ToName, "reference": "NURU-" + strings.ToUpper(id[:8]), "sandbox": true})
}

func (s *Server) investments(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `select kind,name,value::float8,contributed::float8,monthly::float8 from investments where user_id=$1 order by value desc`, uid(r))
	if err != nil {
		fail(w, 500, "could not load investments")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var k, n string
		var v, c, m float64
		rows.Scan(&k, &n, &v, &c, &m)
		out = append(out, map[string]any{"kind": k, "name": n, "value": v, "contributed": c, "monthly": m, "growth": v - c})
	}
	writeJSON(w, 200, out)
}

func (s *Server) reminders(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `select id,title,kind,amount::float8,due_at,done from reminders where user_id=$1 order by done, due_at`, uid(r))
	if err != nil {
		fail(w, 500, "could not load reminders")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, t, k string
		var a float64
		var due time.Time
		var done bool
		rows.Scan(&id, &t, &k, &a, &due, &done)
		out = append(out, map[string]any{"id": id, "title": t, "kind": k, "amount": a, "due_at": due, "done": done})
	}
	writeJSON(w, 200, out)
}

func (s *Server) addReminder(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Title, Kind string
		Amount      float64
		DueAt       time.Time `json:"due_at"`
	}
	if !decode(w, r, &in) {
		return
	}
	if strings.TrimSpace(in.Title) == "" || in.DueAt.IsZero() {
		fail(w, 400, "add a title and a date")
		return
	}
	if in.Kind == "" {
		in.Kind = "bill"
	}
	s.db.Exec(r.Context(), `insert into reminders(user_id,title,kind,amount,due_at) values($1,$2,$3,$4,$5)`, uid(r), strings.TrimSpace(in.Title), in.Kind, in.Amount, in.DueAt)
	s.reminders(w, r)
}

func (s *Server) toggleReminder(w http.ResponseWriter, r *http.Request) {
	s.db.Exec(r.Context(), `update reminders set done=not done where id=$1 and user_id=$2`, chi.URLParam(r, "id"), uid(r))
	s.reminders(w, r)
}

func (s *Server) business(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var name, kind, rc, customers string
	var staffN int
	var sales float64
	s.db.QueryRow(ctx, `select business_name,business_type,business_rc,business_customers,business_staff,business_sales::float8 from users where id=$1`, uid(r)).Scan(&name, &kind, &rc, &customers, &staffN, &sales)
	if name == "" {
		writeJSON(w, 200, map[string]any{"enabled": false})
		return
	}
	staff, err := s.staffSlips(ctx, uid(r))
	if err != nil {
		fail(w, 500, "could not load staff")
		return
	}
	payroll, cost := 0.0, 0.0
	list := []map[string]any{}
	for _, st := range staff {
		payroll += st.Gross
		cost += st.Gross + st.Employer
		list = append(list, map[string]any{"id": st.ID, "name": st.Name, "role": st.Role, "gross": st.Gross, "paye": st.PAYE, "pension": st.Pension, "nhf": st.NHF, "net": st.Net})
	}
	monthly := []map[string]any{}
	rows, _ := s.db.Query(ctx, `select to_char(date_trunc('month',t.created_at),'Mon'),
		coalesce(sum(amount) filter (where direction='credit'),0)::float8, coalesce(sum(amount) filter (where direction='debit'),0)::float8
		from transactions t join accounts a on a.id=t.account_id where t.user_id=$1 and a.kind='business' and t.created_at>=date_trunc('month',now())-interval '5 months'
		group by date_trunc('month',t.created_at) order by date_trunc('month',t.created_at)`, uid(r))
	for rows.Next() {
		var m string
		var in, out float64
		rows.Scan(&m, &in, &out)
		monthly = append(monthly, map[string]any{"month": m, "sales": in, "costs": out, "profit": in - out})
	}
	rows.Close()
	var cash float64
	s.db.QueryRow(ctx, `select coalesce(sum(balance),0)::float8 from accounts where user_id=$1 and kind='business'`, uid(r)).Scan(&cash)
	_, number, _ := s.bizAccount(ctx, uid(r))
	ads := []map[string]any{}
	rows, _ = s.db.Query(ctx, `select merchant, sum(amount)::float8 from transactions where user_id=$1 and category='Advertising' and created_at>now()-interval '90 days' group by merchant order by 2 desc`, uid(r))
	for rows.Next() {
		var m string
		var v float64
		rows.Scan(&m, &v)
		ads = append(ads, map[string]any{"channel": m, "spend": v})
	}
	rows.Close()
	runway := 0.0
	// last full month gives a fair daily burn
	if n := len(monthly); n > 1 {
		if c, _ := monthly[n-2]["costs"].(float64); c > 0 {
			runway = math.Round(cash / (c / 30))
		}
	}
	var unpaid, overdue float64
	var nUnpaid, nOverdue int
	s.db.QueryRow(ctx, `select coalesce(sum(amount),0)::float8, count(*)::int, coalesce(sum(amount) filter (where due_at<now()),0)::float8, (count(*) filter (where due_at<now()))::int
		from invoices where user_id=$1 and paid_at is null`, uid(r)).Scan(&unpaid, &nUnpaid, &overdue, &nOverdue)
	paidAt := s.payrollPaid(ctx, uid(r))
	now := time.Now()
	due := time.Date(now.Year(), now.Month(), 28, 9, 0, 0, 0, now.Location())
	if paidAt != nil {
		due = due.AddDate(0, 1, 0)
	}
	writeJSON(w, 200, map[string]any{"enabled": true, "name": name, "type": kind, "rc": rc, "customers": customers, "staff_count": max(staffN, len(staff)),
		"monthly_sales": sales, "account": number, "staff": list, "payroll": payroll,
		"monthly": monthly, "cash": cash, "runway_days": runway, "advertising": ads,
		"unpaid": unpaid, "unpaid_count": nUnpaid, "overdue": overdue, "overdue_count": nOverdue,
		"payroll_due": map[string]any{"amount": cost, "due_at": due, "paid_at": paidAt}})
}

// fxCache keeps live NGN rates for ten minutes so the app shows the time of
// the rate and never hammers the provider.
type fxCache struct {
	mu    sync.Mutex
	at    time.Time
	rates map[string]float64
}

func (s *Server) fxRates(w http.ResponseWriter, r *http.Request) {
	s.fx.mu.Lock()
	defer s.fx.mu.Unlock()
	if time.Since(s.fx.at) > 10*time.Minute || s.fx.rates == nil {
		resp, err := s.http.Get("https://open.er-api.com/v6/latest/NGN")
		if err == nil {
			var body struct {
				Result string             `json:"result"`
				Rates  map[string]float64 `json:"rates"`
			}
			if json.NewDecoder(resp.Body).Decode(&body) == nil && body.Result == "success" {
				s.fx.rates, s.fx.at = body.Rates, time.Now()
			}
			resp.Body.Close()
		}
		if s.fx.rates == nil {
			// last known rates so the converter still works offline
			s.fx.rates = map[string]float64{"NGN": 1, "USD": 1 / 1523.5, "GBP": 1 / 2031.0, "EUR": 1 / 1772.0, "CAD": 1 / 1105.0, "GHS": 1 / 98.0, "ZAR": 1 / 84.0, "CNY": 1 / 212.0}
			s.fx.at = time.Time{}
		}
	}
	writeJSON(w, 200, map[string]any{"base": "NGN", "rates": s.fx.rates, "updated_at": s.fx.at, "source": "open.er-api.com"})
}

// consoleOverview gives bank staff anonymised totals across opted in users.
func (s *Server) consoleOverview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var users, chats, blocked int
	s.db.QueryRow(ctx, `select count(*) from users where role='customer'`).Scan(&users)
	s.db.QueryRow(ctx, `select count(*) from chats where role='user'`).Scan(&chats)
	s.db.QueryRow(ctx, `select count(*) from security_events where kind like 'ai_%'`).Scan(&blocked)
	langs := map[string]int{}
	rows, _ := s.db.Query(ctx, `select lang, count(*) from chats where role='user' group by lang`)
	for rows.Next() {
		var l string
		var n int
		rows.Scan(&l, &n)
		langs[l] = n
	}
	rows.Close()
	cats := []catTotal{}
	rows, _ = s.db.Query(ctx, `select category, sum(amount)::float8 from transactions where direction='debit' and created_at>=date_trunc('month',now()) group by 1 order by 2 desc limit 8`)
	for rows.Next() {
		var c catTotal
		rows.Scan(&c.Category, &c.Amount)
		cats = append(cats, c)
	}
	rows.Close()
	events := []map[string]any{}
	rows, _ = s.db.Query(ctx, `select kind, detail, created_at from security_events order by id desc limit 20`)
	for rows.Next() {
		var k, d string
		var at time.Time
		rows.Scan(&k, &d, &at)
		events = append(events, map[string]any{"kind": k, "detail": d, "at": at})
	}
	rows.Close()
	writeJSON(w, 200, map[string]any{"customers": users, "questions": chats, "ai_blocked": blocked, "languages": langs, "categories": cats, "events": events})
}
