package httpapi

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/go-chi/chi/v5"
)

var (
	billCustomer = regexp.MustCompile(`^[0-9A-Za-z-]{4,20}$`)
	acct10       = regexp.MustCompile(`^\d{10}$`)
)

// payBill buys a bill, airtime or pays a scanned merchant from the sandbox
// account. It passes the same PIN and face check as a transfer.
func (s *Server) payBill(w http.ResponseWriter, r *http.Request) {
	var in struct {
		From, Category, Biller, Customer, PIN string
		Amount                                float64
		Face                                  []float64
	}
	if !decode(w, r, &in) {
		return
	}
	in.Biller = strings.TrimSpace(in.Biller)
	in.Customer = strings.ReplaceAll(strings.TrimSpace(in.Customer), " ", "")
	if in.Category != "Bills" && in.Category != "Airtime" && in.Category != "Shopping" {
		fail(w, 400, "choose bills, airtime or a merchant")
		return
	}
	if in.Amount < 50 || in.Amount > 500_000 || in.Biller == "" || len(in.Biller) > 60 || !billCustomer.MatchString(in.Customer) {
		fail(w, 400, "check the biller, number and amount")
		return
	}
	what := naira(in.Amount) + " to " + in.Biller
	if !s.stepUp(w, r, in.PIN, in.Face, what) {
		return
	}
	id, at, ok := s.debit(w, r, in.From, in.Amount, in.Category, in.Biller, mask(in.Customer))
	if !ok {
		return
	}
	writeJSON(w, 201, receipt(id, at, in.Amount, in.Biller))
}

func (s *Server) addPayee(w http.ResponseWriter, r *http.Request) {
	var in struct{ Name, Bank, Account, Tag string }
	if !decode(w, r, &in) {
		return
	}
	in.Name, in.Bank, in.Tag = strings.TrimSpace(in.Name), strings.TrimSpace(in.Bank), strings.TrimSpace(in.Tag)
	if len(in.Name) < 2 || len(in.Name) > 60 || in.Bank == "" || len(in.Bank) > 40 || len(in.Tag) > 20 || !acct10.MatchString(in.Account) {
		fail(w, 400, "add a name, a bank and a 10 digit account number")
		return
	}
	s.db.Exec(r.Context(), `insert into payees(user_id,name,bank,account,tag) values($1,$2,$3,$4,$5)
		on conflict (user_id,account) do update set name=excluded.name, bank=excluded.bank, tag=excluded.tag`, uid(r), in.Name, in.Bank, in.Account, in.Tag)
	s.payees(w, r)
}

func (s *Server) updatePayee(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Starred *bool
		Tag     *string
	}
	if !decode(w, r, &in) {
		return
	}
	if in.Starred != nil {
		s.db.Exec(r.Context(), `update payees set starred=$1 where id::text=$2 and user_id=$3`, *in.Starred, chi.URLParam(r, "id"), uid(r))
	}
	if in.Tag != nil && len(*in.Tag) <= 20 {
		s.db.Exec(r.Context(), `update payees set tag=$1 where id::text=$2 and user_id=$3`, strings.TrimSpace(*in.Tag), chi.URLParam(r, "id"), uid(r))
	}
	s.payees(w, r)
}

func (s *Server) deletePayee(w http.ResponseWriter, r *http.Request) {
	s.db.Exec(r.Context(), `delete from payees where id::text=$1 and user_id=$2`, chi.URLParam(r, "id"), uid(r))
	s.payees(w, r)
}
