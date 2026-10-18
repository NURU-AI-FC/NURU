package httpapi

import (
	"context"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

type monthAmount struct {
	Label  string  `json:"label"`
	Amount float64 `json:"amount"`
}

// monthlySpend returns debits per month for the last n months, oldest first,
// optionally for one category.
func (s *Server) monthlySpend(ctx context.Context, user, category string, n int) []monthAmount {
	from, _ := monthBounds(time.Now())
	from = from.AddDate(0, -(n - 1), 0)
	got := map[string]float64{}
	rows, err := s.db.Query(ctx, `select date_trunc('month', created_at), sum(amount)::float8 from transactions t
		where user_id=$1 and direction='debit' and created_at>=$2 and ($3='' or category=$3)`+personal+` group by 1`, user, from, category)
	if err == nil {
		for rows.Next() {
			var m time.Time
			var v float64
			rows.Scan(&m, &v)
			got[m.Format("2006-01")] = v
		}
		rows.Close()
	}
	out := make([]monthAmount, 0, n)
	for m := from; len(out) < n; m = m.AddDate(0, 1, 0) {
		out = append(out, monthAmount{m.Format("Jan"), got[m.Format("2006-01")]})
	}
	return out
}

type merchantTotal struct {
	Merchant string  `json:"merchant"`
	Category string  `json:"category"`
	Count    int     `json:"count"`
	Amount   float64 `json:"amount"`
}

func (s *Server) topMerchants(ctx context.Context, user, category string, from, to time.Time, limit int) []merchantTotal {
	out := []merchantTotal{}
	rows, err := s.db.Query(ctx, `select merchant, mode() within group (order by category), count(*), sum(amount)::float8 from transactions t
		where user_id=$1 and direction='debit' and created_at>=$2 and created_at<$3 and ($4='' or category=$4)`+personal+`
		group by merchant order by 4 desc limit $5`, user, from, to, category, limit)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var m merchantTotal
		rows.Scan(&m.Merchant, &m.Category, &m.Count, &m.Amount)
		out = append(out, m)
	}
	return out
}

func (s *Server) budgetFor(ctx context.Context, user, category string) float64 {
	var v float64
	s.db.QueryRow(ctx, `select monthly_limit::float8 from budgets where user_id=$1 and category=$2`, user, category).Scan(&v)
	return v
}

// categoryDetail is one category this month: total, budget, six month trend,
// top merchants and recent transactions.
func (s *Server) categoryDetail(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimSpace(r.URL.Query().Get("name"))
	if name == "" {
		fail(w, 400, "pick a category")
		return
	}
	ctx, user := r.Context(), uid(r)
	now := time.Now()
	from, to := monthBounds(now)
	months := s.monthlySpend(ctx, user, name, 6)
	total, prev := months[5].Amount, months[4].Amount
	avg := 0.0
	for _, m := range months[:5] {
		avg += m.Amount / 5
	}
	tx, err := s.recent(ctx, user, 30, name, false)
	if err != nil {
		fail(w, 500, "could not load the category")
		return
	}
	merchants := s.topMerchants(ctx, user, name, from, to, 5)
	budget := s.budgetFor(ctx, user, name)
	tip := ""
	switch {
	case budget > 0 && total > budget:
		tip = "You are " + naira(total-budget) + " over your " + name + " budget. Holding back for the rest of the month keeps the overspend from growing."
	case avg > 0 && total > avg*1.15 && len(merchants) > 0:
		tip = merchants[0].Merchant + " is your biggest " + name + " spend this month. Cutting one visit a week could save about " + naira(merchants[0].Amount/float64(merchants[0].Count)*4) + " a month."
	case avg > 0 && total < avg:
		tip = "You are spending less on " + name + " than your usual " + naira(avg) + " a month. Nice work."
	}
	writeJSON(w, 200, map[string]any{"category": name, "month": now.Format("January"), "total": total, "prev": prev, "avg": math.Round(avg),
		"budget": budget, "days_left": int(to.Sub(now).Hours()/24) + 1, "months": months, "merchants": merchants, "transactions": tx, "tip": tip})
}

