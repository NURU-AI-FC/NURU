package secure

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
)

// Box encrypts chat messages with AES-256-GCM. Each user gets their own key,
// derived from the master key, so one leaked row never exposes another user.
type Box struct{ master []byte }

func New(hexKey string) (*Box, error) {
	k, err := hex.DecodeString(hexKey)
	if err != nil || len(k) != 32 {
		return nil, errors.New("DATA_KEY must be 64 hex characters")
	}
	return &Box{master: k}, nil
}

func (b *Box) userKey(userID string) []byte {
	m := hmac.New(sha256.New, b.master)
	m.Write([]byte("nuru-chat:" + userID))
	return m.Sum(nil)
}

func (b *Box) aead(userID string) (cipher.AEAD, error) {
	block, err := aes.NewCipher(b.userKey(userID))
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(block)
}

func (b *Box) Seal(userID, plain string) (nonce, ct []byte, err error) {
	g, err := b.aead(userID)
	if err != nil {
		return nil, nil, err
	}
	nonce = make([]byte, g.NonceSize())
	if _, err = rand.Read(nonce); err != nil {
		return nil, nil, err
	}
	return nonce, g.Seal(nil, nonce, []byte(plain), []byte(userID)), nil
}

func (b *Box) Open(userID string, nonce, ct []byte) (string, error) {
	g, err := b.aead(userID)
	if err != nil {
		return "", err
	}
	p, err := g.Open(nil, nonce, ct, []byte(userID))
	return string(p), err
}
