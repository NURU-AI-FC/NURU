package httpapi

import (
	"context"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

// monthBounds returns the first moment of the month holding t and of the next one.
func monthBounds(t time.Time) (time.Time, time.Time) {
	from := time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
	return from, from.AddDate(0, 1, 0)
}

// personal limits a transactions query aliased t to non-business accounts.
const personal = ` and exists (select 1 from accounts a where a.id=t.account_id and a.kind<>'business')`

type budget struct {
	ID       string  `json:"id"`
	Category string  `json:"category"`
	Limit    float64 `json:"limit"`
	Spent    float64 `json:"spent"`
	Pct      int     `json:"pct"`
}

func (s *Server) listBudgets(ctx context.Context, user string) ([]budget, error) {
	from, to := monthBounds(time.Now())
	rows, err := s.db.Query(ctx, `select b.id, b.category, b.monthly_limit::float8,
		coalesce((select sum(amount) from transactions t where t.user_id=b.user_id and t.direction='debit' and t.category=b.category and t.created_at>=$2 and t.created_at<$3`+personal+`),0)::float8
		from budgets b where b.user_id=$1 order by b.monthly_limit desc`, user, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []budget{}
	for rows.Next() {
		var b budget
		if err := rows.Scan(&b.ID, &b.Category, &b.Limit, &b.Spent); err != nil {
			return nil, err
		}
		b.Pct = int(math.Round(b.Spent / b.Limit * 100))
		out = append(out, b)
	}
	return out, rows.Err()
}

func (s *Server) budgets(w http.ResponseWriter, r *http.Request) {
	items, err := s.listBudgets(r.Context(), uid(r))
	if err != nil {
		fail(w, 500, "could not load budgets")
		return
	}
	now := time.Now()
	_, end := monthBounds(now)
	var limit, spent float64
	for _, b := range items {
		limit += b.Limit
		spent += b.Spent
	}
	// categories the user spends on but has not budgeted, for the add form
	rows, _ := s.db.Query(r.Context(), `select distinct category from transactions t where user_id=$1 and direction='debit' and created_at>now()-interval '6 months'`+personal+` order by 1`, uid(r))
	cats := []string{}
	for rows != nil && rows.Next() {
		var c string
		rows.Scan(&c)
		cats = append(cats, c)
	}
	if rows != nil {
		rows.Close()
	}
	writeJSON(w, 200, map[string]any{"month": now.Format("January"), "limit": limit, "spent": spent,
		"days_left": int(end.Sub(now).Hours()/24) + 1, "items": items, "categories": cats})
}

func (s *Server) addBudget(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Category string
		Limit    float64
	}
	if !decode(w, r, &in) {
		return
	}
	in.Category = strings.TrimSpace(in.Category)
	if in.Category == "" || in.Limit <= 0 || in.Limit > 100_000_000 {
		fail(w, 400, "pick a category and a monthly limit")
		return
	}
	if _, err := s.db.Exec(r.Context(), `insert into budgets(user_id,category,monthly_limit) values($1,$2,$3)
		on conflict (user_id,category) do update set monthly_limit=excluded.monthly_limit`, uid(r), in.Category, in.Limit); err != nil {
		fail(w, 500, "could not save the budget")
		return
	}
	s.budgets(w, r)
}

func (s *Server) updateBudget(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Category string
		Limit    float64
	}
	if !decode(w, r, &in) {
		return
	}
	if in.Limit < 0 || in.Limit > 100_000_000 {
		fail(w, 400, "check the limit")
		return
	}
	tag, err := s.db.Exec(r.Context(), `update budgets set monthly_limit=case when $3::numeric>0 then $3::numeric else monthly_limit end,
		category=coalesce(nullif($4,''),category) where id=$1 and user_id=$2`, chi.URLParam(r, "id"), uid(r), in.Limit, strings.TrimSpace(in.Category))
	if err != nil || tag.RowsAffected() == 0 {
		fail(w, 404, "budget not found")
		return
	}
	s.budgets(w, r)
}

func (s *Server) deleteBudget(w http.ResponseWriter, r *http.Request) {
	s.db.Exec(r.Context(), `delete from budgets where id=$1 and user_id=$2`, chi.URLParam(r, "id"), uid(r))
	s.budgets(w, r)
}

type contribution struct {
	ID     string    `json:"id"`
	Amount float64   `json:"amount"`
	Note   string    `json:"note"`
	At     time.Time `json:"at"`
}

type goal struct {
	ID            string         `json:"id"`
	Name          string         `json:"name"`
	Note          string         `json:"note"`
	Icon          string         `json:"icon"`
	Target        float64        `json:"target"`
	Saved         float64        `json:"saved"`
	Pct           int            `json:"pct"`
	DueAt         *time.Time     `json:"due_at"`
	AutoAmount    float64        `json:"auto_amount"`
	AutoDay       int            `json:"auto_day"`
	MonthlyNeeded float64        `json:"monthly_needed"`
	FinishAt      *time.Time     `json:"finish_at"`
	Contributions []contribution `json:"contributions"`
}

