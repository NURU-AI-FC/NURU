package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
)

type note struct {
	ID     string    `json:"id"`
	Key    string    `json:"-"`
	Kind   string    `json:"kind"`
	Tone   string    `json:"tone"`
	Icon   string    `json:"icon"`
	Title  string    `json:"title"`
	Body   string    `json:"body"`
	Amount float64   `json:"amount"`
	TxID   string    `json:"tx_id"`
	Link   string    `json:"link"`
	Read   bool      `json:"read"`
	At     time.Time `json:"at"`
}

// notify stores a notification once; the key stops duplicates.
func (s *Server) notify(ctx context.Context, user string, n note) {
	var tx any
	if n.TxID != "" {
		tx = n.TxID
	}
	at := n.At
	if at.IsZero() {
		at = time.Now()
	}
	s.db.Exec(ctx, `insert into notifications(user_id,key,kind,tone,icon,title,body,amount,tx_id,link,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		on conflict (user_id,key) do nothing`, user, n.Key, n.Kind, n.Tone, n.Icon, n.Title, n.Body, n.Amount, tx, n.Link, at)
}

type notifyPrefs struct {
	EveryTxn     bool   `json:"every_txn"`
	Unusual      bool   `json:"unusual"`
	LowBalance   bool   `json:"low_balance"`
	NewDevice    bool   `json:"new_device"`
	WeeklyRecap  bool   `json:"weekly_recap"`
	MonthlyPlan  bool   `json:"monthly_plan"`
	BillPrices   bool   `json:"bill_prices"`
	Reminders    bool   `json:"reminders"`
	Quiet        bool   `json:"quiet"`
	QuietFrom    string `json:"quiet_from"`
	QuietTo      string `json:"quiet_to"`
	LargeOver    int    `json:"large_over"`
	LowBalanceAt int    `json:"low_balance_at"`
}

func defaultPrefs() notifyPrefs {
	return notifyPrefs{EveryTxn: true, Unusual: true, LowBalance: true, NewDevice: true, WeeklyRecap: true, MonthlyPlan: true, Reminders: true,
		Quiet: true, QuietFrom: "22:00", QuietTo: "07:00", LargeOver: 50000, LowBalanceAt: 20000}
}

func (s *Server) notifyPrefs(ctx context.Context, user string) notifyPrefs {
	p := defaultPrefs()
	var raw []byte
	if s.db.QueryRow(ctx, `select prefs from notification_settings where user_id=$1`, user).Scan(&raw) == nil {
		json.Unmarshal(raw, &p)
	}
	return p
}

var (
	syncMu   sync.Mutex
	lastSync = map[string]time.Time{}
)

