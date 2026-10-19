package email

import (
	"fmt"
	"html"
	"math"
	"os"
	"strings"
	"time"
)

// Templates follow design/src/p16-emails.mjs: one shell (logo, white card,
// button, safety footer) in Zenith red and white. Everything is inline CSS
// and tables so it renders the same in Gmail, Outlook and Apple Mail.

const (
	red    = "#E30613"
	red50  = "#FDECEE"
	text   = "#16161A"
	text2  = "#55555E"
	muted  = "#8A8A93"
	border = "#E6E6EA"
	surf   = "#F6F6F8"
	green  = "#0F8A4B"
	amber  = "#B76E00"
	font   = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
)

// Message is a rendered email.
type Message struct {
	Template string
	Subject  string
	Preview  string
	HTML     string
	Text     string
}

// AppURL is where buttons point: APP_URL, or the live web app.
func AppURL() string {
	if u := strings.TrimRight(os.Getenv("APP_URL"), "/"); u != "" {
		return u
	}
	return "https://web-production-fd530.up.railway.app"
}

var lagos = func() *time.Location {
	if l, err := time.LoadLocation("Africa/Lagos"); err == nil {
		return l
	}
	return time.FixedZone("WAT", 3600)
}()

// When formats a time the way the designs do: Sun 18 Oct, 7:42pm.
func When(t time.Time) string {
	l := t.In(lagos)
	return l.Format("Mon 2 Jan, ") + strings.ToLower(l.Format("3:04PM"))
}

// Naira formats an amount like ₦25,000 (kobo only when there are any).
func Naira(v float64) string {
	neg := v < 0
	v = math.Abs(v)
	whole := int64(v)
	kobo := int64(math.Round((v - float64(whole)) * 100))
	if kobo == 100 {
		whole, kobo = whole+1, 0
	}
	s := fmt.Sprint(whole)
	for i := len(s) - 3; i > 0; i -= 3 {
		s = s[:i] + "," + s[i:]
	}
	if kobo > 0 {
		s += fmt.Sprintf(".%02d", kobo)
	}
	if neg {
		return "-₦" + s
	}
	return "₦" + s
}

var esc = html.EscapeString

// ---- building blocks ----

func h(t string) string {
	return `<tr><td style="padding:0 0 12px;font-family:` + font + `;font-size:24px;line-height:30px;font-weight:700;color:` + text + `">` + esc(t) + `</td></tr>`
}

func p(t string) string {
	return `<tr><td style="padding:0 0 16px;font-family:` + font + `;font-size:15px;line-height:23px;color:` + text2 + `">` + esc(t) + `</td></tr>`
}

func codeBox(c string) string {
	return `<tr><td style="padding:4px 0 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:` + surf + `;border-radius:14px"><tr>` +
		`<td align="center" style="padding:18px 0;font-family:` + font + `;font-size:34px;line-height:40px;font-weight:700;letter-spacing:10px;color:` + text + `">` + esc(c) + `</td></tr></table></td></tr>`
}

func kv(rows [][2]string) string {
	var b strings.Builder
	b.WriteString(`<tr><td style="padding:4px 0 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ` + border + `;border-radius:14px">`)
	for i, r := range rows {
		top := ""
		if i > 0 {
			top = "border-top:1px solid " + border + ";"
		}
		b.WriteString(`<tr><td style="` + top + `padding:12px 18px;font-family:` + font + `;font-size:14px;color:` + text2 + `">` + esc(r[0]) + `</td>` +
			`<td align="right" style="` + top + `padding:12px 18px;font-family:` + font + `;font-size:14px;font-weight:600;color:` + text + `">` + esc(r[1]) + `</td></tr>`)
	}
	b.WriteString(`</table></td></tr>`)
	return b.String()
}

func button(label, href string, ghost bool) string {
	style := "background:" + red + ";color:#FFFFFF;border:1.5px solid " + red
	if ghost {
		style = "background:#FFFFFF;color:" + text + ";border:1.5px solid " + border
	}
	return `<tr><td style="padding:4px 0 8px"><a href="` + esc(href) + `" style="display:inline-block;padding:13px 24px;border-radius:12px;` + style +
		`;font-family:` + font + `;font-size:15px;font-weight:600;text-decoration:none">` + esc(label) + `</a></td></tr>`
}

func note(t string, alert bool) string {
	bg := surf
	if alert {
		bg = red50
	}
	return `<tr><td style="padding:4px 0 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:` + bg + `;border-radius:14px"><tr>` +
		`<td style="padding:14px 16px;font-family:` + font + `;font-size:13px;line-height:19px;color:` + text2 + `">` + esc(t) + `</td></tr></table></td></tr>`
}

