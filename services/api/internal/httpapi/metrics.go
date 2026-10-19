package httpapi

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/go-chi/chi/v5/middleware"

	"github.com/NURU-AI-FC/nuru/services/api/internal/cache"
)

// metrics counts requests, server errors and response times for NURU HQ's
// platform health page. Counts are always kept in memory; with Redis
// configured they are also flushed there every few seconds, so today's
// figures survive restarts and add up across instances. Without Redis they
// reset when the API restarts, and the page says so.
type metrics struct {
	mu      sync.Mutex
	started time.Time
	day     string
	hours   [24]struct{ req, errs int }
	lat     [2048]time.Duration
	n       int

	store   *cache.Cache
	pending map[string]map[string]int64 // day -> hash field -> delta
	pendLat []time.Duration
}

const (
	metricsFlush = 10 * time.Second
	latKey       = cache.Prefix + "metrics:lat"
)

func dayKey(day string) string { return cache.Prefix + "metrics:day:" + day }

func newMetrics(store *cache.Cache) *metrics {
	m := &metrics{started: time.Now(), store: store, pending: map[string]map[string]int64{}}
	if store.Enabled() {
		go m.flushLoop()
	}
	return m
}

func (m *metrics) flushLoop() {
	for range time.Tick(metricsFlush) {
		m.flush()
	}
}

// flush writes counts gathered since the last flush to Redis. If Redis is
// off they are dropped from the queue; the in-memory figures still have them.
func (m *metrics) flush() {
	m.mu.Lock()
	pending, lat := m.pending, m.pendLat
	m.pending, m.pendLat = map[string]map[string]int64{}, nil
	m.mu.Unlock()
	r := m.store.Redis()
	if r == nil || (len(pending) == 0 && len(lat) == 0) {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	pipe := r.Pipeline()
	for day, fields := range pending {
		for f, n := range fields {
			pipe.HIncrBy(ctx, dayKey(day), f, n)
		}
		pipe.Expire(ctx, dayKey(day), 72*time.Hour)
	}
	if len(lat) > 0 {
		vals := make([]any, len(lat))
		for i, d := range lat {
			vals[i] = d.Microseconds()
		}
		pipe.LPush(ctx, latKey, vals...)
		pipe.LTrim(ctx, latKey, 0, int64(len(m.lat)-1))
	}
	if _, err := pipe.Exec(ctx); err != nil {
		m.store.Fail(err)
	}
}

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
	if m.store.Enabled() {
		f := m.pending[m.day]
		if f == nil {
			f = map[string]int64{}
			m.pending[m.day] = f
		}
		f[fmt.Sprintf("h%dr", local.Hour())]++
		if status >= 500 {
			f[fmt.Sprintf("h%de", local.Hour())]++
		}
		if len(m.pendLat) < len(m.lat) {
			m.pendLat = append(m.pendLat, took)
		}
	}
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
	if s, ok := m.shared(); ok {
		return s
	}
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

// shared reads today's figures from Redis, plus what has not been flushed yet.
func (m *metrics) shared() (metricSnap, bool) {
	r := m.store.Redis()
	if r == nil {
		return metricSnap{}, false
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	day := time.Now().In(lagos).Format("2006-01-02")
	pipe := r.Pipeline()
	h := pipe.HGetAll(ctx, dayKey(day))
	l := pipe.LRange(ctx, latKey, 0, int64(len(m.lat)-1))
	if _, err := pipe.Exec(ctx); err != nil {
		m.store.Fail(err)
		return metricSnap{}, false
	}
	m.mu.Lock()
	s := metricSnap{Started: m.started}
	fields := map[string]int64{}
	for f, v := range h.Val() {
		fields[f], _ = strconv.ParseInt(v, 10, 64)
	}
	for f, n := range m.pending[day] {
		fields[f] += n
	}
	lat := append([]time.Duration(nil), m.pendLat...)
	m.mu.Unlock()
	for i := range 24 {
		req, errs := int(fields[fmt.Sprintf("h%dr", i)]), int(fields[fmt.Sprintf("h%de", i)])
		s.Hours[i] = [2]int{req, errs}
		s.Req += req
		s.Errs += errs
	}
	for _, v := range l.Val() {
		if us, err := strconv.ParseInt(v, 10, 64); err == nil {
			lat = append(lat, time.Duration(us)*time.Microsecond)
		}
	}
	if len(lat) > len(m.lat) {
		lat = lat[:len(m.lat)]
	}
	if n := len(lat); n > 0 {
		sort.Slice(lat, func(i, j int) bool { return lat[i] < lat[j] })
		s.P95 = lat[(n*95-1)/100]
		s.Samples = n
	}
	return s, true
}

var lagos = func() *time.Location {
	if l, err := time.LoadLocation("Africa/Lagos"); err == nil {
		return l
	}
	return time.FixedZone("WAT", 3600)
}()
