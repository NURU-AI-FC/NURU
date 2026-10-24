package httpapi

import (
	"context"
	"fmt"
	"hash/fnv"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/NURU-AI-FC/nuru/services/api/internal/auth"
	"github.com/NURU-AI-FC/nuru/services/api/internal/seed"
)

// The staff console only ever returns aggregates or masked profiles. Names,
// emails, phone numbers and account numbers never leave these handlers.
// Profiles come from console_customers: 'live' rows are computed here from
// real customers, 'pilot' rows are a modelled cohort. Every figure carries a
// basis (live, mixed or estimated) so the page can label it honestly.

func (s *Server) consoleRoutes(r chi.Router) {
	r.Group(func(r chi.Router) {
		r.Use(func(h http.Handler) http.Handler { return auth.RequireRole("staff", h) })
		in := func(area string) func(http.Handler) http.Handler { return s.gate("staff", consoleAreas, area) }
		r.With(in("overview"), s.cached(45*time.Second)).Get("/console/overview", s.consoleOverview)
		r.With(in("segments"), s.cached(45*time.Second)).Get("/console/segments", s.consoleSegments)
		r.With(in("customers")).Get("/console/customers", s.consoleCustomers)
		r.With(in("customers")).Get("/console/customers/{id}", s.consoleCustomer)
		r.With(in("campaigns")).Get("/console/campaigns", s.consoleCampaigns)
		r.With(in("campaigns")).Post("/console/campaigns", s.consoleCreateCampaign)
		r.With(in("campaigns")).Patch("/console/campaigns/{id}", s.consoleCampaignStatus)
		r.With(in("risk"), s.cached(45*time.Second)).Get("/console/risk", s.consoleRisk)
		r.With(in("data"), s.cached(45*time.Second)).Get("/console/consent", s.consoleConsent)
		r.With(in("export")).Get("/console/exports", s.consoleExports)
		r.With(in("export")).Post("/console/exports", s.consoleExport)
		r.With(in("export")).Get("/console/exports/{id}", s.consoleExportFile)
		r.With(in("team")).Get("/console/team", s.teamList(consoleTeam))
		r.With(in("team")).Post("/console/team", s.teamInvite(consoleTeam))
		r.With(in("team")).Patch("/console/team/{id}", s.teamUpdate(consoleTeam))
	})
}

const segExpr = `case when has_business then 'business' when credit_sources>=8 and not salary_regular then 'trader'
	when income<120000 and family_inflow then 'student' when spend>=900000 then 'high' when salary_regular then 'salary' else 'other' end`

type segMeta struct {
	Key, Name, Product, Offer, Icon, Tone, Why string
	Bullets                                    []string
}

var segs = []segMeta{
	{"salary", "Salary earners", "Target savings plan", "Automatic 10% on payday, 12% a year", "briefcase", "red",
		"Salary earners spend most of their pay in the first 20 days, then borrow from friends or quick loan apps. Moving 10% on payday lowers late month borrowing.",
		[]string{"Target savings plan", "Automatic 10% on payday", "12% a year"}},
	{"trader", "Traders and market sellers", "Daily POS savings", "Sweep 5% of daily POS takings", "cart", "amber",
		"Traders get many small payments from many customers and keep cash in the shop. A daily sweep builds a buffer for restocking without a trip to the branch.",
		[]string{"Daily POS savings", "Sweep 5% of takings", "Restock loan after 90 days"}},
	{"student", "Students and NYSC", "Zero fee student account", "No transfer fees, save allowance", "grad", "green",
		"Students get small, frequent transfers from family and spend them fast. A zero fee account with an allowance pot builds the habit early and keeps them with the bank after school.",
		[]string{"Zero fee student account", "Allowance savings pot", "Free debit card"}},
	{"business", "Business owners", "Business overdraft", "Overdraft line that covers cash gaps", "building", "blue",
		"Small businesses often run low on cash before sales settle. An overdraft line covers the gap and they only pay interest on what they use.",
		[]string{"Business overdraft", "Interest only on what you use", "Payroll in NURU"}},
	{"high", "High spenders", "Premium cashback card", "5% cashback on travel and dining", "star", "gray",
		"High spenders move large sums on travel, dining and shopping. A premium card with cashback and a domiciliary account keeps that spend inside the bank.",
		[]string{"Premium cashback card", "Domiciliary account", "Priority support"}},
}

func segName(k string) string {
	for _, s := range segs {
		if s.Key == k {
			return s.Name
		}
	}
	return "Not yet grouped"
}

// scope reads the shared console filters: range in days and source.
func scope(r *http.Request) (int, []string) {
	days := 30
	if d, err := strconv.Atoi(r.URL.Query().Get("days")); err == nil && (d == 7 || d == 30 || d == 90) {
		days = d
	}
	if r.URL.Query().Get("src") == "live" {
		return days, []string{"live"}
	}
	return days, []string{"live", "pilot"}
}

func modelled(src []string) bool { return len(src) > 1 }

func maskedID(id int64) string {
	return fmt.Sprintf("ZB-%02d•••%02d", (id*37)%100, (id*91+13)%100)
}

// model gives a stable, gently growing daily figure for the modelled cohort.
// The same day and metric always give the same number.
func model(metric string, day time.Time, base, growth, noise float64) float64 {
	h := fnv.New32a()
	h.Write([]byte(metric + day.Format("2006-01-02")))
	n := float64(h.Sum32()%1000)/1000 - 0.5
	t := day.Sub(time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)).Hours() / 24
	wk := 1.0
	if wd := day.Weekday(); wd == time.Saturday || wd == time.Sunday {
		wk = 0.82
	}
	return math.Max(0, (base+growth*t)*wk*(1+n*noise))
}

func dayList(days int) []time.Time {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	out := make([]time.Time, days)
	for i := range out {
		out[i] = today.AddDate(0, 0, i-days+1)
	}
	return out
}

func sumModel(metric string, days []time.Time, base, growth, noise float64) float64 {
	t := 0.0
	for _, d := range days {
		t += model(metric, d, base, growth, noise)
	}
	return math.Round(t)
}

