package httpapi

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/NURU-AI-FC/nuru/services/api/internal/seed"
)

// linkAccount completes a sandbox Mono link: the bank login and consent
// happen in the app, and here the account and its history are created.
func (s *Server) linkAccount(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Bank  string
		Scope []string
	}
	if !decode(w, r, &in) {
		return
	}
	if _, ok := seed.Banks[in.Bank]; !ok {
		fail(w, 400, "that bank is not in the sandbox yet")
		return
	}
	var n int
	s.db.QueryRow(r.Context(), `select count(*) from accounts where user_id=$1`, uid(r)).Scan(&n)
	if n >= 8 {
		fail(w, 400, "you can link up to 8 accounts")
		return
	}
	a, err := seed.Link(r.Context(), s.db, uid(r), in.Bank)
	if err != nil {
		log.Printf("link %s: %v", uid(r), err)
		fail(w, 500, "could not link the account")
		return
	}
	s.event(r.Context(), uid(r), "account_linked", in.Bank)
	writeJSON(w, 201, a)
}

func (s *Server) unlinkAccount(w http.ResponseWriter, r *http.Request) {
	var n int
	s.db.QueryRow(r.Context(), `select count(*) from accounts where user_id=$1`, uid(r)).Scan(&n)
	if n <= 1 {
		fail(w, 400, "keep at least one account linked")
		return
	}
	var bank string
	err := s.db.QueryRow(r.Context(), `delete from accounts where id=$1 and user_id=$2 returning bank`, chi.URLParam(r, "id"), uid(r)).Scan(&bank)
	if err != nil {
		fail(w, 404, "account not found")
		return
	}
	s.event(r.Context(), uid(r), "account_unlinked", bank)
	writeJSON(w, 200, map[string]bool{"ok": true})
}

// prefDefaults lists the voice and privacy preferences and their defaults.
var prefDefaults = map[string]any{
	"voice": "female", "speed": "normal", "read_aloud": true, "hold_to_talk": true,
	"save_chats": true, "use_insights": true, "improve": false, "login_alerts": true,
}

func (s *Server) loadPrefs(r *http.Request) map[string]any {
	out := map[string]any{}
	for k, v := range prefDefaults {
		out[k] = v
	}
	var raw []byte
	if s.db.QueryRow(r.Context(), `select prefs from users where id=$1`, uid(r)).Scan(&raw) == nil {
		saved := map[string]any{}
		json.Unmarshal(raw, &saved)
		for k, v := range saved {
			if _, ok := prefDefaults[k]; ok {
				out[k] = v
			}
		}
	}
	return out
}

func (s *Server) prefs(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, s.loadPrefs(r))
}

func (s *Server) updatePrefs(w http.ResponseWriter, r *http.Request) {
	in := map[string]any{}
	if !decode(w, r, &in) {
		return
	}
	choices := map[string]map[string]bool{"voice": {"female": true, "male": true}, "speed": {"slow": true, "normal": true, "fast": true}}
	cur := s.loadPrefs(r)
	for k, v := range in {
		def, ok := prefDefaults[k]
		if !ok {
			continue
		}
		switch def.(type) {
		case bool:
			if b, ok := v.(bool); ok {
				cur[k] = b
			}
		case string:
			if str, ok := v.(string); ok && choices[k][str] {
				cur[k] = str
			}
		}
	}
	raw, _ := json.Marshal(cur)
	s.db.Exec(r.Context(), `update users set prefs=$1 where id=$2`, raw, uid(r))
	if v, ok := in["save_chats"].(bool); ok && !v {
		s.db.Exec(r.Context(), `delete from chats where user_id=$1`, uid(r))
	}
	writeJSON(w, 200, cur)
}

// export gives the customer everything NURU holds about them as one file,
// with chats decrypted so the copy is readable.
func (s *Server) export(w http.ResponseWriter, r *http.Request) {
	ctx, id := r.Context(), uid(r)
	u, err := scanUser(s.db.QueryRow(ctx, `select `+userCols+` from users where id=$1`, id))
	if err != nil {
		fail(w, 404, "account not found")
		return
	}
	accts, _ := s.listAccounts(ctx, id)
	rows := func(q string) []map[string]any {
		out := []map[string]any{}
		res, err := s.db.Query(ctx, q, id)
		if err != nil {
			return out
		}
		defer res.Close()
		cols := res.FieldDescriptions()
		for res.Next() {
			vals, err := res.Values()
			if err != nil {
				continue
			}
			m := map[string]any{}
			for i, c := range cols {
				m[c.Name] = vals[i]
			}
			out = append(out, m)
		}
		return out
	}
	data := map[string]any{
		"exported_at":  time.Now().UTC(),
		"profile":      u,
		"preferences":  s.loadPrefs(r),
		"accounts":     accts,
		"transactions": rows(`select t.created_at, a.name as account, t.direction, t.amount::float8 as amount, t.category, t.merchant, t.narration from transactions t join accounts a on a.id=t.account_id where t.user_id=$1 order by t.created_at desc`),
		"payees":       rows(`select name, bank, '••••' || right(account,4) as account from payees where user_id=$1`),
		"reminders":    rows(`select title, kind, amount::float8 as amount, due_at, done from reminders where user_id=$1`),
		"loans":        rows(`select lender, principal::float8 as principal, rate_pct::float8 as rate_pct, months, balance::float8 as balance from loans where user_id=$1`),
		"investments":  rows(`select kind, name, value::float8 as value, contributed::float8 as contributed from investments where user_id=$1`),
		"chats":        s.loadChat(ctx, id, "", 5000),
		"sessions":     rows(`select device, ip, created_at, last_seen_at, revoked_at from sessions where user_id=$1 order by created_at desc`),
		"security_log": rows(`select kind, created_at from security_events where user_id=$1 order by created_at desc limit 500`),
	}
	s.event(ctx, id, "data_exported", "")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="nuru-data-%s.json"`, time.Now().Format("2006-01-02")))
	writeJSON(w, 200, data)
}
