package seed

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Bank is one institution the sandbox open banking flow can link.
type Bank struct {
	Name, Kind, Product string
}

var Banks = map[string]Bank{
	"Zenith Bank": {"Zenith Bank", "savings", "Savings"},
	"Access Bank": {"Access Bank", "savings", "Savings"},
	"GTBank":      {"GTBank", "current", "Current"},
	"First Bank":  {"First Bank", "savings", "Savings"},
	"UBA":         {"UBA", "savings", "Savings"},
	"Kuda":        {"Kuda", "current", "Spend"},
	"OPay":        {"OPay", "wallet", "Wallet"},
	"Moniepoint":  {"Moniepoint", "wallet", "Wallet"},
	"Demo Bank":   {"Demo Bank", "savings", "Savings"},
}

// Linked is the account a sandbox link created.
type Linked struct {
	ID       string  `json:"id"`
	Bank     string  `json:"bank"`
	Name     string  `json:"name"`
	Number   string  `json:"number"`
	Kind     string  `json:"kind"`
	Balance  float64 `json:"balance"`
	Imported int     `json:"imported"`
}

// Link creates a sandbox account at the bank with six months of history,
// as if Mono had just returned it after the customer logged in.
func Link(ctx context.Context, pool *pgxpool.Pool, userID, bank string) (Linked, error) {
	b, ok := Banks[bank]
	if !ok {
		return Linked{}, fmt.Errorf("unknown bank %q", bank)
	}
	now := time.Now()
	r := rng(userID + bank + now.Format(time.RFC3339Nano))
	num := fmt.Sprintf("•••• %04d", r.Intn(10000))
	out := Linked{Bank: b.Name, Name: b.Name + " " + b.Product, Number: num, Kind: b.Kind}

	var txns []txn
	start := now.AddDate(0, -6, 0)
	for m := time.Date(start.Year(), start.Month(), 1, 0, 0, 0, 0, now.Location()); !m.After(now); m = m.AddDate(0, 1, 0) {
		days := time.Date(m.Year(), m.Month()+1, 0, 0, 0, 0, 0, m.Location()).Day()
		at := func(day, hour int) time.Time {
			return time.Date(m.Year(), m.Month(), day, hour, r.Intn(60), 0, 0, m.Location())
		}
		in := round(60000 + r.Float64()*90000)
		txns = append(txns, txn{0, "credit", in, "Side income", []string{"Transfer from Chidi", "Freelance design", "POS sales", "Ajo payout"}[r.Intn(4)], "Inflow", at(1+r.Intn(days), 11)})
		for _, s := range monthly {
			for i := 0; i < s.perMonth/3+r.Intn(2); i++ {
				amt := s.min + r.Float64()*(s.max-s.min)*0.6
				txns = append(txns, txn{0, "debit", round(amt), s.category, s.merchants[r.Intn(len(s.merchants))], "", at(1+r.Intn(days), 8+r.Intn(13))})
			}
		}
	}

	opening := round(80000 + r.Float64()*150000)
	bal := opening
	rows := make([][]any, 0, len(txns))
	tx, err := pool.Begin(ctx)
	if err != nil {
		return out, err
	}
	defer tx.Rollback(ctx)
	if err := tx.QueryRow(ctx, `insert into accounts(user_id,bank,name,number_masked,kind,linked_via,balance) values($1,$2,$3,$4,$5,'mono-sandbox',0) returning id`,
		userID, out.Bank, out.Name, num, b.Kind).Scan(&out.ID); err != nil {
		return out, err
	}
	for _, t := range txns {
		if !t.at.Before(now) {
			continue
		}
		rows = append(rows, []any{userID, out.ID, t.dir, t.amount, t.category, t.merchant, t.narration, t.at})
		if t.dir == "credit" {
			bal += t.amount
		} else {
			bal -= t.amount
		}
	}
	if _, err := tx.CopyFrom(ctx, pgx.Identifier{"transactions"}, []string{"user_id", "account_id", "direction", "amount", "category", "merchant", "narration", "created_at"}, pgx.CopyFromRows(rows)); err != nil {
		return out, err
	}
	if bal < 20000 {
		bal = 20000 + r.Float64()*60000
	}
	out.Balance = math.Round(bal)
	out.Imported = len(rows)
	if _, err := tx.Exec(ctx, `update accounts set balance=$1 where id=$2`, out.Balance, out.ID); err != nil {
		return out, err
	}
	return out, tx.Commit(ctx)
}