func hero(amount, sub, color string) string {
	out := `<tr><td style="padding:0 0 16px;font-family:` + font + `">`
	if amount != "" {
		out += `<div style="font-size:34px;line-height:40px;font-weight:800;letter-spacing:-0.5px;color:` + color + `">` + esc(amount) + `</div>`
	}
	if sub != "" {
		out += `<div style="padding-top:4px;font-size:14px;color:` + text2 + `">` + esc(sub) + `</div>`
	}
	return out + `</td></tr>`
}

func stats(items [][3]string) string {
	var b strings.Builder
	b.WriteString(`<tr><td style="padding:4px 0 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>`)
	for i, s := range items {
		if i > 0 {
			b.WriteString(`<td width="10" style="font-size:0">&nbsp;</td>`)
		}
		b.WriteString(`<td valign="top" style="padding:14px;border-radius:14px;background:` + surf + `;font-family:` + font + `">` +
			`<div style="font-size:12px;color:` + text2 + `">` + esc(s[0]) + `</div>` +
			`<div style="padding-top:4px;font-size:18px;font-weight:700;color:` + text + `">` + esc(s[1]) + `</div>`)
		if s[2] != "" {
			b.WriteString(`<div style="padding-top:2px;font-size:12px;font-weight:600;color:` + text2 + `">` + esc(s[2]) + `</div>`)
		}
		b.WriteString(`</td>`)
	}
	b.WriteString(`</tr></table></td></tr>`)
	return b.String()
}

func meter(pct int, color string) string {
	w := max(0, min(pct, 100))
	return `<tr><td style="padding:0 0 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDEDF0;border-radius:5px"><tr>` +
		fmt.Sprintf(`<td width="%d%%" style="height:10px;line-height:10px;font-size:0;background:%s;border-radius:5px">&nbsp;</td>`, max(w, 1), color) +
		fmt.Sprintf(`<td width="%d%%" style="font-size:0">&nbsp;</td>`, 100-max(w, 1)) + `</tr></table></td></tr>`
}

