import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Accounts, { AccountDetail } from './pages/Accounts'
import Ask from './pages/Ask'
import Auth from './pages/Auth'
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
          <Route path="/business" element={<Private><Business /></Private>} />
          <Route path="/planner" element={<Private><Planner /></Private>} />
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
