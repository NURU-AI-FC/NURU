package httpapi

import (
	"bytes"
	"net/http"
	"time"

	"github.com/go-chi/httprate"

	"github.com/NURU-AI-FC/nuru/services/api/internal/auth"
)

// limitByIP is httprate.LimitByIP with its counts in the shared cache, so
// limits on sign in and codes hold across restarts when Redis is set.
func (s *Server) limitByIP(name string, n int, window time.Duration) func(http.Handler) http.Handler {
	return httprate.Limit(n, window, httprate.WithKeyFuncs(httprate.KeyByIP),
		httprate.WithLimitCounter(s.cache.LimitCounter(name)))
}

// cached keeps a GET handler's successful JSON reply for ttl. It is for the
// HQ and console aggregate pages, whose figures are counts over many rows
// and do not depend on who asks. Put it after the role and area checks so a
// cached reply is only ever served to someone allowed to see it.
func (s *Server) cached(ttl time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodGet || r.URL.Query().Has("fresh") {
				next.ServeHTTP(w, r)
				return
			}
			role := ""
			if c := auth.From(r.Context()); c != nil {
				role = c.Role
			}
			key := "page:" + role + ":" + r.URL.Path + "?" + r.URL.Query().Encode()
			if b, ok := s.cache.Get(r.Context(), key); ok {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("X-Cache", "hit")
				w.WriteHeader(http.StatusOK)
				w.Write(b)
				return
			}
			rec := &recorder{ResponseWriter: w, code: http.StatusOK}
			next.ServeHTTP(rec, r)
			if rec.code == http.StatusOK && !rec.over {
				s.cache.Set(r.Context(), key, rec.buf.Bytes(), ttl)
			}
		})
	}
}

// recorder passes a reply through while keeping a copy of it, up to 2 MB.
type recorder struct {
	http.ResponseWriter
	code int
	buf  bytes.Buffer
	over bool
}

func (r *recorder) WriteHeader(code int) {
	r.code = code
	r.ResponseWriter.WriteHeader(code)
}

func (r *recorder) Write(b []byte) (int, error) {
	if !r.over {
		if r.buf.Len()+len(b) > 2<<20 {
			r.over = true
			r.buf.Reset()
		} else {
			r.buf.Write(b)
		}
	}
	return r.ResponseWriter.Write(b)
}