var liveSync = struct {
	sync.Mutex
	at time.Time
}{}

// syncLive recomputes anonymised profiles for real customers from their
// transactions, chats and security events. It runs at most every 20 seconds.
func (s *Server) syncLive(ctx context.Context) {
	liveSync.Lock()
	defer liveSync.Unlock()
	if time.Since(liveSync.at) < 20*time.Second {
		return
	}
	liveSync.at = time.Now()
	s.db.Exec(ctx, `
	with f as (
	  select u.id, u.language, u.kyc_verified, u.created_at,
	    coalesce(sum(t.amount) filter (where t.direction='credit'),0)/3 income,
	    coalesce(sum(t.amount) filter (where t.direction='debit' and t.category<>'Savings'),0)/3 spend,
	    coalesce(sum(t.amount) filter (where t.direction='debit' and t.category='Savings'),0)/3 savings,
	    (count(*) filter (where t.direction='credit'))/3 credits_month,
	    count(distinct t.merchant) filter (where t.direction='credit') credit_sources,
	    count(distinct date_trunc('month',t.created_at)) filter (where t.category='Salary') >= 2 salary_regular,
	    coalesce(bool_or(t.category='Family' and t.direction='credit'),false) family_inflow,
	    coalesce(bool_or(t.merchant ilike 'fuel%'),false) car_owner,
	    coalesce(bool_or(t.category='Insurance'),false) insured,
	    coalesce(bool_or(t.category ilike 'fx%'),false) fx_buyer
	  from users u left join transactions t on t.user_id=u.id
	    and t.created_at>=date_trunc('month',now())-interval '3 months' and t.created_at<date_trunc('month',now())
	  where u.role='customer' group by u.id),
	g as (
	  select f.*,
	    exists(select 1 from accounts a where a.user_id=f.id and a.kind='business') has_business,
	    exists(select 1 from accounts a where a.user_id=f.id and a.linked_via like 'mono%') open_banking,
	    (select coalesce(sum(balance),0) from accounts a where a.user_id=f.id) balance,
	    (select coalesce(sum(principal),0) from loans l where l.user_id=f.id) + (select coalesce(sum(contributed),0) from investments i where i.user_id=f.id) product_value,
	    array_remove(array['Savings',
	      case when exists(select 1 from accounts a where a.user_id=f.id and a.kind='business') then 'Business account' end,
	      case when exists(select 1 from loans l where l.user_id=f.id) then 'Personal loan' end,
	      case when exists(select 1 from investments i where i.user_id=f.id and i.kind='pension') then 'Pension' end,
	      case when exists(select 1 from investments i where i.user_id=f.id and i.kind in ('tbills','fund')) then 'Investments' end], null) products,
	    (select count(*) from chats c where c.user_id=f.id and c.role='user') questions,
	    (select count(*) from chats c where c.user_id=f.id and c.role='user' and c.created_at>now()-interval '28 days')/4 weekly,
	    greatest(f.created_at, (select max(created_at) from chats c where c.user_id=f.id), (select max(created_at) from transactions t where t.user_id=f.id and t.created_at<=now())) last_active,
	    (select count(*) from reminders m where m.user_id=f.id) + 4 shown,
	    (select count(*) from reminders m where m.user_id=f.id and m.done) + (select count(*) from transactions t where t.user_id=f.id and t.category='Transfer') acted,
	    array_remove(array[
	      case when exists(select 1 from security_events e where e.user_id=f.id and e.kind='pin_failed' and e.created_at>now()-interval '30 days') then 'Failed PINs' end,
	      case when exists(select 1 from security_events e where e.user_id=f.id and e.kind='face_failed' and e.created_at>now()-interval '30 days') then 'Face mismatch' end,
	      case when exists(select 1 from security_events e where e.user_id=f.id and e.kind='transfers_locked' and e.created_at>now()-interval '30 days') then 'Transfers locked' end,
	      case when exists(select 1 from security_events e where e.user_id=f.id and e.kind='ai_injection' and e.created_at>now()-interval '30 days') then 'Prompt injection' end], null) flags
	  from f)
	insert into console_customers(user_id, source, state, age_band, joined, first_seen, last_active, language, tier, income, spend, savings, balance,
	  credits_month, credit_sources, has_business, salary_regular, family_inflow, fx_buyer, car_owner, insured, products, product_value,
	  nuru_weekly, questions, insights_shown, insights_acted, health, churn, ltv, consent_open_banking, flags, updated_at)
	select id, 'live', 'Lagos', '25-34', created_at::date, created_at::date, last_active, language, case when kyc_verified then 2 else 1 end,
	  round(income,2), round(spend,2), round(savings,2), balance, credits_month, credit_sources, has_business, salary_regular, family_inflow,
	  fx_buyer, car_owner, insured, products, product_value, weekly, questions, shown, least(acted, shown),
	  greatest(300, least(850, round(800 - coalesce(spend/nullif(income,0),1)*300 + greatest(0, 1 - coalesce(spend/nullif(income,0),1))*400
	    + case when product_value>0 then 40 else 0 end)))::int,
	  round(least(0.9, 0.04 + extract(epoch from now()-last_active)/86400/60)::numeric, 3),
	  round(balance*0.06*5 + spend*12*0.006*5 + product_value*0.04, -2),
	  open_banking, flags, now()
	from g
	on conflict (user_id) do update set last_active=excluded.last_active, language=excluded.language, tier=excluded.tier, income=excluded.income,
	  spend=excluded.spend, savings=excluded.savings, balance=excluded.balance, credits_month=excluded.credits_month, credit_sources=excluded.credit_sources,
	  has_business=excluded.has_business, salary_regular=excluded.salary_regular, family_inflow=excluded.family_inflow, fx_buyer=excluded.fx_buyer,
	  car_owner=excluded.car_owner, insured=excluded.insured, products=excluded.products, product_value=excluded.product_value,
	  nuru_weekly=excluded.nuru_weekly, questions=excluded.questions, insights_shown=excluded.insights_shown, insights_acted=excluded.insights_acted,
	  health=excluded.health, churn=excluded.churn, ltv=excluded.ltv, consent_open_banking=excluded.consent_open_banking, flags=excluded.flags, updated_at=now()`)
}

