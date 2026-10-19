package httpapi

import (
	"context"
	"net/http"
	"net/mail"
	"slices"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"github.com/NURU-AI-FC/nuru/services/api/internal/email"
)

// Two kinds of staff sign in: the NURU team to HQ (role 'hq') and Zenith staff
// to the console (role 'staff'). Each has a sub-role that decides which areas
// they can open. The sub-role is read from the database on every request, so
// a role change or deactivation applies at once, not when the token expires.

// hqAreas lists the HQ roles that may open each area.
var hqAreas = map[string][]string{
	"overview": {"owner", "ops", "analyst"},
	"health":   {"owner", "ops", "engineer"},
	"support":  {"owner", "ops", "support"},
	"emails":   {"owner", "ops", "analyst"},
	"team":     {"owner"},
}

// consoleAreas lists the console roles that may open each area. Everyone
// with console access sees the overview and segments.
var consoleAreas = map[string][]string{
	"overview":  {"viewer", "analyst", "campaigns", "risk", "admin"},
	"segments":  {"viewer", "analyst", "campaigns", "risk", "admin"},
	"customers": {"analyst", "admin"},
	"export":    {"analyst", "admin"},
	"campaigns": {"campaigns", "admin"},
	"approve":   {"admin"},
	"risk":      {"risk", "admin"},
	"data":      {"risk", "admin"},
	"team":      {"admin"},
}

func can(table map[string][]string, sub, area string) bool { return slices.Contains(table[area], sub) }

// campaignMoveAllowed says whether a console role may move a campaign to a
// status. Campaign managers send for approval or stop; only admins approve.
func campaignMoveAllowed(sub, to string) bool {
	if sub == "admin" {
		return true
	}
	return sub == "campaigns" && (to == "pending" || to == "stopped")
}

const zenithDomain = "@zenithbank.com"

// staffEmailAllowed is the console sign in rule: Zenith work emails, or an
// email a console admin invited, or the demo staff account.
func staffEmailAllowed(email string, invited, demo bool) bool {
	return strings.HasSuffix(email, zenithDomain) || invited || demo
}

type member struct {
	ID, Name, Email, Role, Sub string
	Active                     bool
}

type memberKey struct{}

func memberFrom(ctx context.Context) member {
	m, _ := ctx.Value(memberKey{}).(member)
	return m
}

func (s *Server) loadMember(ctx context.Context, id string) (member, error) {
	m := member{ID: id}
	err := s.db.QueryRow(ctx, `select name, email, role, case when role='hq' then hq_role else console_role end, deactivated_at is null
		from users where id=$1`, id).Scan(&m.Name, &m.Email, &m.Role, &m.Sub, &m.Active)
	return m, err
}

// gate lets a request through only when the signed in person has the role
// and a sub-role allowed into the area. load is a parameter so tests can run
// without a database.
func gate(load func(context.Context, string) (member, error), role string, table map[string][]string, area string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			m, err := load(r.Context(), uid(r))
			if err != nil || !m.Active || m.Role != role || !can(table, m.Sub, area) {
				fail(w, 403, "your role does not include this page")
				return
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), memberKey{}, m)))
		})
	}
}

func (s *Server) gate(role string, table map[string][]string, area string) func(http.Handler) http.Handler {
	return gate(s.loadMember, role, table, area)
}

// audit records what staff did. detail must never name a customer.
func (s *Server) audit(ctx context.Context, scope, actorID, action, detail string) {
	var actor any
	if actorID != "" {
		actor = actorID
	}
	s.db.Exec(ctx, `insert into audit_log(scope,actor_id,actor,action,detail) values($1,$2,coalesce((select name from users where id=$2),''),$3,$4)`,
		scope, actor, action, detail)
}

func (s *Server) auditLog(ctx context.Context, scope string, limit int) []map[string]any {
	out := []map[string]any{}
	rows, err := s.db.Query(ctx, `select actor, action, detail, created_at from audit_log where scope=$1 order by id desc limit $2`, scope, limit)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var actor, action, detail string
		var at time.Time
		rows.Scan(&actor, &action, &detail, &at)
		out = append(out, map[string]any{"actor": actor, "action": action, "detail": detail, "at": at})
	}
	return out
}

// ---- Staff sign in ----

