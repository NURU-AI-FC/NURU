package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/NURU-AI-FC/nuru/services/api/internal/auth"
	"github.com/NURU-AI-FC/nuru/services/api/internal/config"
	"github.com/NURU-AI-FC/nuru/services/api/internal/db"
	"github.com/NURU-AI-FC/nuru/services/api/internal/email"
	"github.com/NURU-AI-FC/nuru/services/api/internal/httpapi"
	"github.com/NURU-AI-FC/nuru/services/api/internal/monitor"
	"github.com/NURU-AI-FC/nuru/services/api/internal/secure"
	"github.com/NURU-AI-FC/nuru/services/api/internal/seed"
)

func main() {
	cfg := config.Load()
	seed.BankName, email.BankName = cfg.BankName, cfg.BankName
	httpapi.SetStaffDomain(cfg.StaffDomain)
	ctx := context.Background()
	_, flush := monitor.InitSentry("api")
	defer flush()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()
	if err := db.Migrate(ctx, pool); err != nil {
		log.Fatal(err)
	}
	box, err := secure.New(cfg.DataKey)
	if err != nil {
		log.Fatal(err)
	}
	if cfg.DemoMode {
		ensureDemoUsers(ctx, pool)
	}

	go monitor.EnsureUptimeMonitors(ctx)

	srv := &http.Server{Addr: ":" + cfg.Port, Handler: httpapi.New(cfg, pool, box).Routes(), ReadHeaderTimeout: 10 * time.Second}
	go func() {
		log.Printf("NURU API listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	shutdown, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	srv.Shutdown(shutdown)
}

// ensureDemoUsers creates the demo customer, bank staff and NURU team accounts
// shown in the designs, so visitors can sign in without registering.
// demoPassword is shared by every seeded demo account.
const demoPassword = "Nuru-Demo-2026"

func ensureDemoUsers(ctx context.Context, pool *pgxpool.Pool) {
	demo := []struct {
		name, email, password, pin, role, sub string
		business                              bool
	}{
		{"Adaeze Okafor", "demo@nuru.app", demoPassword, "", "customer", "", true},
		{"Tunde Bakare", "staff@nuru.app", demoPassword, "1234", "staff", "admin", false},
		{"Bolaji Jimoh", "ceo@nuru.app", demoPassword, "", "hq", "owner", false},
		{"Zainab Wahab", "ops@nuru.app", demoPassword, "", "hq", "ops", false},
	}
	for _, d := range demo {
		pw, _ := auth.Hash(d.password)
		pin := ""
		if d.pin != "" {
			pin, _ = auth.Hash(d.pin)
		}
		biz, kind := "", ""
		if d.business {
			biz, kind = "Kemi Foods Ltd", "Restaurant and catering"
		}
		var id string
		hqRole, consoleRole := "", ""
		switch d.role {
		case "hq":
			hqRole = d.sub
		case "staff":
			consoleRole = d.sub
		}
		err := pool.QueryRow(ctx, `insert into users(name,email,password_hash,pin_hash,role,business_name,business_type,kyc_verified,email_verified,bvn_last4,hq_role,console_role)
			values($1,$2,$3,$4,$5,$6,$7,true,true,'4417',$8,$9) on conflict (email) do nothing returning id`,
			d.name, d.email, pw, pin, d.role, biz, kind, hqRole, consoleRole).Scan(&id)
		if err != nil {
			// already there: keep the shared demo password current
			pool.Exec(ctx, `update users set password_hash=$1 where email=$2`, pw, d.email)
			continue
		}
		if d.role == "customer" {
			if err := seed.User(ctx, pool, id, d.business); err != nil {
				log.Printf("seed demo user: %v", err)
			}
		}
		log.Printf("demo account ready: %s", d.email)
	}
}
