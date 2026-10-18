package seed

import (
	"context"
	"math"
	"time"

	"github.com/jackc/pgx/v5"
)

// planning adds budgets, savings goals with a few months of contributions,
// and one recent unusual card payment for the alert screen.
func planning(ctx context.Context, tx pgx.Tx, userID, spendAcct string) error {
	if _, err := tx.Exec(ctx, `insert into budgets(user_id,category,monthly_limit) values
		($1,'Food',120000),($1,'Transport',60000),($1,'Data and power',45000),($1,'Shopping',60000),($1,'Entertainment',35000),($1,'Family',60000)
		on conflict do nothing`, userID); err != nil {
		return err
	}
	now := time.Now()
	month := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	goals := []struct {
		name, note, icon string
		target, share    float64
		months           int
		auto             float64
	}{
		{"Rent fund", "Half year rent", "building", 350000, 0.75, 3, 25000},
		{"Emergency fund", "3 months of expenses", "umbrella", 1200000, 0.46, 12, 20000},
		{"New laptop", "MacBook Air", "laptop", 1450000, 0.21, 6, 0},
		{"Japa fund", "Long term", "globe", 5000000, 0.03, 30, 15000},
	}
	for _, g := range goals {
		day := 0
		if g.auto > 0 {
			day = 26
		}
		var id string
		if err := tx.QueryRow(ctx, `insert into goals(user_id,name,note,icon,target,due_at,auto_amount,auto_day) values($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
			userID, g.name, g.note, g.icon, g.target, month.AddDate(0, g.months, 0), g.auto, day).Scan(&id); err != nil {
			return err
		}
		each := math.Round(g.target*g.share/4/50) * 50
		for ago := 0; ago < 4; ago++ {
			at := month.AddDate(0, -ago, 25)
			if at.After(now) {
				at = now
			}
			if _, err := tx.Exec(ctx, `insert into goal_contributions(goal_id,amount,note,created_at) values($1,$2,'Saved',$3)`, id, each, at); err != nil {
				return err
			}
		}
	}
	y := now.AddDate(0, 0, -1)
	at := time.Date(y.Year(), y.Month(), y.Day(), 14, 14, 0, 0, now.Location())
	if _, err := tx.Exec(ctx, `insert into transactions(user_id,account_id,direction,amount,category,merchant,narration,created_at)
		values($1,$2,'debit',85000,'Shopping','Slot Systems Ikeja','POS purchase',$3)`, userID, spendAcct, at); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `update accounts set balance=greatest(balance-85000, 20000) where id=$1`, spendAcct)
	return err
}
