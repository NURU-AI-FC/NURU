package httpapi

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

// NURU asks what a payment was for when it arrives or leaves with no useful
// description, and keeps the answer (encrypted with the customer's key) so later
// advice knows salary from a loan repayment or a business sale.

// unexplained matches recent transactions with no narration worth the name and
// no description yet. Transfers, POS and wallet moves are the usual suspects.
const unexplained = `t.user_id=$1 and t.created_at>now()-interval '45 days' and t.amount>=1000
	and not exists (select 1 from tx_notes n where n.tx_id=t.id)
	and lower(trim(regexp_replace(t.narration, '•+\d*', '', 'g'))) in ('', 'inflow', 'transfer', 'trf', 'pos', 'nip')
	and (t.category in ('Other', 'Transfer', 'Uncategorised')
		or (t.merchant ~* '^(inward|transfer from|wallet transfer|opay wallet|nip|ussd)' and t.category not in ('Sales', 'Salary')))`

// labels customers can pick; each maps to the category it files the money under.
var describeLabels = map[string]string{
	"Salary": "Salary", "Business sale": "Sales", "Family support": "Family", "Refund": "Refund", "Loan": "Loan",
	"Food": "Food", "Transport": "Transport", "Shopping": "Shopping", "Bills": "Bills", "Family": "Family", "Other": "",
}

type pendingTx struct {
	ID        string    `json:"id"`
	Direction string    `json:"direction"`
	Amount    float64   `json:"amount"`
	Merchant  string    `json:"merchant"`
	Account   string    `json:"account"`
	At        time.Time `json:"at"`
}

func (s *Server) pendingDescriptions(ctx context.Context, user string, limit int) ([]pendingTx, int) {
	out := []pendingTx{}
	var total int
	s.db.QueryRow(ctx, `select count(*) from transactions t where `+unexplained, user).Scan(&total)
	rows, err := s.db.Query(ctx, `select t.id,t.direction,t.amount::float8,t.merchant,a.name,t.created_at from transactions t join accounts a on a.id=t.account_id
		where `+unexplained+` order by t.created_at desc limit $2`, user, limit)
	if err != nil {
		return out, total
	}
	defer rows.Close()
	for rows.Next() {
		var p pendingTx
		rows.Scan(&p.ID, &p.Direction, &p.Amount, &p.Merchant, &p.Account, &p.At)
		out = append(out, p)
	}
	return out, total
}

func (s *Server) undescribed(w http.ResponseWriter, r *http.Request) {
	items, total := s.pendingDescriptions(r.Context(), uid(r), 5)
	writeJSON(w, 200, map[string]any{"items": items, "count": total})
}

// describeTx saves the customer's description and files the transaction
// under the matching category.
func (s *Server) describeTx(w http.ResponseWriter, r *http.Request) {
	var in struct{ Purpose, Label string }
	if !decode(w, r, &in) {
		return
	}
	in.Purpose, in.Label = strings.TrimSpace(in.Purpose), strings.TrimSpace(in.Label)
	cat, known := describeLabels[in.Label]
	if !known {
		in.Label, cat = "", ""
	}
	if in.Purpose == "" {
		in.Purpose = in.Label
	}
	if len([]rune(in.Purpose)) < 2 || len([]rune(in.Purpose)) > 200 {
		fail(w, 400, "tell NURU in a few words what it was for")
		return
	}
	ctx, user, id := r.Context(), uid(r), chi.URLParam(r, "id")
	var dir string
	if err := s.db.QueryRow(ctx, `select direction from transactions where id::text=$1 and user_id=$2`, id, user).Scan(&dir); err != nil {
		fail(w, 404, "transaction not found")
		return
	}
	nonce, ct, err := s.box.Seal(user+":tx", in.Purpose)
	if err != nil {
		fail(w, 500, "could not save that")
		return
	}
	s.db.Exec(ctx, `insert into tx_notes(tx_id,user_id,label,nonce,ciphertext) values($1,$2,$3,$4,$5)
		on conflict (tx_id) do update set label=excluded.label, nonce=excluded.nonce, ciphertext=excluded.ciphertext, updated_at=now()`, id, user, in.Label, nonce, ct)
	if cat != "" {
		s.db.Exec(ctx, `update transactions set category=$1 where id::text=$2 and user_id=$3`, cat, id, user)
	}
	items, total := s.pendingDescriptions(ctx, user, 5)
	writeJSON(w, 200, map[string]any{"ok": true, "label": in.Label, "purpose": in.Purpose, "category": cat, "items": items, "count": total})
}

// txNote returns the customer's description of one transaction, if any.
func (s *Server) txNote(ctx context.Context, user, id string) (label, purpose string) {
	var nonce, ct []byte
	if s.db.QueryRow(ctx, `select label,nonce,ciphertext from tx_notes where tx_id::text=$1 and user_id=$2`, id, user).Scan(&label, &nonce, &ct) != nil {
		return "", ""
	}
	purpose, _ = s.box.Open(user+":tx", nonce, ct)
	return label, purpose
}

// describedForAI gives the assistant the customer's recent descriptions.
func (s *Server) describedForAI(ctx context.Context, user string) []map[string]any {
	out := []map[string]any{}
	rows, err := s.db.Query(ctx, `select n.label,n.nonce,n.ciphertext,t.direction,t.amount::float8,t.merchant,t.created_at from tx_notes n join transactions t on t.id=n.tx_id
		where n.user_id=$1 order by t.created_at desc limit 20`, user)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var label, dir, merchant string
		var nonce, ct []byte
		var amt float64
		var at time.Time
		rows.Scan(&label, &nonce, &ct, &dir, &amt, &merchant, &at)
		p, err := s.box.Open(user+":tx", nonce, ct)
		if err != nil {
			continue
		}
		out = append(out, map[string]any{"date": at.Format("2 Jan"), "direction": dir, "amount": amt, "merchant": mask(merchant), "label": label, "customer_says": mask(p)})
	}
	return out
}
