package httpapi

import (
	"context"
	"errors"
	"hash/fnv"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

var errFunds = errors.New("not enough money in this account")

// book records a sandbox movement on one of the user's own accounts inside tx
// and keeps the balance in step. Debits fail when the balance is too low.
func book(ctx context.Context, tx pgx.Tx, user, acct, dir string, amt float64, cat, merchant, note string) error {
	var bal float64
	if err := tx.QueryRow(ctx, `select balance::float8 from accounts where id=$1 and user_id=$2 for update`, acct, user).Scan(&bal); err != nil {
		return err
	}
	delta := amt
	if dir == "debit" {
		if bal < amt {
			return errFunds
		}
		delta = -amt
	}
	if _, err := tx.Exec(ctx, `update accounts set balance=balance+$1 where id=$2`, delta, acct); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `insert into transactions(user_id,account_id,direction,amount,category,merchant,narration,created_at) values($1,$2,$3,$4,$5,$6,$7,now())`,
		user, acct, dir, amt, cat, merchant, note)
	return err
}

// mainAccount is the personal account money moves through, Zenith first.
func (s *Server) mainAccount(ctx context.Context, user string) (string, error) {
	var id string
	err := s.db.QueryRow(ctx, `select id from accounts where user_id=$1 and kind<>'business' order by bank<>'Zenith Bank', kind<>'savings' limit 1`, user).Scan(&id)
	return id, err
}

func (s *Server) bizAccount(ctx context.Context, user string) (string, string, error) {
	var id, num string
	err := s.db.QueryRow(ctx, `select id, number_masked from accounts where user_id=$1 and kind='business' order by name limit 1`, user).Scan(&id, &num)
	return id, num, err
}

func moveFail(w http.ResponseWriter, err error) {
	if errors.Is(err, errFunds) {
		fail(w, 400, errFunds.Error())
		return
	}
	fail(w, 500, "could not move the money, try again")
}

// ---- Loans ----

type instalment struct {
	N         int       `json:"n"`
	Due       time.Time `json:"due_at"`
	Payment   float64   `json:"payment"`
	Interest  float64   `json:"interest"`
	Principal float64   `json:"principal"`
	Balance   float64   `json:"balance"`
	Status    string    `json:"status"`
}

type loanOut struct {
	ID          string       `json:"id"`
	Lender      string       `json:"lender"`
	Principal   float64      `json:"principal"`
	RatePct     float64      `json:"rate_pct"`
	Months      int          `json:"months"`
	Disbursed   time.Time    `json:"disbursed_at"`
	NextDue     time.Time    `json:"next_due_at"`
	FinalDue    time.Time    `json:"final_due_at"`
	Monthly     float64      `json:"monthly"`
	Balance     float64      `json:"balance"`
	Outstanding float64      `json:"outstanding_principal"`
	Paid        int          `json:"paid_instalments"`
	Interest    float64      `json:"total_interest"`
	Schedule    []instalment `json:"schedule,omitempty"`
}

// amortise builds a fixed payment schedule from an annual rate. Instalments
// before next_due are paid; the one on next_due is due.
func amortise(p, ratePct float64, months int, disbursed, next time.Time) loanOut {
	r := ratePct / 1200
	pay := p / float64(months)
	if r > 0 {
		pay = p * r / (1 - math.Pow(1+r, -float64(months)))
	}
	pay = math.Round(pay)
	paid := int(math.Round(next.Sub(disbursed).Hours()/24/30.44)) - 1
	paid = max(0, min(paid, months))
	out := loanOut{Principal: p, RatePct: ratePct, Months: months, Disbursed: disbursed, NextDue: next, Monthly: pay, Paid: paid}
	bal := p
	for k := 1; k <= months; k++ {
		in := math.Round(bal * r)
		pr := pay - in
		if k == months {
			pr = bal
		}
		bal = math.Max(0, bal-pr)
		st := "upcoming"
		if k <= paid {
			st = "paid"
		} else if k == paid+1 {
			st = "due"
		}
		due := next.AddDate(0, k-paid-1, 0)
		out.Schedule = append(out.Schedule, instalment{k, due, in + pr, in, pr, bal, st})
		out.Interest += in
		if st != "paid" {
			out.Balance += in + pr
		} else {
			out.Outstanding = bal
		}
		out.FinalDue = due
	}
	if paid == 0 {
		out.Outstanding = p
	}
	return out
}