// shell wraps a body in the shared NURU frame.
func shell(tpl, subject, preview string, body []string, lines []string, promo bool) Message {
	settings := AppURL() + "/notifications/settings"
	footer := `<a href="` + esc(settings) + `" style="color:` + muted + `">Email settings</a> · <a href="` + esc(AppURL()+"/settings/privacy") + `" style="color:` + muted + `">Privacy</a> · <a href="` + esc(AppURL()+"/help") + `" style="color:` + muted + `">Help</a>`
	if promo {
		footer = `You get this because tips are on. <a href="` + esc(settings) + `" style="color:` + muted + `">Unsubscribe</a> · ` + footer
	}
	doc := `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>` + esc(subject) + `</title></head>` +
		`<body style="margin:0;padding:0;background:#ECECEF">` +
		`<div style="display:none;max-height:0;overflow:hidden;opacity:0">` + esc(preview) + `</div>` +
		`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ECECEF"><tr><td align="center" style="padding:28px 12px">` +
		`<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid ` + border + `;border-radius:20px;overflow:hidden">` +
		// header: logo and partner line
		`<tr><td style="padding:20px 32px;border-bottom:1px solid ` + border + `"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
		`<td style="font-family:` + font + `"><span style="display:inline-block;width:32px;height:32px;line-height:32px;border-radius:10px;background:` + red + `;color:#FFFFFF;text-align:center;font-size:18px;font-weight:800;vertical-align:middle">N</span>` +
		`<span style="padding-left:10px;font-size:18px;font-weight:800;letter-spacing:1px;color:` + text + `;vertical-align:middle">NURU</span></td>` +
		`<td align="right" style="font-family:` + font + `;font-size:12px;color:` + muted + `">with Zenith Bank</td></tr></table></td></tr>` +
		// body
		`<tr><td style="padding:32px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">` + strings.Join(body, "") + `</table></td></tr>` +
		// safety footer
		`<tr><td style="padding:24px 32px;background:` + surf + `;font-family:` + font + `;font-size:12px;line-height:18px;color:` + text2 + `">` +
		`NURU will never ask for your PIN, password, OTP or BVN by email, call or chat.` +
		`<div style="padding-top:8px;color:` + muted + `">Zenith Bank Plc, Plot 84 Ajose Adeogun Street, Victoria Island, Lagos · 0201 278 7000</div>` +
		`<div style="padding-top:8px;color:` + muted + `">` + footer + `</div></td></tr>` +
		`</table></td></tr></table></body></html>`
	plain := strings.Join(lines, "\n\n") + "\n\n--\nNURU will never ask for your PIN, password, OTP or BVN by email, call or chat.\nZenith Bank Plc, Plot 84 Ajose Adeogun Street, Victoria Island, Lagos. 0201 278 7000\nEmail settings: " + settings + "\n"
	return Message{Template: tpl, Subject: subject, Preview: preview, HTML: doc, Text: plain}
}

func spaced(code string) string {
	if len(code) == 6 {
		return code[:3] + " " + code[3:]
	}
	return code
}

func first(name string) string {
	if f := strings.Fields(name); len(f) > 0 {
		return f[0]
	}
	return "there"
}

// ---- the emails NURU sends today ----

// Welcome is sent on sign up with the code that verifies the email.
func Welcome(name, code string) Message {
	return shell("welcome", "Welcome to NURU, "+first(name)+". Here is your code", "Enter "+spaced(code)+" to finish creating your account.",
		[]string{h("Welcome to NURU"), p("Your money, explained in your language. Enter this code in the app to verify your email. It expires in 10 minutes."),
			codeBox(code), note("Did not sign up? Ignore this email and no account will be created.", false)},
		[]string{"Welcome to NURU, " + first(name) + ".", "Your code is " + code + ". It expires in 10 minutes.", "Did not sign up? Ignore this email and no account will be created."}, false)
}

// SignInCode is sent for every sign in, customer or staff.
func SignInCode(code, device string, at time.Time) Message {
	if device == "" {
		device = "Unknown device"
	}
	return shell("signin_code", "Your NURU sign-in code is "+spaced(code), "Requested from "+device+", "+When(at)+".",
		[]string{h("Your sign-in code"), codeBox(code), kv([][2]string{{"Device", device}, {"Time", When(at)}}),
			note("Not you? Do not share this code. Change your password and call Zenith on 0201 278 7000.", true)},
		[]string{"Your NURU sign-in code is " + code + ".", "Device: " + device + "\nTime: " + When(at),
			"Not you? Do not share this code. Change your password and call Zenith on 0201 278 7000."}, false)
}

// PasswordReset carries the code for the reset screen.
func PasswordReset(code string) Message {
	return shell("pin_reset", "Reset your NURU password", "Use "+spaced(code)+" within 10 minutes.",
		[]string{h("Reset your password"), p("Enter this code on the reset screen, then choose a new password."), codeBox(code),
			note("If you did not ask for this, your account is still safe. You can ignore this email.", false)},
		[]string{"Reset your NURU password", "Your code is " + code + ". Use it within 10 minutes.", "If you did not ask for this, your account is still safe."}, false)
}

// NewDevice warns that an account was opened on a device not seen before.
func NewDevice(device, ip string, at time.Time) Message {
	rows := [][2]string{{"Device", device}, {"Time", When(at)}}
	if ip != "" {
		rows = append(rows, [2]string{"IP address", ip})
	}
	return shell("new_device", "New sign-in to NURU on "+device, "Was this you? "+device+", "+When(at)+".",
		[]string{h("New sign-in on " + device), kv(rows), p("If this was you, there is nothing to do. If not, sign that device out and change your password."),
			button("Review my devices", AppURL()+"/settings/devices", false)},
		[]string{"New sign-in to NURU on " + device + " at " + When(at) + ".", "Not you? Sign it out: " + AppURL() + "/settings/devices"}, false)
}

// Transfer describes one transfer for a receipt.
type Transfer struct {
	Amount    float64
	Name      string // the other side
	Bank      string
	Account   string // last four digits
	Note      string
	From      string // account it left or landed in
	Reference string
	At        time.Time
}

// TransferSent is the receipt for money the customer sent.
func TransferSent(t Transfer) Message {
	to := t.Name
	if t.Bank != "" {
		to += ", " + t.Bank
	}
	if t.Account != "" {
		to += " •••• " + t.Account
	}
	rows := [][2]string{{"To", to}}
	if t.Note != "" {
		rows = append(rows, [2]string{"For", t.Note})
	}
	if t.From != "" {
		rows = append(rows, [2]string{"From", t.From})
	}
	rows = append(rows, [2]string{"Date", When(t.At)}, [2]string{"Reference", t.Reference})
	preview := "Ref " + t.Reference
	if t.Note != "" {
		preview = t.Note + " · " + preview
	}
	return shell("transfer_sent", "You sent "+Naira(t.Amount)+" to "+t.Name, preview,
		[]string{hero(Naira(t.Amount), "Sent to "+t.Name, text), kv(rows), button("View receipt", AppURL()+"/history", true)},
		[]string{"You sent " + Naira(t.Amount) + " to " + to + ".", "Date: " + When(t.At) + "\nReference: " + t.Reference}, false)
}

// TransferReceived is the receipt for money that came in.
func TransferReceived(t Transfer) Message {
	sub := "From " + t.Name
	if t.From != "" {
		sub += " into " + t.From
	}
	return shell("transfer_received", "You received "+Naira(t.Amount), sub+".",
		[]string{hero("+"+Naira(t.Amount), sub, green), kv([][2]string{{"From", t.Name}, {"Date", When(t.At)}}),
			p("Tell NURU what it was for so your plan and insights stay accurate."), button("Describe it in NURU", AppURL()+"/history", false)},
		[]string{"You received " + Naira(t.Amount) + ". " + sub + ".", "Date: " + When(t.At)}, false)
}

// Week holds the numbers for the weekly recap.
type Week struct {
	Name           string
	In, Out, Saved float64
	PrevOut        float64
	Top            string // biggest category this week
	TopAmount      float64
	Tip            string
}

// WeeklyRecap summarises the last seven days.
func WeeklyRecap(w Week) Message {
	diff := w.PrevOut - w.Out
	change := ""
	subject := "Your week: " + Naira(w.Out) + " out"
	switch {
	case w.PrevOut > 0 && diff > 0:
		subject += ", " + Naira(diff) + " less than last week"
		change = fmt.Sprintf("-%d%%", int(math.Round(diff/w.PrevOut*100)))
	case w.PrevOut > 0 && diff < 0:
		subject += ", " + Naira(-diff) + " more than last week"
		change = fmt.Sprintf("+%d%%", int(math.Round(-diff/w.PrevOut*100)))
	}
	preview := "Here is where your money went this week."
	if w.Top != "" {
		preview = w.Top + " was your biggest spend at " + Naira(w.TopAmount) + "."
	}
	body := []string{h("Your week in money"), p("Hi " + first(w.Name) + ", here is how the last seven days went."),
		stats([][3]string{{"Money in", Naira(w.In), ""}, {"Money out", Naira(w.Out), change}, {"Saved", Naira(w.Saved), ""}})}
	txt := []string{"Your week in money", "Money in: " + Naira(w.In) + "\nMoney out: " + Naira(w.Out) + "\nSaved: " + Naira(w.Saved)}
	if w.Tip != "" {
		body = append(body, note(w.Tip, true))
		txt = append(txt, w.Tip)
	}
	body = append(body, button("Ask NURU about my week", AppURL()+"/ask", false))
	return shell("weekly_recap", subject, preview, body, txt, true)
}

// Budget holds one budget that is nearly used.
type Budget struct {
	Category     string
	Spent, Limit float64
	DaysLeft     int
}

// BudgetAlert warns that a monthly budget is nearly or fully used.
func BudgetAlert(b Budget) Message {
	pct := 0
	if b.Limit > 0 {
		pct = int(math.Round(b.Spent / b.Limit * 100))
	}
	left := b.Limit - b.Spent
	cat := strings.ToLower(b.Category)
	preview := Naira(left) + " left for " + fmt.Sprint(b.DaysLeft) + " days."
	color := amber
	advice := "Spending a little less here for the rest of the month keeps you inside."
	if left <= 0 {
		preview = "You are " + Naira(-left) + " over with " + fmt.Sprint(b.DaysLeft) + " days to go."
		color = red
		advice = "You can raise the limit or move money from another budget in the app."
	}
	return shell("budget_alert", fmt.Sprintf("You have used %d%% of your %s budget", pct, cat), preview,
		[]string{h(fmt.Sprintf("%s budget: %d%% used", b.Category, pct)),
			kv([][2]string{{"Spent", Naira(b.Spent) + " of " + Naira(b.Limit)}, {"Days left", fmt.Sprint(b.DaysLeft)}}),
			meter(pct, color), p(advice), button("Adjust my budget", AppURL()+"/insights/budgets", true)},
		[]string{fmt.Sprintf("%s budget: %d%% used.", b.Category, pct), Naira(b.Spent) + " of " + Naira(b.Limit) + ". " + preview}, false)
}

// StaffInvite welcomes a new console or HQ team member.
func StaffInvite(name, inviter, role, area string) Message {
	place, path := "the NURU Console", "/console/login"
	if area == "hq" {
		place, path = "NURU HQ", "/hq/login"
	}
	by := "Your team"
	if inviter != "" {
		by = inviter
	}
	return shell("staff_invite", by+" invited you to "+place, "You were added as "+role+". Sign in with your work email.",
		[]string{h("You are invited to " + place), p("Hi " + first(name) + ", " + by + " added you as " + role + ". There is no password to set: sign in with this email and we send you a one time code."),
			kv([][2]string{{"Role", role}, {"Sign in at", AppURL() + path}}), button("Sign in", AppURL()+path, false),
			note("Access ends after 90 days unused. Did not expect this? Ignore this email.", false)},
		[]string{by + " invited you to " + place + " as " + role + ".", "Sign in with your work email: " + AppURL() + path}, false)
}
