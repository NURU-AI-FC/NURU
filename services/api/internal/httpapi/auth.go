package httpapi

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/NURU-AI-FC/nuru/services/api/internal/auth"
	"github.com/NURU-AI-FC/nuru/services/api/internal/seed"
)

type user struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Email        string `json:"email"`
	Phone        string `json:"phone"`
	Role         string `json:"role"`
	Language     string `json:"language"`
	Theme        string `json:"theme"`
	Currency     string `json:"currency"`
	BusinessName string `json:"business_name"`
	BusinessType string `json:"business_type"`
	HasPIN       bool   `json:"has_pin"`
	KYCVerified  bool   `json:"kyc_verified"`
}

const userCols = `id,name,email,phone,role,language,theme,currency,business_name,business_type,pin_hash<>'',kyc_verified`

func scanUser(row pgx.Row) (user, error) {
	var u user
	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Role, &u.Language, &u.Theme, &u.Currency, &u.BusinessName, &u.BusinessType, &u.HasPIN, &u.KYCVerified)
	return u, err
}

func (s *Server) signup(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name, Email, Phone, Password string
		Business                     bool
	}
	if !decode(w, r, &in) {
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	if _, err := mail.ParseAddress(in.Email); err != nil || strings.TrimSpace(in.Name) == "" {
		fail(w, 400, "enter your name and a valid email")
		return
	}
	if len(in.Password) < 8 {
		fail(w, 400, "password must be at least 8 characters")
		return
	}
	hash, err := auth.Hash(in.Password)
	if err != nil {
		fail(w, 500, "could not secure your password")
		return
	}
	var id string
	err = s.db.QueryRow(r.Context(), `insert into users(name,email,phone,password_hash,business_name,business_type)
		values($1,$2,$3,$4,$5,$6) on conflict (email) do nothing returning id`,
		strings.TrimSpace(in.Name), in.Email, in.Phone, hash, bizName(in.Business), bizType(in.Business)).Scan(&id)
	if err == pgx.ErrNoRows {
		fail(w, 409, "an account with this email already exists")
		return
	} else if err != nil {
		fail(w, 500, "could not create the account")
		return
	}
	if err := seed.User(r.Context(), s.db, id, in.Business); err != nil {
		log.Printf("seed %s: %v", id, err)
	}
	s.sendOTP(r.Context(), in.Email, "signup")
	writeJSON(w, 201, map[string]any{"otp_required": true, "demo_code": s.demoCode()})
}