type recurring struct {
	Merchant string      `json:"merchant"`
	Category string      `json:"category"`
	Amount   float64     `json:"amount"`
	Every    int         `json:"every_days"`
	Monthly  float64     `json:"monthly"`
	Count    int         `json:"count"`
	Last     time.Time   `json:"last"`
	Next     time.Time   `json:"next"`
	dates    []time.Time // payments seen
}

func median(xs []float64) float64 {
	if len(xs) == 0 {
		return 0
	}
	c := append([]float64(nil), xs...)
	sort.Float64s(c)
	if len(c)%2 == 1 {
		return c[len(c)/2]
	}
	return (c[len(c)/2-1] + c[len(c)/2]) / 2
}

func meanSD(xs []float64) (float64, float64) {
	if len(xs) == 0 {
		return 0, 0
	}
	m := 0.0
	for _, x := range xs {
		m += x
	}
	m /= float64(len(xs))
	v := 0.0
	for _, x := range xs {
		v += (x - m) * (x - m)
	}
	return m, math.Sqrt(v / float64(len(xs)))
}

// detectRecurring finds merchants debited at a steady interval for a steady
// amount over the last six months: subscriptions, utilities and the like.
func (s *Server) detectRecurring(ctx context.Context, user string) []recurring {
	rows, err := s.db.Query(ctx, `select merchant, category, amount::float8, created_at from transactions t
		where user_id=$1 and direction='debit' and category not in ('Savings','Transfer','Rent') and created_at>now()-interval '190 days'`+personal+`
		order by merchant, created_at`, user)
	if err != nil {
		return nil
	}
	type pay struct {
		amt float64
		at  time.Time
	}
	by := map[string][]pay{}
	cat := map[string]string{}
	var order []string
	for rows.Next() {
		var m, c string
		var p pay
		rows.Scan(&m, &c, &p.amt, &p.at)
		if _, ok := by[m]; !ok {
			order = append(order, m)
		}
		by[m] = append(by[m], p)
		cat[m] = c
	}
	rows.Close()
	now := time.Now()
	out := []recurring{}
	for _, m := range order {
		ps := by[m]
		if len(ps) < 3 {
			continue
		}
		var gaps, amts []float64
		for i, p := range ps {
			amts = append(amts, p.amt)
			if i > 0 {
				gaps = append(gaps, ps[i].at.Sub(ps[i-1].at).Hours()/24)
			}
		}
		every := median(gaps)
		if every < 5 || every > 40 {
			continue
		}
		steady := 0
		for _, g := range gaps {
			if math.Abs(g-every) <= math.Max(3, every*0.25) {
				steady++
			}
		}
		mu, sd := meanSD(amts)
		last := ps[len(ps)-1].at
		if float64(steady) < 0.7*float64(len(gaps)) || sd > mu*0.25 || now.Sub(last).Hours()/24 > every*1.6 {
			continue
		}
		days := int(math.Round(every))
		if days >= 26 {
			days = 30
		}
		next := last.AddDate(0, 0, days)
		if days == 30 {
			next = last.AddDate(0, 1, 0)
		}
		for next.Before(now.Truncate(24 * time.Hour)) {
			next = next.AddDate(0, 0, days)
		}
		amt := math.Round(ps[len(ps)-1].amt)
		r := recurring{Merchant: m, Category: cat[m], Amount: amt, Every: days, Monthly: math.Round(mu * 30 / float64(days)), Count: len(ps), Last: last, Next: next}
		for _, p := range ps {
			r.dates = append(r.dates, p.at)
		}
		out = append(out, r)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Next.Before(out[j].Next) })
	return out
}

