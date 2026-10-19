package httpapi

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/NURU-AI-FC/nuru/services/api/internal/auth"
	"github.com/NURU-AI-FC/nuru/services/api/internal/email"
)

// slip is one month of pay for a staff member: PAYE estimated at 6.33%,
// pension 8% from the employee and 10% from the employer, NHF 2.5%.
type slip struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Role      string  `json:"role"`
	Gross     float64 `json:"gross"`
	Basic     float64 `json:"basic"`
	Housing   float64 `json:"housing"`
	Transport float64 `json:"transport"`
	PAYE      float64 `json:"paye"`
	Pension   float64 `json:"pension"`
	NHF       float64 `json:"nhf"`
	Net       float64 `json:"net"`
	Employer  float64 `json:"employer_pension"`
}

func payslip(g float64) slip {
	sl := slip{Gross: g, Basic: math.Round(g * 0.6), Housing: math.Round(g * 0.25), PAYE: math.Round(g * 0.0633),
		Pension: math.Round(g * 0.08), NHF: math.Round(g * 0.025), Employer: math.Round(g * 0.10)}
	sl.Transport = g - sl.Basic - sl.Housing
	sl.Net = g - sl.PAYE - sl.Pension - sl.NHF
	return sl
}

func (s *Server) staffSlips(ctx context.Context, user string) ([]slip, error) {
	rows, err := s.db.Query(ctx, `select id,name,role,gross::float8 from staff where user_id=$1 order by gross desc, name`, user)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []slip{}
	for rows.Next() {
		var id, n, role string
		var g float64
		if err := rows.Scan(&id, &n, &role, &g); err != nil {
			return nil, err
		}
		sl := payslip(g)
		sl.ID, sl.Name, sl.Role = id, n, role
		out = append(out, sl)
	}
	return out, rows.Err()
}

// payrollPaid says when this month's payroll left the business account, if it has.
func (s *Server) payrollPaid(ctx context.Context, user string) *time.Time {
	var at *time.Time
	s.db.QueryRow(ctx, `select max(ts) from (
		select created_at as ts from payroll_runs where user_id=$1 and month=date_trunc('month',now())::date
		union all select t.created_at from transactions t join accounts a on a.id=t.account_id
		where t.user_id=$1 and a.kind='business' and t.category='Payroll' and t.created_at>=date_trunc('month',now())) x`, user).Scan(&at)
	return at
}

// updateBusiness saves the setup form and opens a sandbox business account
// the first time.
func (s *Server) updateBusiness(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name, Type, RC, Customers string
		Staff                     int
		Sales                     float64
	}
	if !decode(w, r, &in) {
		return
	}
	in.Name, in.Type = strings.TrimSpace(in.Name), strings.TrimSpace(in.Type)
	in.RC, in.Customers = strings.TrimSpace(in.RC), strings.TrimSpace(in.Customers)
	if in.Name == "" || len(in.Name) > 80 || in.Type == "" || len(in.Type) > 60 || len(in.RC) > 20 || len(in.Customers) > 200 || in.Staff < 0 || in.Staff > 10000 || in.Sales < 0 || in.Sales > 1e12 {
		fail(w, 400, "add your business name and what kind of business it is")
		return
	}
	ctx := r.Context()
	if _, err := s.db.Exec(ctx, `update users set business_name=$1, business_type=$2, business_rc=$3, business_customers=$4, business_staff=$5, business_sales=$6 where id=$7`,
		in.Name, in.Type, in.RC, in.Customers, in.Staff, in.Sales, uid(r)); err != nil {
		fail(w, 500, "could not save your business")
		return
	}
	tag, _ := s.db.Exec(ctx, `update accounts set name=$1 where user_id=$2 and kind='business'`, in.Name, uid(r))
	if tag.RowsAffected() == 0 {
		s.db.Exec(ctx, `insert into accounts(user_id,bank,name,number_masked,kind,linked_via,balance) values($1,'Zenith Bank',$2,$3,'business','sandbox',0)`,
			uid(r), in.Name, fmt.Sprintf("•••• %04d", time.Now().UnixNano()%10000))
	}
	s.business(w, r)
}

