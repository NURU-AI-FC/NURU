package httpapi

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/NURU-AI-FC/nuru/services/api/internal/auth"
	"github.com/NURU-AI-FC/nuru/services/api/internal/config"
	"github.com/NURU-AI-FC/nuru/services/api/internal/secure"
)

type Server struct {
	cfg    config.Config
	db     *pgxpool.Pool
	tokens *auth.Signer
	box    *secure.Box
	http   *http.Client
	fx     *fxCache
}

func New(cfg config.Config, db *pgxpool.Pool, box *secure.Box) *Server {
	return &Server{cfg: cfg, db: db, tokens: auth.NewSigner(cfg.JWTSecret), box: box,
		http: &http.Client{Timeout: 45 * time.Second}, fx: &fxCache{}}
}

func (s *Server) Routes() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   s.cfg.WebOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           600,
	}))
	r.Use(securityHeaders)

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) { writeJSON(w, 200, map[string]string{"status": "ok"}) })
	r.Get("/fx", s.fxRates)

	r.Group(func(r chi.Router) {
		// slow down guessing of passwords and codes
		r.Use(httprate.LimitByIP(20, time.Minute))
		r.Post("/auth/signup", s.signup)
		r.Post("/auth/login", s.login)
		r.Post("/auth/verify", s.verifyOTP)
		r.Post("/auth/forgot", s.forgot)
		r.Post("/auth/reset", s.reset)
	})

	r.Group(func(r chi.Router) {
		r.Use(s.tokens.Middleware, s.liveSession)
		r.Get("/me", s.me)
		r.Patch("/me", s.updateMe)
		r.Post("/me/pin", s.setPIN)
		r.Post("/me/kyc", s.kyc)
		r.Get("/me/sessions", s.sessions)
		r.Delete("/me/sessions", s.revokeOthers)
		r.Delete("/me/sessions/{id}", s.revokeSession)
		r.Post("/me/logout", s.logout)
		r.Get("/me/prefs", s.prefs)
		r.Patch("/me/prefs", s.updatePrefs)
		r.Get("/me/export", s.export)
		r.Get("/me/security/overview", s.securityOverview)
		r.Post("/me/freeze", s.freeze)
		r.With(httprate.LimitByIP(10, time.Minute)).Post("/accounts/link", s.linkAccount)
		r.Delete("/accounts/{id}", s.unlinkAccount)

		r.Get("/accounts", s.accounts)
		r.Get("/transactions", s.transactions)
		r.Get("/transactions/{id}", s.getTx)
		r.Post("/transactions/{id}/report", s.reportTx)
		r.Get("/accounts/{id}", s.accountDetail)
		r.Post("/accounts/demo", s.demoAccounts)
		r.Get("/me/profile", s.profile)
		r.Get("/notifications", s.notifications)
		r.Get("/notifications/{id}", s.notification)
		r.Patch("/notifications/{id}", s.markNotification)
		r.Get("/me/notification-settings", s.notifySettings)
		r.Put("/me/notification-settings", s.saveNotifySettings)
		r.Get("/analytics/summary", s.summary)
		r.Get("/analytics/compare", s.compare)
		r.Get("/analytics/forecast", s.forecast)
		r.Get("/analytics/heat", s.heat)
		r.Get("/insights", s.insights)
		r.Get("/analytics/category", s.categoryDetail)
		r.Get("/analytics/recurring", s.recurringBills)
		r.Get("/analytics/merchants", s.merchants)
		r.Get("/analytics/health", s.health)
		r.Get("/analytics/unusual", s.unusual)
		r.Post("/analytics/unusual/{id}", s.reviewUnusual)
		r.Get("/analytics/report", s.report)
		r.Get("/analytics/week", s.week)
		r.Get("/budgets", s.budgets)
		r.Post("/budgets", s.addBudget)
		r.Patch("/budgets/{id}", s.updateBudget)
		r.Delete("/budgets/{id}", s.deleteBudget)
		r.Get("/goals", s.goals)
		r.Post("/goals", s.addGoal)
		r.Patch("/goals/{id}", s.updateGoal)
		r.Delete("/goals/{id}", s.deleteGoal)
		r.Get("/planner/calendar", s.calendar)
		r.Get("/planner/plan", s.plan)
		r.Post("/planner/plan", s.applyPlan)

		r.With(httprate.LimitByIP(10, time.Minute)).Post("/transfers", s.transfer)
		r.Get("/me/security", s.security)
		r.With(httprate.LimitByIP(10, time.Minute)).Post("/me/face", s.enrolFace)
		r.With(httprate.LimitByIP(10, time.Minute)).Post("/payments/bill", s.payBill)
		r.Get("/payees", s.payees)
		r.Post("/payees", s.addPayee)
		r.Patch("/payees/{id}", s.updatePayee)
		r.Delete("/payees/{id}", s.deletePayee)
		r.Get("/loans", s.loans)
		r.Get("/investments", s.investments)
		r.Get("/reminders", s.reminders)
		r.Post("/reminders", s.addReminder)
		r.Patch("/reminders/{id}", s.toggleReminder)
		r.Get("/business", s.business)

		r.Get("/loans/eligibility", s.eligibility)
		r.Get("/loans/{id}", s.loan)
		r.Get("/disputes", s.disputes)
		r.Post("/disputes", s.addDispute)
		r.Get("/deposits", s.deposits)
		r.Post("/deposits", s.addDeposit)
		r.Post("/deposits/{id}/withdraw", s.withdrawDeposit)
		r.Get("/pension", s.pension)
		r.Get("/insurance", s.insurance)
		r.Post("/insurance/claims", s.addClaim)
		r.Get("/vaults", s.vaults)
		r.Post("/vaults", s.addVault)
		r.Post("/vaults/{id}/move", s.moveVault)
		r.Patch("/business", s.updateBusiness)
		r.Get("/business/payroll", s.payroll)
		r.With(httprate.LimitByIP(10, time.Minute)).Post("/business/payroll", s.runPayroll)
		r.Get("/business/payslip/{id}", s.payslipOne)
		r.Get("/business/vendors", s.vendors)
		r.Post("/business/vendors", s.addVendor)
		r.Post("/business/vendors/{id}/pay", s.payVendor)
		r.Get("/business/invoices", s.invoices)
		r.Post("/business/invoices", s.addInvoice)
		r.Patch("/business/invoices/{id}", s.payInvoice)
		r.Get("/business/plan", s.businessPlan)
		r.Post("/business/plan", s.addPlanItem)
		r.Get("/business/investor", s.investor)

		r.With(httprate.LimitByIP(30, time.Minute)).Post("/chat", s.chat)
		r.Get("/chat", s.chatHistory)
		r.Get("/chat/threads", s.chatThreads)
		r.Delete("/chat", s.clearChat)

		s.consoleRoutes(r)
	})
	return r
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func fail(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]string{"error": msg})
}

func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		fail(w, 400, "could not read the request")
		return false
	}
	return true
}

func uid(r *http.Request) string { return auth.From(r.Context()).UserID }