func (s *Server) loadLoans(ctx context.Context, user, id string) ([]loanOut, error) {
	rows, err := s.db.Query(ctx, `select id,lender,principal::float8,rate_pct::float8,months,disbursed_at,next_due_at from loans where user_id=$1 and ($2='' or id::text=$2) order by next_due_at`, user, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []loanOut{}
	for rows.Next() {
		var lid, lender string
		var p, rate float64
		var months int
		var disb, next time.Time
		if err := rows.Scan(&lid, &lender, &p, &rate, &months, &disb, &next); err != nil {
			return nil, err
		}
		l := amortise(p, rate, months, disb, next)
		l.ID, l.Lender = lid, lender
		out = append(out, l)
	}
	return out, rows.Err()
}

func (s *Server) loans(w http.ResponseWriter, r *http.Request) {
	ls, err := s.loadLoans(r.Context(), uid(r), "")
	if err != nil {
		fail(w, 500, "could not load loans")
		return
	}
	for i := range ls {
		ls[i].Schedule = nil
	}
	writeJSON(w, 200, ls)
}

func (s *Server) loan(w http.ResponseWriter, r *http.Request) {
	ls, err := s.loadLoans(r.Context(), uid(r), chi.URLParam(r, "id"))
	if err != nil || len(ls) == 0 {
		fail(w, 404, "loan not found")
		return
	}
	writeJSON(w, 200, ls[0])
}

// eligibility estimates how much more the user could borrow, keeping all
// loan repayments under a third of monthly income. Sandbox only.
func (s *Server) eligibility(w http.ResponseWriter, r *http.Request) {
	var income float64
	var months int
	s.db.QueryRow(r.Context(), `select coalesce(sum(t.amount),0)::float8, count(distinct date_trunc('month',t.created_at))::int from transactions t join accounts a on a.id=t.account_id
		where t.user_id=$1 and a.kind<>'business' and t.direction='credit' and t.category='Salary' and t.created_at>=date_trunc('month',now())-interval '6 months' and t.created_at<date_trunc('month',now())`, uid(r)).Scan(&income, &months)
	if months > 0 {
		income /= float64(months)
	}
	ls, _ := s.loadLoans(r.Context(), uid(r), "")
	existing := 0.0
	for _, l := range ls {
		if l.Balance > 0 {
			existing += l.Monthly
		}
	}
	const rate = 2.5
	headroom := math.Max(0, income*0.33-existing)
	q := rate / 100
	limit := headroom * (1 - math.Pow(1+q, -12)) / q
	limit = math.Min(5_000_000, math.Floor(limit/10000)*10000)
	writeJSON(w, 200, map[string]any{"income": math.Round(income), "salary_months": months, "existing_monthly": existing, "limit": limit,
		"rate_monthly": rate, "terms": []int{3, 6, 12}, "healthy_pct": 30, "sandbox": true})
}

// ---- Refunds and disputes ----

var disputeLabel = map[string]string{"review": "In review", "investigating": "Bank investigating", "refunded": "Refunded", "reversed": "Reversed", "declined": "Declined"}

func (s *Server) disputes(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `select d.id, d.title, d.reason, d.detail, d.amount::float8, d.status, d.created_at, coalesce(t.created_at, d.created_at)
		from disputes d left join transactions t on t.id=d.transaction_id where d.user_id=$1 order by d.status in ('refunded','reversed','declined'), d.created_at desc`, uid(r))
	if err != nil {
		fail(w, 500, "could not load claims")
		return
	}
	defer rows.Close()
	items := []map[string]any{}
	var refunded, open float64
	var nRefunded, nOpen int
	year := time.Date(time.Now().Year(), 1, 1, 0, 0, 0, 0, time.Local)
	for rows.Next() {
		var id, title, reason, detail, status string
		var amt float64
		var at, txAt time.Time
		rows.Scan(&id, &title, &reason, &detail, &amt, &status, &at, &txAt)
		switch status {
		case "review", "investigating":
			open += amt
			nOpen++
		case "refunded", "reversed":
			if at.After(year) {
				refunded += amt
				nRefunded++
			}
		}
		items = append(items, map[string]any{"id": id, "title": title, "reason": reason, "detail": detail, "amount": amt, "status": status,
			"label": disputeLabel[status], "created_at": at, "paid_at": txAt})
	}
	writeJSON(w, 200, map[string]any{"items": items, "refunded": refunded, "refunded_count": nRefunded, "open": open, "open_count": nOpen})
}