func (s *Server) listGoals(ctx context.Context, user string) ([]goal, error) {
	rows, err := s.db.Query(ctx, `select g.id,g.name,g.note,g.icon,g.target::float8,g.due_at::timestamptz,g.auto_amount::float8,g.auto_day,
		coalesce((select sum(amount) from goal_contributions c where c.goal_id=g.id),0)::float8
		from goals g where g.user_id=$1 order by g.created_at, g.name`, user)
	if err != nil {
		return nil, err
	}
	out := []goal{}
	idx := map[string]int{}
	now := time.Now()
	for rows.Next() {
		var g goal
		if err := rows.Scan(&g.ID, &g.Name, &g.Note, &g.Icon, &g.Target, &g.DueAt, &g.AutoAmount, &g.AutoDay, &g.Saved); err != nil {
			rows.Close()
			return nil, err
		}
		g.Pct = int(math.Min(100, math.Round(g.Saved/g.Target*100)))
		left := math.Max(0, g.Target-g.Saved)
		if g.DueAt != nil {
			months := math.Max(1, g.DueAt.Sub(now).Hours()/24/30.4)
			g.MonthlyNeeded = math.Round(left/months/50) * 50
		}
		if g.AutoAmount > 0 && left > 0 {
			f := now.AddDate(0, int(math.Ceil(left/g.AutoAmount)), 0)
			g.FinishAt = &f
		}
		g.Contributions = []contribution{}
		idx[g.ID] = len(out)
		out = append(out, g)
	}
	rows.Close()
	if len(out) == 0 {
		return out, rows.Err()
	}
	rows, err = s.db.Query(ctx, `select c.goal_id,c.id,c.amount::float8,c.note,c.created_at from goal_contributions c join goals g on g.id=c.goal_id
		where g.user_id=$1 order by c.created_at desc`, user)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var gid string
		var c contribution
		if err := rows.Scan(&gid, &c.ID, &c.Amount, &c.Note, &c.At); err != nil {
			return nil, err
		}
		if i, ok := idx[gid]; ok && len(out[i].Contributions) < 24 {
			out[i].Contributions = append(out[i].Contributions, c)
		}
	}
	return out, rows.Err()
}

func (s *Server) goals(w http.ResponseWriter, r *http.Request) {
	g, err := s.listGoals(r.Context(), uid(r))
	if err != nil {
		fail(w, 500, "could not load goals")
		return
	}
	writeJSON(w, 200, g)
}

type goalIn struct {
	Name, Note, Icon string
	Target           *float64
	Due              string   `json:"due_at"`
	AutoAmount       *float64 `json:"auto_amount"`
	AutoDay          *int     `json:"auto_day"`
	Contribute       float64  `json:"contribute"`
}

func (in goalIn) valid() bool {
	return (in.Target == nil || *in.Target > 0 && *in.Target <= 1_000_000_000) &&
		(in.AutoAmount == nil || *in.AutoAmount >= 0 && *in.AutoAmount <= 100_000_000) &&
		(in.AutoDay == nil || *in.AutoDay >= 0 && *in.AutoDay <= 31) && math.Abs(in.Contribute) <= 1_000_000_000
}

func val[T any](p *T) T {
	var z T
	if p == nil {
		return z
	}
	return *p
}

func (in goalIn) due() (*time.Time, bool) {
	if in.Due == "" {
		return nil, true
	}
	t, err := time.Parse("2006-01-02", in.Due[:min(10, len(in.Due))])
	if err != nil {
		return nil, false
	}
	return &t, true
}

func (s *Server) addGoal(w http.ResponseWriter, r *http.Request) {
	var in goalIn
	if !decode(w, r, &in) {
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	due, ok := in.due()
	if in.Name == "" || in.Target == nil || !in.valid() || !ok || in.Contribute < 0 {
		fail(w, 400, "add a name and a target amount")
		return
	}
	if in.Icon == "" {
		in.Icon = "target"
	}
	var id string
	if err := s.db.QueryRow(r.Context(), `insert into goals(user_id,name,note,icon,target,due_at,auto_amount,auto_day) values($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
		uid(r), in.Name, strings.TrimSpace(in.Note), in.Icon, *in.Target, due, val(in.AutoAmount), val(in.AutoDay)).Scan(&id); err != nil {
		fail(w, 500, "could not save the goal")
		return
	}
	if in.Contribute > 0 {
		s.db.Exec(r.Context(), `insert into goal_contributions(goal_id,amount,note) values($1,$2,'First deposit')`, id, in.Contribute)
	}
	s.goals(w, r)
}

// updateGoal edits the fields that are set and, with contribute, records money
// added to (or, when negative, taken out of) the goal.
func (s *Server) updateGoal(w http.ResponseWriter, r *http.Request) {
	var in goalIn
	if !decode(w, r, &in) {
		return
	}
	due, ok := in.due()
	if !ok || !in.valid() {
		fail(w, 400, "check the goal details")
		return
	}
	id := chi.URLParam(r, "id")
	tag, err := s.db.Exec(r.Context(), `update goals set name=coalesce(nullif($3,''),name), note=coalesce(nullif($4,''),note), icon=coalesce(nullif($5,''),icon),
		target=coalesce($6::numeric,target), due_at=coalesce($7::date,due_at),
		auto_amount=coalesce($8::numeric,auto_amount), auto_day=coalesce($9::int,auto_day)
		where id=$1 and user_id=$2`, id, uid(r), strings.TrimSpace(in.Name), strings.TrimSpace(in.Note), in.Icon, in.Target, due, in.AutoAmount, in.AutoDay)
	if err != nil || tag.RowsAffected() == 0 {
		fail(w, 404, "goal not found")
		return
	}
	if in.Contribute != 0 {
		note := "Added"
		if in.Contribute < 0 {
			note = "Withdrawn"
		}
		s.db.Exec(r.Context(), `insert into goal_contributions(goal_id,amount,note) values($1,$2,$3)`, id, in.Contribute, note)
	}
	s.goals(w, r)
}

func (s *Server) deleteGoal(w http.ResponseWriter, r *http.Request) {
	s.db.Exec(r.Context(), `delete from goals where id=$1 and user_id=$2`, chi.URLParam(r, "id"), uid(r))
	s.goals(w, r)
}