// staffStart sends a sign in code to a console or HQ team member. There is no
// password: the code proves the work email. Personal emails are refused for
// the console, and unknown work emails get the same answer as known ones.
func (s *Server) staffStart(w http.ResponseWriter, r *http.Request) {
	var in struct{ Email, Area string }
	if !decode(w, r, &in) {
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	if _, err := mail.ParseAddress(in.Email); err != nil {
		fail(w, 400, "enter your work email")
		return
	}
	role := "staff"
	if in.Area == "hq" {
		role = "hq"
	}
	var id string
	var invited, active, verified bool
	var last *time.Time
	err := s.db.QueryRow(r.Context(), `select id, invited_at is not null, deactivated_at is null, email_verified,
		greatest(created_at, invited_at, (select max(last_seen_at) from sessions where user_id=users.id))
		from users where email=$1 and role=$2`, in.Email, role).Scan(&id, &invited, &active, &verified, &last)
	found := err == nil
	demo := s.cfg.DemoMode && slices.Contains(demoStaff, in.Email)
	if role == "staff" && !staffEmailAllowed(in.Email, found && invited, demo) {
		fail(w, 403, "use your Zenith Bank work email. Personal emails cannot sign in.")
		return
	}
	if found && !active {
		fail(w, 403, "your access was turned off. Ask your admin to invite you again.")
		return
	}
	if found && role == "staff" && !demo && last != nil && time.Since(*last) > 90*24*time.Hour {
		fail(w, 403, "access ends after 90 days unused. Ask your console admin to invite you again.")
		return
	}
	if found {
		s.sendOTP(r, in.Email, "staff")
	} else if err != pgx.ErrNoRows {
		fail(w, 500, "try again")
		return
	}
	writeJSON(w, 200, map[string]any{"otp_required": true, "demo_code": s.demoCode()})
}

// demoStaff are the seeded team accounts that keep working in demo mode.
var demoStaff = []string{"staff@nuru.app", "ceo@nuru.app", "ops@nuru.app"}

// ---- Team and access, shared by HQ and the console ----

type teamScope struct {
	Scope  string            // audit scope: hq or console
	Role   string            // users.role
	Column string            // hq_role or console_role
	Roles  map[string]string // role key to label
	Admin  string            // the role that manages the team
	Domain string            // invites must use this email domain, if set
}

var hqTeam = teamScope{"hq", "hq", "hq_role", map[string]string{"owner": "CEO · Owner", "ops": "Operations", "support": "Support", "engineer": "Engineer", "analyst": "Analyst"}, "owner", ""}
var consoleTeam = teamScope{"console", "staff", "console_role", map[string]string{"viewer": "Viewer", "analyst": "Insights analyst", "campaigns": "Campaign manager", "risk": "Risk officer", "admin": "Console admin"}, "admin", zenithDomain}

// nameFromEmail turns amaka.obi@zenithbank.com into Amaka Obi.
func nameFromEmail(email string) string {
	local, _, _ := strings.Cut(email, "@")
	parts := strings.FieldsFunc(local, func(r rune) bool { return r == '.' || r == '_' || r == '-' || r == '+' })
	for i, p := range parts {
		parts[i] = strings.ToUpper(p[:1]) + p[1:]
	}
	if len(parts) == 0 {
		return email
	}
	return strings.Join(parts, " ")
}

func (s *Server) teamList(t teamScope) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := s.db.Query(r.Context(), `select id, name, email, `+t.Column+`, deactivated_at is not null, email_verified, password_hash<>'',
			invited_at, (select max(last_seen_at) from sessions where user_id=users.id)
			from users where role=$1 and ($2 or deactivated_at is null)
			order by deactivated_at is not null, `+t.Column+`='`+t.Admin+`' desc, name`, t.Role, t.Scope == "console")
		if err != nil {
			fail(w, 500, "could not load the team")
			return
		}
		defer rows.Close()
		people := []map[string]any{}
		for rows.Next() {
			var id, name, email, role string
			var off, verified, password bool
			var invited, seen *time.Time
			rows.Scan(&id, &name, &email, &role, &off, &verified, &password, &invited, &seen)
			status, signIn := "Active", "Email code"
			switch {
			case off:
				status, signIn = "Deactivated", "—"
			case !verified:
				status, signIn = "Invited", "Invite sent"
			case password:
				signIn = "Password and code"
			}
			people = append(people, map[string]any{"id": id, "name": name, "email": email, "role": role, "role_label": t.Roles[role],
				"status": status, "sign_in": signIn, "last_active": seen, "invited_at": invited, "me": id == uid(r)})
		}
		writeJSON(w, 200, map[string]any{"people": people, "roles": t.Roles, "audit": s.auditLog(r.Context(), t.Scope, 30)})
	}
}

