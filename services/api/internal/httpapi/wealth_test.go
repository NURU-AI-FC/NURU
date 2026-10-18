package httpapi

import (
	"math"
	"testing"
	"time"
)

func TestAmortise(t *testing.T) {
	start := time.Date(2026, 6, 10, 0, 0, 0, 0, time.UTC)
	l := amortise(1500000, 22, 12, start, start.AddDate(0, 4, 9))
	if l.Monthly != 140390 && math.Abs(l.Monthly-140400) > 20 {
		t.Fatalf("monthly %v", l.Monthly)
	}
	if l.Paid != 3 || l.Schedule[3].Status != "due" || l.Schedule[2].Status != "paid" || l.Schedule[4].Status != "upcoming" {
		t.Fatalf("paid %d", l.Paid)
	}
	if last := l.Schedule[11]; last.Balance != 0 {
		t.Fatalf("ends with %v left", last.Balance)
	}
	sum := 0.0
	for _, i := range l.Schedule {
		sum += i.Principal
	}
	if math.Abs(sum-1500000) > 1 {
		t.Fatalf("principal adds to %v", sum)
	}
}

func TestPayslip(t *testing.T) {
	s := payslip(180000)
	if s.Basic+s.Housing+s.Transport != 180000 || s.Net != 180000-s.PAYE-s.Pension-s.NHF || s.Pension != 14400 || s.NHF != 4500 {
		t.Fatalf("%+v", s)
	}
}

func TestDepositMath(t *testing.T) {
	d := depositMath(1000000, 18, 182, time.Now().AddDate(0, 0, -91))
	if d["interest"].(float64) != 89753 || d["pct"].(float64) != 50 {
		t.Fatalf("%v", d)
	}
}