func (s *Server) recurringBills(w http.ResponseWriter, r *http.Request) {
	items := s.detectRecurring(r.Context(), uid(r))
	now := time.Now()
	var monthly, due7 float64
	n7 := 0
	var subs []string
	subsYear := 0.0
	for _, it := range items {
		monthly += it.Monthly
		if it.Next.Sub(now) <= 7*24*time.Hour {
			due7 += it.Amount
			n7++
		}
		if it.Category == "Entertainment" || it.Category == "Bills" && it.Amount < 10000 {
			subs = append(subs, it.Merchant+" ("+naira(it.Amount)+")")
			subsYear += it.Monthly * 12
		}
	}
	tip := ""
	if len(subs) > 0 {
		tip = "You pay for " + join(subs) + ". If you rarely use them, cancelling saves " + naira(subsYear) + " a year."
	}
	writeJSON(w, 200, map[string]any{"monthly": monthly, "due7": due7, "due7_count": n7, "items": items, "tip": tip})
}

// merchants ranks where money went in a period, by merchant, by category
// and by channel.
func (s *Server) merchants(w http.ResponseWriter, r *http.Request) {
	ctx, user := r.Context(), uid(r)
	p := r.URL.Query().Get("period")
	if p == "" {
		p = "month"
	}
	now := time.Now()
	from, _ := periodStart(p, now)
	to := now.Add(time.Minute)
	top := s.topMerchants(ctx, user, "", from, to, 12)
	cats := []merchantTotal{}
	channels := map[string]float64{}
	rows, err := s.db.Query(ctx, `select category, merchant, count(*), sum(amount)::float8 from transactions t
		where user_id=$1 and direction='debit' and created_at>=$2`+personal+` group by 1,2`, user, from)
	if err == nil {
		byCat := map[string]*merchantTotal{}
		for rows.Next() {
			var c, m string
			var n int
			var v float64
			rows.Scan(&c, &m, &n, &v)
			if byCat[c] == nil {
				byCat[c] = &merchantTotal{Merchant: c, Category: c}
			}
			byCat[c].Count += n
			byCat[c].Amount += v
			channels[channel(c, m)] += v
		}
		rows.Close()
		for _, c := range byCat {
			cats = append(cats, *c)
		}
		sort.Slice(cats, func(i, j int) bool { return cats[i].Amount > cats[j].Amount })
	}
	ch := []monthAmount{}
	for _, k := range []string{"Card and POS", "Transfer", "Online"} {
		ch = append(ch, monthAmount{k, channels[k]})
	}
	writeJSON(w, 200, map[string]any{"merchants": top, "categories": cats, "channels": ch})
}

func channel(category, merchant string) string {
	switch {
	case category == "Transfer" || category == "Family" || category == "Rent" || strings.HasPrefix(merchant, "Transfer"):
		return "Transfer"
	case category == "Shopping" || category == "Entertainment" || category == "Bills" || category == "Data and power" || category == "Savings":
		return "Online"
	}
	return "Card and POS"
}

type healthPart struct {
	Key    string `json:"key"`
	Name   string `json:"name"`
	Detail string `json:"detail"`
	Score  int    `json:"score"`
	Weight int    `json:"weight"`
}

func clamp01(v float64) float64 { return math.Max(0, math.Min(1, v)) }