func (s *Server) addDispute(w http.ResponseWriter, r *http.Request) {
	var in struct {
		TransactionID string `json:"transaction_id"`
		Reason        string
		Detail        string
	}
	if !decode(w, r, &in) {
		return
	}
	in.Reason, in.Detail = strings.TrimSpace(in.Reason), strings.TrimSpace(in.Detail)
	if in.Reason == "" || len(in.Detail) > 500 {
		fail(w, 400, "choose what went wrong")
		return
	}
	var merchant string
	var amt float64
	if err := s.db.QueryRow(r.Context(), `select merchant, amount::float8 from transactions where id::text=$1 and user_id=$2 and direction='debit'`, in.TransactionID, uid(r)).Scan(&merchant, &amt); err != nil {
		fail(w, 404, "pick one of your payments")
		return
	}
	tag, err := s.db.Exec(r.Context(), `insert into disputes(user_id,transaction_id,title,reason,detail,amount) values($1,$2,$3,$4,$5,$6) on conflict do nothing`,
		uid(r), in.TransactionID, merchant, in.Reason, in.Detail, amt)
	if err != nil {
		fail(w, 500, "could not open the claim")
		return
	}
	if tag.RowsAffected() == 0 {
		fail(w, 409, "this payment already has a claim")
		return
	}
	s.event(r.Context(), uid(r), "dispute_opened", naira(amt)+" "+merchant)
	s.db.Exec(r.Context(), `insert into support_tickets(ref,user_id,kind,subject,transaction_id,dispute_id)
		select '',user_id,'dispute',reason,transaction_id,id from disputes where transaction_id::text=$1 and user_id=$2`, in.TransactionID, uid(r))
	s.disputes(w, r)
}

// ---- Fixed deposits ----

func depositRate(days int) float64 {
	switch {
	case days >= 365:
		return 19
	case days >= 180:
		return 18
	case days >= 90:
		return 16
	}
	return 14
}

func (s *Server) deposits(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `select id, principal::float8, rate_pct::float8, days, started_at, rollover, status, coalesce(payout,0)::float8, closed_at
		from fixed_deposits where user_id=$1 order by status<>'active', started_at desc`, uid(r))
	if err != nil {
		fail(w, 500, "could not load deposits")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, status string
		var p, rate, payout float64
		var days int
		var start time.Time
		var roll bool
		var closed *time.Time
		rows.Scan(&id, &p, &rate, &days, &start, &roll, &status, &payout, &closed)
		d := depositMath(p, rate, days, start)
		d["id"], d["rollover"], d["status"], d["payout"], d["closed_at"] = id, roll, status, payout, closed
		out = append(out, d)
	}
	writeJSON(w, 200, map[string]any{"items": out, "rates": map[int]float64{30: 14, 90: 16, 180: 18, 365: 19}, "wht_pct": 10, "break_pct": 30})
}

func depositMath(p, rate float64, days int, start time.Time) map[string]any {
	end := start.AddDate(0, 0, days)
	elapsed := math.Min(float64(days), math.Max(0, time.Since(start).Hours()/24))
	total := math.Round(p * rate / 100 * float64(days) / 365)
	sofar := math.Round(p * rate / 100 * elapsed / 365)
	return map[string]any{"principal": p, "rate_pct": rate, "days": days, "started_at": start, "matures_at": end,
		"interest": total, "interest_so_far": sofar, "wht": math.Round(total * 0.1), "wht_so_far": math.Round(sofar * 0.1),
		"receive": p + total - math.Round(total*0.1), "pct": math.Round(elapsed / float64(days) * 100), "break_cost": math.Round(sofar * 0.3)}
}

