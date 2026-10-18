package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type chatMsg struct {
	Role    string          `json:"role"`
	Content string          `json:"content"`
	Lang    string          `json:"lang"`
	At      time.Time       `json:"at"`
	Thread  string          `json:"thread,omitempty"`
	Blocked string          `json:"blocked,omitempty"`
	Sources json.RawMessage `json:"sources,omitempty"`
}

var digits = regexp.MustCompile(`\d{6,}`)

// mask hides long digit runs such as account numbers and BVNs before text
// leaves the API, either to the AI model or into the audit log.
func mask(s string) string {
	return digits.ReplaceAllStringFunc(s, func(m string) string { return strings.Repeat("•", len(m)-4) + m[len(m)-4:] })
}

// snapshot is the only data the AI sees: numbers we computed ourselves, with
// names and account numbers already masked. The model never queries the DB.
func (s *Server) snapshot(ctx context.Context, user string) map[string]any {
	var name, bizName string
	s.db.QueryRow(ctx, `select split_part(name,' ',1), business_name from users where id=$1`, user).Scan(&name, &bizName)
	accts, _ := s.listAccounts(ctx, user)
	month, _ := s.computeSummary(ctx, user, "month", false)
	week, _ := s.computeSummary(ctx, user, "week", false)
	cmp, _ := s.computeCompare(ctx, user)
	fc, _ := s.computeForecast(ctx, user)
	recent, _ := s.recent(ctx, user, 15, "", false)
	var rem []map[string]any
	rows, _ := s.db.Query(ctx, `select title, amount::float8, due_at from reminders where user_id=$1 and not done order by due_at limit 6`, user)
	for rows != nil && rows.Next() {
		var t string
		var a float64
		var d time.Time
		rows.Scan(&t, &a, &d)
		rem = append(rem, map[string]any{"title": t, "amount": a, "due": d.Format("2 Jan")})
	}
	if rows != nil {
		rows.Close()
	}
	var loans []map[string]any
	rows, _ = s.db.Query(ctx, `select lender, balance::float8, monthly::float8, rate_pct::float8, next_due_at from loans where user_id=$1`, user)
	for rows != nil && rows.Next() {
		var l string
		var b, m, rt float64
		var d time.Time
		rows.Scan(&l, &b, &m, &rt, &d)
		loans = append(loans, map[string]any{"lender": l, "balance": b, "monthly": m, "rate_pct": rt, "next_due": d.Format("2 Jan")})
	}
	if rows != nil {
		rows.Close()
	}
	acc := []map[string]any{}
	for _, a := range accts {
		acc = append(acc, map[string]any{"name": a.Name, "balance": a.Balance, "number": a.Number})
	}
	tx := []map[string]any{}
	for _, t := range recent {
		tx = append(tx, map[string]any{"date": t.At.Format("2 Jan"), "merchant": mask(t.Merchant), "category": t.Category, "amount": t.Amount, "direction": t.Direction})
	}
	snap := map[string]any{
		"first_name": name, "business": bizName, "today": time.Now().Format("Monday 2 January 2006"),
		"accounts": acc, "this_month": map[string]any{"in": month.In, "out": month.Out, "by_category": month.Categories, "last_month_same_days_out": month.PrevOut},
		"this_week":    map[string]any{"in": week.In, "out": week.Out, "by_category": week.Categories},
		"three_months": cmp, "forecast_30_days": fc, "upcoming": rem, "loans": loans, "recent_transactions": tx,
		"insights": s.computeInsights(ctx, user),
	}
	payees := []string{}
	if prow, err := s.db.Query(ctx, `select name from payees where user_id=$1 order by name`, user); err == nil {
		for prow.Next() {
			var n string
			prow.Scan(&n)
			payees = append(payees, n)
		}
		prow.Close()
	}
	snap["payees"] = payees
	snap["customer_descriptions"] = s.describedForAI(ctx, user)
	_, snap["transactions_without_description"] = s.pendingDescriptions(ctx, user, 0)
	if bizName != "" {
		if b, err := s.computeSummary(ctx, user, "month", true); err == nil {
			snap["business_month"] = map[string]any{"in": b.In, "out": b.Out, "by_category": b.Categories}
		}
	}
	return snap
}

var uuidRe = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

