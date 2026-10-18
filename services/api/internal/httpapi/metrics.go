package httpapi

import (
	"net/http"
	"sort"
	"sync"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

// metrics counts requests, server errors and response times in memory, for
// NURU HQ's platform health page. It resets when the API restarts, and the
// page says so.
type metrics struct {
	mu      sync.Mutex
	started time.Time
	day     string
	hours   [24]struct{ req, errs int }
	lat     [2048]time.Duration
	n       int
}

func newMetrics() *metrics { return &metrics{started: time.Now()} }

func (m *metrics) record(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(ww, r)
		m.add(start, time.Since(start), ww.Status())
	})
}

func (m *metrics) add(at time.Time, took time.Duration, status int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	local := at.In(lagos)
	if d := local.Format("2006-01-02"); d != m.day {
		m.day = d
		m.hours = [24]struct{ req, errs int }{}
	}
	h := &m.hours[local.Hour()]
	h.req++
	if status >= 500 {
		h.errs++
	}
	m.lat[m.n%len(m.lat)] = took
	m.n++
}

type metricSnap struct {
	Started time.Time
	Req     int
	Errs    int
	Hours   [24][2]int
	P95     time.Duration
	Samples int
}

func (m *metrics) snapshot() metricSnap {
	m.mu.Lock()
	defer m.mu.Unlock()
	s := metricSnap{Started: m.started}
	if m.day == time.Now().In(lagos).Format("2006-01-02") {
		for i, h := range m.hours {
			s.Req += h.req
			s.Errs += h.errs
			s.Hours[i] = [2]int{h.req, h.errs}
		}
	}
	n := min(m.n, len(m.lat))
	if n > 0 {
		l := append([]time.Duration(nil), m.lat[:n]...)
		sort.Slice(l, func(i, j int) bool { return l[i] < l[j] })
		s.P95 = l[(n*95-1)/100]
		s.Samples = n
	}
	return s
}

var lagos = func() *time.Location {
	if l, err := time.LoadLocation("Africa/Lagos"); err == nil {
		return l
	}
	return time.FixedZone("WAT", 3600)
}()