// syncNotes turns recent activity, due reminders and insights into
// notifications. It runs at most every few minutes per user.
func (s *Server) syncNotes(ctx context.Context, user string) {
	syncMu.Lock()
	if time.Since(lastSync[user]) < 3*time.Minute {
		syncMu.Unlock()
		return
	}
	lastSync[user] = time.Now()
	syncMu.Unlock()

	p := s.notifyPrefs(ctx, user)
	rows, err := s.db.Query(ctx, `select t.id,t.direction,t.amount::float8,t.category,t.merchant,t.created_at,a.name from transactions t join accounts a on a.id=t.account_id
		where t.user_id=$1 and a.kind<>'business' and t.created_at>now()-interval '30 days' and t.category<>'Savings'
		and (t.category='Transfer' or t.category='Salary' or t.amount>=$2) order by t.created_at`, user, p.LargeOver)
	if err == nil {
		var notes []note
		for rows.Next() {
			var id, dir, cat, merchant, acct string
			var amt float64
			var at time.Time
			rows.Scan(&id, &dir, &amt, &cat, &merchant, &at, &acct)
			n := note{Key: "tx:" + id, Amount: amt, TxID: id, Link: "/history/" + id, At: at}
			switch {
			case dir == "credit":
				n.Kind, n.Tone, n.Icon, n.Title, n.Body = "activity", "green", "down", cat+" received", naira(amt)+" from "+merchant+"."
			case cat == "Transfer":
				n.Kind, n.Tone, n.Icon, n.Title, n.Body = "activity", "gray", "send", "Transfer sent", naira(amt)+" to "+merchant+" from "+acct+"."
			default:
				n.Kind, n.Tone, n.Icon, n.Title, n.Body = "alert", "red", "alert", "Large payment", naira(amt)+" to "+merchant+" from "+acct+"."
			}
			if n.Kind == "activity" && !p.EveryTxn || n.Kind == "alert" && !p.Unusual {
				continue
			}
			notes = append(notes, n)
		}
		rows.Close()
		for _, n := range notes {
			s.notify(ctx, user, n)
		}
	}

	// money that moved with no description: ask the customer what it was for
	items, _ := s.pendingDescriptions(ctx, user, 3)
	for _, t := range items {
		if time.Since(t.At) > 7*24*time.Hour {
			continue
		}
		way := "came in from " + t.Merchant
		if t.Direction == "debit" {
			way = "left " + t.Account + " at " + t.Merchant
		}
		s.notify(ctx, user, note{Key: "describe:" + t.ID, Kind: "reminder", Tone: "amber", Icon: "edit", Title: "What was this " + naira(t.Amount) + " for?",
			Body: naira(t.Amount) + " " + way + " with no description. Tell NURU so your advice stays accurate.", Amount: t.Amount, TxID: t.ID, Link: "/ask?describe=" + t.ID, At: t.At})
	}

	if p.Reminders {
		rows, err = s.db.Query(ctx, `select id,title,amount::float8,due_at from reminders where user_id=$1 and not done and due_at between now() and now()+interval '7 days'`, user)
		if err == nil {
			var notes []note
			for rows.Next() {
				var id, t string
				var amt float64
				var due time.Time
				rows.Scan(&id, &t, &amt, &due)
				body := "Scheduled for " + due.Format("2 Jan, 3:04 pm") + "."
				if amt > 0 {
					body = naira(amt) + " due on " + due.Format("2 Jan") + "."
				}
				notes = append(notes, note{Key: "due:" + id, Kind: "reminder", Tone: "amber", Icon: "calendar", Title: t + " is coming up", Body: body, Amount: amt, Link: "/planner"})
			}
			rows.Close()
			for _, n := range notes {
				s.notify(ctx, user, n)
			}
		}
	}

	if p.LowBalance {
		accts, _ := s.listAccounts(ctx, user)
		for _, a := range accts {
			if a.Kind != "business" && a.Balance < float64(p.LowBalanceAt) {
				s.notify(ctx, user, note{Key: "low:" + a.ID + ":" + time.Now().Format("2006-01-02"), Kind: "alert", Tone: "amber", Icon: "wallet",
					Title: "Low balance", Body: a.Name + " is down to " + naira(a.Balance) + ".", Amount: a.Balance, Link: "/accounts/" + a.ID})
			}
		}
	}

	month := time.Now().Format("2006-01")
	for _, in := range s.computeInsights(ctx, user) {
		icon, kind := "sparkles", "insight"
		switch in.Kind {
		case "unusual":
			if !p.Unusual {
				continue
			}
			icon, kind = "alert", "alert"
		case "subscriptions":
			if !p.BillPrices && !p.MonthlyPlan {
				continue
			}
			icon = "tv"
		case "saving":
			icon = "trendup"
		default:
			if !p.WeeklyRecap && !p.MonthlyPlan {
				continue
			}
		}
		s.notify(ctx, user, note{Key: "insight:" + in.Kind + ":" + in.Title + ":" + month, Kind: kind, Tone: in.Tone, Icon: icon, Title: in.Title, Body: in.Body, Amount: in.Amount, Link: "/insights"})
	}
}

const noteCols = `id,kind,tone,icon,title,body,amount::float8,coalesce(tx_id::text,''),link,read,created_at`