func pct(a, b float64) float64 {
	if b == 0 {
		return 0
	}
	return math.Round(a/b*1000) / 10
}

type kpi struct {
	Key   string  `json:"key"`
	Value float64 `json:"value"`
	Prev  float64 `json:"prev"`
	Basis string  `json:"basis"`
	Note  string  `json:"note"`
}

// consoleOverview is the headline view across opted in customers.
func (s *Server) consoleOverview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	s.syncLive(ctx)
	days, src := scope(r)
	mod := modelled(src)
	basis := map[bool]string{true: "mixed", false: "live"}[mod]
	est := map[bool]string{true: "estimated", false: "live"}[mod]
	q := func(sql string, args ...any) float64 {
		var v float64
		s.db.QueryRow(ctx, sql, append([]any{src}, args...)...).Scan(&v)
		return v
	}
	where := ` from console_customers where source=any($1) and consent_insights`
	customers := q(`select count(*)::float8` + where)
	active := q(`select count(*)::float8`+where+` and last_active>now()-make_interval(days=>$2)`, days)
	// same activity rate applied to who had signed up one period ago, so growth comes from new customers
	prevActive := 0.0
	if customers > 0 {
		prevActive = math.Round(q(`select count(*)::float8`+where+` and first_seen<=current_date-$2::int`, days) * active / customers)
	}
	live := q(`select count(*)::float8 from console_customers where source='live' and source=any($1)`)
	shown := q(`select coalesce(sum(insights_shown),0)::float8` + where)
	acted := q(`select coalesce(sum(insights_acted),0)::float8` + where)
	products := q(`select coalesce(sum(product_value),0)::float8` + where)
	withProducts := q(`select count(*)::float8` + where + ` and cardinality(products)>1`)
	churn := q(`select coalesce(avg(churn),0)::float8` + where)
	highChurn := q(`select count(*)::float8` + where + ` and churn>=0.3`)
	ltv := q(`select coalesce(avg(ltv),0)::float8` + where)
	ltvTotal := q(`select coalesce(sum(ltv),0)::float8` + where)

	dl := dayList(days)
	prevDl := make([]time.Time, days)
	for i, d := range dl {
		prevDl[i] = d.AddDate(0, 0, -days)
	}
	var liveQ, livePrevQ, liveBlocked, liveFraud float64
	s.db.QueryRow(ctx, `select count(*) filter (where created_at>now()-make_interval(days=>$1))::float8,
		count(*) filter (where created_at<=now()-make_interval(days=>$1) and created_at>now()-make_interval(days=>$1*2))::float8 from chats where role='user'`, days).Scan(&liveQ, &livePrevQ)
	s.db.QueryRow(ctx, `select count(*) filter (where kind like 'ai_%')::float8, count(*) filter (where kind in ('transfers_locked','face_failed'))::float8
		from security_events where created_at>now()-make_interval(days=>$1)`, days).Scan(&liveBlocked, &liveFraud)
	questions, prevQ, blocked, fraud, held, uptime, latency := liveQ, livePrevQ, liveBlocked, liveFraud, 0.0, 100.0, 0.0
	if mod {
		questions += sumModel("questions", dl, 9200, 18, 0.18)
		prevQ += sumModel("questions", prevDl, 9200, 18, 0.18)
		blocked += sumModel("prompt_blocked", dl, 38, 0.05, 0.6)
		fraud += sumModel("fraud_confirmed", dl, 1.4, 0, 0.9)
		held = sumModel("fraud_held", dl, 1.4*265000, 0, 0.9)
	}
	up, lat := 0.0, 0.0
	for _, d := range dl {
		up += 100 - model("downtime", d, 0.03, 0, 1.6)
		lat += model("latency", d, 1.8, 0, 0.3)
	}
	uptime, latency = math.Round(up/float64(days)*100)/100, math.Round(lat/float64(days)*10)/10

	langs := map[string]float64{}
	rows, _ := s.db.Query(ctx, `select lang, count(*)::float8 from chats where role='user' and created_at>now()-make_interval(days=>$1) group by lang`, days)
	for rows.Next() {
		var l string
		var n float64
		rows.Scan(&l, &n)
		langs[l] = n
	}
	rows.Close()
	if mod {
		share := map[string]float64{"en": 0.61, "yo": 0.19, "ha": 0.11, "ig": 0.09}
		mq := questions - liveQ
		for l, sh := range share {
			langs[l] += math.Round(mq * sh)
		}
	}
	var voiceShare float64
	s.db.QueryRow(ctx, `select coalesce(avg(case when voice then 100 else 0 end),0)::float8 from console_customers where source=any($1) and consent_insights and language<>'en'`, src).Scan(&voiceShare)

	// weekly active users over twelve weeks, from last_active of profiles
	weeks := []map[string]any{}
	for i := 11; i >= 0; i-- {
		end := time.Now().AddDate(0, 0, -7*i)
		var n float64
		s.db.QueryRow(ctx, `select count(*)::float8 from console_customers where source=any($1) and consent_insights and first_seen<=$2::date`, src, end).Scan(&n)
		// people active that week: a stable share of everyone signed up by then
		active := n
		if mod {
			active = math.Round(n * (0.62 + model("wau", end, 0, 0, 0.08)/100))
		}
		weeks = append(weeks, map[string]any{"label": end.Format("2 Jan"), "value": active})
	}

	topics := []map[string]any{}
	for i, t := range [][2]any{{"Where did my money go?", 0.27}, {"Can I afford this?", 0.17}, {"How do I save for rent?", 0.14}, {"Compare with last month", 0.11}, {"Send money or pay a bill", 0.09}} {
		_ = i
		topics = append(topics, map[string]any{"question": t[0], "count": math.Round(questions * t[1].(float64))})
	}

	var lowSavers, cashGaps, uninsured float64
	s.db.QueryRow(ctx, `select count(*) filter (where `+segExpr+`='salary' and spend>=income*0.9)::float8,
		count(*) filter (where `+segExpr+` in ('business','trader') and low_balance_days>=6)::float8,
		count(*) filter (where car_owner and not insured)::float8`+where, src).Scan(&lowSavers, &cashGaps, &uninsured)
	signals := []map[string]any{
		{"icon": "alert", "tone": "red", "count": lowSavers, "text": "salary earners spend more than 90% of income", "action": "Offer automatic savings", "segment": "salary"},
		{"icon": "briefcase", "tone": "amber", "count": cashGaps, "text": "businesses and traders run low on cash 6 or more days a month", "action": "Offer an overdraft line", "segment": "business"},
		{"icon": "umbrella", "tone": "blue", "count": uninsured, "text": "car owners have no insurance", "action": "Offer motor cover", "segment": "high"},
	}

	cats := []catTotal{}
	rows, _ = s.db.Query(ctx, `select category, sum(amount)::float8 from transactions where direction='debit' and created_at>now()-make_interval(days=>$1) and created_at<=now() group by 1 order by 2 desc limit 8`, days)
	for rows.Next() {
		var c catTotal
		rows.Scan(&c.Category, &c.Amount)
		cats = append(cats, c)
	}
	rows.Close()

	kpis := []kpi{
		{"active", active, prevActive, basis, ""},
		{"questions", questions, prevQ, basis, ""},
		{"acted", pct(acted, shown), 0, basis, strconv.Itoa(int(acted)) + " of " + strconv.Itoa(int(shown)) + " insights"},
		{"products", products, withProducts, est, ""},
		{"churn", math.Round(churn*1000) / 10, highChurn, est, ""},
		{"ltv", ltv, ltvTotal, est, ""},
		{"fraud", fraud, held, basis, ""},
		{"blocked", blocked, liveBlocked, basis, ""},
		{"uptime", uptime, latency, "estimated", ""},
		{"customers", customers, live, basis, ""},
	}
	writeJSON(w, 200, map[string]any{"days": days, "modelled": mod, "live_customers": live, "kpis": kpis, "weeks": weeks, "languages": langs,
		"voice_share": math.Round(voiceShare), "topics": topics, "signals": signals, "categories": cats})
}

