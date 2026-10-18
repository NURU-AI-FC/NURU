package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID string `json:"uid"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type Signer struct{ secret []byte }

func NewSigner(secret string) *Signer { return &Signer{secret: []byte(secret)} }

func (s *Signer) Issue(userID, role string, ttl time.Duration) (string, error) {
	c := Claims{UserID: userID, Role: role, RegisteredClaims: jwt.RegisteredClaims{
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
		Issuer:    "nuru",
	}}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString(s.secret)
}

func (s *Signer) Parse(tok string) (*Claims, error) {
	c := &Claims{}
	t, err := jwt.ParseWithClaims(tok, c, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return s.secret, nil
	}, jwt.WithIssuer("nuru"))
	if err != nil || !t.Valid {
		return nil, errors.New("invalid token")
	}
	return c, nil
}

type ctxKey struct{}

// Middleware rejects requests without a valid bearer token.
func (s *Signer) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			http.Error(w, `{"error":"sign in required"}`, http.StatusUnauthorized)
			return
		}
		c, err := s.Parse(strings.TrimPrefix(h, "Bearer "))
		if err != nil {
			http.Error(w, `{"error":"session expired"}`, http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, c)))
	})
}

// RequireRole allows only users with the given role, such as bank staff.
func RequireRole(role string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if c := From(r.Context()); c == nil || c.Role != role {
			http.Error(w, `{"error":"not allowed"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func From(ctx context.Context) *Claims {
	c, _ := ctx.Value(ctxKey{}).(*Claims)
	return c
}
