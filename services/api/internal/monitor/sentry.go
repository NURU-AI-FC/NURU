// Package monitor wires error tracking (Sentry) and uptime checks
// (UptimeRobot). Both stay off until their keys are set, so local runs and
// demos need nothing.
package monitor

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// Release is the deployed commit Railway builds from, if known.
func Release() string { return os.Getenv("RAILWAY_GIT_COMMIT_SHA") }

// InitSentry starts the Sentry SDK when SENTRY_DSN is set. The returned
// function flushes queued events and is safe to call either way.
func InitSentry(service string) (bool, func()) {
	dsn := os.Getenv("SENTRY_DSN")
	if dsn == "" {
		return false, func() {}
	}
	env := os.Getenv("SENTRY_ENVIRONMENT")
	if env == "" {
		env = os.Getenv("RAILWAY_ENVIRONMENT_NAME")
	}
	if env == "" {
		env = "development"
	}
	err := sentry.Init(sentry.ClientOptions{
		Dsn:              dsn,
		Release:          Release(),
		Environment:      env,
		ServerName:       service,
		AttachStacktrace: true,
		SendDefaultPII:   false,
		TracesSampleRate: 0,
	})
	if err != nil {
		log.Printf("sentry off: %v", err)
		return false, func() {}
	}
	sentry.ConfigureScope(func(s *sentry.Scope) { s.SetTag("service", service) })
	log.Printf("sentry on (%s)", env)
	return true, func() { sentry.Flush(2 * time.Second) }
}

// Enabled reports whether InitSentry turned Sentry on.
func Enabled() bool { return sentry.CurrentHub().Client() != nil }

// Middleware reports panics and 5xx answers to Sentry. With Sentry off it
// returns next unchanged. Place it inside the panic recoverer: it re-panics
// so the recoverer still writes the 500.
func Middleware() func(http.Handler) http.Handler {
	if !Enabled() {
		return func(next http.Handler) http.Handler { return next }
	}
	sh := sentryhttp.New(sentryhttp.Options{Repanic: true, WaitForDelivery: false, Timeout: 2 * time.Second})
	return func(next http.Handler) http.Handler {
		inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
			next.ServeHTTP(ww, r)
			if ww.Status() >= 500 {
				if hub := sentry.GetHubFromContext(r.Context()); hub != nil {
					route := r.URL.Path
					if rc := chi.RouteContext(r.Context()); rc != nil && rc.RoutePattern() != "" {
						route = rc.RoutePattern()
					}
					hub.CaptureMessage(r.Method + " " + route + " answered " + http.StatusText(ww.Status()))
				}
			}
		})
		return sh.Handle(inner)
	}
}
