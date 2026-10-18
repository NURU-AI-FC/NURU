// Package seed fills a new account with twelve months of realistic sandbox
// data, so every judge who signs up sees a working dashboard straight away.
package seed

import (
	"context"
	"hash/fnv"
	"math"
	"math/rand"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type spend struct {
	category  string
	merchants []string
	perMonth  int     // how many times a month
	min, max  float64 // naira per transaction
}

var monthly = []spend{
	{"Food", []string{"Shoprite Lekki", "Chowdeck", "Mile 12 Market", "Chicken Republic", "Glovo"}, 14, 2500, 18000},
	{"Transport", []string{"Bolt", "Uber", "LagRide", "Fuel, Total Admiralty"}, 12, 1500, 9000},
	{"Data and power", []string{"MTN Data", "IKEDC Prepaid", "Airtel"}, 4, 3000, 15000},
	{"Family", []string{"Transfer to Mum", "Transfer to Chidi", "School fees, Emeka"}, 2, 15000, 60000},
	{"Shopping", []string{"Jumia", "Konga", "Ikeja City Mall"}, 3, 5000, 45000},
	{"Entertainment", []string{"Filmhouse IMAX", "Netflix", "Spotify", "Terra Kulture"}, 3, 2500, 12000},
	{"Health", []string{"HealthPlus Pharmacy", "Reddington Clinic"}, 1, 4000, 25000},
}

func rng(userID string) *rand.Rand {
	h := fnv.New64a()
	h.Write([]byte(userID))
	return rand.New(rand.NewSource(int64(h.Sum64())))
}

func round(v float64) float64 { return math.Round(v/50) * 50 }

type txn struct {
	acct      int
	dir       string
	amount    float64
	category  string
	merchant  string
	narration string
	at        time.Time
}

// User creates accounts, a year of transactions, loans, investments, staff
// and reminders. Balances are computed from the transactions themselves.
func User(ctx context.Context, pool *pgxpool.Pool, userID string, business bool) error {
	r := rng(userID)
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, -11, 0)

	accts := []struct{ bank, name, num, kind, via string }{
		{"Zenith Bank", "Zenith Savings", "•••• 4417", "savings", "sandbox"},
		{"OPay", "OPay Wallet", "•••• 2290", "wallet", "mono-sandbox"},
		{"Kuda", "Kuda Spend", "•••• 8053", "current", "mono-sandbox"},
	}
	if business {
		accts = append(accts, struct{ bank, name, num, kind, via string }{"Zenith Bank", "Kemi Foods Ltd", "•••• 0094", "business", "sandbox"})
	}

	var txns []txn
	add := func(t txn) {
		if t.at.Before(now) {
			txns = append(txns, t)
		}
	}
	for m := start; !m.After(now); m = m.AddDate(0, 1, 0) {
		days := time.Date(m.Year(), m.Month()+1, 0, 0, 0, 0, 0, m.Location()).Day()
		at := func(day, hour int) time.Time {
			return time.Date(m.Year(), m.Month(), day, hour, r.Intn(60), 0, 0, m.Location())
		}
		add(txn{0, "credit", 640000, "Salary", "Andela Nigeria", m.Month().String() + " salary", at(25, 9)})
		if r.Intn(3) == 0 {
			add(txn{1, "credit", round(20000 + r.Float64()*60000), "Side income", "Freelance design", "Client payment", at(5+r.Intn(20), 14)})
		}
		if m.Month() == time.January || m.Month() == time.July {
			add(txn{0, "debit", 350000, "Rent", "Landlord, Mr Adeyemi", "Half year rent", at(21, 11)})
		}
		add(txn{0, "debit", 15000, "Savings", "NURU Japa fund", "Auto save", at(26, 8)})
		add(txn{0, "debit", 25000, "Bills", "DStv Compact", "Subscription", at(3, 10)})
		add(txn{0, "debit", 5500, "Bills", "Netflix", "Subscription", at(8, 6)})
		if m.Month() == time.September {
			add(txn{0, "debit", 120000, "Education", "Corona Schools", "School fees", at(10, 10)})
		}
		for _, s := range monthly {
			n := s.perMonth + r.Intn(3) - 1
			for i := 0; i < n; i++ {
				day := 1 + r.Intn(days)
				// weekends cost more, which the heat map shows
				w := at(day, 8+r.Intn(13))
				amt := s.min + r.Float64()*(s.max-s.min)
				if wd := w.Weekday(); wd == time.Friday || wd == time.Saturday {
					amt *= 1.35
				}
				acct := 0
				if s.category == "Transport" || s.category == "Food" && r.Intn(2) == 0 {
					acct = 1
				}
				if s.category == "Shopping" {
					acct = 2
				}
				add(txn{acct, "debit", round(amt), s.category, s.merchants[r.Intn(len(s.merchants))], "", w})
			}
		}
		if business {
			for i := 0; i < 18; i++ {
				add(txn{3, "credit", round(40000 + r.Float64()*100000), "Sales", []string{"Chowdeck payout", "POS sales", "Glovo payout", "Catering order"}[r.Intn(4)], "", at(1+r.Intn(days), 12)})
			}
			add(txn{3, "debit", 590450, "Payroll", "Staff payroll", m.Month().String(), at(28, 10)})
			add(txn{3, "debit", round(180000 + r.Float64()*80000), "Supplies", "Mile 12 Market", "Ingredients", at(4, 7)})
			add(txn{3, "debit", 45000, "Advertising", "Instagram ads", "", at(12, 9)})
			add(txn{3, "debit", 450000, "Owner drawings", "Transfer to Adaeze Okafor", "", at(27, 16)})
			add(txn{3, "debit", 30000, "Advertising", "Flyers, Yaba print", "", at(15, 9)})
		}
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	ids := make([]string, len(accts))
	opening := []float64{420000, 35000, 60000, 900000}
	for i, a := range accts {
		if err := tx.QueryRow(ctx, `insert into accounts(user_id,bank,name,number_masked,kind,linked_via,balance) values($1,$2,$3,$4,$5,$6,$7) returning id`,
			userID, a.bank, a.name, a.num, a.kind, a.via, opening[i]).Scan(&ids[i]); err != nil {
			return err
		}
	}
	rows := make([][]any, 0, len(txns))
	bal := append([]float64(nil), opening[:len(accts)]...)
	for _, t := range txns {
		rows = append(rows, []any{userID, ids[t.acct], t.dir, t.amount, t.category, t.merchant, t.narration, t.at})
		if t.dir == "credit" {
			bal[t.acct] += t.amount
		} else {
			bal[t.acct] -= t.amount
		}
	}
	if _, err := tx.CopyFrom(ctx, pgx.Identifier{"transactions"}, []string{"user_id", "account_id", "direction", "amount", "category", "merchant", "narration", "created_at"}, pgx.CopyFromRows(rows)); err != nil {
		return err
	}
	for i, b := range bal {
		// keep balances positive and believable even if the random year was expensive
		if b < 20000 {
			b = 20000 + r.Float64()*30000
		}
		if _, err := tx.Exec(ctx, `update accounts set balance=$1 where id=$2`, math.Round(b), ids[i]); err != nil {
			return err
		}
	}

	day := func(d int) time.Time { return now.AddDate(0, 0, d).Truncate(time.Hour) }
	if _, err := tx.Exec(ctx, `insert into loans(user_id,lender,principal,rate_pct,months,disbursed_at,next_due_at,monthly,balance) values
		($1,'Zenith Personal Loan',1500000,22,12,$2,$3,140400,987000)`, userID, now.AddDate(0, -4, 0), day(9)); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `insert into investments(user_id,kind,name,value,contributed,monthly) values
		($1,'pension','Stanbic IBTC Pension',2840000,2410000,48000),
		($1,'tbills','FGN Treasury Bills, 364 day',1000000,920000,0),
		($1,'fund','Zenith Money Market Fund',465000,430000,20000)`, userID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `insert into payees(user_id,name,bank,account) values
		($1,'Tunde Bakare','GTBank','0123456621'),($1,'Mile 12 Market','Wema Bank','0034561290'),
		($1,'Mama Ngozi','OPay','8123457788'),($1,'Mr Adeyemi, landlord','First Bank','3012349981') on conflict do nothing`, userID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `insert into reminders(user_id,title,kind,amount,due_at) values
		($1,'Loan repayment, Zenith','loan',140400,$2),
		($1,'DStv renewal','bill',25000,$3),
		($1,'Rent, half year','bill',350000,$4),
		($1,'Investor call, Tola Capital','meeting',0,$5)`, userID, day(9), day(2), day(40), day(4)); err != nil {
		return err
	}
	if business {
		if _, err := tx.Exec(ctx, `insert into staff(user_id,name,role,gross) values
			($1,'Aisha Okoro','Head chef',180000),($1,'Bayo Eze','Kitchen staff',95000),
			($1,'Chioma Nwosu','Cashier',85000),($1,'Dauda Umar','Dispatch rider',75000),
			($1,'Funke Ade','Cleaner',55000)`, userID); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
