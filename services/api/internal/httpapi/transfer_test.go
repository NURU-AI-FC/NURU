package httpapi

import "testing"

func TestTransferGateChecksPinFirst(t *testing.T) {
	risky := func() []string { return []string{"New account, never paid before"} }
	safe := func() []string { return nil }
	cases := []struct {
		name      string
		pinOK     bool
		risk      func() []string
		confirmed bool
		wantOK    bool
		wantRisk  bool
	}{
		{"wrong PIN to a risky payee is refused without the warning", false, risky, false, false, false},
		{"wrong PIN cannot confirm a warning", false, risky, true, false, false},
		{"right PIN to a risky payee shows the warning", true, risky, false, false, true},
		{"right PIN and confirmed goes ahead", true, risky, true, true, false},
		{"right PIN to a known payee goes ahead", true, safe, false, true, false},
		{"wrong PIN to a known payee is refused", false, safe, false, false, false},
	}
	for _, c := range cases {
		checkedRisk := false
		ok, r := transferGate(func() bool { return c.pinOK }, func() []string { checkedRisk = true; return c.risk() }, c.confirmed)
		if ok != c.wantOK || (len(r) > 0) != c.wantRisk {
			t.Errorf("%s: got ok=%v risk=%v", c.name, ok, r)
		}
		if !c.pinOK && checkedRisk {
			t.Errorf("%s: looked at payee risk before the PIN passed", c.name)
		}
	}
}
