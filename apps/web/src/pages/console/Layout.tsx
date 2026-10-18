import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend as RLegend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { canConsole } from '../../access'
import { Shell } from '../../Shell'
import { useApp } from '../../store'
import { Icon, Seg } from '../../ui'
import './console.css'

export type Basis = 'live' | 'mixed' | 'estimated'
export type Src = 'all' | 'live'

// Each tab is shown only to console roles that can open its area.
const TABS: [string, string, string, string][] = [
  ['/console', 'grid', 'Overview', 'overview'], ['/console/segments', 'users', 'Segments', 'segments'], ['/console/customers', 'user', 'Customer view', 'customers'],
  ['/console/campaigns', 'megaphone', 'Campaigns', 'campaigns'], ['/console/risk', 'shield', 'Risk and AI safety', 'risk'], ['/console/data', 'database', 'Data and consent', 'data'],
  ['/console/team', 'key', 'Team and access', 'team'],
]

function stored<T extends string>(key: string, def: T, ok: T[]): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => { try { const x = localStorage.getItem(key) as T; return ok.includes(x) ? x : def } catch { return def } })
  useEffect(() => { try { localStorage.setItem(key, v) } catch { /* ignore */ } }, [key, v])
  return [v, setV]
}

// useScope is the range and source filter shared by every console page.
export function useScope() {
  const [days, setDays] = stored<'7' | '30' | '90'>('nuru.console.days', '30', ['7', '30', '90'])
  const [src, setSrc] = stored<Src>('nuru.console.src', 'all', ['all', 'live'])
  return { days, setDays, src, setSrc, qs: `days=${days}&src=${src}` }
}

export function ConsoleShell({ title, sub, children, scope, range = true }: {
  title: string; sub: string; children: ReactNode; scope?: ReturnType<typeof useScope>; range?: boolean
}) {
  const { user } = useApp()
  const { pathname } = useLocation()
  const here = [...TABS].reverse().find(([to]) => pathname === to || pathname.startsWith(to + '/'))
  const allowed = !here || canConsole(user, here[3])
  return (
    <Shell title={allowed ? title : 'Not in your role'} sub={allowed ? sub : 'Ask your console admin for access'}>
      <nav className="ctabs" aria-label="Console">
        {TABS.filter((t) => canConsole(user, t[3])).map(([to, ic, l]) => <NavLink key={to} to={to} end={to === '/console'} className={({ isActive }) => (isActive ? 'on' : '')}><Icon name={ic} size={16} />{l}</NavLink>)}
      </nav>
      {!allowed ? <NoAccess /> : <>{scope && (
        <div className="cbar">
          <div className="row g8 wrap">
            <Seg value={scope.src} onChange={scope.setSrc} options={[['all', 'Live and modelled'], ['live', 'Live only']]} />
            <span className="row g6 xs t2"><Icon name="lock" size={14} color="var(--green)" />Privacy mode on. Names and account numbers are masked.</span>
          </div>
          {range && <Seg value={scope.days} onChange={scope.setDays} options={[['7', '7 days'], ['30', '30 days'], ['90', '3 months']]} />}
        </div>
      )}
      {children}</>}
    </Shell>
  )
}

// NoAccess is shown instead of a page the person's role does not include.
export function NoAccess({ home = '/console' }: { home?: string }) {
  return (
    <div className="card col center g12" style={{ padding: 40, textAlign: 'center' }}>
      <span className="tile" style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--red50)', color: 'var(--red)' }}><Icon name="lock" size={24} /></span>
      <span className="h3">Your role does not include this page</span>
      <span className="s t2" style={{ maxWidth: 420 }}>Access is role based and every view is logged. Ask an admin to change your role if you need it.</span>
      <Link to={home} className="btn sm">Go to overview</Link>
    </div>
  )
}