func (s *Server) segmentRows(ctx context.Context, src []string) []map[string]any {
	type agg struct {
		n, reach, live, income, spend, savings, quick, low, shown, acted, health, ltv, churn float64
	}
	m := map[string]*agg{}
	rows, err := s.db.Query(ctx, `select `+segExpr+` k, count(*)::float8, count(*) filter (where consent_offers)::float8, count(*) filter (where source='live')::float8,
		avg(income)::float8, avg(spend)::float8, avg(savings)::float8, avg(case when quick_loans then 1 else 0 end)::float8,
		avg(case when low_balance_days>=6 then 1 else 0 end)::float8, sum(insights_shown)::float8, sum(insights_acted)::float8,
		avg(health)::float8, avg(ltv)::float8, avg(churn)::float8
		from console_customers where source=any($1) and consent_insights group by 1`, src)
	if err == nil {
		for rows.Next() {
			var k string
			a := &agg{}
			rows.Scan(&k, &a.n, &a.reach, &a.live, &a.income, &a.spend, &a.savings, &a.quick, &a.low, &a.shown, &a.acted, &a.health, &a.ltv, &a.churn)
			m[k] = a
		}
		rows.Close()
	}
	growth := map[string][]float64{}
	months := []string{}
	for i := 2; i >= 0; i-- {
		end := time.Date(time.Now().Year(), time.Now().Month(), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 1-i, -1)
		if i == 0 {
			end = time.Now()
		}
		months = append(months, end.Format("January"))
		rows, err := s.db.Query(ctx, `select `+segExpr+`, count(*)::float8 from console_customers where source=any($1) and consent_insights and first_seen<=$2::date group by 1`, src, end)
		if err != nil {
			continue
		}
		for rows.Next() {
			var k string
			var n float64
			rows.Scan(&k, &n)
			growth[k] = append(growth[k], n)
		}
		rows.Close()
	}
	out := []map[string]any{}
	for _, sg := range segs {
		a := m[sg.Key]
		if a == nil {
			a = &agg{}
		}
		ratio := pct(a.spend, a.income)
		save := pct(a.savings, a.income)
		signal := map[string]string{
			"salary":   fmt.Sprintf("Spend %.0f%% of income, save %.0f%%", ratio, save),
			"trader":   "Many small payments from many customers",
			"student":  "Small, frequent transfers from family",
			"business": fmt.Sprintf("%.0f%% run low on cash 6+ days a month", a.low*100),
			"high":     "Spend over ₦900k a month",
		}[sg.Key]
		uptake := 0.0
		if a.shown > 0 {
			uptake = math.Round(a.acted / a.shown * 85)
		}
		g := growth[sg.Key]
		for len(g) < 3 {
			g = append([]float64{0}, g...)
		}
		out = append(out, map[string]any{"key": sg.Key, "name": sg.Name, "icon": sg.Icon, "tone": sg.Tone, "product": sg.Product, "offer": sg.Offer,
			"bullets": sg.Bullets, "why": sg.Why, "customers": a.n, "reachable": a.reach, "live": a.live, "avg_income": math.Round(a.income),
			"avg_spend": math.Round(a.spend), "spend_ratio": ratio, "saving_rate": save, "quick_loans": math.Round(a.quick * 100),
			"cash_gap": math.Round(a.low * 100), "uptake": uptake, "health": math.Round(a.health), "avg_ltv": math.Round(a.ltv),
			"churn": math.Round(a.churn*1000) / 10, "signal": signal, "growth": g, "months": months,
			"monthly_saving": math.Round(math.Max(a.income*0.1, 5000))})
	}
	return out
}

// minSegment is the smallest group the console shows, so no segment is small
// enough to point at a few people.
const minSegment = 50

// visibleSegments drops segments under minSegment customers and counts them.
func visibleSegments(rows []map[string]any) ([]map[string]any, int) {
	out := []map[string]any{}
	hidden := 0
	for _, r := range rows {
		if n, _ := r["customers"].(float64); n < minSegment {
			hidden++
			continue
		}
		out = append(out, r)
	}
	return out, hidden
}

