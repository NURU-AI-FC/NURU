import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { canHQ, firstHQ, HQ_ROLES } from '../../access'
import { api } from '../../api'
import { useApp } from '../../store'
import { ThemePicker } from '../../ThemePicker'
import { Icon, Seg } from '../../ui'
import { NoAccess } from '../console/Layout'
import '../console/console.css'
import './hq.css'

const NAV: [string, string, string, string][] = [
  ['/hq', 'grid', 'Overview', 'overview'], ['/hq/health', 'cpu', 'Platform health', 'health'], ['/hq/support', 'headphones', 'Support and reports', 'support'],
  ['/hq/emails', 'mail', 'Emails and nudges', 'emails'], ['/hq/team', 'users', 'Team and access', 'team'],
]

// useRange is the Today, 7 days, 30 days picker shared by HQ pages.
export function useRange() {
  const [days, setDays] = useState<'1' | '7' | '30'>(() => { try { const v = localStorage.getItem('nuru.hq.days'); return v === '1' || v === '30' ? v : '7' } catch { return '7' } })
  useEffect(() => { try { localStorage.setItem('nuru.hq.days', days) } catch { /* ignore */ } }, [days])
  return { days, setDays, label: days === '1' ? 'today' : `last ${days} days` }
}
export const RangePicker = ({ range }: { range: ReturnType<typeof useRange> }) => (
  <Seg value={range.days} onChange={range.setDays} options={[['1', 'Today'], ['7', '7 days'], ['30', '30 days']]} />
)

// HQShell is NURU HQ's frame: a dark sidebar that stays dark in both themes,
// with only the pages the person's HQ role includes.
export function HQShell({ area, title, sub, right, children }: { area: string; title: string; sub: string; right?: ReactNode; children: ReactNode }) {
  const { user, update, signOut } = useApp()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [pathname])
  const dark = document.documentElement.dataset.theme === 'dark'
  const allowed = canHQ(user, area)
  const initials = (user?.name || '').split(' ').map((p) => p[0]).slice(0, 2).join('')
  const out = async () => { await api('/me/logout', { body: {} }).catch(() => {}); signOut(); nav('/hq/login') }

  return (
    <div className="app">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={'side hqside' + (open ? ' open' : '')} aria-label="NURU HQ">
        <div className="row g10" style={{ padding: '0 6px' }}>
          <span className="mark">N</span>
          <span className="col g4"><span className="s w7">NURU HQ</span><span className="xs" style={{ color: '#8c8c97' }}>Internal · team only</span></span>
        </div>
        <nav className="col" style={{ marginTop: 22, gap: 2 }}>
          {NAV.filter((n) => canHQ(user, n[3])).map(([to, ic, l]) => (
            <NavLink key={to} to={to} end={to === '/hq'} className={({ isActive }) => 'nav' + (isActive ? ' on' : '')}><Icon name={ic} /><span>{l}</span></NavLink>
          ))}
        </nav>
        <div className="hqnote col g6">
          <div className="row g8"><Icon name="eyeoff" size={15} color="#4ade80" /><span className="xs w6">No customer data here</span></div>
          <span className="xs" style={{ color: '#b3b3bd' }}>Counts and health only. Chats, balances and names never reach HQ.</span>
        </div>
        <div className="grow" />
        <div className="hqme row g10">
          <span className="av" style={{ width: 34, height: 34, fontSize: 12 }}>{initials}</span>
          <span className="col g4 grow"><span className="s w6">{user?.name}</span><span className="xs" style={{ color: '#8c8c97' }}>{HQ_ROLES[user?.hq_role || ''] || 'No role'}</span></span>
          <button className="ib" onClick={out} aria-label="Sign out" title="Sign out" style={{ background: 'transparent', color: '#8c8c97' }}><Icon name="logout" /></button>
        </div>
      </aside>

      <div className="main">
        <header className="top">
          <button className="ib menu" onClick={() => setOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <div className="col g4 grow" style={{ minWidth: 0 }}>
            <h1 className="h2" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{allowed ? title : 'Not in your role'}</h1>
            <span className="xs mu">{allowed ? sub : 'Ask the HQ owner for access'}</span>
          </div>
          <div className="row g12">
            {right && allowed && <div className="top-right">{right}</div>}
            <ThemePicker />
            <button className="ib theme" onClick={() => update({ theme: dark ? 'light' : 'dark' })} aria-label="Toggle theme"><Icon name={dark ? 'moon' : 'sun'} /></button>
          </div>
        </header>
        {right && allowed && <div className="top-sub">{right}</div>}
        <main className="page">{allowed ? children : <NoAccess home={user ? firstHQ(user) : '/hq'} />}</main>
      </div>
    </div>
  )
}

export function HKpi({ label, value, note, icon, tone }: { label: string; value: ReactNode; note?: ReactNode; icon: string; tone?: 'pos' | 'red' | 'amber' | 'mu' }) {
  return (
    <div className="card kpi">
      <div className="row between g8"><span className="s mu">{label}</span><span className="tile" style={{ width: 32, height: 32 }}><Icon name={icon} size={16} /></span></div>
      <span className="v num">{value}</span>
      {note && <span className={'xs w6 ' + (tone || 'pos')}>{note}</span>}
    </div>
  )
}

// CountDonut is a donut of counts with its own colours, for the AI answer split.
export function CountDonut({ data, center, sub, size = 110 }: { data: { name: string; value: number; color: string }[]; center: string; sub: string; size?: number }) {
  const any = data.some((d) => d.value > 0)
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={any ? data : [{ name: 'none', value: 1, color: 'var(--surface2)' }]} dataKey="value" innerRadius="70%" outerRadius="100%" paddingAngle={any ? 2 : 0} stroke="none" isAnimationActive={false}>
            {(any ? data : [{ color: 'var(--surface2)' }]).map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="col center" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}><span className="w7" style={{ fontSize: 18 }}>{center}</span><span className="xs mu">{sub}</span></div>
    </div>
  )
}

export const Dot = ({ c }: { c: string }) => <span style={{ width: 8, height: 8, borderRadius: 4, background: c, flex: 'none', display: 'inline-block' }} />

// Empty is the honest state for something not connected or not measured yet.
export const Empty = ({ icon, title, body }: { icon: string; title: string; body: ReactNode }) => (
  <div className="col center g8" style={{ padding: '24px 12px', textAlign: 'center' }}>
    <span className="tile" style={{ width: 44, height: 44, borderRadius: 14 }}><Icon name={icon} size={20} /></span>
    <span className="s w6">{title}</span>
    <span className="xs t2" style={{ maxWidth: 380 }}>{body}</span>
  </div>
)

export const n = (v: number | undefined, d = 0) => (v ?? 0).toLocaleString('en-NG', { maximumFractionDigits: d })