func payrollTotals(staff []slip) map[string]float64 {
	t := map[string]float64{}
	for _, st := range staff {
		t["gross"] += st.Gross
		t["net"] += st.Net
		t["paye"] += st.PAYE
		t["pension_employee"] += st.Pension
		t["pension_employer"] += st.Employer
		t["nhf"] += st.NHF
	}
	t["total"] = t["gross"] + t["pension_employer"]
	return t
}

func (s *Server) payroll(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	staff, err := s.staffSlips(ctx, uid(r))
	if err != nil {
		fail(w, 500, "could not load payroll")
		return
	}
	var cash float64
	acct, number, _ := s.bizAccount(ctx, uid(r))
	s.db.QueryRow(ctx, `select coalesce(balance,0)::float8 from accounts where id::text=$1`, acct).Scan(&cash)
	t := payrollTotals(staff)
	now := time.Now()
	runs := []map[string]any{}
	rows, _ := s.db.Query(ctx, `select month, staff, total::float8, created_at from payroll_runs where user_id=$1 order by month desc limit 6`, uid(r))
	for rows.Next() {
		var m, at time.Time
		var n int
		var tot float64
		rows.Scan(&m, &n, &tot, &at)
		runs = append(runs, map[string]any{"month": m.Format("January 2006"), "staff": n, "total": tot, "at": at})
	}
	rows.Close()
	writeJSON(w, 200, map[string]any{"month": now.Format("January 2006"), "staff": staff, "totals": t, "cash": cash, "account": number,
		"after": cash - t["total"], "due_at": time.Date(now.Year(), now.Month(), 28, 9, 0, 0, 0, now.Location()), "paid_at": s.payrollPaid(ctx, uid(r)), "runs": runs})
}

// runPayroll pays this month's staff from the business account after the PIN.
func (s *Server) runPayroll(w http.ResponseWriter, r *http.Request) {
	var in struct{ PIN string }
	if !decode(w, r, &in) {
		return
	}
	ctx := r.Context()
	var pinHash string
	s.db.QueryRow(ctx, `select pin_hash from users where id=$1`, uid(r)).Scan(&pinHash)
	if pinHash == "" {
		fail(w, 428, "create a transaction PIN in Settings first")
		return
	}
	if ok, _ := auth.Verify(in.PIN, pinHash); !ok {
		s.event(ctx, uid(r), "pin_failed", "payroll")
		fail(w, 403, "wrong PIN")
		return
	}
	if s.payrollPaid(ctx, uid(r)) != nil {
		fail(w, 409, "this month's payroll is already paid")
		return
	}
	staff, err := s.staffSlips(ctx, uid(r))
	if err != nil || len(staff) == 0 {
		fail(w, 400, "add staff before running payroll")
		return
	}
	acct, _, err := s.bizAccount(ctx, uid(r))
	if err != nil {
		fail(w, 404, "no business account")
		return
	}
	t := payrollTotals(staff)
	month := time.Now().Format("January")
	tx, err := s.db.Begin(ctx)
	if err != nil {
		fail(w, 500, "try again")
		return
	}
	defer tx.Rollback(ctx)
	if err := book(ctx, tx, uid(r), acct, "debit", t["total"], "Payroll", "Staff payroll", month+" payroll, "+strconv.Itoa(len(staff))+" staff"); err != nil {
		moveFail(w, err)
		return
	}
	var id string
	if err := tx.QueryRow(ctx, `insert into payroll_runs(user_id,month,staff,gross,net,paye,pension_employee,pension_employer,nhf,total)
		values($1,date_trunc('month',now())::date,$2,$3,$4,$5,$6,$7,$8,$9) returning id`, uid(r), len(staff), t["gross"], t["net"], t["paye"],
		t["pension_employee"], t["pension_employer"], t["nhf"], t["total"]).Scan(&id); err != nil {
		fail(w, 409, "this month's payroll is already paid")
		return
	}
	if err := tx.Commit(ctx); err != nil {
		fail(w, 500, "try again")
		return
	}
	s.event(ctx, uid(r), "payroll_run", naira(t["total"]))
	writeJSON(w, 201, map[string]any{"id": id, "total": t["total"], "staff": len(staff), "reference": "PAY-" + strings.ToUpper(id[:8]), "sandbox": true})
}