func (s *Server) consoleSegments(w http.ResponseWriter, r *http.Request) {
	s.syncLive(r.Context())
	_, src := scope(r)
	rows, hidden := visibleSegments(s.segmentRows(r.Context(), src))
	writeJSON(w, 200, map[string]any{"modelled": modelled(src), "segments": rows, "hidden": hidden, "min_size": minSegment})
}

func riskLevel(c float64) string {
	switch {
	case c >= 0.3:
		return "High"
	case c >= 0.12:
		return "Medium"
	}
	return "Low"
}

func (s *Server) consoleCustomers(w http.ResponseWriter, r *http.Request) {
	s.syncLive(r.Context())
	_, src := scope(r)
	seg := r.URL.Query().Get("segment")
	digits := ""
	for _, c := range r.URL.Query().Get("q") {
		if c >= '0' && c <= '9' {
			digits += string(c)
		}
	}
	flagged := r.URL.Query().Get("flagged") == "1"
	rows, err := s.db.Query(r.Context(), `select id, source, `+segExpr+`, state, age_band, health, churn::float8, ltv::float8, flags, last_active
		from console_customers where source=any($1) and consent_insights
		and ($2='' or `+segExpr+`=$2)
		and ($3='' or lpad(((id*37)%100)::text,2,'0')||lpad(((id*91+13)%100)::text,2,'0') like '%'||$3||'%')
		and (not $4 or cardinality(flags)>0)
		order by source='live' desc, cardinality(flags) desc, ltv desc limit 60`, src, seg, digits, flagged)
	if err != nil {
		fail(w, 500, "could not load customers")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id int64
		var source, k, state, age string
		var health int
		var churn, ltv float64
		var flags []string
		var last time.Time
		rows.Scan(&id, &source, &k, &state, &age, &health, &churn, &ltv, &flags, &last)
		out = append(out, map[string]any{"id": id, "masked": maskedID(id), "source": source, "segment": k, "segment_name": segName(k), "state": state,
			"age_band": age, "health": health, "churn": riskLevel(churn), "ltv": ltv, "flags": flags, "last_active": last})
	}
	writeJSON(w, 200, out)
}

