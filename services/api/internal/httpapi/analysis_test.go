package httpapi

import (
	"math"
	"testing"
)

func TestMedianAndSpread(t *testing.T) {
	if m := median([]float64{31, 28, 30}); m != 30 {
		t.Fatalf("median = %v", m)
	}
	if m := median([]float64{7, 9}); m != 8 {
		t.Fatalf("median = %v", m)
	}
	mu, sd := meanSD([]float64{2, 4, 4, 4, 5, 5, 7, 9})
	if mu != 5 || math.Abs(sd-2) > 1e-9 {
		t.Fatalf("mean %v sd %v", mu, sd)
	}
}

func TestChannelAndLabels(t *testing.T) {
	cases := map[[2]string]string{
		{"Family", "Transfer to Mum"}: "Transfer",
		{"Bills", "DStv Compact"}:     "Online",
		{"Food", "Chicken Republic"}:  "Card and POS",
	}
	for in, want := range cases {
		if got := channel(in[0], in[1]); got != want {
			t.Errorf("channel(%v) = %q, want %q", in, got, want)
		}
	}
	if healthLabel(82) != "Excellent" || healthLabel(70) != "Good" || healthLabel(10) != "Needs work" {
		t.Error("health labels")
	}
	if pctChange(120, 100) != 20 || pctChange(5, 0) != 0 {
		t.Error("pct change")
	}
}
