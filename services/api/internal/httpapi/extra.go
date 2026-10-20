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
	"github.com/NURU-AI-FC/nuru/services/api/internal/email"
)

// stepUp guards every payment: no lockout, a PIN and an enrolled face, the
// right PIN, then a face match against the encrypted template. Three
// failures pause payments for 30 minutes. It writes the error response
// itself and reports whether the payment may go ahead.
func (s *Server) stepUp(w http.ResponseWriter, r *http.Request, pin string, face []float64, what string) bool {
	var pinHash string
	var hasFace bool
	var locked *time.Time
	var fails int
	s.db.QueryRow(r.Context(), `select pin_hash, face_template is not null, transfer_locked_until, transfer_fails from users where id=$1`, uid(r)).Scan(&pinHash, &hasFace, &locked, &fails)
	if locked != nil && locked.After(time.Now()) {
		fail(w, 423, "transfers are paused until "+locked.Format("3:04 pm")+" after 3 failed checks")
		return false
	}
	if pinHash == "" || !hasFace {
		fail(w, 428, "create a PIN and enrol your face first")
		return false
	}
	failed := func(kind, msg string) bool {
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
		s.event(r.Context(), uid(r), kind, what)
		fail(w, 403, msg)
		return false
	}
	if ok, _ := auth.Verify(pin, pinHash); !ok {
		return failed("pin_failed", "wrong PIN")
	}
	if ok, _ := s.matchFace(r, face); !ok {
		return failed("face_failed", "the face did not match")
	}
	s.db.Exec(r.Context(), `update users set transfer_fails=0 where id=$1`, uid(r))
	return true
}

// debit takes money from one of the user's accounts and records it in one
// database transaction. On failure it has already written the response.
func (s *Server) debit(w http.ResponseWriter, r *http.Request, from string, amount float64, category, merchant, narration string) (string, time.Time, bool) {
	var id string
	var at time.Time
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		fail(w, 500, "try again")
		return id, at, false
	}
	defer tx.Rollback(r.Context())
	var bal float64
	if err := tx.QueryRow(r.Context(), `select balance::float8 from accounts where id=$1 and user_id=$2 for update`, from, uid(r)).Scan(&bal); err != nil {
		fail(w, 404, "account not found")
		return id, at, false
	}
	if bal < amount {
		fail(w, 400, "not enough money in this account")
		return id, at, false
	}
	tx.Exec(r.Context(), `update accounts set balance=balance-$1 where id=$2`, amount, from)
	if err := tx.QueryRow(r.Context(), `insert into transactions(user_id,account_id,direction,amount,category,merchant,narration,created_at)
		values($1,$2,'debit',$3,$4,$5,$6,now()) returning id, created_at`, uid(r), from, amount, category, merchant, narration).Scan(&id, &at); err != nil {
		fail(w, 500, "payment failed")
		return id, at, false
	}
	if err := tx.Commit(r.Context()); err != nil {
		fail(w, 500, "payment failed")
		return id, at, false
	}
	return id, at, true
}

func receipt(id string, at time.Time, amount float64, to string) map[string]any {
	digits := []byte{}
	for _, c := range id {
		if c != '-' {
			digits = append(digits, byte('0'+int(c)%10))
		}
	}
	return map[string]any{"id": id, "at": at, "amount": amount, "to": to, "fee": 0, "sandbox": true,
		"reference": "NURU-" + strings.ToUpper(id[:8]), "session_id": "000015" + at.Format("060102150405") + string(digits[:12])}
}

// transferRisk flags a payment to an account the customer has never paid
// that is large, or far above what they usually send.
func (s *Server) transferRisk(r *http.Request, account string, amount float64) []string {
	var saved bool
	s.db.QueryRow(r.Context(), `select exists(select 1 from payees where user_id=$1 and account=$2)`, uid(r), account).Scan(&saved)
	if saved {
		return nil
	}
	var usual float64
	s.db.QueryRow(r.Context(), `select coalesce(avg(amount),0)::float8 from transactions where user_id=$1 and direction='debit'
		and category in ('Transfer','Family') and created_at>now()-interval '90 days'`, uid(r)).Scan(&usual)
	times := 0.0
	if usual > 0 {
		times = math.Floor(amount / usual)
	}
	if amount < 200_000 && times < 5 {
		return nil
	}
	out := []string{"New account, never paid before"}
	if times >= 3 {
		out = append(out, strconv.Itoa(int(times))+"× bigger than your usual transfer")
	}
	if amount >= 200_000 {
		out = append(out, "Over "+naira(200_000)+" in one go to someone new")
	}
	return out
}

// transferGate decides whether a payment may go ahead. The PIN and face are
// always checked first, on every attempt, so a wrong PIN never reaches the
// scam warning and confirming that warning needs the PIN and face again.
// It returns the risk reasons when a verified payment still needs the
// customer to confirm it.
func transferGate(verify func() bool, risk func() []string, confirmed bool) (bool, []string) {
	if !verify() {
		return false, nil
	}
	if r := risk(); len(r) > 0 && !confirmed {
		return false, r
	}
	return true, nil
}

// transfer moves money between a user's account and a payee. It needs the
// transaction PIN and a face match against the enrolled template. A risky
// payment to someone new is paused until the customer confirms it.
func (s *Server) transfer(w http.ResponseWriter, r *http.Request) {
	var in struct {
		From, PayeeID, ToName, ToBank, ToAccount, Note, PIN string
		Amount                                              float64
		Face                                                []float64
		ConfirmRisk                                         bool
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
	what := naira(in.Amount) + " to " + in.ToName
	ok, risk := transferGate(func() bool { return s.stepUp(w, r, in.PIN, in.Face, what) },
		func() []string { return s.transferRisk(r, in.ToAccount, in.Amount) }, in.ConfirmRisk)
	if len(risk) > 0 {
		s.event(r.Context(), uid(r), "transfer_paused", what)
		writeJSON(w, 409, map[string]any{"error": "we paused this transfer", "risk": risk, "to": in.ToName, "bank": in.ToBank, "amount": in.Amount})
		return
	}
	if !ok {
		return
	}
	id, at, ok := s.debit(w, r, in.From, in.Amount, "Transfer", in.ToName+", "+in.ToBank, strings.TrimSpace(in.Note)+" ••••"+in.ToAccount[6:])
	if !ok {
		return
	}
	s.db.Exec(r.Context(), `insert into payees(user_id,name,bank,account) values($1,$2,$3,$4) on conflict do nothing`, uid(r), in.ToName, in.ToBank, in.ToAccount)
	rec := receipt(id, at, in.Amount, in.ToName)
	var from string
	s.db.QueryRow(r.Context(), `select name from accounts where id=$1`, in.From).Scan(&from)
	s.sendEmail(uid(r), "", email.TransferSent(email.Transfer{Amount: in.Amount, Name: in.ToName, Bank: in.ToBank, Account: in.ToAccount[6:],
		Note: strings.TrimSpace(in.Note), From: from, Reference: rec["reference"].(string), At: at}))
	writeJSON(w, 201, rec)
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
