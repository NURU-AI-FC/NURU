import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { api, type Chart } from './api'
import { paths } from './icons'
import { useApp, useMoney } from './store'

export function Icon({ name, size = 18, color = 'currentColor', stroke = 2 }: { name: string; size?: number; color?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" dangerouslySetInnerHTML={{ __html: paths[name] || '' }} style={{ flex: 'none' }} />
  )
}

export const Logo = ({ size = 32 }: { size?: number }) => (
  <span className="logo"><span className="mark" style={{ width: size, height: size, fontSize: size * 0.56 }}>N</span>NURU</span>
)

// useLoad fetches a path and re-fetches when it changes.
export function useLoad<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!path) return
    let live = true
    api<T>(path).then((d) => live && setData(d)).catch((e) => live && setError(e.message))
    return () => { live = false }
  }, [path, n])
  return { data, error, reload: () => setN((x) => x + 1) }
}

export const Skeleton = ({ h = 120 }: { h?: number }) => <div className="skeleton" style={{ height: h }} />

export const COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)']
const SERIES3 = ['var(--c5)', 'var(--c2)', 'var(--c1)']

function Tip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) {
  const money = useMoney()
  if (!active || !payload?.length) return null
  return (
    <div className="tt">
      {label && <div className="w6" style={{ marginBottom: 4 }}>{label}</div>}
      {payload.map((p) => <div key={p.name} className="row g6"><span className="dot" style={{ background: p.color }} />{p.name}: <b className="num">{money(p.value)}</b></div>)}
    </div>
  )
}

export function Donut({ data, center, sub, height = 180 }: { data: { name: string; value: number }[]; center?: string; sub?: string; height?: number }) {
  return (
    <div style={{ position: 'relative', width: height, height, flex: 'none' }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={2} stroke="none" isAnimationActive={false}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip content={<Tip />} />
        </PieChart>
      </ResponsiveContainer>
      {center && <div className="col center" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}><span className="w7" style={{ fontSize: 20 }}>{center}</span>{sub && <span className="xs mu">{sub}</span>}</div>}
    </div>
  )
}

export function Bars({ labels, series, height = 220, colors }: { labels: string[]; series: { name: string; values: number[] }[]; height?: number; colors?: string[] }) {
  const money = useMoney()
  const rows = labels.map((l, i) => Object.fromEntries([['label', l], ...series.map((s) => [s.name, s.values[i] ?? 0])]))
  const cs = colors || (series.length === 3 ? SERIES3 : COLORS)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} barGap={4} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(v) => money(v, { compact: true })} />
        <Tooltip content={<Tip />} cursor={{ fill: 'var(--surface)' }} />
        {series.map((s, i) => <Bar key={s.name} dataKey={s.name} fill={cs[i % cs.length]} radius={[5, 5, 0, 0]} maxBarSize={26} isAnimationActive={false} />)}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function Lines({ labels, series, height = 220 }: { labels: string[]; series: { name: string; values: number[] }[]; height?: number }) {
  const money = useMoney()
  const rows = labels.map((l, i) => Object.fromEntries([['label', l], ...series.map((s) => [s.name, s.values[i] ?? 0])]))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v) => money(v, { compact: true })} domain={['auto', 'auto']} />
        <Tooltip content={<Tip />} />
        {series.map((s, i) => <Line key={s.name} dataKey={s.name} stroke={i ? 'var(--c2)' : 'var(--c1)'} strokeWidth={2.5} dot={false} isAnimationActive={false} />)}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ChartView({ chart }: { chart: Chart }) {
  const money = useMoney()
  if (chart.type === 'donut') {
    const data = chart.labels.map((l, i) => ({ name: l, value: chart.series[0].values[i] }))
    const total = data.reduce((a, b) => a + b.value, 0)
    return (
      <div className="row g16 wrap">
        <Donut data={data} height={140} center={money(total, { compact: true })} />
        <Legend items={data} total={total} />
      </div>
    )
  }
  return chart.type === 'line' ? <Lines labels={chart.labels} series={chart.series} height={180} /> : <Bars labels={chart.labels} series={chart.series} height={200} />
}

export function Legend({ items, total }: { items: { name: string; value: number }[]; total: number }) {
  return (
    <div className="col g8 grow" style={{ minWidth: 160 }}>
      {items.map((d, i) => (
        <div key={d.name} className="row g8 s"><span className="dot" style={{ background: COLORS[i % COLORS.length] }} /><span className="grow">{d.name}</span><span className="w6 num">{total ? Math.round((d.value / total) * 100) : 0}%</span></div>
      ))}
    </div>
  )
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return <div className="seg" role="tablist">{options.map(([v, l]) => <button key={v} role="tab" aria-selected={v === value} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}</div>
}

export function Stat({ label, value, note, tone, icon }: { label: string; value: string; note?: ReactNode; tone?: 'pos' | 'amber' | 'red'; icon: string }) {
  return (
    <div className="card col g12">
      <div className="row between"><span className="t2">{label}</span><span className="tile" style={{ width: 32, height: 32 }}><Icon name={icon} size={16} /></span></div>
      <span className="big num">{value}</span>
      {note && <span className={'xs w6 ' + (tone || 'mu')}>{note}</span>}
    </div>
  )
}

export function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [onClose])
  return <div className="modal-bg" onClick={onClose}><div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>{children}</div></div>
}

// PinInput is four boxes that move focus as you type.
export function PinInput({ length = 4, onDone }: { length?: number; onDone: (pin: string) => void }) {
  const [v, setV] = useState<string[]>(Array(length).fill(''))
  const refs = useRef<(HTMLInputElement | null)[]>([])
  useEffect(() => { refs.current[0]?.focus() }, [])
  const set = (i: number, d: string) => {
    const next = [...v]
    next[i] = d.slice(-1)
    setV(next)
    if (d && i < length - 1) refs.current[i + 1]?.focus()
    if (next.every(Boolean)) onDone(next.join(''))
  }
  return (
    <div className="pin">
      {v.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el }} value={d} inputMode="numeric" type="password" maxLength={1} aria-label={`Digit ${i + 1}`}
          onChange={(e) => set(i, e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Backspace' && !d && i > 0 && refs.current[i - 1]?.focus()} />
      ))}
    </div>
  )
}

export function catIcon(c: string) {
  return ({ Food: 'receipt', Transport: 'zap', Salary: 'down', 'Side income': 'down', Sales: 'down', Shopping: 'card', Bills: 'file', Rent: 'home', Savings: 'target', Family: 'users', Transfer: 'send', Payroll: 'users', Advertising: 'trendup', Supplies: 'briefcase', 'Data and power': 'zap', Entertainment: 'sparkles', Education: 'book', 'Owner drawings': 'wallet' } as Record<string, string>)[c] || 'wallet'
}

export function when(at: string) {
  const d = new Date(at), now = new Date()
  const day = 864e5, diff = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / day)
  const time = d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })
  if (diff === 0) return 'Today, ' + time
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

export function useGreeting() {
  const { t } = useApp()
  const h = new Date().getHours()
  return h < 12 ? t('morning') : h < 17 ? t('afternoon') : t('evening')
}