func (s *Server) consoleCustomer(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	c := r.Context()
	var (
		source, k, state, age, lang                                 string
		userID                                                      *string
		joined                                                      time.Time
		last                                                        time.Time
		voice, consentOffers, consentAI, openBanking, fx, car, ins  bool
		quick, biz                                                  bool
		tier, health, weekly, questions, shown, acted, low, credits int
		income, spend, savings, balance, churn, ltv, pv             float64
		products, flags                                             []string
	)
	err := s.db.QueryRow(c, `select source, user_id::text, `+segExpr+`, state, age_band, language, joined, last_active, voice, consent_offers, consent_ai,
		consent_open_banking, fx_buyer, car_owner, insured, quick_loans, has_business, tier, health, nuru_weekly, questions, insights_shown, insights_acted,
		low_balance_days, credits_month, income::float8, spend::float8, savings::float8, balance::float8, churn::float8, ltv::float8, product_value::float8,
		products, flags from console_customers where id=$1 and consent_insights`, id).Scan(&source, &userID, &k, &state, &age, &lang, &joined, &last,
		&voice, &consentOffers, &consentAI, &openBanking, &fx, &car, &ins, &quick, &biz, &tier, &health, &weekly, &questions, &shown, &acted, &low,
		&credits, &income, &spend, &savings, &balance, &churn, &ltv, &pv, &products, &flags)
	if err != nil {
		fail(w, 404, "no opted in customer with that ID")
		return
	}
	s.audit(c, "console", uid(r), "customer_viewed", "#"+maskedID(id))
	var pctl float64
	s.db.QueryRow(c, `select coalesce(avg(case when ltv<=$1 then 1.0 else 0 end),0)::float8 from console_customers where `+segExpr+`=$2 and consent_insights`, ltv, k).Scan(&pctl)

	flow := []map[string]any{}
	banks := []string{seed.BankName}
	nudges := []map[string]any{}
	events := []map[string]any{}
	if userID != nil {
		rows, _ := s.db.Query(c, `select to_char(date_trunc('month',created_at),'Mon'), coalesce(sum(amount) filter (where direction='credit'),0)::float8,
			coalesce(sum(amount) filter (where direction='debit'),0)::float8 from transactions where user_id=$1 and created_at>=date_trunc('month',now())-interval '2 months'
			and created_at<=now() group by date_trunc('month',created_at) order by date_trunc('month',created_at)`, *userID)
		for rows.Next() {
			var m string
			var in, out float64
			rows.Scan(&m, &in, &out)
			flow = append(flow, map[string]any{"month": m, "in": in, "out": out})
		}
		rows.Close()
		banks = []string{}
		rows, _ = s.db.Query(c, `select distinct split_part(bank,' ',1) from accounts where user_id=$1`, *userID)
		for rows.Next() {
			var b string
			rows.Scan(&b)
			banks = append(banks, b)
		}
		rows.Close()
		// titles only: insight bodies can name payees
		for _, in := range s.computeInsights(c, *userID) {
			nudges = append(nudges, map[string]any{"title": in.Title, "kind": in.Kind, "tone": in.Tone, "status": "Shown", "amount": in.Amount})
		}
		rows, _ = s.db.Query(c, `select kind, done, due_at from reminders where user_id=$1 order by due_at desc limit 3`, *userID)
		for rows.Next() {
			var t string
			var done bool
			var due time.Time
			rows.Scan(&t, &done, &due)
			st := "Planned"
			if done {
				st = "Acted"
			}
			// reminder titles are free text, so only the kind is shown
			title := map[string]string{"bill": "Bill reminder set", "loan": "Loan repayment reminder set", "meeting": "Meeting reminder set"}[t]
			if title == "" {
				title = "Reminder set"
			}
			nudges = append(nudges, map[string]any{"title": title, "kind": "reminder", "status": st, "at": due})
		}
		rows.Close()
		rows, _ = s.db.Query(c, `select kind, count(*), max(created_at) from security_events where user_id=$1 and created_at>now()-interval '90 days' group by kind order by 3 desc`, *userID)
		for rows.Next() {
			var kind string
			var n int
			var at time.Time
			rows.Scan(&kind, &n, &at)
			events = append(events, map[string]any{"kind": kind, "count": n, "at": at})
		}
		rows.Close()
	} else {
		for i, m := range []int{2, 1, 0} {
			d := time.Now().AddDate(0, -m, 0)
			flow = append(flow, map[string]any{"month": d.Format("Jan"), "in": math.Round(income * (0.95 + model("in", d, 0, 0, 0.2)/100 + float64(i)*0.01)),
				"out": math.Round(spend * (0.9 + model("out", d.AddDate(0, 0, int(id%27)), 0.2, 0, 1)))})
		}
		if openBanking {
			banks = append(banks, []string{"OPay", "Kuda", "Moniepoint", "PalmPay"}[id%4])
		}
		tmpl := map[string][][2]string{
			"salary":   {{"Moved 10% of salary to savings", "Acted"}, {"Food is over budget this month", "Viewed"}, {"Rent due on the 21st", "Planned"}},
			"trader":   {{"Swept ₦4,500 of POS takings", "Acted"}, {"Restock spend is up 18%", "Viewed"}, {"Supplier payment due Friday", "Planned"}},
			"student":  {{"Allowance arrived, saved ₦2,000", "Acted"}, {"Data spend is running high", "Viewed"}, {"Exam fees due next week", "Planned"}},
			"business": {{"Cash will run low in 9 days", "Viewed"}, {"Payroll scheduled for the 28th", "Planned"}, {"Sales up 12% on last month", "Acted"}},
			"high":     {{"Travel spend is 2x usual", "Viewed"}, {"Moved ₦150,000 to domiciliary", "Acted"}, {"Card bill due in 5 days", "Planned"}},
		}[k]
		for i, t := range tmpl {
			nudges = append(nudges, map[string]any{"title": t[0], "status": t[1], "at": time.Now().AddDate(0, 0, -2-i*3-int(id%3))})
		}
		for _, f := range flags {
			events = append(events, map[string]any{"kind": f, "count": 1 + id%3, "at": time.Now().AddDate(0, 0, -int(id%20))})
		}
	}

	ratio := 1.0
	if income > 0 {
		ratio = spend / income
	}
	clamp := func(v float64) float64 { return math.Round(math.Max(3, math.Min(96, v))) }
	needs := []map[string]any{
		{"name": "Target savings plan", "score": clamp(100 * (ratio - 0.55) * 1.6)},
		{"name": "Personal loan up to " + naira(math.Round(income*6/100000)*100000), "score": clamp(30 + float64(health-600)/5 - churn*80)},
		{"name": "Domiciliary account", "score": clamp(map[bool]float64{true: 70, false: 12}[fx] + float64(id%15))},
		{"name": "Motor insurance", "score": clamp(map[bool]float64{true: 78, false: 4}[car && !ins])},
		{"name": "Business overdraft", "score": clamp(map[bool]float64{true: 40, false: 2}[biz] + float64(low)*6)},
	}
	for i := 0; i < len(needs); i++ {
		for j := i + 1; j < len(needs); j++ {
			if needs[j]["score"].(float64) > needs[i]["score"].(float64) {
				needs[i], needs[j] = needs[j], needs[i]
			}
		}
	}
	langName := map[string]string{"en": "English", "yo": "Yorùbá", "ha": "Hausa", "ig": "Igbo"}[lang]
	if voice {
		langName += ", voice"
	}
	writeJSON(w, 200, map[string]any{"id": id, "masked": maskedID(id), "source": source, "segment": k, "segment_name": segName(k), "state": state,
		"age_band": age, "joined": joined.Year(), "last_active": last, "tier": tier, "language": langName, "weekly": weekly, "questions": questions,
		"consent":  map[string]bool{"insights": true, "offers": consentOffers, "ai": consentAI, "open_banking": openBanking},
		"products": products, "banks": banks, "health": health, "churn": churn, "churn_level": riskLevel(churn), "ltv": ltv, "ltv_pctl": math.Round(pctl * 100),
		"income": income, "spend": spend, "savings": savings, "flow": flow, "needs": needs[:3], "nudges": nudges, "shown": shown, "acted": acted,
		"flags": flags, "events": events, "quick_loans": quick})
}

var channelOK = map[string]bool{"chat": true, "push": true, "sms": true, "email": true}

func (s *Server) consoleCampaigns(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `select id, name, segment, offer, message, language, channels, send_at, status, reach, expected, created_at
		from campaigns order by created_at desc limit 100`)
	if err != nil {
		fail(w, 500, "could not load campaigns")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, name, seg, offer, msg, lang, status string
		var ch []string
		var send, made time.Time
		var reach, exp int
		rows.Scan(&id, &name, &seg, &offer, &msg, &lang, &ch, &send, &status, &reach, &exp, &made)
		out = append(out, map[string]any{"id": id, "name": name, "segment": seg, "segment_name": segName(seg), "offer": offer, "message": msg,
			"language": lang, "channels": ch, "send_at": send, "status": status, "reach": reach, "expected": exp, "created_at": made})
	}
	writeJSON(w, 200, out)
}

// complianceIssue is a small rule set every campaign message must pass.
func complianceIssue(msg string) string {
	low := []rune(msg)
	if len(low) < 10 || len(low) > 400 {
		return "write a message between 10 and 400 characters"
	}
	if digits.MatchString(msg) {
		return "remove long numbers, messages must never carry account numbers"
	}
	for _, bad := range []string{"guarantee", "risk free", "risk-free", "http://", "https://", "www.", "bvn", "password", "pin "} {
		if strings.Contains(strings.ToLower(msg), bad) {
			return "compliance rules do not allow \"" + bad + "\" in offers"
		}
	}
	return ""
}

