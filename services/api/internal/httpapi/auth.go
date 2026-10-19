package httpapi

import (
	"context"
	"crypto/rand"
	"fmt"
	"hash/fnv"
	"log"
	"math/big"
	"net/http"
	"net/mail"
	"slices"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/NURU-AI-FC/nuru/services/api/internal/auth"
	"github.com/NURU-AI-FC/nuru/services/api/internal/email"
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
	HQRole       string `json:"hq_role,omitempty"`
	ConsoleRole  string `json:"console_role,omitempty"`
}

const userCols = `id,name,email,phone,role,language,theme,currency,business_name,business_type,pin_hash<>'',kyc_verified,hq_role,console_role`

func scanUser(row pgx.Row) (user, error) {
	var u user
	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Role, &u.Language, &u.Theme, &u.Currency, &u.BusinessName, &u.BusinessType, &u.HasPIN, &u.KYCVerified,
		&u.HQRole, &u.ConsoleRole)
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
	s.sendOTP(r, in.Email, "signup")
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
	var off bool
	err := s.db.QueryRow(r.Context(), `select id,password_hash,deactivated_at is not null from users where email=$1`, in.Email).Scan(&id, &hash, &off)
	ok := false
	if err == nil && !off {
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
	s.sendOTP(r, in.Email, "login")
	writeJSON(w, 200, map[string]any{"otp_required": true, "demo_code": s.demoCode()})
}

