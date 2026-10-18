package httpapi

import (
	"math"
	"net/http"
	"sort"
	"strconv"
	"time"
)

type calEvent struct {
	Date   string  `json:"date"`
	At     string  `json:"at"`
	Title  string  `json:"title"`
	Kind   string  `json:"kind"`
	Source string  `json:"source"`
	Amount float64 `json:"amount"`
	Credit bool    `json:"credit"`
	Status string  `json:"status"`
}

// calendar lays out a month of money events: reminders, recurring bills
// (paid or expected) and salary (received or expected).
func (s *Server) calendar(w http.ResponseWriter, r *http.Request) {
	ctx, user := r.Context(), uid(r)
	now := time.Now()
	month := now
	if m, err := time.ParseInLocation("2006-01", r.URL.Query().Get("month"), now.Location()); err == nil {
		month = m
	}
	from, to := monthBounds(month)
	today := now.Truncate(24 * time.Hour)
	ev := []calEvent{}
	add := func(at time.Time, title, kind, source string, amt float64, credit bool, status string) {
		ev = append(ev, calEvent{at.Format("2006-01-02"), at.Format(time.RFC3339), title, kind, source, amt, credit, status})
	}

	rows, err := s.db.Query(ctx, `select title, kind, amount::float8, due_at, done from reminders where user_id=$1 and due_at>=$2 and due_at<$3`, user, from, to)
	if err == nil {
		for rows.Next() {
			var t, k string
			var a float64
			var at time.Time
			var done bool
			rows.Scan(&t, &k, &a, &at, &done)
			st := "due"
			if done {
				st = "done"
			}
			add(at, t, k, "reminder", a, false, st)
		}
		rows.Close()
	}

	for _, b := range s.detectRecurring(ctx, user) {
		for _, d := range b.dates {
			if !d.Before(from) && d.Before(to) {
				add(d, b.Merchant, "bill", "recurring", b.Amount, false, "paid")
			}
		}
		for d := b.Next; d.Before(to); {
			if !d.Before(from) && !d.Before(today) {
				add(d, b.Merchant, "bill", "recurring", b.Amount, false, "expected")
			}
			if b.Every == 30 {
				d = d.AddDate(0, 1, 0)
			} else {
				d = d.AddDate(0, 0, b.Every)
			}
		}
	}

	// salary: what came in this month, otherwise the usual day and amount
	var payer string
	var amt float64
	var day int
	if err := s.db.QueryRow(ctx, `select mode() within group (order by merchant), avg(amount)::float8, mode() within group (order by extract(day from created_at)::int)
		from transactions t where user_id=$1 and direction='credit' and category='Salary' and created_at>now()-interval '6 months'`+personal+` having count(*)>0`, user).Scan(&payer, &amt, &day); err == nil {
		var got float64
		var at time.Time
		if s.db.QueryRow(ctx, `select amount::float8, created_at from transactions t where user_id=$1 and direction='credit' and category='Salary' and created_at>=$2 and created_at<$3`+personal+` order by created_at limit 1`,
			user, from, to).Scan(&got, &at) == nil {
			add(at, "Salary, "+payer, "salary", "salary", got, true, "received")
		} else {
			last := to.AddDate(0, 0, -1).Day()
			exp := time.Date(from.Year(), from.Month(), min(day, last), 9, 0, 0, 0, from.Location())
			if !exp.Before(today) {
				add(exp, "Salary, "+payer, "salary", "salary", math.Round(amt), true, "expected")
			}
		}
	}
	sort.Slice(ev, func(i, j int) bool { return ev[i].At < ev[j].At })
	writeJSON(w, 200, map[string]any{"month": from.Format("2006-01"), "label": from.Format("January 2006"), "today": now.Format("2006-01-02"), "events": ev})
}

var needs = map[string]bool{"Rent": true, "Bills": true, "Data and power": true, "Transport": true, "Food": true, "Health": true, "Education": true, "Family": true}

type planLine struct {
	Category string  `json:"category"`
	Group    string  `json:"group"`
	Usual    float64 `json:"usual"`
	Limit    float64 `json:"limit"`
}