// healthAt scores finances as they stood at asOf, from four parts: saving
// rate, spending stability, debt to income and the cash buffer in days.
func (s *Server) healthAt(ctx context.Context, user string, asOf time.Time) (int, []healthPart) {
	var in, out float64
	s.db.QueryRow(ctx, `select coalesce(sum(amount) filter (where direction='credit'),0)::float8, coalesce(sum(amount) filter (where direction='debit' and category<>'Savings'),0)::float8
		from transactions t where user_id=$1 and created_at>=$2 and created_at<$3`+personal, user, asOf.AddDate(0, -3, 0), asOf).Scan(&in, &out)
	rate := 0.0
	if in > 0 {
		rate = (in - out) / in
	}
	saving := healthPart{"saving", "Saving rate", strconv.Itoa(int(math.Round(rate*100))) + "% of income kept", int(clamp01(rate/0.3) * 100), 30}

	// month to month swings, ignoring one-off costs like rent and school fees
	var totals []float64
	worst, worstCV := "", 0.0
	rows, err := s.db.Query(ctx, `select category, date_trunc('month', created_at) m, sum(amount)::float8 from transactions t
		where user_id=$1 and direction='debit' and category not in ('Rent','Education','Savings') and created_at>=$2 and created_at<$3`+personal+` group by 1,2`,
		user, asOf.AddDate(0, -6, 0), asOf)
	if err == nil {
		byMonth := map[time.Time]float64{}
		byCat := map[string][]float64{}
		for rows.Next() {
			var c string
			var m time.Time
			var v float64
			rows.Scan(&c, &m, &v)
			byMonth[m] += v
			byCat[c] = append(byCat[c], v)
		}
		rows.Close()
		for _, v := range byMonth {
			totals = append(totals, v)
		}
		for c, vs := range byCat {
			mu, sd := meanSD(vs)
			if len(vs) >= 3 && mu > 10000 && sd/mu > worstCV {
				worst, worstCV = c, sd/mu
			}
		}
	}
	mu, sd := meanSD(totals)
	cv := 0.0
	if mu > 0 {
		cv = sd / mu
	}
	detail := "Steady from month to month"
	if worst != "" && worstCV > 0.15 {
		detail = worst + " changes the most"
	}
	stable := healthPart{"stability", "Spending stability", detail, int(clamp01(1-cv/0.5) * 100), 20}

	var loans float64
	s.db.QueryRow(ctx, `select coalesce(sum(monthly),0)::float8 from loans where user_id=$1 and balance>0`, user).Scan(&loans)
	dti := 0.0
	if in > 0 {
		dti = loans / (in / 3)
	} else if loans > 0 {
		dti = 1
	}
	debt := healthPart{"debt", "Debt to income", strconv.Itoa(int(math.Round(dti*100))) + "% of monthly income", int(clamp01(1-dti/0.7) * 100), 25}

	var bal, since float64
	s.db.QueryRow(ctx, `select coalesce(sum(balance),0)::float8 from accounts where user_id=$1 and kind<>'business'`, user).Scan(&bal)
	s.db.QueryRow(ctx, `select coalesce(sum(case when direction='credit' then amount else -amount end),0)::float8 from transactions t where user_id=$1 and created_at>=$2`+personal, user, asOf).Scan(&since)
	bal -= since
	days := 0.0
	if out > 0 {
		days = math.Max(0, bal/(out/90))
	}
	buffer := healthPart{"buffer", "Buffer days", strconv.Itoa(int(days)) + " days of spending in the bank", int(clamp01(days/90) * 100), 25}

	parts := []healthPart{saving, stable, debt, buffer}
	score := 0
	for _, p := range parts {
		score += p.Score * p.Weight
	}
	return int(math.Round(float64(score) / 100)), parts
}

func healthLabel(n int) string {
	switch {
	case n >= 80:
		return "Excellent"
	case n >= 65:
		return "Good"
	case n >= 50:
		return "Fair"
	}
	return "Needs work"
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	ctx, user := r.Context(), uid(r)
	now := time.Now()
	score, parts := s.healthAt(ctx, user, now)
	prev, _ := s.healthAt(ctx, user, now.AddDate(0, -1, 0))
	weak := parts[0]
	for _, p := range parts {
		if (100-p.Score)*p.Weight > (100-weak.Score)*weak.Weight {
			weak = p
		}
	}
	gain := (100 - weak.Score) * weak.Weight / 100
	tips := map[string]string{
		"saving":    "Saving 30% of what comes in",
		"stability": "Keeping each month's spending close to your usual",
		"debt":      "Paying loans down to under a fifth of your income",
		"buffer":    "Building enough cash to cover 3 months of spending",
	}
	tip := ""
	if gain > 0 {
		tip = tips[weak.Key] + " would add up to " + strconv.Itoa(gain) + " points."
	}
	writeJSON(w, 200, map[string]any{"score": score, "label": healthLabel(score), "change": score - prev,
		"since": now.AddDate(0, -1, 0).Format("January"), "parts": parts, "tip": tip})
}

