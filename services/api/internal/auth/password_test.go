package auth

import "testing"

func TestHashVerify(t *testing.T) {
	h, err := Hash("1234")
	if err != nil {
		t.Fatal(err)
	}
	if ok, _ := Verify("1234", h); !ok {
		t.Fatal("correct PIN rejected")
	}
	if ok, _ := Verify("4321", h); ok {
		t.Fatal("wrong PIN accepted")
	}
}
