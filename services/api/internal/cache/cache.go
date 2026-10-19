// Package cache is a small key-value and counter store. With REDIS_URL set
// (for example an Upstash rediss:// URL) values live in Redis, so they are
// shared between API instances and survive restarts. Without it, or while
// Redis cannot be reached, the same calls work from memory.
package cache

import (
	"context"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// Prefix keeps NURU's keys apart from anything else in the same database.
const Prefix = "nuru:"

// retryAfter is how long Redis is skipped after a failed call, so a dead
// Redis costs one timeout every half minute rather than one per request.
const retryAfter = 30 * time.Second

type Cache struct {
	rdb *redis.Client

	mu      sync.Mutex
	downTil time.Time
	vals    map[string]entry
	counts  map[string]count
}

type count struct {
	n   int64
	exp time.Time
}

type entry struct {
	val []byte
	exp time.Time
}

// New connects to url. An empty or invalid url gives a memory-only cache;
// an unreachable one is retried in the background on later calls.
func New(url string) *Cache {
	c := &Cache{vals: map[string]entry{}, counts: map[string]count{}}
	url = strings.TrimSpace(url)
	if url == "" {
		return c
	}
	opt, err := redis.ParseURL(url)
	if err != nil {
		log.Printf("cache: REDIS_URL is not a valid redis URL, using memory")
		return c
	}
	opt.DialTimeout = 2 * time.Second
	opt.ReadTimeout = time.Second
	opt.WriteTimeout = time.Second
	opt.MaxRetries = 1
	c.rdb = redis.NewClient(opt)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := c.rdb.Ping(ctx).Err(); err != nil {
		log.Printf("cache: redis not reachable yet, using memory until it is")
		c.markDown()
	} else {
		log.Printf("cache: using redis at %s", opt.Addr)
	}
	return c
}

// Redis returns the client while Redis is in use, or nil when the cache is
// in memory mode (no URL, or a recent failure).
func (c *Cache) Redis() *redis.Client {
	if c == nil || c.rdb == nil {
		return nil
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if time.Now().Before(c.downTil) {
		return nil
	}
	return c.rdb
}

// Enabled reports whether a Redis URL was given, reachable or not.
func (c *Cache) Enabled() bool { return c != nil && c.rdb != nil }

// Fail records a Redis error so callers fall back to memory for a while.
func (c *Cache) Fail(err error) {
	if err == nil || err == redis.Nil {
		return
	}
	log.Printf("cache: redis error, using memory for %s: %v", retryAfter, err)
	c.markDown()
}

func (c *Cache) markDown() {
	c.mu.Lock()
	c.downTil = time.Now().Add(retryAfter)
	c.mu.Unlock()
}

// Mode says where values live right now: "redis" or "memory".
func (c *Cache) Mode() string {
	if c.Redis() != nil {
		return "redis"
	}
	return "memory"
}

// Get returns a value set with Set, if it has not expired.
func (c *Cache) Get(ctx context.Context, key string) ([]byte, bool) {
	if r := c.Redis(); r != nil {
		b, err := r.Get(ctx, Prefix+key).Bytes()
		if err == nil {
			return b, true
		}
		if err == redis.Nil {
			return nil, false
		}
		c.Fail(err)
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.vals[key]
	if !ok || time.Now().After(e.exp) {
		delete(c.vals, key)
		return nil, false
	}
	return e.val, true
}

// Set stores val for ttl.
func (c *Cache) Set(ctx context.Context, key string, val []byte, ttl time.Duration) {
	if r := c.Redis(); r != nil {
		err := r.Set(ctx, Prefix+key, val, ttl).Err()
		if err == nil {
			return
		}
		c.Fail(err)
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	now := time.Now()
	if len(c.vals) > 1000 { // keep memory bounded: drop what has expired
		for k, e := range c.vals {
			if now.After(e.exp) {
				delete(c.vals, k)
			}
		}
	}
	c.vals[key] = entry{val: val, exp: now.Add(ttl)}
}

// IncrBy adds n to a counter that expires ttl after it is first created,
// and returns the new total.
func (c *Cache) IncrBy(ctx context.Context, key string, n int64, ttl time.Duration) int64 {
	if r := c.Redis(); r != nil {
		pipe := r.TxPipeline()
		v := pipe.IncrBy(ctx, Prefix+key, n)
		pipe.ExpireNX(ctx, Prefix+key, ttl)
		if _, err := pipe.Exec(ctx); err == nil {
			return v.Val()
		} else {
			c.Fail(err)
		}
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	now := time.Now()
	e, ok := c.counts[key]
	if !ok || now.After(e.exp) {
		if len(c.counts) > 10000 {
			for k, e := range c.counts {
				if now.After(e.exp) {
					delete(c.counts, k)
				}
			}
		}
		e = count{exp: now.Add(ttl)}
	}
	e.n += n
	c.counts[key] = e
	return e.n
}

// Count reads a counter set with IncrBy.
func (c *Cache) Count(ctx context.Context, key string) int64 {
	if r := c.Redis(); r != nil {
		v, err := r.Get(ctx, Prefix+key).Int64()
		if err == nil || err == redis.Nil {
			return v
		}
		c.Fail(err)
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if e, ok := c.counts[key]; ok && time.Now().Before(e.exp) {
		return e.n
	}
	return 0
}

// Close releases the Redis connection.
func (c *Cache) Close() error {
	if c == nil || c.rdb == nil {
		return nil
	}
	return c.rdb.Close()
}