func (s *Server) payslipOne(w http.ResponseWriter, r *http.Request) {
	staff, _ := s.staffSlips(r.Context(), uid(r))
	var name string
	s.db.QueryRow(r.Context(), `select business_name from users where id=$1`, uid(r)).Scan(&name)
	for _, st := range staff {
		if st.ID == chi.URLParam(r, "id") {
			writeJSON(w, 200, map[string]any{"slip": st, "business": name, "month": time.Now().Format("January 2006"), "ids": staffIDs(staff)})
			return
		}
	}
	fail(w, 404, "staff member not found")
}

func staffIDs(st []slip) []string {
	out := make([]string, len(st))
	for i, x := range st {
		out[i] = x.ID
	}
	return out
}

// ---- Vendors ----

func (s *Server) vendors(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `select id,name,note,amount::float8,due_at,paid_at from vendors where user_id=$1 order by paid_at is not null, due_at`, uid(r))
	if err != nil {
		fail(w, 500, "could not load vendors")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, n, note string
		var amt float64
		var due time.Time
		var paid *time.Time
		rows.Scan(&id, &n, &note, &amt, &due, &paid)
		out = append(out, map[string]any{"id": id, "name": n, "note": note, "amount": amt, "due_at": due, "paid_at": paid})
	}
	writeJSON(w, 200, out)
}

func (s *Server) addVendor(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name, Note string
		Amount     float64
		DueAt      time.Time `json:"due_at"`
	}
	if !decode(w, r, &in) {
		return
	}
	in.Name, in.Note = strings.TrimSpace(in.Name), strings.TrimSpace(in.Note)
	if in.Name == "" || len(in.Name) > 80 || len(in.Note) > 120 || in.Amount <= 0 || in.Amount > 1e9 || in.DueAt.IsZero() {
		fail(w, 400, "add a name, amount and due date")
		return
	}
	s.db.Exec(r.Context(), `insert into vendors(user_id,name,note,amount,due_at) values($1,$2,$3,$4,$5)`, uid(r), in.Name, in.Note, in.Amount, in.DueAt)
	s.vendors(w, r)
}

// payVendor pays a bill from the business account.
func (s *Server) payVendor(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	acct, _, err := s.bizAccount(ctx, uid(r))
	if err != nil {
		fail(w, 404, "no business account")
		return
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		fail(w, 500, "try again")
		return
	}
	defer tx.Rollback(ctx)
	var name, note string
	var amt float64
	if err := tx.QueryRow(ctx, `select name,note,amount::float8 from vendors where id::text=$1 and user_id=$2 and paid_at is null for update`, chi.URLParam(r, "id"), uid(r)).Scan(&name, &note, &amt); err != nil {
		fail(w, 404, "bill not found or already paid")
		return
	}
	if err := book(ctx, tx, uid(r), acct, "debit", amt, "Supplies", name, note); err != nil {
		moveFail(w, err)
		return
	}
	tx.Exec(ctx, `update vendors set paid_at=now() where id::text=$1`, chi.URLParam(r, "id"))
	if err := tx.Commit(ctx); err != nil {
		fail(w, 500, "try again")
		return
	}
	s.vendors(w, r)
}

// ---- Invoices ----

func (s *Server) invoices(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `select id,number,customer,amount::float8,issued_at,due_at,paid_at from invoices where user_id=$1
		order by paid_at is not null, due_at`, uid(r))
	if err != nil {
		fail(w, 500, "could not load invoices")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	var owed, overdue float64
	var nOwed, nOverdue int
	for rows.Next() {
		var id, num, cust string
		var amt float64
		var issued, due time.Time
		var paid *time.Time
		rows.Scan(&id, &num, &cust, &amt, &issued, &due, &paid)
		if paid == nil {
			owed += amt
			nOwed++
			if due.Before(time.Now()) {
				overdue += amt
				nOverdue++
			}
		}
		out = append(out, map[string]any{"id": id, "number": num, "customer": cust, "amount": amt, "issued_at": issued, "due_at": due, "paid_at": paid})
	}
	writeJSON(w, 200, map[string]any{"items": out, "owed": owed, "owed_count": nOwed, "overdue": overdue, "overdue_count": nOverdue})
}

