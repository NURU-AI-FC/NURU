package httpapi

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/NURU-AI-FC/nuru/services/api/internal/monitor"
)

// Platform health: live checks run from this API on every visit. Uptime and
// error history come from UptimeRobot and Sentry only when their keys are
// set (UPTIMEROBOT_API_KEY, SENTRY_AUTH_TOKEN with SENTRY_ORG and
// SENTRY_PROJECT); otherwise the page says they are not connected.
// Reporting is separate: SENTRY_DSN sends errors from each service (see
// internal/monitor), and on start the API creates the UptimeRobot monitors
// this page reads, matched by name.

func resendReady() bool { return os.Getenv("RESEND_API_KEY") != "" }

var probe = &http.Client{Timeout: 4 * time.Second}

// liveChecks pings each part of NURU and times it.
func (s *Server) liveChecks(ctx context.Context) []map[string]any {
	checks := []map[string]any{}
	add := func(key, name, runs, status, note string, ms float64) {
		checks = append(checks, map[string]any{"key": key, "name": name, "runs": runs, "status": status, "note": note, "ms": math.Round(ms)})
	}
	timed := func(f func() error) (float64, error) {
		t := time.Now()
		err := f()
		return float64(time.Since(t).Microseconds()) / 1000, err
	}
	var wg sync.WaitGroup
	var mu sync.Mutex
	results := map[string]func(){}
	run := func(key string, f func() func()) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			done := f()
			mu.Lock()
			results[key] = done
			mu.Unlock()
		}()
	}
	run("web", func() func() {
		if len(s.cfg.WebOrigins) == 0 || s.cfg.WebOrigins[0] == "" || s.cfg.WebOrigins[0] == "*" {
			return func() { add("web", "Web app", "", "unknown", "No web address set in WEB_ORIGINS", 0) }
		}
		web := s.cfg.WebOrigins[0]
		ms, err := timed(func() error { return get(ctx, web, nil) })
		return func() {
			if err != nil {
				add("web", "Web app", hostOf(web), "down", "No answer from "+hostOf(web), ms)
			} else {
				add("web", "Web app", hostOf(web), "up", "", ms)
			}
		}
	})
	run("api", func() func() { return func() { add("api", "Core API", "Go", "up", "Answering this page", 0) } })
	run("db", func() func() {
		ms, err := timed(func() error { var one int; return s.db.QueryRow(ctx, `select 1`).Scan(&one) })
		return func() {
			if err != nil {
				add("db", "Database", "Postgres", "down", "Could not run a query", ms)
			} else {
				add("db", "Database", "Postgres", "up", "", ms)
			}
		}
	})
	run("ai", func() func() {
		var h struct {
			Model   string            `json:"model"`
			Release map[string]string `json:"release"`
		}
		ms, err := timed(func() error { return get(ctx, s.cfg.AIURL+"/health", &h) })
		return func() {
			switch {
			case err != nil:
				add("ai", "AI service", "Python", "down", "No answer from /health", ms)
			case h.Model == "templates":
				add("ai", "AI service", "Python · templates", "warn", "No Claude key, answering from templates", ms)
			default:
				add("ai", "AI service", "Python · "+h.Model, "up", "", ms)
			}
			if err == nil {
				checks[len(checks)-1]["release"] = h.Release
			}
		}
	})
	wg.Wait()
	for _, k := range []string{"web", "api", "db", "ai"} {
		if f := results[k]; f != nil {
			f()
		}
	}
	switch {
	case azureReady() && spitchReady():
		add("voice", "Voice", "Azure Speech · Spitch", "configured", "Keys set. Not called here, to avoid cost", 0)
	case azureReady() || spitchReady():
		add("voice", "Voice", map[bool]string{true: "Azure Speech", false: "Spitch"}[azureReady()], "configured", "One provider set, phones read the rest aloud", 0)
	default:
		add("voice", "Voice", "Phone speech", "off", "No Azure or Spitch key, phones read aloud", 0)
	}
	if resendReady() {
		add("email", "Email", "Resend", "configured", "Keys set. Every send is in the email log", 0)
	} else {
		add("email", "Email", "Resend", "off", "No RESEND_API_KEY, emails are logged but not sent", 0)
	}
	return checks
}