type monthPlan struct {
	Month    string     `json:"month"`
	Income   float64    `json:"income"`
	PayDay   int        `json:"pay_day"`
	Needs    float64    `json:"needs"`
	Wants    float64    `json:"wants"`
	Savings  float64    `json:"savings"`
	Buffer   float64    `json:"buffer"`
	Lines    []planLine `json:"lines"`
	Reasons  []string   `json:"reasons"`
	Goals    float64    `json:"goals_need"`
	Budgeted int        `json:"budgeted"`
}

func r50(v float64) float64 { return math.Round(v/500) * 500 }

// buildPlan splits next month's expected income into needs, wants, savings
// and a buffer, from the last three months of spending and the goals.
func (s *Server) buildPlan(r *http.Request) monthPlan {
	ctx, user := r.Context(), uid(r)
	now := time.Now()
	cur, _ := monthBounds(now)
	next := cur.AddDate(0, 1, 0)
	p := monthPlan{Month: next.Format("January"), Lines: []planLine{}, Reasons: []string{}}
	var months int
	s.db.QueryRow(ctx, `select coalesce(sum(amount),0)::float8, count(distinct date_trunc('month', created_at)), coalesce(mode() within group (order by extract(day from created_at)::int),25)
		from transactions t where user_id=$1 and direction='credit' and category in ('Salary','Sales','Side income') and created_at>=$2 and created_at<$3`+personal,
		user, cur.AddDate(0, -6, 0), cur).Scan(&p.Income, &months, &p.PayDay)
	if months > 0 {
		p.Income = r50(p.Income / float64(months))
	}
	usual := map[string]float64{}
	rows, err := s.db.Query(ctx, `select category, sum(amount)::float8 from transactions t where user_id=$1 and direction='debit' and category not in ('Savings','Transfer')
		and created_at>=$2 and created_at<$3`+personal+` group by 1`, user, cur.AddDate(0, -3, 0), cur)
	if err == nil {
		for rows.Next() {
			var c string
			var v float64
			rows.Scan(&c, &v)
			usual[c] = v / 3
		}
		rows.Close()
	}
	// rent and school fees come a few times a year, so spread them over six months
	for _, c := range []string{"Rent", "Education"} {
		var v float64
		s.db.QueryRow(ctx, `select coalesce(sum(amount),0)::float8 from transactions t where user_id=$1 and direction='debit' and category=$2 and created_at>=$3`+personal, user, c, cur.AddDate(0, -6, 0)).Scan(&v)
		if v > 0 {
			usual[c] = v / 6
		}
	}
	var needU, wantU float64
	for c, v := range usual {
		if needs[c] {
			needU += v
		} else {
			wantU += v
		}
	}
	goals, _ := s.listGoals(ctx, user)
	for _, g := range goals {
		if g.Saved < g.Target {
			p.Goals += math.Max(g.MonthlyNeeded, g.AutoAmount)
		}
	}
	inc := math.Max(p.Income, 1)
	p.Buffer = r50(inc * 0.05)
	p.Savings = r50(math.Min(inc*0.35, math.Max(inc*0.2, p.Goals)))
	p.Needs = r50(math.Min(needU, inc*0.6))
	p.Wants = math.Max(0, r50(inc-p.Savings-p.Buffer-p.Needs))
	if p.Wants > wantU*1.1 && wantU > 0 {
		// do not invite more fun spending than usual: the extra goes to savings
		p.Savings += p.Wants - r50(wantU*1.1)
		p.Wants = r50(wantU * 1.1)
	}
	for c, v := range usual {
		g, scale := "Wants", 1.0
		if needs[c] {
			g = "Needs"
			if needU > 0 {
				scale = p.Needs / needU
			}
		} else if wantU > 0 {
			scale = p.Wants / wantU
		}
		p.Lines = append(p.Lines, planLine{c, g, math.Round(v), r50(v * scale)})
	}
	sort.Slice(p.Lines, func(i, j int) bool { return p.Lines[i].Limit > p.Lines[j].Limit })

	if months > 0 {
		p.Reasons = append(p.Reasons, "Income of about "+naira(p.Income)+" is the average of the last "+strconv.Itoa(months)+" months")
	}
	if needU > p.Needs+1000 {
		p.Reasons = append(p.Reasons, "Needs usually cost "+naira(needU)+", so they are trimmed to keep saving on track")
	} else if needU > 0 {
		p.Reasons = append(p.Reasons, "Needs are planned at what they usually cost, about "+naira(needU))
	}
	if p.Goals > 0 {
		p.Reasons = append(p.Reasons, "Your goals need about "+naira(p.Goals)+" a month to finish on time")
	}
	if wantU > p.Wants+1000 {
		p.Reasons = append(p.Reasons, "Wants are "+naira(wantU-p.Wants)+" lower than usual to make room for savings")
	}
	p.Reasons = append(p.Reasons, "A "+naira(p.Buffer)+" buffer covers surprises without touching savings")
	s.db.QueryRow(ctx, `select count(*) from budgets where user_id=$1`, user).Scan(&p.Budgeted)
	return p
}

