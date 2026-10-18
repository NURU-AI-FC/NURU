package httpapi

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/NURU-AI-FC/nuru/services/api/internal/auth"
)

// deviceName turns a user agent into something a person recognises.
func deviceName(ua string) string {
	l := strings.ToLower(ua)
	dev := "Unknown device"
	switch {
	case strings.Contains(l, "iphone"):
		dev = "iPhone"
	case strings.Contains(l, "ipad"):
		dev = "iPad"
	case strings.Contains(l, "android"):
		dev = "Android phone"
	case strings.Contains(l, "mac os"):
		dev = "Mac"
	case strings.Contains(l, "windows"):
		dev = "Windows PC"
	case strings.Contains(l, "linux"):
		dev = "Linux PC"
	}
	browser := ""
	switch {
	case strings.Contains(l, "edg/"):
		browser = "Edge"
	case strings.Contains(l, "firefox"):
		browser = "Firefox"
	case strings.Contains(l, "chrome") || strings.Contains(l, "crios"):
		browser = "Chrome"
	case strings.Contains(l, "safari"):
		browser = "Safari"
	}
	if browser != "" {
		return dev + " · " + browser
	}
	return dev
}

// startSession records the device that just signed in and returns its id.
func (s *Server) startSession(r *http.Request, userID string) string {
	ua := r.UserAgent()
	if len(ua) > 300 {
		ua = ua[:300]
	}
	ip := r.RemoteAddr
	if h, _, err := net.SplitHostPort(ip); err == nil {
		ip = h
	}
	if p := strings.Split(ip, "."); len(p) == 4 {
		ip = p[0] + "." + p[1] + ".xx.xx"
	}
	var id string
	if err := s.db.QueryRow(r.Context(), `insert into sessions(user_id,device,user_agent,ip) values($1,$2,$3,$4) returning id`,
		userID, deviceName(ua), ua, ip).Scan(&id); err != nil {
		return ""
	}
	return id
}

func (s *Server) issue(r *http.Request, userID, role string) (string, error) {
	return s.tokens.IssueSession(userID, role, s.startSession(r, userID), 12*time.Hour)
}

// liveSession rejects tokens whose session was revoked. Tokens issued before
// sessions existed carry no id and still work until they expire.
func (s *Server) liveSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c := auth.From(r.Context())
		if c != nil && c.ID != "" {
			var revoked *time.Time
			var seen time.Time
			err := s.db.QueryRow(r.Context(), `select revoked_at, last_seen_at from sessions where id=$1 and user_id=$2`, c.ID, c.UserID).Scan(&revoked, &seen)
			if err != nil || revoked != nil {
				http.Error(w, `{"error":"you were signed out of this device"}`, http.StatusUnauthorized)
				return
			}
			if time.Since(seen) > time.Minute {
				s.db.Exec(r.Context(), `update sessions set last_seen_at=now() where id=$1`, c.ID)
			}
		}
		next.ServeHTTP(w, r)
	})
}

func sid(r *http.Request) string {
	if c := auth.From(r.Context()); c != nil {
		return c.ID
	}
	return ""
}

func (s *Server) sessions(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `select id,device,ip,created_at,last_seen_at,revoked_at from sessions
		where user_id=$1 and (revoked_at is null or revoked_at > now() - interval '60 days') order by revoked_at is not null, last_seen_at desc limit 20`, uid(r))
	if err != nil {
		fail(w, 500, "could not load your devices")
		return
	}
	defer rows.Close()
	type sess struct {
		ID       string     `json:"id"`
		Device   string     `json:"device"`
		IP       string     `json:"ip"`
		Created  time.Time  `json:"created_at"`
		LastSeen time.Time  `json:"last_seen_at"`
		Revoked  *time.Time `json:"revoked_at"`
		Current  bool       `json:"current"`
	}
	out := []sess{}
	cur := sid(r)
	for rows.Next() {
		var x sess
		if rows.Scan(&x.ID, &x.Device, &x.IP, &x.Created, &x.LastSeen, &x.Revoked) == nil {
			x.Current = x.ID == cur
			out = append(out, x)
		}
	}
	writeJSON(w, 200, out)
}

func (s *Server) revokeSession(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == sid(r) {
		fail(w, 400, "use log out to end this session")
		return
	}
	tag, err := s.db.Exec(r.Context(), `update sessions set revoked_at=now() where id=$1 and user_id=$2 and revoked_at is null`, id, uid(r))
	if err != nil || tag.RowsAffected() == 0 {
		fail(w, 404, "session not found")
		return
	}
	s.event(r.Context(), uid(r), "session_revoked", id)
	writeJSON(w, 200, map[string]bool{"ok": true})
}

// revokeOthers signs out every device except this one.
func (s *Server) revokeOthers(w http.ResponseWriter, r *http.Request) {
	n := s.endSessions(r.Context(), uid(r), sid(r))
	s.event(r.Context(), uid(r), "sessions_revoked", "others")
	writeJSON(w, 200, map[string]int64{"revoked": n})
}

func (s *Server) endSessions(ctx context.Context, user, keep string) int64 {
	tag, err := s.db.Exec(ctx, `update sessions set revoked_at=now() where user_id=$1 and revoked_at is null and id::text<>$2`, user, keep)
	if err != nil {
		return 0
	}
	return tag.RowsAffected()
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	var in struct{ All bool }
	_ = json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<10)).Decode(&in)
	if in.All {
		s.endSessions(r.Context(), uid(r), "")
	} else if id := sid(r); id != "" {
		s.db.Exec(r.Context(), `update sessions set revoked_at=now() where id=$1`, id)
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}