func (s *Server) chat(w http.ResponseWriter, r *http.Request) {
	var in struct{ Message, Lang, Thread string }
	if !decode(w, r, &in) {
		return
	}
	in.Message = strings.TrimSpace(in.Message)
	if in.Message == "" || len(in.Message) > 2000 {
		fail(w, 400, "ask a question up to 2000 characters")
		return
	}
	if in.Lang == "" {
		in.Lang = "en"
	}
	user := uid(r)
	var history []chatMsg
	if uuidRe.MatchString(in.Thread) {
		history = s.loadChat(r.Context(), user, in.Thread, 8)
	} else {
		s.db.QueryRow(r.Context(), `select gen_random_uuid()::text`).Scan(&in.Thread)
	}
	hist := []map[string]string{}
	for _, h := range history {
		hist = append(hist, map[string]string{"role": h.Role, "content": h.Content})
	}
	body, _ := json.Marshal(map[string]any{"message": mask(in.Message), "lang": in.Lang, "context": s.snapshot(r.Context(), user), "history": hist})
	req, _ := http.NewRequestWithContext(r.Context(), "POST", s.cfg.AIURL+"/answer", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	var out struct {
		Answer  string           `json:"answer"`
		Blocked string           `json:"blocked"`
		Chart   json.RawMessage  `json:"chart"`
		Actions []map[string]any `json:"actions"`
		Sources json.RawMessage  `json:"sources"`
		Thread  string           `json:"thread"`
		Engine  string           `json:"engine"`
	}
	start := time.Now()
	resp, err := s.http.Do(req)
	if err != nil {
		fail(w, 502, "NURU is busy, try again in a moment")
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 || json.NewDecoder(resp.Body).Decode(&out) != nil {
		fail(w, 502, "NURU could not answer, try again")
		return
	}
	took := int(time.Since(start).Milliseconds())
	if out.Engine == "" && out.Blocked != "" {
		out.Engine = "guard"
	}
	if out.Blocked != "" {
		snippet := mask(in.Message)
		if len(snippet) > 80 {
			snippet = snippet[:80] + "…"
		}
		s.event(r.Context(), user, "ai_"+out.Blocked, snippet)
	}
	if len(out.Sources) == 0 || string(out.Sources) == "null" {
		out.Sources = json.RawMessage("[]")
	}
	out.Thread = in.Thread
	s.saveChat(r.Context(), user, in.Thread, "user", in.Lang, in.Message, "", nil, "", 0)
	s.saveChat(r.Context(), user, in.Thread, "assistant", in.Lang, out.Answer, out.Blocked, out.Sources, out.Engine, took)
	writeJSON(w, 200, out)
}

// saveChat stores one message. For answers, engine says how it was made
// (claude, template or guard) and ms how long the AI service took.
func (s *Server) saveChat(ctx context.Context, user, thread, role, lang, text, blocked string, sources json.RawMessage, engine string, ms int) {
	nonce, ct, err := s.box.Seal(user, text)
	if err != nil {
		return
	}
	var src any
	if len(sources) > 0 {
		src = string(sources)
	}
	var took any
	if role == "assistant" && ms > 0 {
		took = ms
	}
	s.db.Exec(ctx, `insert into chats(user_id,thread_id,role,lang,nonce,ciphertext,blocked,sources,engine,latency_ms) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)`,
		user, thread, role, lang, nonce, ct, blocked, src, engine, took)
}

// loadChat returns the latest messages of one conversation, or across all
// of them when thread is empty.
func (s *Server) loadChat(ctx context.Context, user, thread string, limit int) []chatMsg {
	rows, err := s.db.Query(ctx, `select role, lang, nonce, ciphertext, created_at, coalesce(thread_id::text,''), blocked, coalesce(sources::text,'')
		from (select * from chats where user_id=$1 and ($2 = '' or thread_id::text = $2) order by id desc limit $3) c order by id`, user, thread, limit)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := []chatMsg{}
	for rows.Next() {
		var m chatMsg
		var nonce, ct []byte
		var src string
		rows.Scan(&m.Role, &m.Lang, &nonce, &ct, &m.At, &m.Thread, &m.Blocked, &src)
		if src != "" {
			m.Sources = json.RawMessage(src)
		}
		if txt, err := s.box.Open(user, nonce, ct); err == nil {
			m.Content = txt
			out = append(out, m)
		}
	}
	return out
}

func (s *Server) chatHistory(w http.ResponseWriter, r *http.Request) {
	thread := r.URL.Query().Get("thread")
	if thread != "" && !uuidRe.MatchString(thread) {
		fail(w, 400, "unknown conversation")
		return
	}
	writeJSON(w, 200, s.loadChat(r.Context(), uid(r), thread, 100))
}

// chatThreads lists conversations, titled by their first question, which is
// decrypted here so titles never sit in the database in plain text.
func (s *Server) chatThreads(w http.ResponseWriter, r *http.Request) {
	user := uid(r)
	rows, err := s.db.Query(r.Context(), `select c.thread_id::text, c.lang, c.nonce, c.ciphertext, t.started, t.last, t.n, t.blocked
		from (select thread_id, min(id) first, min(created_at) started, max(created_at) last, count(*) n, count(*) filter (where blocked<>'') blocked
		      from chats where user_id=$1 and thread_id is not null group by thread_id) t
		join chats c on c.id = t.first order by t.last desc limit 100`, user)
	if err != nil {
		fail(w, 500, "could not load chats")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, lang string
		var nonce, ct []byte
		var started, last time.Time
		var n, blocked int
		rows.Scan(&id, &lang, &nonce, &ct, &started, &last, &n, &blocked)
		title, err := s.box.Open(user, nonce, ct)
		if err != nil {
			continue
		}
		if rs := []rune(title); len(rs) > 80 {
			title = string(rs[:80]) + "…"
		}
		out = append(out, map[string]any{"id": id, "title": title, "lang": lang, "started_at": started, "at": last, "messages": n, "blocked": blocked})
	}
	writeJSON(w, 200, out)
}

func (s *Server) clearChat(w http.ResponseWriter, r *http.Request) {
	if thread := r.URL.Query().Get("thread"); thread != "" {
		if !uuidRe.MatchString(thread) {
			fail(w, 400, "unknown conversation")
			return
		}
		s.db.Exec(r.Context(), `delete from chats where user_id=$1 and thread_id::text=$2`, uid(r), thread)
	} else {
		s.db.Exec(r.Context(), `delete from chats where user_id=$1`, uid(r))
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}
