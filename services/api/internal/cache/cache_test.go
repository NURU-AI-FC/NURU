package cache

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
)

func exercise(t *testing.T, c *Cache) {
	t.Helper()
	ctx := context.Background()
	if _, ok := c.Get(ctx, "missing"); ok {
		t.Fatal("found a key that was never set")
	}
	c.Set(ctx, "k", []byte("v"), time.Minute)
	if b, ok := c.Get(ctx, "k"); !ok || string(b) != "v" {
		t.Fatalf("get after set = %q %v", b, ok)
	}
	c.Set(ctx, "gone", []byte("v"), time.Millisecond)
	time.Sleep(5 * time.Millisecond)
	if _, ok := c.Get(ctx, "gone"); ok && c.Mode() == "memory" {
		t.Fatal("expired value still returned")
	}
	if n := c.IncrBy(ctx, "n", 2, time.Minute); n != 2 {
		t.Fatalf("first incr = %d", n)
	}
	if n := c.IncrBy(ctx, "n", 3, time.Minute); n != 5 {
		t.Fatalf("second incr = %d", n)
	}
	if n := c.Count(ctx, "n"); n != 5 {
		t.Fatalf("count = %d", n)
	}
}

func TestMemoryWhenNoURL(t *testing.T) {
	c := New("")
	if c.Mode() != "memory" || c.Redis() != nil {
		t.Fatal("expected memory mode without REDIS_URL")
	}
	exercise(t, c)
}

func TestMemoryWhenURLInvalid(t *testing.T) {
	c := New("not a url")
	if c.Mode() != "memory" {
		t.Fatal("expected memory mode for an invalid URL")
	}
	exercise(t, c)
}

func TestMemoryWhenRedisUnreachable(t *testing.T) {
	c := New("redis://127.0.0.1:1/0")
	if c.Mode() != "memory" {
		t.Fatal("expected memory mode when redis is down")
	}
	exercise(t, c)
}

func TestRedisAndFallbackWhenItDies(t *testing.T) {
	mr := miniredis.RunT(t)
	c := New("redis://" + mr.Addr())
	if c.Mode() != "redis" {
		t.Fatal("expected redis mode")
	}
	exercise(t, c)
	if !mr.Exists(Prefix + "k") {
		t.Fatal("value did not reach redis")
	}
	// a second instance (a restart) sees the same values
	if b, ok := New("redis://"+mr.Addr()).Get(context.Background(), "k"); !ok || string(b) != "v" {
		t.Fatal("value did not survive a new client")
	}
	mr.Close()
	ctx := context.Background()
	c.Set(ctx, "after", []byte("x"), time.Minute) // fails over to memory
	if c.Mode() != "memory" {
		t.Fatal("expected memory mode after redis went away")
	}
	if b, ok := c.Get(ctx, "after"); !ok || string(b) != "x" {
		t.Fatal("memory fallback lost the value")
	}
}

func TestLimitCounter(t *testing.T) {
	for _, tc := range []struct {
		name string
		c    func(t *testing.T) *Cache
	}{
		{"memory", func(t *testing.T) *Cache { return New("") }},
		{"redis", func(t *testing.T) *Cache { return New("redis://" + miniredis.RunT(t).Addr()) }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			lc := tc.c(t).LimitCounter("test")
			lc.Config(5, time.Minute)
			now := time.Now().UTC().Truncate(time.Minute)
			prev := now.Add(-time.Minute)
			lc.IncrementBy("ip", prev, 4)
			lc.Increment("ip", now)
			lc.Increment("ip", now)
			curr, before, err := lc.Get("ip", now, prev)
			if err != nil || curr != 2 || before != 4 {
				t.Fatalf("got %d %d %v, want 2 4", curr, before, err)
			}
		})
	}
}
