package config

import (
	"os"
	"strings"
)

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
	DataKey     string // 32 byte hex key for encrypting chats and personal data
	AIURL       string
	WebOrigins  []string
	DemoMode    bool   // fixed OTP 000000 and seeded demo account
	BankName    string // the partner bank NURU runs inside
	StaffDomain string // work email domain allowed into the bank console
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func Load() Config {
	return Config{
		Port:        env("PORT", "8080"),
		DatabaseURL: env("DATABASE_URL", "postgres://nuru:nuru@localhost:5432/nuru?sslmode=disable"),
		JWTSecret:   env("JWT_SECRET", "dev-only-change-me"),
		DataKey:     env("DATA_KEY", "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f"),
		AIURL:       env("AI_URL", "http://localhost:8000"),
		WebOrigins:  strings.Split(env("WEB_ORIGINS", "http://localhost:5173"), ","),
		DemoMode:    env("DEMO_MODE", "true") == "true",
		BankName:    env("BANK_NAME", "Partner Bank"),
		StaffDomain: env("BANK_STAFF_DOMAIN", "@bank.example"),
	}
}