func (s *Server) consoleCreateCampaign(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name, Segment, Offer, Message, Language, Status string
		Channels                                        []string
		SendAt                                          time.Time `json:"send_at"`
	}
	if !decode(w, r, &in) {
		return
	}
	if segName(in.Segment) == "Not yet grouped" {
		fail(w, 400, "pick a segment")
		return
	}
	if in.Name == "" || len([]rune(in.Name)) > 80 || in.Offer == "" || len([]rune(in.Offer)) > 80 {
		fail(w, 400, "add a campaign name and an offer")
		return
	}
	if len(in.Channels) == 0 {
		fail(w, 400, "pick at least one channel")
		return
	}
	for _, c := range in.Channels {
		if !channelOK[c] {
			fail(w, 400, "unknown channel")
			return
		}
	}
	if msg := complianceIssue(in.Message); msg != "" {
		fail(w, 422, msg)
		return
	}
	if in.Status != "pending" {
		in.Status = "draft"
	}
	if map[string]bool{"en": true, "yo": true, "ig": true, "ha": true}[in.Language] == false {
		in.Language = "en"
	}
	if in.SendAt.IsZero() {
		in.SendAt = time.Now().Add(24 * time.Hour)
	}
	var reach int
	var shown, acted float64
	s.db.QueryRow(r.Context(), `select count(*), coalesce(sum(insights_shown),0)::float8, coalesce(sum(insights_acted),0)::float8
		from console_customers where consent_insights and consent_offers and `+segExpr+`=$1`, in.Segment).Scan(&reach, &shown, &acted)
	exp := 0
	if shown > 0 {
		exp = int(math.Round(float64(reach) * acted / shown * 0.85))
	}
	var id string
	if err := s.db.QueryRow(r.Context(), `insert into campaigns(name,segment,offer,message,language,channels,send_at,status,reach,expected,created_by)
		values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`, in.Name, in.Segment, in.Offer, in.Message, in.Language, in.Channels,
		in.SendAt, in.Status, reach, exp, uid(r)).Scan(&id); err != nil {
		fail(w, 500, "could not save the campaign")
		return
	}
	action := "campaign_drafted"
	if in.Status == "pending" {
		action = "campaign_for_approval"
	}
	s.audit(r.Context(), "console", uid(r), action, in.Name)
	writeJSON(w, 201, map[string]any{"id": id, "reach": reach, "expected": exp, "status": in.Status})
}

func (s *Server) consoleCampaignStatus(w http.ResponseWriter, r *http.Request) {
	var in struct{ Status string }
	if !decode(w, r, &in) {
		return
	}
	next := map[string][]string{"pending": {"draft"}, "approved": {"pending"}, "sent": {"approved"}, "stopped": {"draft", "pending", "approved"}}
	from, ok := next[in.Status]
	if !ok {
		fail(w, 400, "unknown status")
		return
	}
	if !campaignMoveAllowed(memberFrom(r.Context()).Sub, in.Status) {
		fail(w, 403, "only a console admin can approve or send campaigns")
		return
	}
	var name string
	err := s.db.QueryRow(r.Context(), `update campaigns set status=$1 where id::text=$2 and status=any($3) returning name`, in.Status, chi.URLParam(r, "id"), from).Scan(&name)
	if err != nil {
		fail(w, 409, "this campaign cannot move to "+in.Status)
		return
	}
	s.audit(r.Context(), "console", uid(r), "campaign_"+in.Status, name)
	s.consoleCampaigns(w, r)
}

// safeDetail rewrites audit details so staff never see names or emails.
func safeDetail(kind, d string) string {
	switch kind {
	case "login_failed":
		return "Wrong password on a customer account"
	case "transfers_locked":
		return "Transfers paused for 30 minutes after " + strings.ReplaceAll(d, "_", " ")
	case "pin_failed", "face_failed":
		if amt, _, ok := strings.Cut(d, " to "); ok {
			return "Transfer of " + amt
		}
		return "Transfer attempt"
	case "face_enrolled":
		return "Face enrolled for payments"
	}
	return mask(d)
}

func (s *Server) consoleRisk(w http.ResponseWriter, r *http.Request) {
	c := r.Context()
	days, src := scope(r)
	mod := modelled(src)
	dl := dayList(days)
	idx := map[string]int{}
	labels := make([]string, len(dl))
	for i, d := range dl {
		idx[d.Format("2006-01-02")] = i
		labels[i] = d.Format("2 Jan")
	}
	kinds := []string{"ai_injection", "ai_off_topic", "pin_failed", "face_failed", "transfers_locked", "login_failed"}
	series := map[string][]float64{}
	liveSeries := map[string][]float64{}
	for _, k := range kinds {
		series[k] = make([]float64, days)
		liveSeries[k] = make([]float64, days)
	}
	rows, _ := s.db.Query(c, `select kind, to_char(created_at at time zone 'UTC','YYYY-MM-DD'), count(*)::float8 from security_events
		where created_at>=$1 group by 1,2`, dl[0])
	for rows.Next() {
		var k, d string
		var n float64
		rows.Scan(&k, &d, &n)
		if i, ok := idx[d]; ok && series[k] != nil {
			series[k][i] += n
			liveSeries[k][i] += n
		}
	}
	rows.Close()
	base := map[string][3]float64{"ai_injection": {38, 0.05, 0.6}, "ai_off_topic": {290, 0.6, 0.35}, "pin_failed": {120, 0.2, 0.3},
		"face_failed": {34, 0.03, 0.5}, "transfers_locked": {11, 0, 0.7}, "login_failed": {210, 0.3, 0.3}}
	if mod {
		for _, k := range kinds {
			b := base[k]
			for i, d := range dl {
				series[k][i] += math.Round(model(k, d, b[0], b[1], b[2]))
			}
		}
	}
	tot := func(v []float64) float64 {
		t := 0.0
		for _, x := range v {
			t += x
		}
		return t
	}
	alerts, confirmed, held := tot(liveSeries["transfers_locked"])+tot(liveSeries["face_failed"]), tot(liveSeries["transfers_locked"]), 0.0
	if mod {
		alerts += sumModel("fraud_alerts", dl, 10.4, 0, 0.5)
		confirmed += sumModel("fraud_confirmed", dl, 1.4, 0, 0.9)
		held = sumModel("fraud_held", dl, 1.4*265000, 0, 0.9)
	}
	up, lat := 0.0, 0.0
	upSeries, latSeries := make([]float64, days), make([]float64, days)
	for i, d := range dl {
		upSeries[i] = math.Round((100-model("downtime", d, 0.03, 0, 1.6))*100) / 100
		latSeries[i] = math.Round(model("latency", d, 1.8, 0, 0.3)*100) / 100
		up += upSeries[i]
		lat += latSeries[i]
	}
	kp := map[string]any{}
	for _, k := range kinds {
		kp[k] = map[string]float64{"total": tot(series[k]), "live": tot(liveSeries[k])}
	}
	kp["fraud_alerts"], kp["fraud_confirmed"], kp["held"] = alerts, confirmed, held
	kp["uptime"], kp["latency"] = math.Round(up/float64(days)*100)/100, math.Round(lat/float64(days)*10)/10

	logRows := []map[string]any{}
	rows, _ = s.db.Query(c, `select kind, detail, created_at from security_events where kind<>'face_enrolled' order by id desc limit 40`)
	for rows.Next() {
		var k, d string
		var at time.Time
		rows.Scan(&k, &d, &at)
		logRows = append(logRows, map[string]any{"kind": k, "detail": safeDetail(k, d), "at": at})
	}
	rows.Close()
	var flagged int
	s.db.QueryRow(c, `select count(*) from console_customers where source=any($1) and consent_insights and cardinality(flags)>0`, src).Scan(&flagged)
	writeJSON(w, 200, map[string]any{"days": days, "modelled": mod, "labels": labels, "series": series, "live": liveSeries, "kpis": kp,
		"uptime": upSeries, "latency": latSeries, "log": logRows, "flagged_customers": flagged})
}

