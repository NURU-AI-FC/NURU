import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Accounts, { AccountDetail } from './pages/Accounts'
import Ask from './pages/Ask'
import Auth from './pages/Auth'
import Branches from './pages/Branches'
import Business from './pages/Business'
import Console from './pages/Console'
import History, { TxDetail } from './pages/History'
import Home from './pages/Home'
import Insights from './pages/Insights'
import Landing from './pages/Landing'
import Money from './pages/Money'
import Notifications, { AlertDetail, NotifySettings } from './pages/Notifications'
import Pay from './pages/Pay'
import Planner from './pages/Planner'
import Profile from './pages/Profile'
import Search from './pages/Search'
import Settings from './pages/Settings'
import InsightAlert from './pages/insights/Alert'
import InsightBills from './pages/insights/Bills'
import InsightBudgets from './pages/insights/Budgets'
import InsightCategory from './pages/insights/Category'
import InsightGoals from './pages/insights/Goals'
import InsightHealth from './pages/insights/Health'
import InsightMerchants from './pages/insights/Merchants'
import InsightReport from './pages/insights/Report'
import PlanBudget from './pages/planner/Budget'
import PlanCalendar from './pages/planner/Calendar'
import PlanGoal from './pages/planner/Goal'
import PlanMonth from './pages/planner/Plan'
import PlanRecap from './pages/planner/Recap'
import Welcome from './pages/Welcome'
import Verify from './pages/Verify'
import LinkAccount from './pages/Link'
import Help from './pages/Help'
import Learn from './pages/Learn'
import Security from './pages/settings/Security'
import Devices from './pages/settings/Devices'
import Language from './pages/settings/Language'
import Privacy from './pages/settings/Privacy'
import LinkedAccounts from './pages/settings/Accounts'
import Support from './pages/settings/Support'
import { AppProvider, useApp } from './store'
import './styles.css'

function Private({ children, staff = false, any = false }: { children: ReactNode; staff?: boolean; any?: boolean }) {
  const { user, ready } = useApp()
  if (!ready) return null
  if (!user) return <Navigate to="/login" replace />
  if (!any && staff !== (user.role === 'staff')) return <Navigate to={user.role === 'staff' ? '/console' : '/'} replace />
  return children
}

function Root() {
  const { user, ready } = useApp()
  if (!ready) return null
  if (!user) return <Landing />
  return user.role === 'staff' ? <Navigate to="/console" replace /> : <Home />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <BrowserRouter>
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
          <Route path="/pay/*" element={<Private><Pay /></Private>} />
          <Route path="/money" element={<Private><Money /></Private>} />
          <Route path="/business" element={<Private><Business /></Private>} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  </StrictMode>,
)