func bizName(b bool) string {
	if b {
		return "Kemi Foods Ltd"
	}
	return ""
}
func bizType(b bool) string {
	if b {
		return "Restaurant and catering"
	}
	return ""
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var in struct{ Email, Password string }
	if !decode(w, r, &in) {
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	var id, hash string
	err := s.db.QueryRow(r.Context(), `select id,password_hash from users where email=$1`, in.Email).Scan(&id, &hash)
	ok := false
	if err == nil {
		ok, _ = auth.Verify(in.Password, hash)
	} else {
		// spend the same time on unknown emails so they can't be discovered
		_, _ = auth.Verify(in.Password, "$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$ZmFrZWZha2VmYWtlZmFrZWZha2VmYWtlZmFrZWZha2U")
	}
	if !ok {
		s.event(r.Context(), "", "login_failed", in.Email)
		fail(w, 401, "email or password is wrong")
		return
	}
	s.sendOTP(r.Context(), in.Email, "login")
	writeJSON(w, 200, map[string]any{"otp_required": true, "demo_code": s.demoCode()})
}

func (s *Server) verifyOTP(w http.ResponseWriter, r *http.Request) {
	var in struct{ Email, Code string }
	if !decode(w, r, &in) {
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	var hash string
	var attempts int
	var exp time.Time
	err := s.db.QueryRow(r.Context(), `select code_hash,attempts,expires_at from otps where email=$1`, in.Email).Scan(&hash, &attempts, &exp)
	if err != nil || time.Now().After(exp) || attempts >= 5 {
		fail(w, 400, "code expired, request a new one")
		return
	}
	if ok, _ := auth.Verify(in.Code, hash); !ok {
		s.db.Exec(r.Context(), `update otps set attempts=attempts+1 where email=$1`, in.Email)
		fail(w, 400, "that code is not right")
		return
	}
	s.db.Exec(r.Context(), `delete from otps where email=$1`, in.Email)
	u, err := scanUser(s.db.QueryRow(r.Context(), `update users set email_verified=true where email=$1 returning `+userCols, in.Email))
	if err != nil {
		fail(w, 400, "account not found")
		return
	}
	tok, err := s.tokens.Issue(u.ID, u.Role, 12*time.Hour)
	if err != nil {
		fail(w, 500, "could not sign you in")
		return
	}
	writeJSON(w, 200, map[string]any{"token": tok, "user": u})
}

func (s *Server) demoCode() string {
	if s.cfg.DemoMode {
		return "000000"
	}
	return ""
}

// sendOTP stores a hashed one time code. In demo mode the code is always
// 000000 so judges can sign in without a phone; otherwise it is random and
// would be sent by SMS or email.
func (s *Server) sendOTP(ctx context.Context, email, purpose string) {
	code := "000000"
	if !s.cfg.DemoMode {
		n, _ := rand.Int(rand.Reader, big.NewInt(1000000))
		code = fmt.Sprintf("%06d", n.Int64())
		log.Printf("otp for %s issued", email)
	}
	h, _ := auth.Hash(code)
	s.db.Exec(ctx, `insert into otps(email,code_hash,purpose,expires_at) values($1,$2,$3,$4)
		on conflict (email) do update set code_hash=excluded.code_hash, purpose=excluded.purpose, attempts=0, expires_at=excluded.expires_at`,
		email, h, purpose, time.Now().Add(10*time.Minute))
}

func (s *Server) event(ctx context.Context, userID, kind, detail string) {
	var u any
	if userID != "" {
		u = userID
	}
	s.db.Exec(ctx, `insert into security_events(user_id,kind,detail) values($1,$2,$3)`, u, kind, detail)
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	u, err := scanUser(s.db.QueryRow(r.Context(), `select `+userCols+` from users where id=$1`, uid(r)))
	if err != nil {
		fail(w, 404, "account not found")
		return
	}
	writeJSON(w, 200, u)
}

func (s *Server) updateMe(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name, Phone, Language, Theme, Currency *string
	}
	if !decode(w, r, &in) {
		return
	}
	allowed := map[string]map[string]bool{
		"language": {"en": true, "yo": true, "ig": true, "ha": true},
		"theme":    {"light": true, "dark": true, "system": true},
		"currency": {"NGN": true, "USD": true, "GBP": true, "EUR": true},
	}
	set := func(col string, v *string) {
		if v != nil && (allowed[col] == nil || allowed[col][*v]) {
			s.db.Exec(r.Context(), `update users set `+col+`=$1 where id=$2`, *v, uid(r))
		}
	}
	if in.Name != nil && strings.TrimSpace(*in.Name) != "" {
		set("name", in.Name)
	}
	if in.Phone != nil {
		p := strings.Join(strings.Fields(*in.Phone), "")
		digits := strings.TrimPrefix(p, "+")
		if p != "" && (len(digits) < 7 || len(digits) > 15 || strings.Trim(digits, "0123456789") != "") {
			fail(w, 400, "enter a valid phone number")
			return
		}
		set("phone", &p)
	}
	set("language", in.Language)
	set("theme", in.Theme)
	set("currency", in.Currency)
	s.me(w, r)
}

func (s *Server) setPIN(w http.ResponseWriter, r *http.Request) {
	var in struct{ PIN, Current string }
	if !decode(w, r, &in) {
		return
	}
	if len(in.PIN) != 4 || strings.Trim(in.PIN, "0123456789") != "" {
		fail(w, 400, "PIN must be 4 digits")
		return
	}
	var old string
	s.db.QueryRow(r.Context(), `select pin_hash from users where id=$1`, uid(r)).Scan(&old)
	if old != "" {
		if ok, _ := auth.Verify(in.Current, old); !ok {
			fail(w, 400, "current PIN is wrong")
			return
		}
	}
	h, _ := auth.Hash(in.PIN)
	s.db.Exec(r.Context(), `update users set pin_hash=$1 where id=$2`, h, uid(r))
	writeJSON(w, 200, map[string]bool{"ok": true})
}

// kyc records a sandbox BVN or NIN check. Only the last four digits are kept.
func (s *Server) kyc(w http.ResponseWriter, r *http.Request) {
	var in struct{ BVN, NIN string }
	if !decode(w, r, &in) {
		return
	}
	id := in.BVN
	if id == "" {
		id = in.NIN
	}
	if len(id) != 11 || strings.Trim(id, "0123456789") != "" {
		fail(w, 400, "BVN and NIN are 11 digits")
		return
	}
	s.db.Exec(r.Context(), `update users set kyc_verified=true, bvn_last4=$1 where id=$2`, id[7:], uid(r))
	writeJSON(w, 200, map[string]any{"verified": true, "sandbox": true})
}