func (s *Server) addDeposit(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Amount float64
		Days   int
	}
	if !decode(w, r, &in) {
		return
	}
	if in.Amount < 10000 || in.Amount > 50_000_000 || (in.Days != 30 && in.Days != 90 && in.Days != 180 && in.Days != 365) {
		fail(w, 400, "deposit at least ₦10,000 for 30, 90, 180 or 365 days")
		return
	}
	acct, err := s.mainAccount(r.Context(), uid(r))
	if err != nil {
		fail(w, 404, "no account to fund it from")
		return
	}
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		fail(w, 500, "try again")
		return
	}
	defer tx.Rollback(r.Context())
	if err := book(r.Context(), tx, uid(r), acct, "debit", in.Amount, "Savings", "Zenith fixed deposit", strconv.Itoa(in.Days)+" day deposit"); err != nil {
		moveFail(w, err)
		return
	}
	tx.Exec(r.Context(), `insert into fixed_deposits(user_id,principal,rate_pct,days) values($1,$2,$3,$4)`, uid(r), in.Amount, depositRate(in.Days), in.Days)
	if err := tx.Commit(r.Context()); err != nil {
		fail(w, 500, "try again")
		return
	}
	s.deposits(w, r)
}

// withdrawDeposit pays out early at 70% of interest earned, or in full at maturity.
func (s *Server) withdrawDeposit(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	acct, err := s.mainAccount(ctx, uid(r))
	if err != nil {
		fail(w, 404, "no account to pay into")
		return
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		fail(w, 500, "try again")
		return
	}
	defer tx.Rollback(ctx)
	var p, rate float64
	var days int
	var start time.Time
	if err := tx.QueryRow(ctx, `select principal::float8, rate_pct::float8, days, started_at from fixed_deposits where id::text=$1 and user_id=$2 and status='active' for update`,
		chi.URLParam(r, "id"), uid(r)).Scan(&p, &rate, &days, &start); err != nil {
		fail(w, 404, "deposit not found")
		return
	}
	d := depositMath(p, rate, days, start)
	interest := d["interest_so_far"].(float64)
	if d["pct"].(float64) < 100 {
		interest *= 0.7
	}
	payout := math.Round(p + interest*0.9)
	if err := book(ctx, tx, uid(r), acct, "credit", payout, "Savings", "Zenith fixed deposit", "Deposit withdrawn"); err != nil {
		moveFail(w, err)
		return
	}
	tx.Exec(ctx, `update fixed_deposits set status='closed', payout=$1, closed_at=now() where id::text=$2`, payout, chi.URLParam(r, "id"))
	if err := tx.Commit(ctx); err != nil {
		fail(w, 500, "try again")
		return
	}
	s.deposits(w, r)
}

// ---- Pension ----

func (s *Server) pension(w http.ResponseWriter, r *http.Request) {
	var name string
	var bal float64
	if err := s.db.QueryRow(r.Context(), `select name, value::float8 from investments where user_id=$1 and kind='pension' order by value desc limit 1`, uid(r)).Scan(&name, &bal); err != nil {
		writeJSON(w, 200, map[string]any{"enabled": false})
		return
	}
	rows, err := s.db.Query(r.Context(), `select month, employer::float8, employee::float8 from pension_contributions where user_id=$1 order by month desc limit 6`, uid(r))
	if err != nil {
		fail(w, 500, "could not load pension")
		return
	}
	type c struct {
		Month    string  `json:"month"`
		Employer float64 `json:"employer"`
		Employee float64 `json:"employee"`
	}
	list := []c{}
	var employer, employee float64
	var missed []map[string]any
	for rows.Next() {
		var m time.Time
		var x c
		rows.Scan(&m, &x.Employer, &x.Employee)
		x.Month = m.Format("Jan")
		list = append([]c{x}, list...)
		employer, employee = math.Max(employer, x.Employer), math.Max(employee, x.Employee)
	}
	rows.Close()
	for _, x := range list {
		if x.Employer == 0 && employer > 0 {
			missed = append(missed, map[string]any{"month": x.Month, "amount": employer})
		}
	}
	// a 35 year old retiring at 60, returns 4% a year above inflation, in today's money
	const age, retire = 35, 60
	n := float64((retire - age) * 12)
	g := 0.04 / 12
	f := math.Pow(1+g, n)
	annuity := (f - 1) / g
	at60 := bal*f + (employer+employee)*annuity
	h := fnv.New32a()
	h.Write([]byte(uid(r)))
	writeJSON(w, 200, map[string]any{"enabled": true, "provider": strings.TrimSuffix(name, " Pension"), "name": name, "balance": bal,
		"pin": "PEN100" + strconv.Itoa(int(h.Sum32()%1_000_000)+100000), "fund": "RSA Fund II", "contributions": list,
		"employer": employer, "employee": employee, "missed": missed,
		"age": age, "retire_age": retire, "real_return_pct": 4, "at_retirement": math.Round(at60/100000) * 100000,
		"voluntary": 10000, "voluntary_adds": math.Round(10000*annuity/100000) * 100000})
}

