package httpapi

import (
	"net/http"
	"time"
)

// securityOverview feeds the security centre score and its rows.
func (s *Server) securityOverview(w http.ResponseWriter, r *http.Request) {
	var hasPIN, face, kyc bool
	var pinAt, pwAt, locked *time.Time
	var created time.Time
	var active int
	s.db.QueryRow(r.Context(), `select pin_hash<>'', face_template is not null, kyc_verified, pin_changed_at, password_changed_at, created_at, transfer_locked_until,
		(select count(*) from sessions where user_id=users.id and revoked_at is null and last_seen_at > now() - interval '12 hours')
		from users where id=$1`, uid(r)).Scan(&hasPIN, &face, &kyc, &pinAt, &pwAt, &created, &locked, &active)
	if pwAt == nil {
		pwAt = &created
	}
	out := map[string]any{"has_pin": hasPIN, "face_enrolled": face, "kyc_verified": kyc, "pin_changed_at": pinAt,
		"password_changed_at": pwAt, "active_sessions": active, "login_alerts": s.loadPrefs(r)["login_alerts"]}
	if locked != nil && locked.After(time.Now()) {
		out["frozen_until"] = locked
	}
	writeJSON(w, 200, out)
}

// freeze pauses transfers for 24 hours and signs out other devices, for a
// customer who thinks someone else has access.
func (s *Server) freeze(w http.ResponseWriter, r *http.Request) {
	s.db.Exec(r.Context(), `update users set transfer_locked_until=now()+interval '24 hours' where id=$1`, uid(r))
	s.endSessions(r.Context(), uid(r), sid(r))
	s.event(r.Context(), uid(r), "account_frozen", "")
	writeJSON(w, 200, map[string]bool{"ok": true})
}
