import { Icon, Skeleton, useLoad, when } from '../../ui'
import { BasisTag, ConsoleShell, CountBars, Err, Kpi, Meter, fmt, useScope } from './Layout'

type Consent = {
  days: number; modelled: boolean; total: number
  rates: { key: string; label: string; count: number; rate: number }[]
  segments: { segment: string; name: string; customers: number; insights: number; offers: number }[]
  retention: { data: string; where: string; keep: string; access: string; records: number; oldest: string | null }[]
  trend: { label: string; given: number; withdrawn: number }[]
  requests: { exports: number; deletions: number; median_hours: number }
}
const ICON: Record<string, string> = { insights: 'chart', ai: 'sparkles', offers: 'megaphone', open_banking: 'link' }

export default function Data() {
  const scope = useScope()
  const { data: d, error } = useLoad<Consent>('/console/consent?' + scope.qs)
  const basis = d?.modelled ? 'mixed' : 'live'
  const period = scope.days === '90' ? '3 months' : scope.days + ' days'

  return (
    <ConsoleShell title="Data and consent" sub="Who allowed what, and how long NURU keeps each kind of data" scope={scope}>
      <Err msg={error} />
      <div className="grid g-4">
        {d ? d.rates.map((r) => <Kpi key={r.key} icon={ICON[r.key] || 'check'} label={r.label} value={r.rate + '%'} note={`${fmt(r.count)} of ${fmt(d.total)} customers`} basis={basis} />)
          : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} h={128} />)}
      </div>

      <div className="grid g-21">
        <div className="card col g12">
          <div className="row between"><div className="col g4"><span className="h3">Consent given and withdrawn, last {period}</span><span className="xs mu">Customers change these in Settings at any time</span></div><BasisTag b="estimated" /></div>
          {d ? <CountBars labels={d.trend.map((t) => t.label)} series={[{ name: 'Given', values: d.trend.map((t) => t.given) }, { name: 'Withdrawn', values: d.trend.map((t) => t.withdrawn) }]} colors={['var(--green)', 'var(--c1)']} /> : <Skeleton h={220} />}
        </div>
        <div className="card col g12">
          <div className="row between"><span className="h3">Data requests</span><BasisTag b="estimated" /></div>
          {d ? <>
            {[['download', 'Data downloads', fmt(d.requests.exports)], ['trash', 'Accounts deleted', fmt(d.requests.deletions)], ['clock', 'Median time to complete', d.requests.median_hours + ' hours']].map(([ic, l, v]) => (
              <div key={l} className="row between"><div className="row g10"><span className="tile" style={{ width: 32, height: 32 }}><Icon name={ic} size={16} /></span><span className="s">{l}</span></div><span className="s w6 num">{v}</span></div>
            ))}
            <div className="soft xs t2">NDPA 2023 gives customers the right to see, move and delete their data. NURU aims to complete each request within 72 hours.</div>
          </> : <Skeleton h={160} />}
        </div>
      </div>

      <div className="card col g12">
        <div className="row between"><span className="h3">Consent by segment</span><BasisTag b={basis} /></div>
        <div className="cscroll">
          <table className="tx">
            <thead><tr><th>Segment</th><th>Customers</th><th>Insights for the bank</th><th>Personal offers</th></tr></thead>
            <tbody>
              {d && [...d.segments].sort((a, b) => b.customers - a.customers).map((s) => (
                <tr key={s.segment}>
                  <td className="s w6">{s.name}</td>
                  <td className="num s">{fmt(s.customers)}</td>
                  <td><div className="row g8"><div style={{ width: 90 }}><Meter p={s.insights} color="var(--green)" /></div><span className="s w6">{s.insights}%</span></div></td>
                  <td><div className="row g8"><div style={{ width: 90 }}><Meter p={s.offers} /></div><span className="s w6">{s.offers}%</span></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <span className="xs mu">Customers who did not allow insights are counted here but never appear in segments, profiles or campaigns.</span>
      </div>

      <div className="card col" style={{ padding: 0 }}>
        <div className="row between wrap g8" style={{ padding: '16px 18px 6px' }}><div className="col g4"><span className="h3">Data retention</span><span className="xs mu">Record counts are read live from the database</span></div><BasisTag b="live" /></div>
        <div className="cscroll">
          <table className="tx">
            <thead><tr><th>Data</th><th className="hide-sm">How it is stored</th><th>Kept for</th><th>Staff access</th><th className="right">Records</th><th className="right hide-sm">Oldest</th></tr></thead>
            <tbody>
              {d?.retention.map((r) => (
                <tr key={r.data}>
                  <td className="s w6">{r.data}</td>
                  <td className="xs t2 hide-sm">{r.where}</td>
                  <td className="s">{r.keep}</td>
                  <td><span className={'chip ' + (r.access.startsWith('Never') ? 'green' : '')}>{r.access}</span></td>
                  <td className="right num s w6">{fmt(r.records)}</td>
                  <td className="right xs t2 hide-sm">{r.oldest ? when(r.oldest) : 'None'}</td>
                </tr>
              ))}
              {!d && <tr><td colSpan={6}><Skeleton h={200} /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </ConsoleShell>
  )
}