// ---- Insurance ----

func (s *Server) insurance(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `select id, kind, provider, plan, policy_no, cover::float8, premium::float8, excess::float8, renews_at from insurance_policies where user_id=$1 order by renews_at`, uid(r))
	if err != nil {
		fail(w, 500, "could not load policies")
		return
	}
	policies := []map[string]any{}
	var cover, due float64
	hasLife := false
	for rows.Next() {
		var id, kind, prov, plan, no string
		var cv, prem, exc float64
		var renews time.Time
		rows.Scan(&id, &kind, &prov, &plan, &no, &cv, &prem, &exc, &renews)
		status := "active"
		if time.Until(renews) < 30*24*time.Hour {
			status = "due"
		}
		cover += cv
		due += prem
		hasLife = hasLife || kind == "life"
		policies = append(policies, map[string]any{"id": id, "kind": kind, "provider": prov, "plan": plan, "policy_no": no, "cover": cv,
			"premium": prem, "excess": exc, "renews_at": renews, "status": status})
	}
	rows.Close()
	claims := []map[string]any{}
	rows, err = s.db.Query(r.Context(), `select c.id, p.kind, p.provider, c.description, c.amount::float8, c.status, c.created_at from insurance_claims c join insurance_policies p on p.id=c.policy_id where c.user_id=$1 order by c.created_at desc`, uid(r))
	if err == nil {
		for rows.Next() {
			var id, kind, prov, desc, st string
			var amt float64
			var at time.Time
			rows.Scan(&id, &kind, &prov, &desc, &amt, &st, &at)
			claims = append(claims, map[string]any{"id": id, "kind": kind, "provider": prov, "description": desc, "amount": amt, "status": st, "created_at": at})
		}
		rows.Close()
	}
	out := map[string]any{"policies": policies, "covered": cover, "premiums_due": due, "claims": claims}
	if !hasLife {
		out["gap"] = map[string]any{"kind": "life", "dependants": 2, "cover": 10_000_000, "monthly": 4200}
	}
	writeJSON(w, 200, out)
}

func (s *Server) addClaim(w http.ResponseWriter, r *http.Request) {
	var in struct {
		PolicyID    string `json:"policy_id"`
		Description string
		Amount      float64
		Photos      int
	}
	if !decode(w, r, &in) {
		return
	}
	in.Description = strings.TrimSpace(in.Description)
	if in.Description == "" || len(in.Description) > 1000 || in.Amount <= 0 || in.Amount > 100_000_000 {
		fail(w, 400, "say what happened and the estimated cost")
		return
	}
	var id string
	err := s.db.QueryRow(r.Context(), `insert into insurance_claims(user_id,policy_id,description,amount,photos)
		select $1, id, $3, $4, $5 from insurance_policies where id::text=$2 and user_id=$1 returning id`, uid(r), in.PolicyID, in.Description, in.Amount, max(0, min(in.Photos, 10))).Scan(&id)
	if err != nil {
		fail(w, 404, "policy not found")
		return
	}
	writeJSON(w, 201, map[string]any{"id": id, "reference": "CLM-" + strings.ToUpper(id[:8]), "status": "submitted", "sandbox": true})
}

