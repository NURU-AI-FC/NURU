// Recharts-based charts. Import them through ui.tsx (Donut, Bars, Lines),
// which loads this module on demand.
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useMoney } from './store'
import { COLORS } from './ui'

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

