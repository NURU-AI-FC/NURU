package httpapi

import "testing"

func TestSandboxIdentity(t *testing.T) {
	a, d1 := sandboxIdentity("Adaeze Okafor")
	b, d2 := sandboxIdentity("Adaeze Okafor")
	if a != b || !d1.Equal(d2) {
		t.Fatal("identity should be stable")
	}
	if len(a) <= len("Adaeze Okafor") {
		t.Fatalf("expected a middle name, got %q", a)
	}
	if y := d1.Year(); y < 1982 || y > 1999 {
		t.Fatalf("odd birth year %d", y)
	}
}

func TestMaskPhone(t *testing.T) {
	for in, want := range map[string]string{"0803 456 7890": "+234 803 *** 7890", "+2348034567890": "+234 803 *** 7890", "8034567890": "+234 803 *** 7890", "": ""} {
		if got := maskPhone(in); got != want {
			t.Errorf("maskPhone(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestDeviceName(t *testing.T) {
	if got := deviceName("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile Safari/604.1"); got != "iPhone · Safari" {
		t.Errorf("got %q", got)
	}
	if got := deviceName("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 Chrome/129.0 Safari/537.36"); got != "Mac · Chrome" {
		t.Errorf("got %q", got)
	}
}
