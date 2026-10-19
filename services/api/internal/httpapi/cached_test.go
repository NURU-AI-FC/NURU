package httpapi

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"

	"github.com/NURU-AI-FC/nuru/services/api/internal/cache"
)

func TestCachedServesSecondCallFromCache(t *testing.T) {
	for _, url := range []string{"", "redis://127.0.0.1:1/0", "redis://" + miniredis.RunT(t).Addr()} {
		s := &Server{cache: cache.New(url)}
		calls := 0
		h := s.cached(time.Minute)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			calls++
			writeJSON(w, 200, map[string]int{"n": calls})
		}))
		var bodies []string
		for range 2 {
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, httptest.NewRequest("GET", "/hq/overview?days=7", nil))
			bodies = append(bodies, rec.Body.String())
		}
		if calls != 1 || bodies[0] != bodies[1] {
			t.Fatalf("%q: handler ran %d times, bodies %q", url, calls, bodies)
		}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest("GET", "/hq/overview?days=30", nil))
		if calls != 2 {
			t.Fatalf("%q: a different range should not share the cached reply", url)
		}
	}
}

func TestCachedSkipsErrors(t *testing.T) {
	s := &Server{cache: cache.New("")}
	calls := 0
	h := s.cached(time.Minute)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		fail(w, 500, "boom")
	}))
	for range 2 {
		h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", "/console/risk", nil))
	}
	if calls != 2 {
		t.Fatal("an error reply was cached")
	}
}

func TestMetricsSurviveRestartWithRedis(t *testing.T) {
	mr := miniredis.RunT(t)
	c := cache.New("redis://" + mr.Addr())
	m := newMetrics(c)
	now := time.Now()
	for i := 1; i <= 10; i++ {
		status := 200
		if i == 10 {
			status = 500
		}
		m.add(now, time.Duration(i)*time.Millisecond, status)
	}
	// unflushed counts already show
	if s := m.snapshot(); s.Req != 10 || s.Errs != 1 {
		t.Fatalf("before flush: %+v", s)
	}
	m.flush()
	again := newMetrics(cache.New("redis://" + mr.Addr())) // a restart
	s := again.snapshot()
	if s.Req != 10 || s.Errs != 1 || s.Samples != 10 || s.P95 != 10*time.Millisecond {
		t.Fatalf("after restart: %+v", s)
	}
	// with Redis gone the snapshot falls back to this process's own counts
	mr.Close()
	again.add(now, time.Millisecond, 200)
	if s := again.snapshot(); s.Req != 1 {
		t.Fatalf("fallback: %+v", s)
	}
}

func TestMetricsMemoryWithoutRedis(t *testing.T) {
	m := newMetrics(cache.New(""))
	m.add(time.Now(), time.Millisecond, 200)
	m.flush() // no-op
	if s := m.snapshot(); s.Req != 1 || len(m.pending) != 0 {
		t.Fatalf("%+v pending=%v", s, m.pending)
	}
}
