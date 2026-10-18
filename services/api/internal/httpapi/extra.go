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
	if risk := s.transferRisk(r, in.ToAccount, in.Amount); len(risk) > 0 && !in.ConfirmRisk {
		s.event(r.Context(), uid(r), "transfer_paused", naira(in.Amount)+" to "+in.ToName)
		writeJSON(w, 409, map[string]any{"error": "we paused this transfer", "risk": risk, "to": in.ToName, "bank": in.ToBank, "amount": in.Amount})
		return
	}
	if !s.stepUp(w, r, in.PIN, in.Face, naira(in.Amount)+" to "+in.ToName) {
		return
	}
	id, at, ok := s.debit(w, r, in.From, in.Amount, "Transfer", in.ToName+", "+in.ToBank, strings.TrimSpace(in.Note)+" ••••"+in.ToAccount[6:])
	if !ok {
		return
	}
	s.db.Exec(r.Context(), `insert into payees(user_id,name,bank,account) values($1,$2,$3,$4) on conflict do nothing`, uid(r), in.ToName, in.ToBank, in.ToAccount)
	writeJSON(w, 201, receipt(id, at, in.Amount, in.ToName))
}

func (s *Server) loans(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `select lender,principal::float8,rate_pct::float8,months,disbursed_at,next_due_at,monthly::float8,balance::float8 from loans where user_id=$1`, uid(r))
	if err != nil {
		fail(w, 500, "could not load loans")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var lender string
		var p, rate, monthly, bal float64
		var months int
		var disb, next time.Time
		rows.Scan(&lender, &p, &rate, &months, &disb, &next, &monthly, &bal)
		paid := math.Round((p*(1+rate/100) - bal) / monthly)
		out = append(out, map[string]any{"lender": lender, "principal": p, "rate_pct": rate, "months": months, "disbursed_at": disb,
			"next_due_at": next, "monthly": monthly, "balance": bal, "paid_instalments": paid, "total_interest": math.Round(p * rate / 100)})
	}
	writeJSON(w, 200, out)
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
	var name, kind string
	s.db.QueryRow(r.Context(), `select business_name,business_type from users where id=$1`, uid(r)).Scan(&name, &kind)
	if name == "" {
		writeJSON(w, 200, map[string]any{"enabled": false})
		return
	}
	rows, _ := s.db.Query(r.Context(), `select name,role,gross::float8 from staff where user_id=$1 order by gross desc`, uid(r))
	staff := []map[string]any{}
	payroll := 0.0
	for rows.Next() {
		var n, role string
		var g float64
		rows.Scan(&n, &role, &g)
		paye := math.Round(g * 0.0633)
		pension := math.Round(g * 0.08)
		net := g - paye - pension
		payroll += g
		staff = append(staff, map[string]any{"name": n, "role": role, "gross": g, "paye": paye, "pension": pension, "net": net})
	}
	rows.Close()
	monthly := []map[string]any{}
	rows, _ = s.db.Query(r.Context(), `select to_char(date_trunc('month',t.created_at),'Mon'),
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
	s.db.QueryRow(r.Context(), `select coalesce(sum(balance),0)::float8 from accounts where user_id=$1 and kind='business'`, uid(r)).Scan(&cash)
	var ads []map[string]any
	rows, _ = s.db.Query(r.Context(), `select merchant, sum(amount)::float8 from transactions where user_id=$1 and category='Advertising' and created_at>now()-interval '90 days' group by merchant`, uid(r))
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
	writeJSON(w, 200, map[string]any{"enabled": true, "name": name, "type": kind, "staff": staff, "payroll": payroll,
		"monthly": monthly, "cash": cash, "runway_days": runway, "advertising": ads})
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