func hostOf(u string) string {
	if p, err := url.Parse(u); err == nil && p.Host != "" {
		return p.Host
	}
	return u
}

func get(ctx context.Context, u string, into any) error {
	req, err := http.NewRequestWithContext(ctx, "GET", u, nil)
	if err != nil {
		return err
	}
	resp, err := probe.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 500 {
		return &httpErr{resp.StatusCode}
	}
	if into != nil {
		return json.NewDecoder(resp.Body).Decode(into)
	}
	return nil
}

type httpErr struct{ code int }

func (e *httpErr) Error() string { return "answered " + http.StatusText(e.code) }

// ---- UptimeRobot ----

type uptimeResult struct {
	Connected bool
	Error     string
	Average   float64
	Monitors  []map[string]any
}

var integrationCache = struct {
	sync.Mutex
	uptime   uptimeResult
	uptimeAt time.Time
	sentry   sentryResult
	sentryAt time.Time
}{}

func (s *Server) uptimeRobot(ctx context.Context) uptimeResult {
	key := os.Getenv("UPTIMEROBOT_API_KEY")
	if key == "" {
		return uptimeResult{}
	}
	integrationCache.Lock()
	defer integrationCache.Unlock()
	if time.Since(integrationCache.uptimeAt) < time.Minute {
		return integrationCache.uptime
	}
	out := uptimeResult{Connected: true}
	form := url.Values{"api_key": {key}, "format": {"json"}, "custom_uptime_ratios": {"30"}, "response_times": {"1"}, "response_times_limit": {"1"}}
	req, _ := http.NewRequestWithContext(ctx, "POST", "https://api.uptimerobot.com/v2/getMonitors", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	var body struct {
		Stat     string `json:"stat"`
		Monitors []struct {
			Name   string `json:"friendly_name"`
			Status int    `json:"status"`
			Ratio  string `json:"custom_uptime_ratio"`
			Avg    any    `json:"average_response_time"`
		} `json:"monitors"`
	}
	resp, err := probe.Do(req)
	if err == nil {
		err = json.NewDecoder(resp.Body).Decode(&body)
		resp.Body.Close()
	}
	if err != nil || body.Stat != "ok" {
		out.Error = "UptimeRobot did not answer, check the key"
	} else {
		sum := 0.0
		for _, m := range body.Monitors {
			var ratio float64
			json.Unmarshal([]byte(m.Ratio), &ratio)
			sum += ratio
			status := map[int]string{0: "paused", 1: "unknown", 2: "up", 8: "warn", 9: "down"}[m.Status]
			out.Monitors = append(out.Monitors, map[string]any{"name": m.Name, "status": status, "uptime": ratio, "ms": m.Avg})
		}
		if len(body.Monitors) > 0 {
			out.Average = math.Round(sum/float64(len(body.Monitors))*100) / 100
		}
	}
	integrationCache.uptime, integrationCache.uptimeAt = out, time.Now()
	return out
}

// ---- Sentry ----

type sentryResult struct {
	Connected bool
	Error     string
	Open, New int
	Hours     [24]int
}

func (s *Server) sentry(ctx context.Context) sentryResult {
	tok, org, proj := os.Getenv("SENTRY_AUTH_TOKEN"), os.Getenv("SENTRY_ORG"), os.Getenv("SENTRY_PROJECT")
	if tok == "" {
		return sentryResult{}
	}
	integrationCache.Lock()
	defer integrationCache.Unlock()
	if time.Since(integrationCache.sentryAt) < time.Minute {
		return integrationCache.sentry
	}
	out := sentryResult{Connected: true}
	if org == "" || proj == "" {
		out.Error = "Set SENTRY_ORG and SENTRY_PROJECT as well"
		return out
	}
	u := "https://sentry.io/api/0/projects/" + url.PathEscape(org) + "/" + url.PathEscape(proj) + "/issues/?query=is:unresolved&statsPeriod=24h&limit=100"
	req, _ := http.NewRequestWithContext(ctx, "GET", u, nil)
	req.Header.Set("Authorization", "Bearer "+tok)
	var issues []struct {
		FirstSeen time.Time `json:"firstSeen"`
		Stats     struct {
			Day [][2]float64 `json:"24h"`
		} `json:"stats"`
	}
	resp, err := probe.Do(req)
	if err == nil {
		if resp.StatusCode != 200 {
			err = &httpErr{resp.StatusCode}
		} else {
			err = json.NewDecoder(resp.Body).Decode(&issues)
		}
		resp.Body.Close()
	}
	if err != nil {
		out.Error = "Sentry did not answer, check the token"
	} else {
		out.Open = len(issues)
		for _, is := range issues {
			if time.Since(is.FirstSeen) < 24*time.Hour {
				out.New++
			}
			for _, p := range is.Stats.Day {
				at := time.Unix(int64(p[0]), 0).In(lagos)
				if at.Format("2006-01-02") == time.Now().In(lagos).Format("2006-01-02") {
					out.Hours[at.Hour()] += int(p[1])
				}
			}
		}
	}
	integrationCache.sentry, integrationCache.sentryAt = out, time.Now()
	return out
}

func (s *Server) hqHealth(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	m := s.metrics.snapshot()
	checks := s.liveChecks(ctx)
	ur := s.uptimeRobot(ctx)
	se := s.sentry(ctx)

	hours := []map[string]any{}
	for h := 0; h < 24; h++ {
		errs := m.Hours[h][1]
		if se.Connected && se.Error == "" {
			errs = se.Hours[h]
		}
		hours = append(hours, map[string]any{"label": time.Date(2000, 1, 1, h, 0, 0, 0, time.UTC).Format("15"), "requests": m.Hours[h][0], "errors": errs})
	}

	// AI answers by how they were made, over the chosen range
	from := since(hqDays(r))
	engines := map[string]float64{}
	rows, err := s.db.Query(ctx, `select case when blocked='off_topic' then 'off_topic' when blocked<>'' then 'blocked' when engine='' then 'unrecorded' else engine end,
		count(*)::float8 from chats where role='assistant' and created_at>=$1 group by 1`, from)
	if err == nil {
		for rows.Next() {
			var k string
			var n float64
			rows.Scan(&k, &n)
			engines[k] += n
		}
		rows.Close()
	}
	var aiP95 *float64
	s.db.QueryRow(ctx, `select percentile_cont(0.95) within group (order by latency_ms)::float8 from chats where role='assistant' and latency_ms is not null and created_at>=$1`, from).Scan(&aiP95)

	releases := []map[string]any{}
	if sha := os.Getenv("RAILWAY_GIT_COMMIT_SHA"); sha != "" {
		msg, _, _ := strings.Cut(os.Getenv("RAILWAY_GIT_COMMIT_MESSAGE"), "\n")
		releases = append(releases, map[string]any{"service": "api", "sha": sha[:min(7, len(sha))], "message": msg, "at": m.Started})
	}
	for _, c := range checks {
		if rel, ok := c["release"].(map[string]string); ok && rel["sha"] != "" {
			releases = append(releases, map[string]any{"service": "ai", "sha": rel["sha"], "message": rel["message"]})
		}
	}

	out := map[string]any{
		"started": m.Started, "requests": m.Req, "errors": m.Errs, "error_rate": pct(float64(m.Errs), float64(m.Req)),
		"p95_ms": m.P95.Milliseconds(), "samples": m.Samples, "hours": hours, "checks": checks, "engines": engines, "releases": releases,
		"uptimerobot": map[string]any{"connected": ur.Connected, "error": ur.Error, "average": ur.Average, "monitors": ur.Monitors},
		"sentry":      map[string]any{"connected": se.Connected, "error": se.Error, "open": se.Open, "new": se.New, "reporting": monitor.Enabled()},
	}
	if aiP95 != nil {
		out["ai_p95_ms"] = math.Round(*aiP95)
	}
	writeJSON(w, 200, out)
}
