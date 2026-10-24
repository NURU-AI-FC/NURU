package email

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

var at = time.Date(2026, 10, 18, 18, 42, 0, 0, time.UTC) // 7:42pm in Lagos

func all() []Message {
	return []Message{
		Welcome("Adaeze Okafor", "482913"),
		SignInCode("731052", "Mac · Chrome", at),
		PasswordReset("905118"),
		NewDevice("iPhone · Safari", "102.89.xx.xx", at),
		TransferSent(Transfer{Amount: 25000, Name: "Tunde Bakare", Bank: "GTBank", Account: "6621", Note: "Generator repair", From: "Savings account", Reference: "NURU-8F2A91C0", At: at}),
		TransferReceived(Transfer{Amount: 150000, Name: "OPay wallet", From: "Current account", At: at}),
		WeeklyRecap(Week{Name: "Adaeze Okafor", In: 150000, Out: 61200, PrevOut: 79600, Saved: 20000, Top: "Food", TopAmount: 22000, Tip: "Friday was your biggest day."}),
		BudgetAlert(Budget{Category: "Food", Spent: 68000, Limit: 80000, DaysLeft: 9}),
		StaffInvite("Amaka Obi", "Bolaji Jimoh", "Support", "hq"),
	}
}

func TestEveryTemplateRenders(t *testing.T) {
	seen := map[string]bool{}
	for _, m := range all() {
		if m.Template == "" || m.Subject == "" || m.Text == "" {
			t.Fatalf("%s: empty fields", m.Template)
		}
		if seen[m.Template] {
			t.Fatalf("duplicate template key %s", m.Template)
		}
		seen[m.Template] = true
		for _, want := range []string{"<!doctype html>", "#E30613", "NURU", "will never ask for your PIN", "</html>", `role="presentation"`} {
			if !strings.Contains(m.HTML, want) {
				t.Fatalf("%s: missing %q", m.Template, want)
			}
		}
		if strings.Contains(m.HTML, "<style") || strings.Contains(m.HTML, "class=") {
			t.Fatalf("%s: email must use inline styles only", m.Template)
		}
	}
}

func TestContent(t *testing.T) {
	cases := []struct {
		m    Message
		want []string
	}{
		{Welcome("Adaeze Okafor", "482913"), []string{"Welcome to NURU, Adaeze", "482913", "482 913"}},
		{SignInCode("731052", "Mac · Chrome", at), []string{"731 052", "Mac · Chrome", "Sun 18 Oct, 7:42pm"}},
		{PasswordReset("905118"), []string{"Reset your NURU password", "905118"}},
		{TransferSent(Transfer{Amount: 25000, Name: "Tunde Bakare", Reference: "NURU-8F2A91C0", At: at}), []string{"You sent ₦25,000 to Tunde Bakare", "NURU-8F2A91C0"}},
		{TransferReceived(Transfer{Amount: 1500.5, Name: "Kemi", At: at}), []string{"You received ₦1,500.50", "+₦1,500.50"}},
		{WeeklyRecap(Week{Name: "Ada", Out: 61200, PrevOut: 79600}), []string{"₦18,400 less than last week", "-23%", "Unsubscribe"}},
		{BudgetAlert(Budget{Category: "Food", Spent: 68000, Limit: 80000, DaysLeft: 9}), []string{"85% of your food budget", "₦12,000 left for 9 days"}},
		{BudgetAlert(Budget{Category: "Food", Spent: 90000, Limit: 80000, DaysLeft: 3}), []string{"113%", "₦10,000 over"}},
		{StaffInvite("Amaka Obi", "", "Insights analyst", "console"), []string{"NURU Console", "/console/login", "Insights analyst"}},
	}
	for _, c := range cases {
		for _, w := range c.want {
			if !strings.Contains(c.m.Subject+c.m.Preview+c.m.HTML, w) {
				t.Errorf("%s: missing %q", c.m.Template, w)
			}
		}
	}
}

func TestEscapesUserText(t *testing.T) {
	m := TransferSent(Transfer{Amount: 1, Name: `<script>alert(1)</script>`, Note: `"><img src=x>`, Reference: "R", At: at})
	if strings.Contains(m.HTML, "<script>") || strings.Contains(m.HTML, "<img src=x>") {
		t.Fatal("user text was not escaped")
	}
}

func TestNaira(t *testing.T) {
	for in, want := range map[float64]string{0: "₦0", 999: "₦999", 1000: "₦1,000", 1234567.8: "₦1,234,567.80", -2500: "-₦2,500", 9.999: "₦10"} {
		if got := Naira(in); got != want {
			t.Errorf("Naira(%v) = %s, want %s", in, got, want)
		}
	}
}

func TestDemo(t *testing.T) {
	if !Demo("Demo@NURU.app") || Demo("ada@gmail.com") {
		t.Fatal("demo detection is wrong")
	}
}

func TestSendWithoutKeyIsOff(t *testing.T) {
	c := &Client{}
	if c.Enabled() {
		t.Fatal("client without key should be off")
	}
	if _, err := c.Send(context.Background(), "a@b.com", PasswordReset("1")); err != ErrDisabled {
		t.Fatalf("got %v", err)
	}
}

func TestSendPostsToResend(t *testing.T) {
	var got map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer re_test" {
			w.WriteHeader(401)
			return
		}
		json.NewDecoder(r.Body).Decode(&got)
		w.Write([]byte(`{"id":"em_123"}`))
	}))
	defer srv.Close()
	old := resendURL
	resendURL = srv.URL
	defer func() { resendURL = old }()

	c := &Client{Key: "re_test", From: DefaultFrom, HTTP: srv.Client()}
	id, err := c.Send(context.Background(), "ada@example.com", Welcome("Ada", "123456"))
	if err != nil || id != "em_123" {
		t.Fatalf("id %q err %v", id, err)
	}
	if got["from"] != DefaultFrom || got["to"].([]any)[0] != "ada@example.com" || !strings.Contains(got["subject"].(string), "Welcome") {
		t.Fatalf("bad payload %v", got)
	}
}