// ---- Savings vaults ----

func (s *Server) vaults(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `select id, name, balance::float8, target::float8, rate_pct::float8, note, unlocks_at from vaults where user_id=$1 order by created_at, name`, uid(r))
	if err != nil {
		fail(w, 500, "could not load vaults")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	total, earn := 0.0, 0.0
	for rows.Next() {
		var id, name, note string
		var bal, target, rate float64
		var unlocks *time.Time
		rows.Scan(&id, &name, &bal, &target, &rate, &note, &unlocks)
		locked := unlocks != nil && unlocks.After(time.Now())
		total += bal
		earn += bal * rate
		out = append(out, map[string]any{"id": id, "name": name, "balance": bal, "target": target, "rate_pct": rate, "note": note, "unlocks_at": unlocks, "locked": locked})
	}
	rate := 0.0
	if total > 0 {
		rate = math.Round(earn/total*10) / 10
	}
	var auto float64
	s.db.QueryRow(r.Context(), `select coalesce(max(amount),0)::float8 from transactions where user_id=$1 and category='Savings' and narration='Auto save' and created_at>now()-interval '45 days'`, uid(r)).Scan(&auto)
	writeJSON(w, 200, map[string]any{"vaults": out, "total": total, "rate_pct": rate, "auto_save": auto})
}

func (s *Server) addVault(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name   string
		Target float64
		Months int
	}
	if !decode(w, r, &in) {
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" || len(in.Name) > 60 || in.Target < 0 || in.Months < 0 || in.Months > 60 {
		fail(w, 400, "give the vault a name")
		return
	}
	var unlocks *time.Time
	rate, note := 10.0, "Flexible"
	if in.Months > 0 {
		t := time.Now().AddDate(0, in.Months, 0)
		unlocks, rate, note = &t, 12+math.Min(3, float64(in.Months)/8), "Locked for "+strconv.Itoa(in.Months)+" months"
	}
	s.db.Exec(r.Context(), `insert into vaults(user_id,name,target,rate_pct,note,unlocks_at) values($1,$2,$3,$4,$5,$6)`, uid(r), in.Name, in.Target, math.Round(rate*10)/10, note, unlocks)
	s.vaults(w, r)
}

// moveVault moves money between the main account and a vault as an internal transfer.
func (s *Server) moveVault(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Amount    float64
		Direction string
	}
	if !decode(w, r, &in) {
		return
	}
	if in.Amount <= 0 || in.Amount > 50_000_000 || (in.Direction != "in" && in.Direction != "out") {
		fail(w, 400, "enter an amount")
		return
	}
	ctx := r.Context()
	acct, err := s.mainAccount(ctx, uid(r))
	if err != nil {
		fail(w, 404, "no account to move from")
		return
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		fail(w, 500, "try again")
		return
	}
	defer tx.Rollback(ctx)
	var name string
	var bal float64
	var unlocks *time.Time
	if err := tx.QueryRow(ctx, `select name, balance::float8, unlocks_at from vaults where id::text=$1 and user_id=$2 for update`, chi.URLParam(r, "id"), uid(r)).Scan(&name, &bal, &unlocks); err != nil {
		fail(w, 404, "vault not found")
		return
	}
	dir, delta := "debit", in.Amount
	if in.Direction == "out" {
		if unlocks != nil && unlocks.After(time.Now()) {
			fail(w, 400, "this vault is locked until "+unlocks.Format("2 Jan 2006"))
			return
		}
		if bal < in.Amount {
			fail(w, 400, "the vault only has "+naira(bal))
			return
		}
		dir, delta = "credit", -in.Amount
	}
	if err := book(ctx, tx, uid(r), acct, dir, in.Amount, "Savings", "Vault, "+name, "Internal transfer"); err != nil {
		moveFail(w, err)
		return
	}
	tx.Exec(ctx, `update vaults set balance=balance+$1 where id::text=$2`, delta, chi.URLParam(r, "id"))
	if err := tx.Commit(ctx); err != nil {
		fail(w, 500, "try again")
		return
	}
	s.vaults(w, r)
}
