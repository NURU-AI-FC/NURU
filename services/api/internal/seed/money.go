package seed

import (
	"context"

	"github.com/jackc/pgx/v5"
)

// Money adds disputes, a fixed deposit, pension history, insurance, savings
// vaults and, for businesses, vendors, invoices and plan items. The rows come
// from nuru_seed_money in migration 014 so existing and new users match.
func Money(ctx context.Context, tx pgx.Tx, userID string) error {
	_, err := tx.Exec(ctx, `select nuru_seed_money($1)`, userID)
	return err
}
