package httpapi

import (
	"context"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"github.com/NURU-AI-FC/nuru/services/api/internal/seed"
)

type txFilter struct {
	Account, Category, Direction, Q string
	From, To                        time.Time
	Business                        bool
	Limit, Offset                   int
}

func parseTxFilter(r *http.Request) txFilter {
	q := r.URL.Query()
	f := txFilter{Account: q.Get("account"), Category: q.Get("category"), Q: strings.TrimSpace(q.Get("q")), Business: q.Get("scope") == "business"}
	if d := q.Get("direction"); d == "credit" || d == "debit" {
		f.Direction = d
	}
	f.Limit, _ = strconv.Atoi(q.Get("limit"))
	if f.Limit <= 0 || f.Limit > 500 {
		f.Limit = 50
	}
	f.Offset, _ = strconv.Atoi(q.Get("offset"))
	if f.Offset < 0 {
		f.Offset = 0
	}
	if t, err := time.Parse("2006-01-02", q.Get("from")); err == nil {
		f.From = t
	}
	if t, err := time.Parse("2006-01-02", q.Get("to")); err == nil {
		f.To = t.AddDate(0, 0, 1)
	}
	if len(f.Q) > 80 {
		f.Q = f.Q[:80]
	}
	return f
}

// where builds the shared filter clause. An account id replaces the
// personal or business scope since it already names one account.
func (f txFilter) where(user string) (string, []any) {
	args := []any{user}
	add := func(v any) string {
		args = append(args, v)
		return "$" + strconv.Itoa(len(args))
	}
	w := "t.user_id=$1"
	if f.Account != "" {
		w += " and t.account_id::text=" + add(f.Account)
	} else {
		w += " and (a.kind='business')=" + add(f.Business)
	}
	if f.Category != "" {
		w += " and t.category=" + add(f.Category)
	}
	if f.Direction != "" {
		w += " and t.direction=" + add(f.Direction)
	}
	if f.Q != "" {
		p := add("%" + strings.NewReplacer(`\`, `\\`, "%", `\%`, "_", `\_`).Replace(f.Q) + "%")
		w += " and (t.merchant ilike " + p + " or t.category ilike " + p + " or t.narration ilike " + p + ")"
	}
	if !f.From.IsZero() {
		w += " and t.created_at>=" + add(f.From)
	}
	if !f.To.IsZero() {
		w += " and t.created_at<" + add(f.To)
	}
	return w, args
}

type txRow struct {
	transaction
	AccountID string `json:"account_id"`
	Bank      string `json:"bank"`
	Number    string `json:"number"`
	Reference string `json:"reference"`
}

const txSelect = `select t.id,a.name,t.direction,t.amount::float8,t.category,t.merchant,t.narration,t.created_at,a.id,a.bank,a.number_masked
	from transactions t join accounts a on a.id=t.account_id where `

func scanTx(row pgx.Row) (txRow, error) {
	var t txRow
	err := row.Scan(&t.ID, &t.Account, &t.Direction, &t.Amount, &t.Category, &t.Merchant, &t.Narration, &t.At, &t.AccountID, &t.Bank, &t.Number)
	t.Reference = reference(t.ID, t.At)
	return t, err
}

// reference is a stable, bank style reference built from the id and time.
func reference(id string, at time.Time) string {
	tail := strings.ToUpper(strings.ReplaceAll(id, "-", ""))
	if len(tail) > 4 {
		tail = tail[:4]
	}
	return "NUR" + at.Format("060102150405") + tail
}

func (s *Server) queryTx(ctx context.Context, user string, f txFilter) ([]txRow, error) {
	w, args := f.where(user)
	args = append(args, f.Limit, f.Offset)
	rows, err := s.db.Query(ctx, txSelect+w+` order by t.created_at desc limit $`+strconv.Itoa(len(args)-1)+` offset $`+strconv.Itoa(len(args)), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []txRow{}
	for rows.Next() {
		t, err := scanTx(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// listTx serves GET /transactions. With meta=1 it also returns the match
// count and totals so search and history can show "23 results".
func (s *Server) listTx(w http.ResponseWriter, r *http.Request) {
	f := parseTxFilter(r)
	items, err := s.queryTx(r.Context(), uid(r), f)
	if err != nil {
		fail(w, 500, "could not load transactions")
		return
	}
	if r.URL.Query().Get("meta") != "1" {
		writeJSON(w, 200, items)
		return
	}
	where, args := f.where(uid(r))
	var n int
	var in, out float64
	s.db.QueryRow(r.Context(), `select count(*), coalesce(sum(t.amount) filter (where t.direction='credit'),0)::float8, coalesce(sum(t.amount) filter (where t.direction='debit'),0)::float8
		from transactions t join accounts a on a.id=t.account_id where `+where, args...).Scan(&n, &in, &out)
	writeJSON(w, 200, map[string]any{"items": items, "count": n, "in": in, "out": out, "more": f.Offset+len(items) < n})
}

func (s *Server) getTx(w http.ResponseWriter, r *http.Request) {
	t, err := scanTx(s.db.QueryRow(r.Context(), txSelect+`t.user_id=$1 and t.id::text=$2`, uid(r), chi.URLParam(r, "id")))
	if err != nil {
		fail(w, 404, "transaction not found")
		return
	}
	// how this compares with the usual spend in the same category
	var avg float64
	var n int
	s.db.QueryRow(r.Context(), `select coalesce(avg(amount),0)::float8, count(*) from transactions where user_id=$1 and category=$2 and direction=$3 and created_at>now()-interval '90 days'`,
		uid(r), t.Category, t.Direction).Scan(&avg, &n)
	var month int
	s.db.QueryRow(r.Context(), `select count(*) from transactions where user_id=$1 and merchant=$2 and created_at>=date_trunc('month', $3::timestamptz) and created_at<=$3`,
		uid(r), t.Merchant, t.At).Scan(&month)
	label, purpose := s.txNote(r.Context(), uid(r), t.ID)
	writeJSON(w, 200, map[string]any{"tx": t, "label": label, "purpose": purpose, "category_avg": math.Round(avg), "category_count": n, "merchant_month": month})
}

func (s *Server) reportTx(w http.ResponseWriter, r *http.Request) {
	var in struct{ Reason, Note string }
	if !decode(w, r, &in) {
		return
	}
	t, err := scanTx(s.db.QueryRow(r.Context(), txSelect+`t.user_id=$1 and t.id::text=$2`, uid(r), chi.URLParam(r, "id")))
	if err != nil {
		fail(w, 404, "transaction not found")
		return
	}
	reason := strings.TrimSpace(in.Reason)
	if reason == "" {
		reason = "Other"
	}
	if len(in.Note) > 500 {
		in.Note = in.Note[:500]
	}
	s.event(r.Context(), uid(r), "tx_report", reason+": "+t.Reference)
	s.notify(r.Context(), uid(r), note{Key: "report:" + t.ID, Kind: "alert", Tone: "blue", Icon: "shieldcheck", Title: "We got your report",
		Body: "Zenith support will look into " + naira(t.Amount) + " to " + t.Merchant + " (" + t.Reference + ") within 24 hours.", Amount: t.Amount, TxID: t.ID, Link: "/history/" + t.ID})
	writeJSON(w, 200, map[string]any{"ok": true, "reference": t.Reference})
}

// accountDetail returns one account with this month's flows and a six
// month balance line rebuilt backwards from today's balance.
func (s *Server) accountDetail(w http.ResponseWriter, r *http.Request) {
	var a account
	err := s.db.QueryRow(r.Context(), `select id,bank,name,number_masked,kind,balance::float8,currency,linked_via from accounts where user_id=$1 and id::text=$2`,
		uid(r), chi.URLParam(r, "id")).Scan(&a.ID, &a.Bank, &a.Name, &a.Number, &a.Kind, &a.Balance, &a.Currency, &a.Via)
	if err != nil {
		fail(w, 404, "account not found")
		return
	}
	now := time.Now()
	first := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	start := first.AddDate(0, -5, 0)
	net := map[string]float64{}
	var in, out float64
	rows, err := s.db.Query(r.Context(), `select date_trunc('month', created_at), coalesce(sum(case when direction='credit' then amount else -amount end),0)::float8,
		coalesce(sum(amount) filter (where direction='credit'),0)::float8, coalesce(sum(amount) filter (where direction='debit'),0)::float8
		from transactions where account_id=$1 and created_at>=$2 group by 1`, a.ID, start)
	if err == nil {
		for rows.Next() {
			var m time.Time
			var n, ci, co float64
			rows.Scan(&m, &n, &ci, &co)
			net[m.Format("2006-01")] = n
			if m.Format("2006-01") == first.Format("2006-01") {
				in, out = ci, co
			}
		}
		rows.Close()
	}
	// walk back from today: the end of last month is today's balance minus this month's net
	pts := make([]map[string]any, 6)
	bal := a.Balance
	for i := 0; i < 6; i++ {
		m := first.AddDate(0, -i, 0)
		pts[5-i] = map[string]any{"label": m.Format("Jan"), "balance": math.Round(bal)}
		bal -= net[m.Format("2006-01")]
	}
	var holder string
	s.db.QueryRow(r.Context(), `select name from users where id=$1`, uid(r)).Scan(&holder)
	writeJSON(w, 200, map[string]any{"account": a, "holder": holder, "in": in, "out": out, "month": first.Format("Jan"), "points": pts})
}

// demoAccounts fills an empty account with sandbox banks and a year of history.
func (s *Server) demoAccounts(w http.ResponseWriter, r *http.Request) {
	var n int
	s.db.QueryRow(r.Context(), `select count(*) from accounts where user_id=$1`, uid(r)).Scan(&n)
	if n > 0 {
		fail(w, 409, "you already have linked accounts")
		return
	}
	var biz string
	s.db.QueryRow(r.Context(), `select business_name from users where id=$1`, uid(r)).Scan(&biz)
	if err := seed.User(r.Context(), s.db, uid(r), biz != ""); err != nil {
		fail(w, 500, "could not link the demo bank")
		return
	}
	s.accounts(w, r)
}

// profile adds what the profile page shows on top of /me.
func (s *Server) profile(w http.ResponseWriter, r *http.Request) {
	var since time.Time
	var kyc bool
	var accts, txs int
	var income, saved float64
	ctx := r.Context()
	s.db.QueryRow(ctx, `select created_at, kyc_verified from users where id=$1`, uid(r)).Scan(&since, &kyc)
	s.db.QueryRow(ctx, `select count(*) from accounts where user_id=$1 and kind<>'business'`, uid(r)).Scan(&accts)
	s.db.QueryRow(ctx, `select count(*), coalesce(sum(t.amount) filter (where t.direction='credit' and t.category in ('Salary','Side income')),0)::float8,
		coalesce(sum(t.amount) filter (where t.category='Savings'),0)::float8
		from transactions t join accounts a on a.id=t.account_id where t.user_id=$1 and a.kind<>'business' and t.created_at>now()-interval '90 days'`, uid(r)).Scan(&txs, &income, &saved)
	pct := 0.0
	if income > 0 {
		pct = math.Round(saved / income * 100)
	}
	tier := 1
	if kyc {
		tier = 2
	}
	writeJSON(w, 200, map[string]any{"member_since": since, "tier": tier, "accounts": accts, "transactions_90d": txs, "saved_pct": pct})
}