func (s *Server) plan(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, s.buildPlan(r))
}

// applyPlan turns the plan's per-category limits into budgets.
func (s *Server) applyPlan(w http.ResponseWriter, r *http.Request) {
	p := s.buildPlan(r)
	for _, l := range p.Lines {
		if l.Limit <= 0 || l.Category == "Rent" || l.Category == "Education" {
			continue
		}
		s.db.Exec(r.Context(), `insert into budgets(user_id,category,monthly_limit) values($1,$2,$3)
			on conflict (user_id,category) do update set monthly_limit=excluded.monthly_limit`, uid(r), l.Category, l.Limit)
	}
	s.budgets(w, r)
}

// week compares spending by category for the last 7 days with the 7 before,
// and counts what went into savings, for the weekly recap.
func (s *Server) week(w http.ResponseWriter, r *http.Request) {
	ctx, user := r.Context(), uid(r)
	start, _ := periodStart("week", time.Now())
	prevStart := start.AddDate(0, 0, -7)
	cur, prev := map[string]float64{}, map[string]float64{}
	rows, err := s.db.Query(ctx, `select category, created_at>=$2, sum(amount)::float8 from transactions t where user_id=$1 and direction='debit' and created_at>=$3`+personal+` group by 1,2`, user, start, prevStart)
	if err == nil {
		for rows.Next() {
			var c string
			var now bool
			var v float64
			rows.Scan(&c, &now, &v)
			if now {
				cur[c] = v
			} else {
				prev[c] = v
			}
		}
		rows.Close()
	}
	type change struct {
		Category string  `json:"category"`
		Now      float64 `json:"now"`
		Before   float64 `json:"before"`
		Pct      int     `json:"pct"`
	}
	ch := []change{}
	for c := range mergeKeys(cur, prev) {
		if c == "Savings" || cur[c]+prev[c] < 3000 {
			continue
		}
		ch = append(ch, change{c, cur[c], prev[c], pctChange(cur[c], prev[c])})
	}
	sort.Slice(ch, func(i, j int) bool { return math.Abs(ch[i].Now-ch[i].Before) > math.Abs(ch[j].Now-ch[j].Before) })
	var saved, goalIn float64
	s.db.QueryRow(ctx, `select coalesce(sum(amount),0)::float8 from transactions t where user_id=$1 and direction='debit' and category='Savings' and created_at>=$2`+personal, user, start).Scan(&saved)
	s.db.QueryRow(ctx, `select coalesce(sum(c.amount),0)::float8 from goal_contributions c join goals g on g.id=c.goal_id where g.user_id=$1 and c.created_at>=$2`, user, start).Scan(&goalIn)
	top := s.topMerchants(ctx, user, "", start, time.Now().Add(time.Minute), 3)
	var name string
	s.db.QueryRow(ctx, `select split_part(name,' ',1) from users where id=$1`, user).Scan(&name)
	writeJSON(w, 200, map[string]any{"from": start.Format("2 January"), "to": time.Now().Format("2 January"), "name": name,
		"changes": ch, "saved": math.Max(saved, goalIn), "merchants": top})
}

func mergeKeys(a, b map[string]float64) map[string]bool {
	out := map[string]bool{}
	for k := range a {
		out[k] = true
	}
	for k := range b {
		out[k] = true
	}
	return out
}