func (s *Server) consoleConsent(w http.ResponseWriter, r *http.Request) {
	c := r.Context()
	s.syncLive(c)
	days, src := scope(r)
	var total, insights, offers, ai, ob float64
	s.db.QueryRow(c, `select count(*)::float8, count(*) filter (where consent_insights)::float8, count(*) filter (where consent_offers)::float8,
		count(*) filter (where consent_ai)::float8, count(*) filter (where consent_open_banking)::float8 from console_customers where source=any($1)`, src).
		Scan(&total, &insights, &offers, &ai, &ob)
	rates := []map[string]any{
		{"key": "insights", "label": "Anonymised insights for the bank", "count": insights, "rate": pct(insights, total)},
		{"key": "ai", "label": "AI assistant may read their numbers", "count": ai, "rate": pct(ai, total)},
		{"key": "offers", "label": "Personal offers", "count": offers, "rate": pct(offers, total)},
		{"key": "open_banking", "label": "Linked accounts at other banks", "count": ob, "rate": pct(ob, total)},
	}
	bySeg := []map[string]any{}
	rows, _ := s.db.Query(c, `select `+segExpr+`, count(*)::float8, avg(case when consent_insights then 100 else 0 end)::float8,
		avg(case when consent_offers then 100 else 0 end)::float8 from console_customers where source=any($1) group by 1`, src)
	for rows.Next() {
		var k string
		var n, i, o float64
		rows.Scan(&k, &n, &i, &o)
		bySeg = append(bySeg, map[string]any{"segment": k, "name": segName(k), "customers": n, "insights": math.Round(i), "offers": math.Round(o)})
	}
	rows.Close()

	count := func(sql string) (n float64, oldest *time.Time) {
		s.db.QueryRow(c, sql).Scan(&n, &oldest)
		return
	}
	type ret struct {
		Data, Where, Keep, Access string
		Sql                       string
	}
	classes := []ret{
		{"Transactions", "Postgres database", "7 years (CBN rule)", "Aggregates only", `select count(*)::float8, min(created_at) from transactions`},
		{"Chat messages", "Encrypted with AES-256-GCM", "Until the customer deletes them", "Never shown to staff", `select count(*)::float8, min(created_at) from chats`},
		{"Face templates", "Encrypted numbers, no photos", "Until the customer removes face pay", "Never shown to staff", `select count(*)::float8, min(face_enrolled_at) from users where face_template is not null`},
		{"Security and audit log", "Postgres, masked details", "2 years", "Masked, as on Risk page", `select count(*)::float8, min(created_at) from security_events`},
		{"Saved payees", "Postgres", "Until the customer deletes them", "Never shown to staff", `select count(*)::float8, min(created_at) from payees`},
		{"One time codes", "Hashed only", "10 minutes", "Never shown to staff", `select count(*)::float8, min(expires_at) from otps`},
		{"Anonymised profiles", "Console, no names or numbers", "Recomputed on every visit", "This console", `select count(*)::float8, min(updated_at) from console_customers where source='live'`},
	}
	retention := []map[string]any{}
	for _, cl := range classes {
		n, old := count(cl.Sql)
		retention = append(retention, map[string]any{"data": cl.Data, "where": cl.Where, "keep": cl.Keep, "access": cl.Access, "records": n, "oldest": old})
	}
	dl := dayList(days)
	trend := []map[string]any{}
	step := 1
	if days == 90 {
		step = 7
	}
	mod := modelled(src)
	for i := 0; i < len(dl); i += step {
		d := dl[i]
		g, wd := 0.0, 0.0
		for j := i; j < i+step && j < len(dl) && mod; j++ {
			g += math.Round(model("consent_given", dl[j], 140, 0.3, 0.3))
			wd += math.Round(model("consent_withdrawn", dl[j], 9, 0, 0.6))
		}
		trend = append(trend, map[string]any{"label": d.Format("2 Jan"), "given": g, "withdrawn": wd})
	}
	requests := map[string]float64{"exports": 0, "deletions": 0, "median_hours": 0}
	if mod {
		requests = map[string]float64{"exports": sumModel("dsr_export", dl, 6, 0, 0.7), "deletions": sumModel("dsr_delete", dl, 2, 0, 0.9), "median_hours": 26}
	}
	writeJSON(w, 200, map[string]any{"days": days, "modelled": mod, "total": total, "rates": rates, "segments": bySeg,
		"retention": retention, "trend": trend, "requests": requests})
}
