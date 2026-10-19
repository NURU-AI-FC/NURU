package cache

import (
	"context"
	"strconv"
	"time"

	"github.com/go-chi/httprate"
	"github.com/redis/go-redis/v9"
)

// LimitCounter returns an httprate counter that keeps its windows in Redis,
// so limits hold across restarts and instances. name keeps each limiter's
// counts apart. While Redis is off it counts in memory, like httprate does
// by default.
func (c *Cache) LimitCounter(name string) httprate.LimitCounter {
	return &limitCounter{c: c, name: name, local: httprate.NewLocalLimitCounter(time.Minute)}
}

type limitCounter struct {
	c      *Cache
	name   string
	window time.Duration
	local  httprate.LimitCounter
}

func (l *limitCounter) key(key string, window time.Time) string {
	return Prefix + "rl:" + l.name + ":" + key + ":" + strconv.FormatInt(window.Unix(), 10)
}

func (l *limitCounter) Config(requestLimit int, windowLength time.Duration) {
	l.window = windowLength
	l.local.Config(requestLimit, windowLength)
}

func (l *limitCounter) Increment(key string, currentWindow time.Time) error {
	return l.IncrementBy(key, currentWindow, 1)
}

func (l *limitCounter) IncrementBy(key string, currentWindow time.Time, amount int) error {
	if r := l.c.Redis(); r != nil {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		k := l.key(key, currentWindow)
		pipe := r.TxPipeline()
		pipe.IncrBy(ctx, k, int64(amount))
		pipe.Expire(ctx, k, 2*l.window+time.Second)
		_, err := pipe.Exec(ctx)
		if err == nil {
			return nil
		}
		l.c.Fail(err)
	}
	return l.local.IncrementBy(key, currentWindow, amount)
}

func (l *limitCounter) Get(key string, currentWindow, previousWindow time.Time) (int, int, error) {
	if r := l.c.Redis(); r != nil {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		vals, err := r.MGet(ctx, l.key(key, currentWindow), l.key(key, previousWindow)).Result()
		if err == nil || err == redis.Nil {
			return toInt(vals, 0), toInt(vals, 1), nil
		}
		l.c.Fail(err)
	}
	return l.local.Get(key, currentWindow, previousWindow)
}

func toInt(vals []any, i int) int {
	if i >= len(vals) {
		return 0
	}
	s, _ := vals[i].(string)
	n, _ := strconv.Atoi(s)
	return n
}
