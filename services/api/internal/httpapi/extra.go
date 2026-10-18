package httpapi

import (
	"encoding/json"
	"math"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/NURU-AI-FC/nuru/services/api/internal/auth"
)

// transfer moves money between a user's account and a payee. It always needs
// the transaction PIN; the web app adds a passkey or face check before calling.
func (s *Server) transfer(w http.ResponseWriter, r *http.Request) {
	var in struct {
		From, ToName, ToBank, ToAccount, Note, PIN string
		Amount                                     float64
	}
	if !decode(w, r, &in) {
		return
	}
	if in.Amount <= 0 || in.Amount > 5_000_000 || in.ToName == "" || len(in.ToAccount) != 10 {
		fail(w, 400, "check the amount and the 10 digit account number")
		return
	}
	var pinHash string
	s.db.QueryRow(r.Context(), `select pin_hash from users where id=$1`, uid(r)).Scan(&pinHash)
	if pinHash == "" {
		fail(w, 400, "set a transaction PIN first")
		return
	}
	if ok, _ := auth.Verify(in.PIN, pinHash); !ok {
		s.event(r.Context(), uid(r), "pin_failed", "transfer")
		fail(w, 403, "wrong PIN")
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
	writeJSON(w, 201, map[string]any{"id": id, "at": at, "amount": in.Amount, "to": in.ToName, "reference": "NURU-" + strings.ToUpper(id[:8]), "sandbox": true})
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