// unusual finds the recent payment furthest above the usual for its
// category that the user has not yet answered.
func (s *Server) unusual(w http.ResponseWriter, r *http.Request) {
	ctx, user := r.Context(), uid(r)
	var id, merchant, category, account string
	var amount, usual float64
	var at time.Time
	err := s.db.QueryRow(ctx, `with c as (
		  select category, avg(amount) mu, stddev_pop(amount) sd from transactions t
		  where user_id=$1 and direction='debit' and created_at>now()-interval '6 months' and created_at<now()-interval '30 days'`+personal+` group by category)
		select t.id, t.merchant, t.category, a.name, t.amount::float8, c.mu::float8, t.created_at
		from transactions t join c using (category) join accounts a on a.id=t.account_id
		where t.user_id=$1 and t.direction='debit' and a.kind<>'business' and t.created_at>now()-interval '30 days'
		  and t.category not in ('Rent','Education','Savings') and c.sd>0 and t.amount>c.mu+2.5*c.sd and t.amount>=2*c.mu
		  and ($2='' or t.id::text=$2)
		  and not exists (select 1 from alert_reviews v where v.user_id=$1 and v.transaction_id=t.id)
		order by t.amount/c.mu desc limit 1`, user, r.URL.Query().Get("id")).Scan(&id, &merchant, &category, &account, &amount, &usual, &at)
	if err != nil {
		writeJSON(w, 200, map[string]any{"found": false})
		return
	}
	writeJSON(w, 200, map[string]any{"found": true, "id": id, "merchant": merchant, "category": category, "account": account,
		"amount": amount, "usual": math.Round(usual), "times": math.Round(amount/usual*10) / 10, "at": at, "months": s.monthlySpend(ctx, user, category, 6)})
}

func (s *Server) reviewUnusual(w http.ResponseWriter, r *http.Request) {
	var in struct{ Answer string }
	if !decode(w, r, &in) {
		return
	}
	if in.Answer != "me" && in.Answer != "freeze" {
		fail(w, 400, "answer me or freeze")
		return
	}
	id := chi.URLParam(r, "id")
	var merchant string
	var amount float64
	if err := s.db.QueryRow(r.Context(), `select merchant, amount::float8 from transactions where id=$1 and user_id=$2`, id, uid(r)).Scan(&merchant, &amount); err != nil {
		fail(w, 404, "payment not found")
		return
	}
	s.db.Exec(r.Context(), `insert into alert_reviews(user_id,transaction_id,answer) values($1,$2,$3) on conflict (user_id,transaction_id) do update set answer=excluded.answer`, uid(r), id, in.Answer)
	if in.Answer == "freeze" {
		s.event(r.Context(), uid(r), "card_freeze_requested", naira(amount)+" at "+merchant)
		writeJSON(w, 200, map[string]any{"ok": true, "message": "Your card is frozen in the sandbox. Zenith will call you about " + naira(amount) + " at " + merchant + "."})
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true, "message": "Thanks. We will remember payments like this."})
}

type highlight struct {
	Icon  string `json:"icon"`
	Tone  string `json:"tone"`
	Title string `json:"title"`
	Body  string `json:"body"`
}

func pctChange(cur, prev float64) int {
	if prev == 0 {
		return 0
	}
	return int(math.Round((cur - prev) / prev * 100))
}