const BASIS_TIP: Record<Basis, string> = {
  live: 'Counted from real NURU customers and events',
  mixed: 'Real NURU customers plus the modelled pilot cohort',
  estimated: 'Modelled figure, not a measured one',
}
export const BasisTag = ({ b }: { b: Basis }) => <span className={'basis ' + b} title={BASIS_TIP[b]}>{b}</span>

export function Kpi({ label, value, note, icon, basis, tone }: { label: string; value: string; note?: ReactNode; icon: string; basis?: Basis; tone?: 'pos' | 'red' | 'amber' }) {
  return (
    <div className="card kpi">
      <div className="row between g8"><span className="s mu">{label}</span><span className="tile" style={{ width: 32, height: 32 }}><Icon name={icon} size={16} /></span></div>
      <span className="v num">{value}</span>
      <div className="row between g8">{note ? <span className={'xs w6 ' + (tone || 't2')}>{note}</span> : <span />}{basis && <BasisTag b={basis} />}</div>
    </div>
  )
}

export const fmt = (n: number, d = 0) => (n ?? 0).toLocaleString('en-NG', { maximumFractionDigits: d })
export const compact = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'm' : n >= 1e4 ? Math.round(n / 1000) + 'k' : fmt(n)
export function delta(now: number, prev: number) {
  if (!prev) return ''
  const p = Math.round(((now - prev) / prev) * 100)
  return (p >= 0 ? '+' : '') + p + '% vs previous period'
}

export const CC = ['var(--c1)', 'var(--c2)', 'var(--c4)', 'var(--c6)', 'var(--c7)', 'var(--c3)']

function CountTip({ active, payload, label, unit = '' }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="tt">
      {label && <div className="w6" style={{ marginBottom: 4 }}>{label}</div>}
      {payload.map((p) => <div key={p.name} className="row g6"><span className="dot" style={{ background: p.color }} />{p.name}: <b className="num">{fmt(p.value, 2)}{unit}</b></div>)}
    </div>
  )
}

type Series = { name: string; values: number[] }
const rowsOf = (labels: string[], series: Series[]) => labels.map((l, i) => Object.fromEntries([['label', l], ...series.map((s) => [s.name, s.values[i] ?? 0])]))

export function CountBars({ labels, series, height = 220, stacked, colors = CC, unit, whole }: { labels: string[]; series: Series[]; height?: number; stacked?: boolean; colors?: string[]; unit?: string; whole?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rowsOf(labels, series)} barGap={3} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={compact} allowDecimals={!whole} />
        <Tooltip content={<CountTip unit={unit} />} cursor={{ fill: 'var(--surface)' }} />
        {series.length > 1 && <RLegend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => <Bar key={s.name} dataKey={s.name} stackId={stacked ? 'a' : undefined} fill={colors[i % colors.length]} radius={stacked ? 0 : [5, 5, 0, 0]} maxBarSize={28} isAnimationActive={false} />)}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function CountLines({ labels, series, height = 220, colors = CC, dashed, domain, unit, whole }: { labels: string[]; series: Series[]; height?: number; colors?: string[]; dashed?: string; domain?: [number | string, number | string]; unit?: string; whole?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rowsOf(labels, series)} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={20} />
        <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={compact} domain={domain || ['auto', 'auto']} allowDecimals={!whole} />
        <Tooltip content={<CountTip unit={unit} />} />
        {series.length > 1 && <RLegend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => <Line key={s.name} dataKey={s.name} stroke={s.name === dashed ? 'var(--muted)' : colors[i % colors.length]} strokeDasharray={s.name === dashed ? '5 5' : undefined} strokeWidth={2.5} dot={false} isAnimationActive={false} />)}
      </LineChart>
    </ResponsiveContainer>
  )
}

export const Meter = ({ p, color = 'var(--red)' }: { p: number; color?: string }) => <div className="bar" style={{ height: 6 }}><i style={{ width: Math.max(0, Math.min(100, p)) + '%', background: color }} /></div>

export const Err = ({ msg }: { msg: string }) => msg ? <div className="card soft row g8"><Icon name="alert" color="var(--red)" /><span className="s">{msg}</span></div> : null
