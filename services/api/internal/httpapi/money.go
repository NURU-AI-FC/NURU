package httpapi

import (
	"context"
	"math"
	"net/http"
	"sort"
	"strconv"
	"time"
)

type account struct {
	ID       string  `json:"id"`
	Bank     string  `json:"bank"`
	Name     string  `json:"name"`
	Number   string  `json:"number"`
	Kind     string  `json:"kind"`
	Balance  float64 `json:"balance"`
	Currency string  `json:"currency"`
	Via      string  `json:"linked_via"`
}

func (s *Server) listAccounts(ctx context.Context, user string) ([]account, error) {
	rows, err := s.db.Query(ctx, `select id,bank,name,number_masked,kind,balance::float8,currency,linked_via from accounts where user_id=$1 order by kind='business', bank<>'Zenith Bank', name`, user)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []account{}
	for rows.Next() {
		var a account
		if err := rows.Scan(&a.ID, &a.Bank, &a.Name, &a.Number, &a.Kind, &a.Balance, &a.Currency, &a.Via); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *Server) accounts(w http.ResponseWriter, r *http.Request) {
	a, err := s.listAccounts(r.Context(), uid(r))
	if err != nil {
		fail(w, 500, "could not load accounts")
		return
	}
	total := 0.0
	for _, x := range a {
		if x.Kind != "business" {
			total += x.Balance
		}
	}
	writeJSON(w, 200, map[string]any{"accounts": a, "total": total})
}

type transaction struct {
	ID        string    `json:"id"`
	Account   string    `json:"account"`
	Direction string    `json:"direction"`
	Amount    float64   `json:"amount"`
	Category  string    `json:"category"`
	Merchant  string    `json:"merchant"`
	Narration string    `json:"narration"`
	At        time.Time `json:"at"`
}

func (s *Server) recent(ctx context.Context, user string, limit int, category string, business bool) ([]transaction, error) {
	rows, err := s.db.Query(ctx, `select t.id,a.name,t.direction,t.amount::float8,t.category,t.merchant,t.narration,t.created_at
		from transactions t join accounts a on a.id=t.account_id
		where t.user_id=$1 and ($2='' or t.category=$2) and ((a.kind='business')=$3)
		order by t.created_at desc limit $4`, user, category, business, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []transaction{}
	for rows.Next() {
		var t transaction
		if err := rows.Scan(&t.ID, &t.Account, &t.Direction, &t.Amount, &t.Category, &t.Merchant, &t.Narration, &t.At); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// transactions supports account, category, direction, q, from, to,
// limit and offset filters; see listTx.
func (s *Server) transactions(w http.ResponseWriter, r *http.Request) {
	s.listTx(w, r)
}

// periodStart returns where a day, week, month or year view begins.
func periodStart(p string, now time.Time) (time.Time, string) {
	y, m, d := now.Date()
	switch p {
	case "day":
		return time.Date(y, m, d, 0, 0, 0, 0, now.Location()), "hour"
	case "week":
		return time.Date(y, m, d, 0, 0, 0, 0, now.Location()).AddDate(0, 0, -6), "day"
	case "year":
		return time.Date(y, 1, 1, 0, 0, 0, 0, now.Location()), "month"
	default:
		return time.Date(y, m, 1, 0, 0, 0, 0, now.Location()), "day"
	}
}

type catTotal struct {
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
}

type point struct {
	Label string  `json:"label"`
	In    float64 `json:"in"`
	Out   float64 `json:"out"`
}

type summaryOut struct {
	Period     string     `json:"period"`
	From       time.Time  `json:"from"`
	In         float64    `json:"in"`
	Out        float64    `json:"out"`
	Categories []catTotal `json:"categories"`
	Series     []point    `json:"series"`
	PrevOut    float64    `json:"prev_out"`
}

func (s *Server) computeSummary(ctx context.Context, user, period string, business bool) (summaryOut, error) {
	now := time.Now()
	from, bucket := periodStart(period, now)
	out := summaryOut{Period: period, From: from, Categories: []catTotal{}, Series: []point{}}
	scope := `and ((select kind from accounts where id=t.account_id)='business')=$3`

	if err := s.db.QueryRow(ctx, `select coalesce(sum(amount) filter (where direction='credit'),0)::float8, coalesce(sum(amount) filter (where direction='debit'),0)::float8
		from transactions t where user_id=$1 and created_at>=$2 `+scope, user, from, business).Scan(&out.In, &out.Out); err != nil {
		return out, err
	}
	// same length window just before, for "vs last period"
	prevFrom := from.Add(-now.Sub(from))
	if period == "month" {
		prevFrom = from.AddDate(0, -1, 0)
	}
	s.db.QueryRow(ctx, `select coalesce(sum(amount),0)::float8 from transactions t where user_id=$1 and direction='debit' and created_at>=$2 and created_at<$4 `+scope,
		user, prevFrom, business, prevFrom.Add(now.Sub(from))).Scan(&out.PrevOut)

	rows, err := s.db.Query(ctx, `select category, sum(amount)::float8 from transactions t where user_id=$1 and direction='debit' and created_at>=$2 `+scope+` group by category order by 2 desc`, user, from, business)
	if err != nil {
		return out, err
	}
	for rows.Next() {
		var c catTotal
		rows.Scan(&c.Category, &c.Amount)
		out.Categories = append(out.Categories, c)
	}
	rows.Close()

	rows, err = s.db.Query(ctx, `select date_trunc($4::text, created_at) b,
		coalesce(sum(amount) filter (where direction='credit'),0)::float8, coalesce(sum(amount) filter (where direction='debit'),0)::float8
		from transactions t where user_id=$1 and created_at>=$2 `+scope+` group by b order by b`, user, from, business, bucket)
	if err != nil {
		return out, err
	}
	got := map[string]point{}
	for rows.Next() {
		var b time.Time
		var p point
		rows.Scan(&b, &p.In, &p.Out)
		got[label(b, bucket)] = p
	}
	rows.Close()
	// fill empty buckets so charts have a steady x axis
	for t := from; !t.After(now); t = step(t, bucket) {
		l := label(t, bucket)
		p := got[l]
		p.Label = l
		out.Series = append(out.Series, p)
	}
	return out, nil
}

func step(t time.Time, bucket string) time.Time {
	switch bucket {
	case "hour":
		return t.Add(time.Hour)
	case "month":
		return t.AddDate(0, 1, 0)
	}
	return t.AddDate(0, 0, 1)
}

func label(t time.Time, bucket string) string {
	switch bucket {
	case "hour":
		return t.Format("15:00")
	case "month":
		return t.Format("Jan")
	}
	return t.Format("2 Jan")
}

func (s *Server) summary(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Query().Get("period")
	if p == "" {
		p = "month"
	}
	out, err := s.computeSummary(r.Context(), uid(r), p, r.URL.Query().Get("scope") == "business")
	if err != nil {
		fail(w, 500, "could not build the summary")
		return
	}
	writeJSON(w, 200, out)
}

type monthCompare struct {
	Month string    `json:"month"`
	Weeks []float64 `json:"weeks"`
	Total float64   `json:"total"`
	In    float64   `json:"in"`
}

// computeCompare returns weekly spending for the current and previous two
// months, the three month comparison on the dashboard. One query covers all
// three months; m is 0 for the oldest month and 2 for this one.
func (s *Server) computeCompare(ctx context.Context, user string) ([]monthCompare, error) {
	now := time.Now()
	first := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	starts := []time.Time{first.AddDate(0, -2, 0), first.AddDate(0, -1, 0), first}
	out := make([]monthCompare, 3)
	for i, st := range starts {
		out[i] = monthCompare{Month: st.Format("January"), Weeks: make([]float64, 4)}
	}
	rows, err := s.db.Query(ctx, `select case when created_at<$3 then 0 when created_at<$4 then 1 else 2 end m,
		least(((extract(day from created_at)::int-1)/7),3) w, direction, sum(amount)::float8
		from transactions t join accounts a on a.id=t.account_id
		where t.user_id=$1 and a.kind<>'business' and created_at>=$2 and created_at<$5 group by m, w, direction`,
		user, starts[0], starts[1], starts[2], first.AddDate(0, 1, 0))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var m, wk int
		var dir string
		var v float64
		if err := rows.Scan(&m, &wk, &dir, &v); err != nil || m < 0 || m > 2 || wk < 0 || wk > 3 {
			continue
		}
		if dir == "debit" {
			out[m].Weeks[wk] += v
			out[m].Total += v
		} else {
			out[m].In += v
		}
	}
	return out, rows.Err()
}

func (s *Server) compare(w http.ResponseWriter, r *http.Request) {
	out, err := s.computeCompare(r.Context(), uid(r))
	if err != nil {
		fail(w, 500, "could not compare months")
		return
	}
	writeJSON(w, 200, out)
}

// forecast projects the next 30 days from the average daily spend of the
// last 90 days plus known salary and reminders.
func (s *Server) computeForecast(ctx context.Context, user string) (map[string]any, error) {
	accts, err := s.listAccounts(ctx, user)
	if err != nil {
		return nil, err
	}
	bal := 0.0
	for _, a := range accts {
		if a.Kind != "business" {
			bal += a.Balance
		}
	}
	var spent90 float64
	s.db.QueryRow(ctx, `select coalesce(sum(amount),0)::float8 from transactions t join accounts a on a.id=t.account_id
		where t.user_id=$1 and a.kind<>'business' and direction='debit' and category not in ('Rent','Education') and created_at>now()-interval '90 days'`, user).Scan(&spent90)
	daily := spent90 / 90
	type due struct {
		at  time.Time
		amt float64
		t   string
	}
	var dues []due
	rows, _ := s.db.Query(ctx, `select due_at, amount::float8, title from reminders where user_id=$1 and not done and due_at < now()+interval '31 days' and amount>0`, user)
	for rows != nil && rows.Next() {
		var d due
		rows.Scan(&d.at, &d.amt, &d.t)
		dues = append(dues, d)
	}
	if rows != nil {
		rows.Close()
	}
	now := time.Now()
	pts := []map[string]any{}
	low := bal
	for i := 0; i <= 30; i++ {
		day := now.AddDate(0, 0, i)
		if i > 0 {
			bal -= daily
			if day.Day() == 25 {
				bal += 640000
			}
			for _, d := range dues {
				if d.at.YearDay() == day.YearDay() {
					bal -= d.amt
				}
			}
		}
		low = math.Min(low, bal)
		pts = append(pts, map[string]any{"label": day.Format("2 Jan"), "balance": math.Round(bal)})
	}
	return map[string]any{"points": pts, "end": math.Round(bal), "lowest": math.Round(low), "daily_spend": math.Round(daily)}, nil
}

func (s *Server) forecast(w http.ResponseWriter, r *http.Request) {
	f, err := s.computeForecast(r.Context(), uid(r))
	if err != nil {
		fail(w, 500, "could not forecast")
		return
	}
	writeJSON(w, 200, f)
}

// heat returns spending by weekday for the last 4 weeks (28 cells).
func (s *Server) heat(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `select (now()::date - created_at::date) d, sum(amount)::float8 from transactions t join accounts a on a.id=t.account_id
		where t.user_id=$1 and a.kind<>'business' and direction='debit' and created_at>now()-interval '28 days' group by d`, uid(r))
	if err != nil {
		fail(w, 500, "could not load")
		return
	}
	defer rows.Close()
	cells := make([]float64, 28)
	for rows.Next() {
		var d int
		var v float64
		rows.Scan(&d, &v)
		if d >= 0 && d < 28 {
			cells[27-d] = v
		}
	}
	writeJSON(w, 200, map[string]any{"cells": cells, "start": time.Now().AddDate(0, 0, -27).Format("2006-01-02")})
}

type insight struct {
	Kind   string  `json:"kind"`
	Tone   string  `json:"tone"`
	Title  string  `json:"title"`
	Body   string  `json:"body"`
	Amount float64 `json:"amount,omitempty"`
}

// computeInsights finds categories above their three month average,
// recurring subscriptions and unusually large payments.
func (s *Server) computeInsights(ctx context.Context, user string) []insight {
	out := []insight{}
	rows, err := s.db.Query(ctx, `with m as (
		  select category, date_trunc('month', created_at) mo, sum(amount) v from transactions t join accounts a on a.id=t.account_id
		  where t.user_id=$1 and a.kind<>'business' and direction='debit' and created_at>=date_trunc('month', now())-interval '3 months' group by 1,2)
		select category,
		  coalesce(sum(v) filter (where mo=date_trunc('month', now())),0)::float8 cur,
		  coalesce(avg(v) filter (where mo<date_trunc('month', now())),0)::float8 avg3
		from m group by category`, user)
	if err == nil {
		dayFrac := float64(time.Now().Day()) / 30
		for rows.Next() {
			var c string
			var cur, avg float64
			rows.Scan(&c, &cur, &avg)
			pace := avg * dayFrac
			if avg > 0 && cur > pace*1.2 && cur-pace > 5000 {
				out = append(out, insight{"over", "amber", c + " is running high", "You have spent " + naira(cur) + " on " + c + " so far this month, " + naira(cur-pace) + " more than usual by this date.", cur - pace})
			}
		}
		rows.Close()
	}
	rows, err = s.db.Query(ctx, `select merchant, avg(amount)::float8, count(distinct date_trunc('month', created_at)) from transactions
		where user_id=$1 and direction='debit' and category in ('Bills','Entertainment') and created_at>now()-interval '4 months'
		group by merchant having count(distinct date_trunc('month', created_at))>=3 and stddev_pop(amount)<500`, user)
	if err == nil {
		var subs []string
		total := 0.0
		for rows.Next() {
			var m string
			var a float64
			var n int
			rows.Scan(&m, &a, &n)
			subs = append(subs, m)
			total += a
		}
		rows.Close()
		if len(subs) > 0 {
			sort.Strings(subs)
			word := " subscriptions found"
			if len(subs) == 1 {
				word = " subscription found"
			}
			out = append(out, insight{"subscriptions", "blue", strconv.Itoa(len(subs)) + word, "You pay " + naira(total) + " a month for " + join(subs) + ".", total})
		}
	}
	var m string
	var amt, mean, sd float64
	err = s.db.QueryRow(ctx, `with s as (select category, avg(amount) mu, stddev_pop(amount) sd from transactions where user_id=$1 and direction='debit' group by category)
		select t.merchant, t.amount::float8, s.mu::float8, s.sd::float8 from transactions t join s using (category)
		where t.user_id=$1 and t.direction='debit' and t.created_at>now()-interval '14 days' and s.sd>0 and t.amount > s.mu + 3*s.sd
		order by t.amount desc limit 1`, user).Scan(&m, &amt, &mean, &sd)
	if err == nil {
		out = append(out, insight{"unusual", "red", "Unusual payment", naira(amt) + " to " + m + " is much bigger than your normal. Was this you?", amt})
	}
	var saved float64
	s.db.QueryRow(ctx, `select coalesce(sum(amount),0)::float8 from transactions where user_id=$1 and category='Savings' and created_at>=date_trunc('month', now())`, user).Scan(&saved)
	if saved > 0 {
		out = append(out, insight{"saving", "green", "Japa fund on track", "You have saved " + naira(saved) + " this month. Keep it going.", saved})
	}
	return out
}

func (s *Server) insights(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, s.computeInsights(r.Context(), uid(r)))
}

func naira(v float64) string {
	n := int64(math.Round(v))
	neg := n < 0
	if neg {
		n = -n
	}
	str := strconv.FormatInt(n, 10)
	for i := len(str) - 3; i > 0; i -= 3 {
		str = str[:i] + "," + str[i:]
	}
	if neg {
		return "-₦" + str
	}
	return "₦" + str
}

func join(xs []string) string {
	switch len(xs) {
	case 0:
		return ""
	case 1:
		return xs[0]
	}
	out := ""
	for i, x := range xs {
		switch {
		case i == 0:
			out = x
		case i == len(xs)-1:
			out += " and " + x
		default:
			out += ", " + x
		}
	}
	return out
}