// report summarises one month: money in and out, what was kept, categories,
// budgets and goals, for printing or sharing.
func (s *Server) report(w http.ResponseWriter, r *http.Request) {
	ctx, user := r.Context(), uid(r)
	now := time.Now()
	month := now
	if m, err := time.ParseInLocation("2006-01", r.URL.Query().Get("month"), now.Location()); err == nil && !m.After(now) {
		month = m
	}
	from, to := monthBounds(month)
	sums := func(a, b time.Time) (in, out, saved float64) {
		s.db.QueryRow(ctx, `select coalesce(sum(amount) filter (where direction='credit'),0)::float8, coalesce(sum(amount) filter (where direction='debit' and category<>'Savings'),0)::float8,
			coalesce(sum(amount) filter (where direction='debit' and category='Savings'),0)::float8
			from transactions t where user_id=$1 and created_at>=$2 and created_at<$3`+personal, user, a, b).Scan(&in, &out, &saved)
		return
	}
	in, out, saved := sums(from, to)
	pin, pout, _ := sums(from.AddDate(0, -1, 0), from)
	catsAt := func(a, b time.Time) map[string]float64 {
		m := map[string]float64{}
		rows, err := s.db.Query(ctx, `select category, sum(amount)::float8 from transactions t where user_id=$1 and direction='debit' and created_at>=$2 and created_at<$3`+personal+` group by 1`, user, a, b)
		if err != nil {
			return m
		}
		defer rows.Close()
		for rows.Next() {
			var c string
			var v float64
			rows.Scan(&c, &v)
			m[c] = v
		}
		return m
	}
	cur, prev := catsAt(from, to), catsAt(from.AddDate(0, -1, 0), from)
	cats := []catTotal{}
	for c, v := range cur {
		cats = append(cats, catTotal{c, v})
	}
	sort.Slice(cats, func(i, j int) bool { return cats[i].Amount > cats[j].Amount })

	var hs []highlight
	if pin > 0 {
		ch := pctChange(in, pin)
		if ch >= 0 {
			hs = append(hs, highlight{"trendup", "green", "Income up " + strconv.Itoa(ch) + "%", naira(in) + " came in, against " + naira(pin) + " the month before"})
		} else {
			hs = append(hs, highlight{"trenddown", "amber", "Income down " + strconv.Itoa(-ch) + "%", naira(in) + " came in, against " + naira(pin) + " the month before"})
		}
	}
	rows, err := s.db.Query(ctx, `select category, monthly_limit::float8 from budgets where user_id=$1`, user)
	over, overBy, kept := "", 0.0, 0
	nb := 0
	if err == nil {
		for rows.Next() {
			var c string
			var lim float64
			rows.Scan(&c, &lim)
			nb++
			if d := cur[c] - lim; d > overBy {
				over, overBy = c, d
			} else if d <= 0 {
				kept++
			}
		}
		rows.Close()
	}
	if over != "" {
		hs = append(hs, highlight{"alert", "red", over + " over budget", naira(overBy) + " more than planned"})
	} else if nb > 0 {
		hs = append(hs, highlight{"check", "green", "Every budget kept", "All " + strconv.Itoa(nb) + " budgets stayed under their limit"})
	}
	drop, dropBy := "", 0.0
	for c, v := range prev {
		if v > 10000 && v-cur[c] > dropBy {
			drop, dropBy = c, v-cur[c]
		}
	}
	if drop != "" {
		hs = append(hs, highlight{"check", "green", drop + " down " + strconv.Itoa(-pctChange(cur[drop], prev[drop])) + "%", "You spent " + naira(dropBy) + " less than the month before"})
	}
	goals, _ := s.listGoals(ctx, user)
	if len(goals) > 0 {
		g := goals[0]
		for _, x := range goals {
			if x.Pct > g.Pct {
				g = x
			}
		}
		body := strconv.Itoa(g.Pct) + "% saved"
		if g.DueAt != nil {
			body += ", due " + g.DueAt.Format("2 Jan")
		}
		hs = append(hs, highlight{"target", "amber", g.Name + " is your closest goal", body})
	}
	var name string
	s.db.QueryRow(ctx, `select split_part(name,' ',1) from users where id=$1`, user).Scan(&name)
	score, _ := s.healthAt(ctx, user, to)
	rate := 0
	if in > 0 {
		rate = int(math.Round((in - out) / in * 100))
	}
	monthsList := []map[string]string{}
	for m, _ := monthBounds(now); len(monthsList) < 12; m = m.AddDate(0, -1, 0) {
		monthsList = append(monthsList, map[string]string{"value": m.Format("2006-01"), "label": m.Format("January 2006")})
	}
	if len(cats) > 6 {
		cats = cats[:6]
	}
	writeJSON(w, 200, map[string]any{"month": from.Format("2006-01"), "label": from.Format("January 2006"), "short": from.Format("January"),
		"name": name, "in": in, "out": out, "kept": in - out, "saved": saved, "rate": rate, "score": score,
		"prev_in": pin, "prev_out": pout, "categories": cats, "budgets_kept": kept, "budgets": nb, "highlights": hs, "months": monthsList})
}
