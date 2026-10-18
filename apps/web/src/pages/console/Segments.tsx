import { useState } from 'react'
import { Link } from 'react-router-dom'
import { canConsole } from '../../access'
import { api } from '../../api'
import { useApp, useMoney } from '../../store'
import { Icon, Skeleton, useLoad } from '../../ui'
import { BasisTag, ConsoleShell, CountBars, Err, Meter, fmt, useScope } from './Layout'

export type Segment = {
  key: string; name: string; icon: string; tone: string; product: string; offer: string; bullets: string[]; why: string
  customers: number; reachable: number; live: number; avg_income: number; avg_spend: number; spend_ratio: number; saving_rate: number
  quick_loans: number; cash_gap: number; uptake: number; health: number; avg_ltv: number; churn: number; signal: string
  growth: number[]; months: string[]; monthly_saving: number
}
const GROUPS: [string, string, string[]][] = [
  ['all', 'All segments', []], ['personal', 'Personal', ['salary', 'student', 'high']], ['business', 'Business', ['business', 'trader']], ['value', 'High value', ['high', 'business']],
]

// download saves a CSV the API made. Exports are built and logged on the
// server and stop downloading after 7 days.
export function download(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function Segments() {
  const scope = useScope()
  const money = useMoney()
  const { user, toast } = useApp()
  const [exporting, setExporting] = useState(false)
  const [group, setGroup] = useState('all')
  const [pick, setPick] = useState('salary')
  const { data, error } = useLoad<{ modelled: boolean; segments: Segment[]; hidden: number; min_size: number }>('/console/segments?src=' + scope.src)
  const exportCSV = async () => {
    setExporting(true)
    try {
      const r = await api<{ csv: string; filename: string; expires_at: string }>('/console/exports', { body: { kind: 'segments', src: scope.src } })
      download(r.csv, r.filename)
      toast('Export logged. The copy on the server expires ' + new Date(r.expires_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }))
    } catch (e) { toast((e as Error).message) } finally { setExporting(false) }
  }
  const all = data?.segments || []
  const keys = GROUPS.find((g) => g[0] === group)![2]
  const rows = keys.length ? all.filter((s) => keys.includes(s.key)) : all
  const total = all.reduce((a, s) => a + s.customers, 0)
  const sel = all.find((s) => s.key === pick) || all[0]
  const basis = data?.modelled ? 'mixed' : 'live'

  return (
    <ConsoleShell title="Segments" sub={data ? `${fmt(total)} customers in ${all.length} segments` : 'Grouped by NURU from spending patterns'} scope={scope} range={false}>
      <Err msg={error} />
      <div className="row between wrap g8">
        <div className="row g8 wrap">{GROUPS.map(([k, l]) => <button key={k} className={'chip' + (group === k ? ' red' : '')} onClick={() => setGroup(k)}>{l}</button>)}</div>
        {canConsole(user, 'export') && <button className="chip" onClick={exportCSV} disabled={!rows.length || exporting}><Icon name="download" size={14} />{exporting ? 'Exporting…' : 'Export CSV'}</button>}
      </div>
      {!!data?.hidden && (
        <div className="soft row g10"><Icon name="eyeoff" size={16} color="var(--muted)" /><span className="xs t2 grow">{data.hidden} segment{data.hidden === 1 ? ' is' : 's are'} hidden because {data.hidden === 1 ? 'it has' : 'they have'} fewer than {data.min_size} customers, so no small group can be singled out.</span></div>
      )}

      <div className="card col" style={{ padding: 0 }}>
        <div className="row between wrap g8" style={{ padding: '16px 18px 6px' }}>
          <div className="col g4"><span className="h3">Customer segments and next best offer</span><span className="xs mu">Grouped by NURU from spending patterns. No single customer can be identified.</span></div>
          <div className="row g8"><BasisTag b={basis} />{canConsole(user, 'campaigns') && <Link to={'/console/campaigns?segment=' + (sel?.key || 'salary')} className="btn pri sm"><Icon name="megaphone" size={16} color="#fff" />Create campaign</Link>}</div>
        </div>
        <div className="cscroll">
          <table className="tx">
            <thead><tr><th>Segment</th><th>Customers</th><th className="hide-sm">Signal</th><th>Suggested product</th><th>Likely uptake</th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.key} className="crow" onClick={() => setPick(s.key)} style={s.key === sel?.key ? { background: 'var(--surface)' } : undefined}>
                  <td><div className="row g10"><span className={'chip ' + s.tone} style={{ width: 30, height: 30, padding: 0, justifyContent: 'center' }}><Icon name={s.icon} size={14} /></span><span className="w6 s">{s.name}</span></div></td>
                  <td className="num w6">{fmt(s.customers)}{s.live > 0 && <span className="xs pos"> · {s.live} live</span>}</td>
                  <td className="t2 s hide-sm">{s.signal}</td>
                  <td><span className="chip">{s.product}</span></td>
                  <td><div className="row g8"><div style={{ width: 80 }}><Meter p={s.uptake * 2} /></div><span className="s w6">{s.uptake}%</span></div></td>
                </tr>
              ))}
              {!data && <tr><td colSpan={5}><Skeleton h={200} /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {sel && (
        <div className="grid g-2">
          <div className="card col g12">
            <div className="row between"><span className="h3">Segment growth, last 3 months</span><BasisTag b={basis} /></div>
            <CountBars labels={sel.months} series={all.slice(0, 3).map((s) => ({ name: s.name, values: s.growth }))} height={200} />
            <span className="xs mu">Customers who use NURU and opted in, counted at the end of each month.</span>
          </div>
          <div className="card col g12">
            <div className="row between wrap g8"><span className="h3">Why NURU suggests {sel.product.toLowerCase()}</span><span className={'chip ' + sel.tone}>{sel.name}</span></div>
            <span className="s t2">{sel.why}</span>
            <div className="grid g-3" style={{ gap: 10 }}>
              {[['Avg income', money(sel.avg_income)], ['Saves per month', sel.saving_rate + '%'], ['Spends of income', sel.spend_ratio + '%'],
                ['Quick loan use', sel.quick_loans + '%'], ['Cash gaps', sel.cash_gap + '%'], ['Avg lifetime value', money(sel.avg_ltv, { compact: true })]].map(([l, v]) => (
                <div key={l} className="soft col g4"><span className="xs mu">{l}</span><span className="s w6 num">{v}</span></div>
              ))}
            </div>
            <div className="row g8 wrap">{sel.bullets.map((b) => <span key={b} className="chip">{b}</span>)}</div>
            <div className="row g8 wrap">
              {canConsole(user, 'campaigns') && <Link to={'/console/campaigns?segment=' + sel.key} className="btn pri sm"><Icon name="megaphone" size={16} color="#fff" />Offer to {fmt(sel.reachable)} customers</Link>}
              {canConsole(user, 'customers') && <Link to={'/console/customers?segment=' + sel.key} className="btn sm"><Icon name="user" size={16} />See masked profiles</Link>}
            </div>
          </div>
        </div>
      )}
    </ConsoleShell>
  )
}
