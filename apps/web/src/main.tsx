import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Ask from './pages/Ask'
import Auth from './pages/Auth'
import Business from './pages/Business'
import Decide from './pages/business/Decide'
import Expenses from './pages/business/Expenses'
import Investor from './pages/business/Investor'
import Invoices from './pages/business/Invoices'
import Payroll from './pages/business/Payroll'
import Payslip from './pages/business/Payslip'
import Plan from './pages/business/Plan'
import Setup from './pages/business/Setup'
import Vendors from './pages/business/Vendors'
import Verdict from './pages/business/Verdict'
import Console from './pages/Console'
import Home from './pages/Home'
import Insights from './pages/Insights'
import Landing from './pages/Landing'
import Money from './pages/Money'
import Borrow from './pages/money/Borrow'
import Claim from './pages/money/Claim'
import Deposit from './pages/money/Deposit'
import Insurance from './pages/money/Insurance'
import LoanDetail from './pages/money/LoanDetail'
import Pension from './pages/money/Pension'
import Refunds from './pages/money/Refunds'
import Vaults from './pages/money/Vaults'
import Pay from './pages/Pay'
import Planner from './pages/Planner'
import Settings from './pages/Settings'
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
          <Route path="/insights" element={<Private><Insights /></Private>} />
          <Route path="/ask" element={<Private><Ask /></Private>} />
          <Route path="/pay" element={<Private><Pay /></Private>} />
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
          <Route path="/settings" element={<Private any><Settings /></Private>} />
          <Route path="/console" element={<Private staff><Console /></Private>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  </StrictMode>,
)