func (s *Server) verifyOTP(w http.ResponseWriter, r *http.Request) {
	var in struct{ Email, Code string }
	if !decode(w, r, &in) {
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	if msg := s.checkOTP(r.Context(), in.Email, in.Code, "signup", "login", "staff"); msg != "" {
		fail(w, 400, msg)
		return
	}
	u, err := scanUser(s.db.QueryRow(r.Context(), `update users set email_verified=true where email=$1 and deactivated_at is null returning `+userCols, in.Email))
	if err != nil {
		fail(w, 400, "account not found")
		return
	}
	tok, err := s.issue(r, u.ID, u.Role)
	if err != nil {
		fail(w, 500, "could not sign you in")
		return
	}
	switch u.Role {
	case "staff":
		s.audit(r.Context(), "console", u.ID, "signed_in", "")
	case "hq":
		s.audit(r.Context(), "hq", u.ID, "signed_in", "")
	}
	writeJSON(w, 200, map[string]any{"token": tok, "user": u})
}

// checkOTP verifies and spends a code issued for one of the given purposes,
// so a password reset code can never be used to sign in.
func (s *Server) checkOTP(ctx context.Context, email, code string, purposes ...string) string {
	var hash, purpose string
	var attempts int
	var exp time.Time
	err := s.db.QueryRow(ctx, `select code_hash,purpose,attempts,expires_at from otps where email=$1`, email).Scan(&hash, &purpose, &attempts, &exp)
	if err != nil || time.Now().After(exp) || attempts >= 5 || !slices.Contains(purposes, purpose) {
		return "code expired, request a new one"
	}
	if ok, _ := auth.Verify(code, hash); !ok {
		s.db.Exec(ctx, `update otps set attempts=attempts+1 where email=$1`, email)
		return "that code is not right"
	}
	s.db.Exec(ctx, `delete from otps where email=$1`, email)
	return ""
}

// forgot sends a reset code. It answers the same way for unknown emails so
// accounts cannot be discovered.
func (s *Server) forgot(w http.ResponseWriter, r *http.Request) {
	var in struct{ Email string }
	if !decode(w, r, &in) {
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	if _, err := mail.ParseAddress(in.Email); err != nil {
		fail(w, 400, "enter a valid email")
		return
	}
	var id string
	if s.db.QueryRow(r.Context(), `select id from users where email=$1`, in.Email).Scan(&id) == nil {
		s.sendOTP(r, in.Email, "reset")
		s.event(r.Context(), id, "password_reset_requested", "")
	}
	writeJSON(w, 200, map[string]any{"otp_required": true, "demo_code": s.demoCode()})
}

// reset sets a new password after a reset code, then signs out every device.
func (s *Server) reset(w http.ResponseWriter, r *http.Request) {
	var in struct{ Email, Code, Password string }
	if !decode(w, r, &in) {
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	if len(in.Password) < 8 {
		fail(w, 400, "password must be at least 8 characters")
		return
	}
	if msg := s.checkOTP(r.Context(), in.Email, in.Code, "reset"); msg != "" {
		fail(w, 400, msg)
		return
	}
	var id, old string
	if err := s.db.QueryRow(r.Context(), `select id,password_hash from users where email=$1`, in.Email).Scan(&id, &old); err != nil {
		fail(w, 400, "account not found")
		return
	}
	if same, _ := auth.Verify(in.Password, old); same {
		fail(w, 400, "choose a password you have not used before")
		return
	}
	hash, err := auth.Hash(in.Password)
	if err != nil {
		fail(w, 500, "could not secure your password")
		return
	}
	s.db.Exec(r.Context(), `update users set password_hash=$1, password_changed_at=now() where id=$2`, hash, id)
	s.endSessions(r.Context(), id, "")
	s.event(r.Context(), id, "password_reset", "")
	writeJSON(w, 200, map[string]bool{"ok": true})
}

func (s *Server) demoCode() string {
	if s.cfg.DemoMode {
		return "000000"
	}
	return ""
}

// sendOTP stores a hashed one time code and emails it. In demo mode the code
// is always 000000 so judges can sign in without an inbox; otherwise it is
// random. The email goes out in the background (see sendEmail).
func (s *Server) sendOTP(r *http.Request, to, purpose string) {
	ctx := r.Context()
	code := "000000"
	if !s.cfg.DemoMode {
		n, _ := rand.Int(rand.Reader, big.NewInt(1000000))
		code = fmt.Sprintf("%06d", n.Int64())
		log.Printf("otp for %s issued", to)
	}
	h, _ := auth.Hash(code)
	s.db.Exec(ctx, `insert into otps(email,code_hash,purpose,expires_at) values($1,$2,$3,$4)
		on conflict (email) do update set code_hash=excluded.code_hash, purpose=excluded.purpose, attempts=0, expires_at=excluded.expires_at`,
		to, h, purpose, time.Now().Add(10*time.Minute))
	switch purpose {
	case "signup":
		var name string
		s.db.QueryRow(ctx, `select name from users where email=$1`, to).Scan(&name)
		s.sendEmail("", to, email.Welcome(name, code))
	case "reset":
		s.sendEmail("", to, email.PasswordReset(code))
	default: // login, staff
		s.sendEmail("", to, email.SignInCode(code, deviceName(r.UserAgent()), time.Now()))
	}
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
	s.db.Exec(r.Context(), `update users set pin_hash=$1, pin_changed_at=now() where id=$2`, h, uid(r))
	writeJSON(w, 200, map[string]bool{"ok": true})
}

// kyc runs a sandbox BVN or NIN check. With lookup set it only returns the
// matched record for the customer to confirm; otherwise it marks them
// verified. Only the last four digits are kept.
func (s *Server) kyc(w http.ResponseWriter, r *http.Request) {
	var in struct {
		BVN, NIN string
		Lookup   bool
	}
	if !decode(w, r, &in) {
		return
	}
	id, kind := in.BVN, "BVN"
	if id == "" {
		id, kind = in.NIN, "NIN"
	}
	if len(id) != 11 || strings.Trim(id, "0123456789") != "" {
		fail(w, 400, "BVN and NIN are 11 digits")
		return
	}
	var name, phone string
	if err := s.db.QueryRow(r.Context(), `select name,phone from users where id=$1`, uid(r)).Scan(&name, &phone); err != nil {
		fail(w, 404, "account not found")
		return
	}
	full, dob := sandboxIdentity(name)
	out := map[string]any{"found": true, "sandbox": true, "kind": kind, "name": full, "dob": dob.Format("2006-01-02"),
		"phone": maskPhone(phone), "masked": id[:3] + "*****" + id[8:], "verified": false}
	if !in.Lookup {
		s.db.Exec(r.Context(), `update users set kyc_verified=true, bvn_last4=$1 where id=$2`, id[7:], uid(r))
		s.event(r.Context(), uid(r), "kyc_verified", kind)
		out["verified"] = true
	}
	writeJSON(w, 200, out)
}

// sandboxIdentity makes the record a KYC partner would return: the profile
// name with a middle name, and a stable date of birth.
func sandboxIdentity(name string) (string, time.Time) {
	h := fnv.New32a()
	h.Write([]byte(strings.ToLower(name)))
	n := int(h.Sum32())
	parts := strings.Fields(name)
	if len(parts) == 2 {
		middle := []string{"Chioma", "Oluwaseun", "Amina", "Ifeoma", "Tolulope", "Ngozi", "Babatunde", "Zainab"}[n%8]
		parts = []string{parts[0], middle, parts[1]}
	}
	dob := time.Date(1982+n%18, time.Month(1+n/18%12), 1+n/216%28, 0, 0, 0, 0, time.UTC)
	return strings.Join(parts, " "), dob
}

func maskPhone(p string) string {
	d := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, p)
	if len(d) < 7 {
		return ""
	}
	if d[0] == '0' {
		d = "234" + d[1:]
	} else if len(d) == 10 {
		d = "234" + d
	}
	return "+" + d[:3] + " " + d[3:6] + " *** " + d[len(d)-4:]
}
