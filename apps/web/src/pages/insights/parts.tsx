import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import type { Tx } from '../../api'
import type { Key } from '../../i18n'
import { useApp } from '../../store'
import { Icon } from '../../ui'
import '../Insights.css'

const INSIGHTS: [string, Key][] = [
  ['/insights', 'overview'], ['/insights/bills', 'bills'], ['/insights/merchants', 'whereSpend'], ['/insights/health', 'healthScore'],
  ['/insights/budgets', 'budgets'], ['/insights/goals', 'goals'], ['/insights/report', 'report'],
]
const PLANNER: [string, Key][] = [
  ['/planner', 'reminders'], ['/planner/calendar', 'calendar'], ['/planner/budget', 'budget'], ['/planner/goal', 'savingsGoal'],
  ['/planner/plan', 'monthlyPlan'], ['/planner/recap', 'weeklyRecap'],
]

export function SubNav({ area }: { area: 'insights' | 'planner' }) {
  const { t } = useApp()
  const items = area === 'insights' ? INSIGHTS : PLANNER
  return (
    <nav className="subnav" aria-label={t(area)}>
      {items.map(([to, k]) => <NavLink key={to} to={to} end={to === '/insights' || to === '/planner'} className={({ isActive }) => (isActive ? 'on' : '')}>{t(k)}</NavLink>)}
    </nav>
  )
}

export function Ring({ pct, size = 64, stroke = 7, color = 'var(--red)', track = 'var(--surface2)', label, sub }: { pct: number; size?: number; stroke?: number; color?: string; track?: string; label?: string; sub?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(100, pct))
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }} role="img" aria-label={`${Math.round(p)}%`}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} />
      </svg>
      <div className="col center" style={{ position: 'absolute', inset: 0 }}>
        <span className="w7" style={{ fontSize: Math.max(12, size / 4.6) }}>{label ?? `${Math.round(p)}%`}</span>
        {sub && <span className="xs mu">{sub}</span>}
      </div>
    </div>
  )
}

export const Prog = ({ pct, color = 'var(--red)', h = 8 }: { pct: number; color?: string; h?: number }) => (
  <div className="bar" style={{ height: h }}><i style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} /></div>
)

export const tone = (pct: number) => (pct >= 100 ? 'var(--red)' : pct > 85 ? 'var(--amber)' : 'var(--green)')

export const Tip = ({ icon = 'sparkles', children, color = 'var(--red)' }: { icon?: string; children: ReactNode; color?: string }) => (
  <div className="soft row g10" style={{ alignItems: 'flex-start' }}><Icon name={icon} size={18} color={color} /><span className="s t2">{children}</span></div>
)

export const shortDate = (d: string | Date, o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => new Date(d).toLocaleDateString('en-NG', o)

export type Budget = { id: string; category: string; limit: number; spent: number; pct: number }
export type Budgets = { month: string; limit: number; spent: number; days_left: number; items: Budget[]; categories: string[] }
export type Contribution = { id: string; amount: number; note: string; at: string }
export type Goal = {
  id: string; name: string; note: string; icon: string; target: number; saved: number; pct: number; due_at: string | null
  auto_amount: number; auto_day: number; monthly_needed: number; finish_at: string | null; contributions: Contribution[]
}
export type MonthAmount = { label: string; amount: number }
export type Merchant = { merchant: string; category: string; count: number; amount: number }
export type CategoryDetail = {
  category: string; month: string; total: number; prev: number; avg: number; budget: number; days_left: number
  months: MonthAmount[]; merchants: Merchant[]; transactions: Tx[]; tip: string
}
export type Recurring = { merchant: string; category: string; amount: number; every_days: number; monthly: number; count: number; last: string; next: string }
