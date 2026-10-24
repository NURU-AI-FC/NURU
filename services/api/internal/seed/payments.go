package seed

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
)

// payments tags the saved payees, adds two more beneficiaries and a monthly
// scheduled transfer so the Pay hub is populated for a new account.
func payments(ctx context.Context, tx pgx.Tx, userID string, now time.Time) error {
	if _, err := tx.Exec(ctx, `update payees set tag = case name when 'Mama Ngozi' then 'Family' when 'Tunde Bakare' then '' else 'Vendors' end,
		starred = name in ('Mama Ngozi','Tunde Bakare') where user_id=$1`, userID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `insert into payees(user_id,name,bank,account,tag) values
		($1,'Kemi Foods Ltd','Access Bank','1010940094','Business'),($1,'Chidi Okeke','Access Bank','0693313310','Family') on conflict do nothing`, userID); err != nil {
		return err
	}
	due := time.Date(now.Year(), now.Month(), 28, 9, 0, 0, 0, now.Location())
	if due.Before(now) {
		due = due.AddDate(0, 1, 0)
	}
	_, err := tx.Exec(ctx, `insert into reminders(user_id,title,kind,amount,due_at) values ($1,'Mama upkeep','transfer',30000,$2)`, userID, due)
	return err
}