func (s *Server) addInvoice(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Customer string
		Amount   float64
		DueAt    time.Time `json:"due_at"`
	}
	if !decode(w, r, &in) {
		return
	}
	in.Customer = strings.TrimSpace(in.Customer)
	if in.Customer == "" || len(in.Customer) > 80 || in.Amount <= 0 || in.Amount > 1e9 || in.DueAt.IsZero() {
		fail(w, 400, "add a customer, amount and due date")
		return
	}
	var n int
	s.db.QueryRow(r.Context(), `select coalesce(max(nullif(regexp_replace(number,'\D','','g'),'')::int),100) from invoices where user_id=$1`, uid(r)).Scan(&n)
	s.db.Exec(r.Context(), `insert into invoices(user_id,number,customer,amount,due_at) values($1,$2,$3,$4,$5)`, uid(r), fmt.Sprintf("INV-%04d", n+1), in.Customer, in.Amount, in.DueAt)
	s.invoices(w, r)
}

// payInvoice marks an invoice paid and books the money into the business account.
func (s *Server) payInvoice(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	acct, _, err := s.bizAccount(ctx, uid(r))
	if err != nil {
		fail(w, 404, "no business account")
		return
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		fail(w, 500, "try again")
		return
	}
	defer tx.Rollback(ctx)
	var num, cust string
	var amt float64
	if err := tx.QueryRow(ctx, `select number,customer,amount::float8 from invoices where id::text=$1 and user_id=$2 and paid_at is null for update`, chi.URLParam(r, "id"), uid(r)).Scan(&num, &cust, &amt); err != nil {
		fail(w, 404, "invoice not found or already paid")
		return
	}
	if err := book(ctx, tx, uid(r), acct, "credit", amt, "Sales", cust, num); err != nil {
		moveFail(w, err)
		return
	}
	tx.Exec(ctx, `update invoices set paid_at=now() where id::text=$1`, chi.URLParam(r, "id"))
	if err := tx.Commit(ctx); err != nil {
		fail(w, 500, "try again")
		return
	}
	s.sendEmail(uid(r), "", email.TransferReceived(email.Transfer{Amount: amt, Name: cust, From: "your business account", Reference: num, At: time.Now()}))
	s.invoices(w, r)
}

// ---- Plan ----

// bizMonths returns sales, costs and direct costs (ingredients and kitchen
// payroll) for the last n full months, oldest first.
func (s *Server) bizMonths(ctx context.Context, user string, n int) (sales, costs, supplies []float64) {
	rows, err := s.db.Query(ctx, `select coalesce(sum(t.amount) filter (where direction='credit'),0)::float8, coalesce(sum(t.amount) filter (where direction='debit'),0)::float8,
		coalesce(sum(t.amount) filter (where direction='debit' and category in ('Supplies','Payroll')),0)::float8
		from transactions t join accounts a on a.id=t.account_id where t.user_id=$1 and a.kind='business'
		and t.created_at>=date_trunc('month',now())-make_interval(months => $2) and t.created_at<date_trunc('month',now())
		group by date_trunc('month',t.created_at) order by date_trunc('month',t.created_at)`, user, n)
	if err != nil {
		return
	}
	defer rows.Close()
	for rows.Next() {
		var a, b, c float64
		rows.Scan(&a, &b, &c)
		sales, costs, supplies = append(sales, a), append(costs, b), append(supplies, c)
	}
	return
}

func (s *Server) businessPlan(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	rows, err := s.db.Query(ctx, `select id,kind,title,note,amount::float8,due_at from plan_items where user_id=$1 order by due_at`, uid(r))
	if err != nil {
		fail(w, 500, "could not load the plan")
		return
	}
	type item struct {
		ID     string    `json:"id"`
		Kind   string    `json:"kind"`
		Title  string    `json:"title"`
		Note   string    `json:"note"`
		Amount float64   `json:"amount"`
		DueAt  time.Time `json:"due_at"`
	}
	items := []item{}
	for rows.Next() {
		var it item
		rows.Scan(&it.ID, &it.Kind, &it.Title, &it.Note, &it.Amount, &it.DueAt)
		items = append(items, it)
	}
	rows.Close()
	var cash float64
	s.db.QueryRow(ctx, `select coalesce(sum(balance),0)::float8 from accounts where user_id=$1 and kind='business'`, uid(r)).Scan(&cash)
	sales, costs, _ := s.bizMonths(ctx, uid(r), 3)
	net := 0.0
	for i := range sales {
		net += sales[i] - costs[i]
	}
	if len(sales) > 0 {
		net /= float64(len(sales))
	}
	now := time.Now()
	first := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	points := []map[string]any{}
	bal, low := cash, cash
	for k := 1; k <= 12; k++ {
		start, end := first.AddDate(0, k, 0), first.AddDate(0, k+1, 0)
		bal += net
		for _, it := range items {
			if !it.DueAt.Before(start) && it.DueAt.Before(end) {
				bal += it.Amount
			}
		}
		low = math.Min(low, bal)
		points = append(points, map[string]any{"label": start.Format("Jan 06"), "cash": math.Round(bal)})
	}
	writeJSON(w, 200, map[string]any{"cash": cash, "monthly_net": math.Round(net), "lowest": math.Round(low), "end": math.Round(bal),
		"from": first.AddDate(0, 1, 0), "to": first.AddDate(0, 12, 0), "forecast": points, "items": items})
}