func (s *Server) teamInvite(t teamScope) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var in struct{ Email, Name, Role string }
		if !decode(w, r, &in) {
			return
		}
		in.Email = strings.ToLower(strings.TrimSpace(in.Email))
		if _, err := mail.ParseAddress(in.Email); err != nil || strings.ContainsAny(in.Email, " <>") {
			fail(w, 400, "enter a valid email")
			return
		}
		if t.Domain != "" && !strings.HasSuffix(in.Email, t.Domain) {
			fail(w, 400, "only "+strings.TrimPrefix(t.Domain, "@")+" emails can be invited")
			return
		}
		if t.Roles[in.Role] == "" {
			fail(w, 400, "pick a role")
			return
		}
		in.Name = strings.TrimSpace(in.Name)
		if in.Name == "" || len([]rune(in.Name)) > 80 {
			in.Name = nameFromEmail(in.Email)
		}
		me := memberFrom(r.Context())
		var role string
		var off bool
		err := s.db.QueryRow(r.Context(), `select role, deactivated_at is not null from users where email=$1`, in.Email).Scan(&role, &off)
		switch {
		case err == pgx.ErrNoRows:
			_, err = s.db.Exec(r.Context(), `insert into users(name,email,password_hash,role,`+t.Column+`,invited_by,invited_at) values($1,$2,'',$3,$4,$5,now())`,
				in.Name, in.Email, t.Role, in.Role, me.ID)
		case err == nil && role == t.Role && off:
			_, err = s.db.Exec(r.Context(), `update users set `+t.Column+`=$1, deactivated_at=null, invited_by=$2, invited_at=now() where email=$3`, in.Role, me.ID, in.Email)
		case err == nil && role == t.Role:
			fail(w, 409, "this person already has access")
			return
		case err == nil:
			fail(w, 409, "this email is already used by another NURU account")
			return
		}
		if err != nil {
			fail(w, 500, "could not send the invite")
			return
		}
		s.audit(r.Context(), t.Scope, me.ID, "invited", in.Name+" as "+t.Roles[in.Role])
		s.sendEmail("", in.Email, email.StaffInvite(in.Name, me.Name, t.Roles[in.Role], t.Scope))
		s.teamList(t)(w, r)
	}
}

// teamUpdate changes someone's role or turns their access on or off. Nobody
// can change their own access, and the last admin cannot be removed.
func (s *Server) teamUpdate(t teamScope) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Role   string
			Active *bool
		}
		if r.Method == http.MethodDelete {
			off := false
			in.Active = &off
		} else if !decode(w, r, &in) {
			return
		}
		me := memberFrom(r.Context())
		id := chi.URLParam(r, "id")
		if id == me.ID {
			fail(w, 400, "ask another admin to change your own access")
			return
		}
		var name, role string
		var off bool
		if err := s.db.QueryRow(r.Context(), `select name, `+t.Column+`, deactivated_at is not null from users where id::text=$1 and role=$2`, id, t.Role).
			Scan(&name, &role, &off); err != nil {
			fail(w, 404, "no one on the team with that ID")
			return
		}
		leavingAdmin := role == t.Admin && !off && ((in.Role != "" && in.Role != t.Admin) || (in.Active != nil && !*in.Active))
		if leavingAdmin {
			var admins int
			s.db.QueryRow(r.Context(), `select count(*) from users where role=$1 and `+t.Column+`=$2 and deactivated_at is null`, t.Role, t.Admin).Scan(&admins)
			if admins <= 1 {
				fail(w, 400, "keep at least one "+strings.ToLower(t.Roles[t.Admin]))
				return
			}
		}
		if in.Role != "" && in.Role != role {
			if t.Roles[in.Role] == "" {
				fail(w, 400, "pick a role")
				return
			}
			s.db.Exec(r.Context(), `update users set `+t.Column+`=$1 where id=$2`, in.Role, id)
			s.audit(r.Context(), t.Scope, me.ID, "role_changed", name+" to "+t.Roles[in.Role])
		}
		if in.Active != nil && *in.Active == off {
			if *in.Active {
				s.db.Exec(r.Context(), `update users set deactivated_at=null where id=$1`, id)
				s.audit(r.Context(), t.Scope, me.ID, "reactivated", name)
			} else {
				s.db.Exec(r.Context(), `update users set deactivated_at=now() where id=$1`, id)
				s.endSessions(r.Context(), id, "")
				action := "deactivated"
				if t.Scope == "hq" {
					action = "removed"
				}
				s.audit(r.Context(), t.Scope, me.ID, action, name)
			}
		}
		s.teamList(t)(w, r)
	}
}
