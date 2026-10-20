import { StrictMode, Suspense, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, createRoutesFromElements, matchRoutes } from 'react-router-dom'
import { token } from './api'
import { page, preloadFor } from './page'
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
const Accounts = page(() => import('./pages/Accounts'))
const AccountDetail = page(() => import('./pages/Accounts'), 'AccountDetail')
const Ask = page(() => import('./pages/Ask'))
const Auth = page(() => import('./pages/Auth'))
const Branches = page(() => import('./pages/Branches'))
const Business = page(() => import('./pages/Business'))
const Decide = page(() => import('./pages/business/Decide'))
const Expenses = page(() => import('./pages/business/Expenses'))
const Investor = page(() => import('./pages/business/Investor'))
const Invoices = page(() => import('./pages/business/Invoices'))
const Payroll = page(() => import('./pages/business/Payroll'))
const Payslip = page(() => import('./pages/business/Payslip'))
const Plan = page(() => import('./pages/business/Plan'))
const Setup = page(() => import('./pages/business/Setup'))
const Vendors = page(() => import('./pages/business/Vendors'))
const Verdict = page(() => import('./pages/business/Verdict'))
const Console = page(() => import('./pages/Console'))
const History = page(() => import('./pages/History'))
const TxDetail = page(() => import('./pages/History'), 'TxDetail')
const Campaigns = page(() => import('./pages/console/Campaigns'))
const Customers = page(() => import('./pages/console/Customers'))
const CustomerDetail = page(() => import('./pages/console/Customers'), 'CustomerDetail')
const ConsoleData = page(() => import('./pages/console/Data'))
const Risk = page(() => import('./pages/console/Risk'))
const Segments = page(() => import('./pages/console/Segments'))
const Home = page(() => import('./pages/Home'))
const Insights = page(() => import('./pages/Insights'))
const Landing = page(() => import('./pages/Landing'))
const Money = page(() => import('./pages/Money'))
const Notifications = page(() => import('./pages/Notifications'))
const AlertDetail = page(() => import('./pages/Notifications'), 'AlertDetail')
const NotifySettings = page(() => import('./pages/Notifications'), 'NotifySettings')
const Borrow = page(() => import('./pages/money/Borrow'))
const Claim = page(() => import('./pages/money/Claim'))
const Deposit = page(() => import('./pages/money/Deposit'))
const Insurance = page(() => import('./pages/money/Insurance'))
const LoanDetail = page(() => import('./pages/money/LoanDetail'))
const Pension = page(() => import('./pages/money/Pension'))
const Refunds = page(() => import('./pages/money/Refunds'))
const Vaults = page(() => import('./pages/money/Vaults'))
const Pay = page(() => import('./pages/Pay'))
const Planner = page(() => import('./pages/Planner'))
const Profile = page(() => import('./pages/Profile'))
const Search = page(() => import('./pages/Search'))
const Settings = page(() => import('./pages/Settings'))
const InsightAlert = page(() => import('./pages/insights/Alert'))
const InsightBills = page(() => import('./pages/insights/Bills'))
const InsightBudgets = page(() => import('./pages/insights/Budgets'))
const InsightCategory = page(() => import('./pages/insights/Category'))
const InsightGoals = page(() => import('./pages/insights/Goals'))
const InsightHealth = page(() => import('./pages/insights/Health'))
const InsightMerchants = page(() => import('./pages/insights/Merchants'))
const InsightReport = page(() => import('./pages/insights/Report'))
const PlanBudget = page(() => import('./pages/planner/Budget'))
const PlanCalendar = page(() => import('./pages/planner/Calendar'))
const PlanGoal = page(() => import('./pages/planner/Goal'))
const PlanMonth = page(() => import('./pages/planner/Plan'))
const PlanRecap = page(() => import('./pages/planner/Recap'))
const Welcome = page(() => import('./pages/Welcome'))
const Verify = page(() => import('./pages/Verify'))
const LinkAccount = page(() => import('./pages/Link'))
const Help = page(() => import('./pages/Help'))
const Learn = page(() => import('./pages/Learn'))
const Security = page(() => import('./pages/settings/Security'))
const Devices = page(() => import('./pages/settings/Devices'))
const Language = page(() => import('./pages/settings/Language'))
const Privacy = page(() => import('./pages/settings/Privacy'))
const LinkedAccounts = page(() => import('./pages/settings/Accounts'))
const Support = page(() => import('./pages/settings/Support'))
const ConsoleLogin = page(() => import('./pages/console/Login'))
const ConsoleTeam = page(() => import('./pages/console/Team'))
const HQOverview = page(() => import('./pages/hq/Overview'))
const HQHealth = page(() => import('./pages/hq/Health'))
const HQSupport = page(() => import('./pages/hq/Support'))
const HQEmails = page(() => import('./pages/hq/Emails'))
const HQTeam = page(() => import('./pages/hq/Team'))

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
Root.preload = () => (token() ? Home : Landing).preload()

const routes = (
  <>
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
  </>
)

function render() {
  createRoot(document.getElementById('root')!, { onUncaughtError: reportError, onCaughtError: reportError }).render(
    <StrictMode>
      <AppProvider>
        <BrowserRouter>
          <AssistantHost />
          <Suspense fallback={null}>
            <Routes>{routes}</Routes>
          </Suspense>
        </BrowserRouter>
      </AppProvider>
    </StrictMode>,
  )
}

// Start downloading the page for the address being opened straight away. A
// signed-in user waits for /me anyway, so the page loads alongside it; anyone
// else gets the first render once their page has arrived.
const matched = matchRoutes(createRoutesFromElements(routes), location) || []
const warm = preloadFor(matched[matched.length - 1]?.route.element)?.().catch(() => {})
if (token() || !warm) render()
else Promise.race([warm, new Promise((ok) => setTimeout(ok, 5000))]).then(render)
