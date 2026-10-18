package httpapi

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/NURU-AI-FC/nuru/services/api/internal/auth"
)

func TestHQRoles(t *testing.T) {
	want := map[string][]string{
		"owner":    {"overview", "health", "support", "emails", "team"},
		"ops":      {"overview", "health", "support", "emails"},
		"support":  {"support"},
		"engineer": {"health"},
		"analyst":  {"overview", "emails"},
	}
	for role, areas := range want {
		for area := range hqAreas {
			ok := false
			for _, a := range areas {
				ok = ok || a == area
			}
			if can(hqAreas, role, area) != ok {
				t.Errorf("hq %s in %s: got %v, want %v", role, area, !ok, ok)
			}
		}
	}
}

func TestConsoleRoles(t *testing.T) {
	want := map[string][]string{
		"viewer":    {"overview", "segments"},
		"analyst":   {"overview", "segments", "customers", "export"},
		"campaigns": {"overview", "segments", "campaigns"},
		"risk":      {"overview", "segments", "risk", "data"},
		"admin":     {"overview", "segments", "customers", "export", "campaigns", "approve", "risk", "data", "team"},
	}
	for role, areas := range want {
		for area := range consoleAreas {
			ok := false
			for _, a := range areas {
				ok = ok || a == area
			}
			if can(consoleAreas, role, area) != ok {
				t.Errorf("console %s in %s: got %v, want %v", role, area, !ok, ok)
			}
		}
	}
	if can(consoleAreas, "", "overview") {
		t.Error("staff without a console role must see nothing")
	}
}

func TestCampaignMoves(t *testing.T) {
	cases := []struct {
		sub, to string
		ok      bool
	}{
		{"campaigns", "pending", true}, {"campaigns", "stopped", true}, {"campaigns", "approved", false}, {"campaigns", "sent", false},
		{"admin", "approved", true}, {"admin", "sent", true}, {"analyst", "pending", false}, {"viewer", "stopped", false},
	}
	for _, c := range cases {
		if got := campaignMoveAllowed(c.sub, c.to); got != c.ok {
			t.Errorf("%s to %s: got %v", c.sub, c.to, got)
		}
	}
}

func TestStaffEmailRule(t *testing.T) {
	if !staffEmailAllowed("amaka.obi@zenithbank.com", false, false) {
		t.Error("Zenith work email refused")
	}
	if staffEmailAllowed("amaka@gmail.com", false, false) || staffEmailAllowed("x@zenithbank.com.evil.ng", false, false) {
		t.Error("personal email allowed")
	}
	if !staffEmailAllowed("staff@nuru.app", false, true) || !staffEmailAllowed("guest@partner.ng", true, false) {
		t.Error("demo or invited email refused")
	}
}

func TestVisibleSegments(t *testing.T) {
	rows, hidden := visibleSegments([]map[string]any{{"key": "a", "customers": 49.0}, {"key": "b", "customers": 50.0}, {"key": "c", "customers": 0.0}})
	if len(rows) != 1 || rows[0]["key"] != "b" || hidden != 2 {
		t.Fatalf("got %v hidden %d", rows, hidden)
	}
}

func TestNameFromEmail(t *testing.T) {
	if got := nameFromEmail("amaka.obi@zenithbank.com"); got != "Amaka Obi" {
		t.Fatalf("got %q", got)
	}
}

// TestGate runs the middleware with a signed token and a fake member store.
func TestGate(t *testing.T) {
	signer := auth.NewSigner("test-secret-test-secret")
	people := map[string]member{
		"u-owner":   {Role: "hq", Sub: "owner", Active: true},
		"u-support": {Role: "hq", Sub: "support", Active: true},
		"u-gone":    {Role: "hq", Sub: "owner", Active: false},
		"u-staff":   {Role: "staff", Sub: "admin", Active: true},
		"u-viewer":  {Role: "staff", Sub: "viewer", Active: true},
	}
	load := func(_ context.Context, id string) (member, error) {
		m, ok := people[id]
		if !ok {
			return m, errors.New("no such user")
		}
		m.ID = id
		return m, nil
	}
	cases := []struct {
		user, role, area string
		table            map[string][]string
		code             int
	}{
		{"u-owner", "hq", "team", hqAreas, 200},
		{"u-support", "hq", "support", hqAreas, 200},
		{"u-support", "hq", "overview", hqAreas, 403},
		{"u-gone", "hq", "overview", hqAreas, 403},
		{"u-staff", "hq", "overview", hqAreas, 403},
		{"u-staff", "staff", "team", consoleAreas, 200},
		{"u-viewer", "staff", "segments", consoleAreas, 200},
		{"u-viewer", "staff", "customers", consoleAreas, 403},
		{"u-viewer", "staff", "export", consoleAreas, 403},
		{"nobody", "staff", "overview", consoleAreas, 403},
	}
	for _, c := range cases {
		var seen member
		h := signer.Middleware(gate(load, c.role, c.table, c.area)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			seen = memberFrom(r.Context())
			w.WriteHeader(200)
		})))
		tok, _ := signer.Issue(c.user, people[c.user].Role, time.Minute)
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("Authorization", "Bearer "+tok)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != c.code {
			t.Errorf("%s in %s %s: got %d, want %d", c.user, c.role, c.area, rec.Code, c.code)
		}
		if c.code == 200 && seen.ID != c.user {
			t.Errorf("handler did not get the member for %s", c.user)
		}
	}
}

func TestMetricsP95(t *testing.T) {
	m := newMetrics()
	now := time.Now()
	for i := 1; i <= 100; i++ {
		status := 200
		if i%25 == 0 {
			status = 502
		}
		m.add(now, time.Duration(i)*time.Millisecond, status)
	}
	s := m.snapshot()
	if s.Req != 100 || s.Errs != 4 || s.P95 != 95*time.Millisecond {
		t.Fatalf("%+v", s)
	}
}
