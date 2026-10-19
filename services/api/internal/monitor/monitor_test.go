package monitor

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestEnsureIsIdempotent(t *testing.T) {
	var made []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		if r.Form.Get("api_key") != "k" {
			w.Write([]byte(`{"stat":"fail","error":{"type":"invalid_parameter"}}`))
			return
		}
		switch r.URL.Path {
		case "/getMonitors":
			w.Write([]byte(`{"stat":"ok","pagination":{"offset":0,"limit":50,"total":1},"monitors":[{"friendly_name":"nuru WEB","url":"https://x/"}]}`))
		case "/newMonitor":
			made = append(made, r.Form.Get("friendly_name")+" "+r.Form.Get("url")+" "+r.Form.Get("type"))
			w.Write([]byte(`{"stat":"ok","monitor":{"id":1,"status":1}}`))
		}
	}))
	defer srv.Close()
	old := uptimeAPI
	uptimeAPI = srv.URL + "/"
	defer func() { uptimeAPI = old }()

	want := []Monitor{{"NURU web", "https://x/"}, {"NURU API health", "https://x/api/health"}}
	created, err := ensure(context.Background(), srv.Client(), "k", want)
	if err != nil {
		t.Fatal(err)
	}
	if len(created) != 1 || created[0] != "NURU API health" || made[0] != "NURU API health https://x/api/health 1" {
		t.Fatalf("created %v, calls %v", created, made)
	}
	if _, err := ensure(context.Background(), srv.Client(), "bad", want); err == nil {
		t.Fatal("a bad key should fail")
	}
}

func TestOffWithoutKeys(t *testing.T) {
	t.Setenv("SENTRY_DSN", "")
	t.Setenv("UPTIMEROBOT_API_KEY", "")
	on, flush := InitSentry("api")
	flush()
	if on {
		t.Fatal("sentry should be off without a DSN")
	}
	h := http.HandlerFunc(func(http.ResponseWriter, *http.Request) {})
	if got := Middleware()(h); got == nil {
		t.Fatal("middleware should pass through")
	}
	EnsureUptimeMonitors(context.Background()) // no key: does nothing
}
