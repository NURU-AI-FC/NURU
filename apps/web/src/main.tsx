import { lazy, StrictMode, Suspense, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './store'
import { homeFor } from './access'
// Page styles stay in the first stylesheet, in the order they always had
// before styles.css, so lazy pages render exactly as before (about 9 kB
// gzipped). Their scripts load on demand below.
import './pages/Home.css'
import './pages/pay/Pay.css'
import './pages/Ask.css'
import './pages/branches.css'
import './pages/Business.css'
import './pages/money/kit.css'
import './pages/console/console.css'
import './pages/Insights.css'
import './pages/landing.css'
import './pages/settings/kit.css'
import './pages/hq/hq.css'
import './styles.css'
import { initSentry, reportError } from './sentry'
import { AssistantHost } from './Assistant'

// Every page is its own chunk, so the first screen only downloads what it
// draws. Navigations run in a transition, so the current page stays up while
// the next one loads.
const Accounts = lazy(() => import('./pages/Accounts'))
const AccountDetail = lazy(() => import('./pages/Accounts').then((m) => ({ default: m.AccountDetail })))
const Ask = lazy(() => import('./pages/Ask'))
const Auth = lazy(() => import('./pages/Auth'))
const Branches = lazy(() => import('./pages/Branches'))
const Business = lazy(() => import('./pages/Business'))
const Decide = lazy(() => import('./pages/business/Decide'))
const Expenses = lazy(() => import('./pages/business/Expenses'))
const Investor = lazy(() => import('./pages/business/Investor'))
const Invoices = lazy(() => import('./pages/business/Invoices'))
const Payroll = lazy(() => import('./pages/business/Payroll'))
const Payslip = lazy(() => import('./pages/business/Payslip'))
const Plan = lazy(() => import('./pages/business/Plan'))
const Setup = lazy(() => import('./pages/business/Setup'))
const Vendors = lazy(() => import('./pages/business/Vendors'))
const Verdict = lazy(() => import('./pages/business/Verdict'))
const Console = lazy(() => import('./pages/Console'))
const History = lazy(() => import('./pages/History'))
const TxDetail = lazy(() => import('./pages/History').then((m) => ({ default: m.TxDetail })))
const Campaigns = lazy(() => import('./pages/console/Campaigns'))
const Customers = lazy(() => import('./pages/console/Customers'))
const CustomerDetail = lazy(() => import('./pages/console/Customers').then((m) => ({ default: m.CustomerDetail })))
const ConsoleData = lazy(() => import('./pages/console/Data'))
const Risk = lazy(() => import('./pages/console/Risk'))
const Segments = lazy(() => import('./pages/console/Segments'))
const Home = lazy(() => import('./pages/Home'))
const Insights = lazy(() => import('./pages/Insights'))
const Landing = lazy(() => import('./pages/Landing'))
const Money = lazy(() => import('./pages/Money'))
const Notifications = lazy(() => import('./pages/Notifications'))
const AlertDetail = lazy(() => import('./pages/Notifications').then((m) => ({ default: m.AlertDetail })))
const NotifySettings = lazy(() => import('./pages/Notifications').then((m) => ({ default: m.NotifySettings })))
const Borrow = lazy(() => import('./pages/money/Borrow'))
const Claim = lazy(() => import('./pages/money/Claim'))
const Deposit = lazy(() => import('./pages/money/Deposit'))
const Insurance = lazy(() => import('./pages/money/Insurance'))
const LoanDetail = lazy(() => import('./pages/money/LoanDetail'))
const Pension = lazy(() => import('./pages/money/Pension'))
const Refunds = lazy(() => import('./pages/money/Refunds'))
const Vaults = lazy(() => import('./pages/money/Vaults'))
const Pay = lazy(() => import('./pages/Pay'))
const Planner = lazy(() => import('./pages/Planner'))
const Profile = lazy(() => import('./pages/Profile'))
const Search = lazy(() => import('./pages/Search'))
const Settings = lazy(() => import('./pages/Settings'))
const InsightAlert = lazy(() => import('./pages/insights/Alert'))
const InsightBills = lazy(() => import('./pages/insights/Bills'))
const InsightBudgets = lazy(() => import('./pages/insights/Budgets'))
const InsightCategory = lazy(() => import('./pages/insights/Category'))
const InsightGoals = lazy(() => import('./pages/insights/Goals'))
const InsightHealth = lazy(() => import('./pages/insights/Health'))
const InsightMerchants = lazy(() => import('./pages/insights/Merchants'))
const InsightReport = lazy(() => import('./pages/insights/Report'))
const PlanBudget = lazy(() => import('./pages/planner/Budget'))
const PlanCalendar = lazy(() => import('./pages/planner/Calendar'))
const PlanGoal = lazy(() => import('./pages/planner/Goal'))
const PlanMonth = lazy(() => import('./pages/planner/Plan'))
const PlanRecap = lazy(() => import('./pages/planner/Recap'))
const Welcome = lazy(() => import('./pages/Welcome'))
const Verify = lazy(() => import('./pages/Verify'))
const LinkAccount = lazy(() => import('./pages/Link'))
const Help = lazy(() => import('./pages/Help'))
const Learn = lazy(() => import('./pages/Learn'))
const Security = lazy(() => import('./pages/settings/Security'))
const Devices = lazy(() => import('./pages/settings/Devices'))
const Language = lazy(() => import('./pages/settings/Language'))
const Privacy = lazy(() => import('./pages/settings/Privacy'))
const LinkedAccounts = lazy(() => import('./pages/settings/Accounts'))
const Support = lazy(() => import('./pages/settings/Support'))
const ConsoleLogin = lazy(() => import('./pages/console/Login'))
const ConsoleTeam = lazy(() => import('./pages/console/Team'))
const HQOverview = lazy(() => import('./pages/hq/Overview'))
const HQHealth = lazy(() => import('./pages/hq/Health'))
const HQSupport = lazy(() => import('./pages/hq/Support'))
const HQEmails = lazy(() => import('./pages/hq/Emails'))
const HQTeam = lazy(() => import('./pages/hq/Team'))

initSentry()

// Private keeps each kind of account in its own app: customers, Zenith staff
// in the console and the NURU team in HQ.
function Private({ children, staff = false, hq = false, any = false }: { children: ReactNode; staff?: boolean; hq?: boolean; any?: boolean }) {
  const { user, ready } = useApp()
  if (!ready) return null
  if (!user) return <Navigate to={staff ? '/console/login' : '/login'} replace />
  const want = staff ? 'staff' : hq ? 'hq' : 'customer'
  if (!any && user.role !== want) return <Navigate to={homeFor(user)} replace />
  if (any && user.role === 'hq') return <Navigate to={homeFor(user)} replace />
  return children
}

function Root() {
  const { user, ready } = useApp()
  if (!ready) return null
  if (!user) return <Landing />
  return user.role === 'customer' ? <Home /> : <Navigate to={homeFor(user)} replace />
}

createRoot(document.getElementById('root')!, { onUncaughtError: reportError, onCaughtError: reportError }).render(
  <StrictMode>
    <AppProvider>
      <BrowserRouter>
        <AssistantHost />
        <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/signup" element={<Auth mode="signup" />} />
          <Route path="/forgot" element={<Auth mode="forgot" />} />
          <Route path="/welcome" element={<Private><Welcome /></Private>} />
          <Route path="/verify" element={<Private><Verify /></Private>} />
          <Route path="/link" element={<Private><LinkAccount /></Private>} />
          <Route path="/help" element={<Private any><Help /></Private>} />
          <Route path="/help/chat" element={<Private any><Support /></Private>} />
          <Route path="/learn" element={<Private><Learn /></Private>} />
          <Route path="/settings/security" element={<Private any><Security /></Private>} />
          <Route path="/settings/devices" element={<Private any><Devices /></Private>} />
          <Route path="/settings/language" element={<Private any><Language /></Private>} />
          <Route path="/settings/privacy" element={<Private><Privacy /></Private>} />
          <Route path="/settings/accounts" element={<Private><LinkedAccounts /></Private>} />
          <Route path="/insights" element={<Private><Insights /></Private>} />
          <Route path="/insights/category/:name" element={<Private><InsightCategory /></Private>} />
          <Route path="/insights/bills" element={<Private><InsightBills /></Private>} />
          <Route path="/insights/merchants" element={<Private><InsightMerchants /></Private>} />
          <Route path="/insights/health" element={<Private><InsightHealth /></Private>} />
          <Route path="/insights/budgets" element={<Private><InsightBudgets /></Private>} />
          <Route path="/insights/goals" element={<Private><InsightGoals /></Private>} />
          <Route path="/insights/alert" element={<Private><InsightAlert /></Private>} />
          <Route path="/insights/report" element={<Private><InsightReport /></Private>} />
          <Route path="/ask" element={<Private><Ask /></Private>} />
          <Route path="/assistant" element={<Private><Home /></Private>} />
          <Route path="/pay/*" element={<Private><Pay /></Private>} />
          <Route path="/money" element={<Private><Money /></Private>} />
          <Route path="/money/loans/:id" element={<Private><LoanDetail /></Private>} />
          <Route path="/money/borrow" element={<Private><Borrow /></Private>} />
          <Route path="/money/refunds" element={<Private><Refunds /></Private>} />
          <Route path="/money/deposit" element={<Private><Deposit /></Private>} />
          <Route path="/money/pension" element={<Private><Pension /></Private>} />
          <Route path="/money/insurance" element={<Private><Insurance /></Private>} />
          <Route path="/money/insurance/claim/:id" element={<Private><Claim /></Private>} />
          <Route path="/money/vaults" element={<Private><Vaults /></Private>} />
          <Route path="/business" element={<Private><Business /></Private>} />
          <Route path="/business/setup" element={<Private><Setup /></Private>} />
          <Route path="/business/payroll" element={<Private><Payroll /></Private>} />
          <Route path="/business/payslip/:id" element={<Private><Payslip /></Private>} />
          <Route path="/business/vendors" element={<Private><Vendors /></Private>} />
          <Route path="/business/invoices" element={<Private><Invoices /></Private>} />
          <Route path="/business/expenses" element={<Private><Expenses /></Private>} />
          <Route path="/business/plan" element={<Private><Plan /></Private>} />
          <Route path="/business/decide" element={<Private><Decide /></Private>} />
          <Route path="/business/decide/result" element={<Private><Verdict /></Private>} />
          <Route path="/business/investor" element={<Private><Investor /></Private>} />
          <Route path="/planner" element={<Private><Planner /></Private>} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/planner/calendar" element={<Private><PlanCalendar /></Private>} />
          <Route path="/planner/budget" element={<Private><PlanBudget /></Private>} />
          <Route path="/planner/goal" element={<Private><PlanGoal /></Private>} />
          <Route path="/planner/goal/:id" element={<Private><PlanGoal /></Private>} />
          <Route path="/planner/plan" element={<Private><PlanMonth /></Private>} />
          <Route path="/planner/recap" element={<Private><PlanRecap /></Private>} />
          <Route path="/accounts" element={<Private><Accounts /></Private>} />
          <Route path="/accounts/:id" element={<Private><AccountDetail /></Private>} />
          <Route path="/history" element={<Private><History /></Private>} />
          <Route path="/history/:id" element={<Private><TxDetail /></Private>} />
          <Route path="/notifications" element={<Private><Notifications /></Private>} />
          <Route path="/notifications/settings" element={<Private><NotifySettings /></Private>} />
          <Route path="/notifications/:id" element={<Private><AlertDetail /></Private>} />
          <Route path="/search" element={<Private><Search /></Private>} />
          <Route path="/profile" element={<Private><Profile /></Private>} />
          <Route path="/settings" element={<Private any><Settings /></Private>} />
          <Route path="/console" element={<Private staff><Console /></Private>} />
          <Route path="/console/segments" element={<Private staff><Segments /></Private>} />
          <Route path="/console/customers" element={<Private staff><Customers /></Private>} />
          <Route path="/console/customers/:id" element={<Private staff><CustomerDetail /></Private>} />
          <Route path="/console/campaigns" element={<Private staff><Campaigns /></Private>} />
          <Route path="/console/risk" element={<Private staff><Risk /></Private>} />
          <Route path="/console/data" element={<Private staff><ConsoleData /></Private>} />
          <Route path="/console/team" element={<Private staff><ConsoleTeam /></Private>} />
          <Route path="/console/login" element={<ConsoleLogin area="console" />} />
          <Route path="/hq/login" element={<ConsoleLogin area="hq" />} />
          <Route path="/hq" element={<Private hq><HQOverview /></Private>} />
          <Route path="/hq/health" element={<Private hq><HQHealth /></Private>} />
          <Route path="/hq/support" element={<Private hq><HQSupport /></Private>} />
          <Route path="/hq/emails" element={<Private hq><HQEmails /></Private>} />
          <Route path="/hq/team" element={<Private hq><HQTeam /></Private>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  </StrictMode>,
)
