package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

// Argon2id parameters follow the OWASP baseline (19 MiB, 2 passes).
const (
	memory  = 19 * 1024
	passes  = 2
	threads = 1
	keyLen  = 32
)

// Hash returns a PHC formatted Argon2id hash for passwords, PINs and OTPs.
func Hash(secret string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key := argon2.IDKey([]byte(secret), salt, passes, memory, threads, keyLen)
	b := base64.RawStdEncoding
	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s", argon2.Version, memory, passes, threads, b.EncodeToString(salt), b.EncodeToString(key)), nil
}

// Verify compares a secret with a stored hash in constant time.
func Verify(secret, encoded string) (bool, error) {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false, errors.New("bad hash format")
	}
	var m uint32
	var t uint32
	var p uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &m, &t, &p); err != nil {
		return false, err
	}
	b := base64.RawStdEncoding
	salt, err := b.DecodeString(parts[4])
	if err != nil {
		return false, err
	}
	want, err := b.DecodeString(parts[5])
	if err != nil {
		return false, err
	}
	got := argon2.IDKey([]byte(secret), salt, t, m, p, uint32(len(want)))
	return subtle.ConstantTimeCompare(got, want) == 1, nil
}
