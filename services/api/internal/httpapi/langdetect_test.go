package httpapi

import "testing"

func TestDetectLang(t *testing.T) {
	cases := []struct{ msg, app, want string }{
		{"How much did I spend on food this month?", "en", "en"},
		{"Bawo ni owo mi?", "en", "yo"},
		{"Elo ni mo na lori ounjẹ?", "en", "yo"},
		{"Kedu ego m fọdụrụ?", "en", "ig"},
		{"Biko gini ka m mefuru?", "en", "ig"},
		{"Nawa ne kudi na?", "en", "ha"},
		{"Sannu, ina kuɗina?", "en", "ha"},
		{"Show my balance", "yo", "yo"},
		{"ok", "ha", "ha"},
		{"Can you send money to my mum for me?", "en", "en"},
	}
	for _, c := range cases {
		if got := detectLang(c.msg, c.app); got != c.want {
			t.Errorf("detectLang(%q, %q) = %q, want %q", c.msg, c.app, got, c.want)
		}
	}
}
