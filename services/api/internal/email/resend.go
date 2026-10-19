// Package email renders NURU's transactional emails and sends them through
// Resend. With no RESEND_API_KEY set nothing leaves the server: the caller
// still logs the email so HQ can see what would have gone out.
package email

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const DefaultFrom = "NURU <onboarding@resend.dev>"

var resendURL = "https://api.resend.com/emails"

// Client talks to the Resend HTTP API with the standard library only.
type Client struct {
	Key  string
	From string
	HTTP *http.Client
}

// FromEnv reads RESEND_API_KEY and EMAIL_FROM.
func FromEnv() *Client {
	from := strings.TrimSpace(os.Getenv("EMAIL_FROM"))
	if from == "" {
		from = DefaultFrom
	}
	return &Client{Key: strings.TrimSpace(os.Getenv("RESEND_API_KEY")), From: from, HTTP: &http.Client{Timeout: 15 * time.Second}}
}

// Enabled reports whether a provider key is set.
func (c *Client) Enabled() bool { return c != nil && c.Key != "" }

// ErrDisabled is returned by Send when no key is set.
var ErrDisabled = errors.New("email sending is off: RESEND_API_KEY is not set")

// Send posts one email and returns the provider's message id.
func (c *Client) Send(ctx context.Context, to string, m Message) (string, error) {
	if !c.Enabled() {
		return "", ErrDisabled
	}
	body, _ := json.Marshal(map[string]any{
		"from": c.From, "to": []string{to}, "subject": m.Subject, "html": m.HTML, "text": m.Text,
		"tags": []map[string]string{{"name": "template", "value": m.Template}},
	})
	req, err := http.NewRequestWithContext(ctx, "POST", resendURL, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+c.Key)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	if resp.StatusCode >= 300 {
		var e struct {
			Message string `json:"message"`
		}
		json.Unmarshal(raw, &e)
		return "", fmt.Errorf("resend answered %d: %s", resp.StatusCode, e.Message)
	}
	var ok struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(raw, &ok); err != nil || ok.ID == "" {
		return "", fmt.Errorf("resend gave no message id")
	}
	return ok.ID, nil
}

// Demo reports whether an address belongs to a seeded demo account. Those are
// logged but never sent.
func Demo(to string) bool {
	return strings.HasSuffix(strings.ToLower(strings.TrimSpace(to)), "@nuru.app")
}