func (s *Server) notifications(w http.ResponseWriter, r *http.Request) {
	s.syncNotes(r.Context(), uid(r))
	var unread int
	s.db.QueryRow(r.Context(), `select count(*) from notifications where user_id=$1 and not read`, uid(r)).Scan(&unread)
	if r.URL.Query().Get("count") == "1" {
		writeJSON(w, 200, map[string]any{"unread": unread})
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 200 {
		limit = 60
	}
	rows, err := s.db.Query(r.Context(), `select `+noteCols+` from notifications where user_id=$1 and ($2='' or kind=$2) order by created_at desc limit $3`,
		uid(r), r.URL.Query().Get("kind"), limit)
	if err != nil {
		fail(w, 500, "could not load notifications")
		return
	}
	defer rows.Close()
	items := []note{}
	for rows.Next() {
		var n note
		if rows.Scan(&n.ID, &n.Kind, &n.Tone, &n.Icon, &n.Title, &n.Body, &n.Amount, &n.TxID, &n.Link, &n.Read, &n.At) == nil {
			items = append(items, n)
		}
	}
	writeJSON(w, 200, map[string]any{"items": items, "unread": unread})
}

// notification returns one alert with the transaction behind it and six
// weeks of spending in that category for context.
func (s *Server) notification(w http.ResponseWriter, r *http.Request) {
	var n note
	err := s.db.QueryRow(r.Context(), `select `+noteCols+` from notifications where user_id=$1 and id::text=$2`, uid(r), chi.URLParam(r, "id")).
		Scan(&n.ID, &n.Kind, &n.Tone, &n.Icon, &n.Title, &n.Body, &n.Amount, &n.TxID, &n.Link, &n.Read, &n.At)
	if err != nil {
		fail(w, 404, "notification not found")
		return
	}
	out := map[string]any{"note": n}
	if n.TxID != "" {
		t, err := scanTx(s.db.QueryRow(r.Context(), txSelect+`t.user_id=$1 and t.id::text=$2`, uid(r), n.TxID))
		if err == nil {
			out["tx"] = t
			var usual float64
			s.db.QueryRow(r.Context(), `select coalesce(percentile_cont(0.5) within group (order by amount),0)::float8 from transactions where user_id=$1 and category=$2 and direction=$3 and created_at>now()-interval '90 days'`,
				uid(r), t.Category, t.Direction).Scan(&usual)
			out["usual"] = usual
			weeks := make([]float64, 6)
			labels := []string{"W1", "W2", "W3", "W4", "W5", "Now"}
			rows, err := s.db.Query(r.Context(), `select floor(extract(epoch from ($3::timestamptz - created_at))/604800)::int w, sum(amount)::float8 from transactions
				where user_id=$1 and category=$2 and direction='debit' and created_at>$3::timestamptz-interval '42 days' and created_at<=$3::timestamptz group by w`, uid(r), t.Category, t.At)
			if err == nil {
				for rows.Next() {
					var wk int
					var v float64
					rows.Scan(&wk, &v)
					if wk >= 0 && wk < 6 {
						weeks[5-wk] = v
					}
				}
				rows.Close()
			}
			out["weeks"] = map[string]any{"labels": labels, "values": weeks}
		}
	}
	if !n.Read {
		s.db.Exec(r.Context(), `update notifications set read=true where id=$1`, n.ID)
	}
	writeJSON(w, 200, out)
}

func (s *Server) markNotification(w http.ResponseWriter, r *http.Request) {
	var in struct{ Read *bool }
	if !decode(w, r, &in) {
		return
	}
	read := in.Read == nil || *in.Read
	id := chi.URLParam(r, "id")
	if id == "all" {
		s.db.Exec(r.Context(), `update notifications set read=$2 where user_id=$1`, uid(r), read)
	} else {
		s.db.Exec(r.Context(), `update notifications set read=$3 where user_id=$1 and id::text=$2`, uid(r), id, read)
	}
	var unread int
	s.db.QueryRow(r.Context(), `select count(*) from notifications where user_id=$1 and not read`, uid(r)).Scan(&unread)
	writeJSON(w, 200, map[string]any{"ok": true, "unread": unread})
}

func (s *Server) notifySettings(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, s.notifyPrefs(r.Context(), uid(r)))
}

func (s *Server) saveNotifySettings(w http.ResponseWriter, r *http.Request) {
	p := s.notifyPrefs(r.Context(), uid(r))
	if !decode(w, r, &p) {
		return
	}
	if _, err := time.Parse("15:04", p.QuietFrom); err != nil {
		p.QuietFrom = "22:00"
	}
	if _, err := time.Parse("15:04", p.QuietTo); err != nil {
		p.QuietTo = "07:00"
	}
	if p.LargeOver < 1000 {
		p.LargeOver = 50000
	}
	if p.LowBalanceAt < 0 {
		p.LowBalanceAt = 20000
	}
	raw, _ := json.Marshal(p)
	if _, err := s.db.Exec(r.Context(), `insert into notification_settings(user_id,prefs) values($1,$2) on conflict (user_id) do update set prefs=excluded.prefs, updated_at=now()`, uid(r), raw); err != nil {
		fail(w, 500, "could not save settings")
		return
	}
	syncMu.Lock()
	delete(lastSync, uid(r))
	syncMu.Unlock()
	writeJSON(w, 200, p)
}
