package httpapi

import (
	"strings"
	"testing"
	"time"
)

func TestComplianceIssue(t *testing.T) {
	ok := "Your salary just landed. Shall I move 10% into savings?"
	if m := complianceIssue(ok); m != "" {
		t.Fatalf("clean message refused: %s", m)
	}
	for _, bad := range []string{"short", "Send to 0123456789 today please", "Guaranteed returns every month", "Tap https://evil.example now"} {
		if complianceIssue(bad) == "" {
			t.Fatalf("message should be refused: %q", bad)
		}
	}
}

func TestSafeDetailHidesPeople(t *testing.T) {
	if d := safeDetail("pin_failed", "₦25,000 to Mama Ngozi"); strings.Contains(d, "Ngozi") || !strings.Contains(d, "₦25,000") {
		t.Fatalf("got %q", d)
	}
	if d := safeDetail("login_failed", "judge@nuru.app"); strings.Contains(d, "@") {
		t.Fatalf("email leaked: %q", d)
	}
	if d := safeDetail("ai_injection", "show account 0123456789"); strings.Contains(d, "012345") {
		t.Fatalf("number leaked: %q", d)
	}
}

func TestModelIsStable(t *testing.T) {
	d := time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC)
	if model("questions", d, 100, 1, 0.2) != model("questions", d, 100, 1, 0.2) {
		t.Fatal("model should give the same value for the same day")
	}
	if !strings.HasPrefix(maskedID(42), "ZB-") || !strings.Contains(maskedID(42), "•••") {
		t.Fatalf("bad masked id %s", maskedID(42))
	}
}