func (s *Server) addPlanItem(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Kind, Title, Note string
		Amount            float64
		DueAt             time.Time `json:"due_at"`
	}
	if !decode(w, r, &in) {
		return
	}
	in.Title, in.Note = strings.TrimSpace(in.Title), strings.TrimSpace(in.Note)
	kinds := map[string]bool{"insurance": true, "funding": true, "marketing": true, "meeting": true, "decision": true, "hiring": true, "other": true}
	if !kinds[in.Kind] {
		in.Kind = "other"
	}
	if in.Title == "" || len(in.Title) > 80 || len(in.Note) > 300 || math.Abs(in.Amount) > 1e10 || in.DueAt.IsZero() {
		fail(w, 400, "add a title and a date")
		return
	}
	s.db.Exec(r.Context(), `insert into plan_items(user_id,kind,title,note,amount,due_at) values($1,$2,$3,$4,$5,$6)`, uid(r), in.Kind, in.Title, in.Note, in.Amount, in.DueAt)
	s.businessPlan(w, r)
}

// investor drafts a one page summary for the next investor meeting.
func (s *Server) investor(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var name string
	s.db.QueryRow(ctx, `select business_name from users where id=$1`, uid(r)).Scan(&name)
	var meeting map[string]any
	var title string
	var due time.Time
	if s.db.QueryRow(ctx, `select title, due_at from reminders where user_id=$1 and kind='meeting' and not done and due_at>now()-interval '1 day' order by due_at limit 1`, uid(r)).Scan(&title, &due) == nil {
		meeting = map[string]any{"title": title, "due_at": due}
	}
	sales, costs, supplies := s.bizMonths(ctx, uid(r), 12)
	var rev, cost, sup float64
	for i := range sales {
		rev, cost, sup = rev+sales[i], cost+costs[i], sup+supplies[i]
	}
	margin, growth := 0.0, 0.0
	if rev > 0 {
		margin = math.Round((rev - sup) / rev * 100)
	}
	// compound monthly growth over the last six full months
	if n := len(sales); n >= 6 && sales[n-6] > 0 {
		growth = math.Round((math.Pow(sales[n-1]/sales[n-6], 1.0/5)-1)*1000) / 10
	}
	var ask float64
	var askNote string
	s.db.QueryRow(ctx, `select amount::float8, note from plan_items where user_id=$1 and kind='funding' and amount>0 order by due_at limit 1`, uid(r)).Scan(&ask, &askNote)
	var payroll float64
	s.db.QueryRow(ctx, `select coalesce(sum(gross),0)::float8 from staff where user_id=$1`, uid(r)).Scan(&payroll)
	qs := []string{}
	if rev > 0 {
		qs = append(qs, fmt.Sprintf("Ingredients and staff take %d%% of sales. What happens if food prices rise again?", int(math.Round(sup/rev*100))))
		qs = append(qs, fmt.Sprintf("Staff cost %s a month. How will you hire without hurting margin?", naira(payroll)))
	}
	if ask > 0 {
		qs = append(qs, "How will the "+naira(ask)+" be spent, and when does it pay back?")
	} else {
		qs = append(qs, "What would you do with new funding, and how fast would it pay back?")
	}
	writeJSON(w, 200, map[string]any{"business": name, "meeting": meeting, "revenue_12m": rev, "profit_12m": rev - cost, "gross_margin": margin,
		"monthly_growth": growth, "months": len(sales), "ask": ask, "ask_note": askNote, "equity_pct": 10, "questions": qs})
}
