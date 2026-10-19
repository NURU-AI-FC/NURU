package monitor

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// Monitor is one UptimeRobot HTTP check, matched by its friendly name.
type Monitor struct {
	Name string
	URL  string
}

var uptimeAPI = "https://api.uptimerobot.com/v2/"

// DefaultMonitors are the checks NURU wants: the web app and the API health
// route through the web app's /api proxy. APP_URL changes the base.
func DefaultMonitors() []Monitor {
	base := strings.TrimRight(os.Getenv("APP_URL"), "/")
	if base == "" {
		base = "https://web-production-fd530.up.railway.app"
	}
	return []Monitor{{"NURU web", base + "/"}, {"NURU API health", base + "/api/health"}}
}

// EnsureUptimeMonitors creates any of the default monitors that are missing
// when UPTIMEROBOT_API_KEY is set. It is safe to run on every start: monitors
// are matched by friendly name and never duplicated or changed.
func EnsureUptimeMonitors(ctx context.Context) {
	key := os.Getenv("UPTIMEROBOT_API_KEY")
	if key == "" {
		return
	}
	created, err := ensure(ctx, &http.Client{Timeout: 15 * time.Second}, key, DefaultMonitors())
	if err != nil {
		log.Printf("uptimerobot: %v", err)
		return
	}
	for _, n := range created {
		log.Printf("uptimerobot: created monitor %q", n)
	}
}

type urResp struct {
	Stat     string `json:"stat"`
	Error    any    `json:"error"`
	Monitors []struct {
		Name string `json:"friendly_name"`
		URL  string `json:"url"`
	} `json:"monitors"`
	Pagination struct {
		Offset int `json:"offset"`
		Limit  int `json:"limit"`
		Total  int `json:"total"`
	} `json:"pagination"`
}

func call(ctx context.Context, hc *http.Client, method string, form url.Values) (urResp, error) {
	var out urResp
	req, err := http.NewRequestWithContext(ctx, "POST", uptimeAPI+method, strings.NewReader(form.Encode()))
	if err != nil {
		return out, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Cache-Control", "no-cache")
	resp, err := hc.Do(req)
	if err != nil {
		return out, err
	}
	defer resp.Body.Close()
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return out, fmt.Errorf("%s: unreadable answer (%d)", method, resp.StatusCode)
	}
	if out.Stat != "ok" {
		return out, fmt.Errorf("%s failed: %v", method, out.Error)
	}
	return out, nil
}

func ensure(ctx context.Context, hc *http.Client, key string, want []Monitor) ([]string, error) {
	have := map[string]bool{}
	for offset := 0; ; {
		r, err := call(ctx, hc, "getMonitors", url.Values{"api_key": {key}, "format": {"json"}, "offset": {fmt.Sprint(offset)}, "limit": {"50"}})
		if err != nil {
			return nil, err
		}
		for _, m := range r.Monitors {
			have[strings.ToLower(m.Name)] = true
		}
		offset += len(r.Monitors)
		if len(r.Monitors) == 0 || offset >= r.Pagination.Total {
			break
		}
	}
	var created []string
	for _, m := range want {
		if have[strings.ToLower(m.Name)] {
			continue
		}
		// type 1 is HTTP(s); 300 seconds is the free plan interval
		if _, err := call(ctx, hc, "newMonitor", url.Values{"api_key": {key}, "format": {"json"}, "type": {"1"},
			"friendly_name": {m.Name}, "url": {m.URL}, "interval": {"300"}}); err != nil {
			return created, err
		}
		created = append(created, m.Name)
	}
	return created, nil
}
