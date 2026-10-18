import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMoney } from '../../store'
import { Bars, Icon, Skeleton, useLoad, when } from '../../ui'
import { BasisTag, ConsoleShell, Err, Kpi, Meter, fmt, useScope } from './Layout'

type Row = { id: number; masked: string; source: string; segment: string; segment_name: string; state: string; age_band: string; health: number; churn: string; ltv: number; flags: string[]; last_active: string }
type Detail = {
  id: number; masked: string; source: 'live' | 'pilot'; segment: string; segment_name: string; state: string; age_band: string; joined: number
  last_active: string; tier: number; language: string; weekly: number; questions: number; consent: Record<string, boolean>
  products: string[]; banks: string[]; health: number; churn: number; churn_level: string; ltv: number; ltv_pctl: number
  income: number; spend: number; savings: number; flow: { month: string; in: number; out: number }[]; needs: { name: string; score: number }[]
  nudges: { title: string; status: string; at?: string; tone?: string }[]; shown: number; acted: number; flags: string[]
  events: { kind: string; count: number; at: string }[]; quick_loans: boolean
}
const SEGS: [string, string][] = [['', 'All segments'], ['salary', 'Salary earners'], ['trader', 'Traders'], ['student', 'Students'], ['business', 'Business owners'], ['high', 'High spenders']]
const EVENT: Record<string, string> = { pin_failed: 'Wrong transfer PIN', face_failed: 'Face did not match', transfers_locked: 'Transfers paused', ai_injection: 'Prompt injection blocked', ai_off_topic: 'Off topic question declined', login_failed: 'Failed sign in' }
const churnTone = (c: string) => (c === 'High' ? 'red' : c === 'Medium' ? 'amber' : 'green')

export default function Customers() {
  const scope = useScope()
  const money = useMoney()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const segment = params.get('segment') || ''
  const [q, setQ] = useState('')
  const [flagged, setFlagged] = useState(false)
  const { data, error } = useLoad<Row[]>(`/console/customers?src=${scope.src}&segment=${segment}&q=${encodeURIComponent(q)}&flagged=${flagged ? 1 : 0}`)

  return (
    <ConsoleShell title="Customer view" sub="Masked profiles, shown only with customer consent" scope={scope} range={false}>
      <Err msg={error} />
      <div className="card col g12">
        <div className="row g8 wrap">
          <div className="search" style={{ display: 'flex', width: 240 }}><Icon name="search" size={16} color="var(--muted)" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search masked ID digits" aria-label="Search masked ID" /></div>
          <select className="input" style={{ width: 180, height: 40 }} value={segment} onChange={(e) => setParams(e.target.value ? { segment: e.target.value } : {})} aria-label="Segment">
            {SEGS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <button className={'chip' + (flagged ? ' red' : '')} onClick={() => setFlagged(!flagged)}><Icon name="alert" size={14} />Risk flags only</button>
        </div>
        <div className="cscroll">
          <table className="tx">
            <thead><tr><th>Customer</th><th>Segment</th><th className="hide-sm">Region</th><th>Health</th><th>Churn</th><th>Lifetime value</th><th className="hide-sm">Flags</th></tr></thead>
            <tbody>
              {data?.map((c) => (
                <tr key={c.id} className="crow" onClick={() => nav('/console/customers/' + c.id)}>
                  <td><div className="row g8"><span className="w6 s num">#{c.masked}</span>{c.source === 'live' && <span className="basis live">live</span>}</div></td>
                  <td className="s">{c.segment_name}</td>
                  <td className="s t2 hide-sm">{c.state} · {c.age_band}</td>
                  <td className="num s w6">{c.health}</td>
                  <td><span className={'chip ' + churnTone(c.churn)}>{c.churn}</span></td>
                  <td className="num s">{money(c.ltv, { compact: true })}</td>
                  <td className="hide-sm">{c.flags.length ? <span className="chip red">{c.flags.length} flag{c.flags.length > 1 ? 's' : ''}</span> : <span className="xs mu">None</span>}</td>
                </tr>
              ))}
              {data && !data.length && <tr><td colSpan={7} className="t2 s">No opted in customers match.</td></tr>}
              {!data && <tr><td colSpan={7}><Skeleton h={240} /></td></tr>}
            </tbody>
          </table>
        </div>
        <span className="xs mu">Showing up to 60 profiles, live customers first, then those with risk flags. IDs are masked and cannot be traced to a name.</span>
      </div>
    </ConsoleShell>
  )
}

export function CustomerDetail() {
  const { id } = useParams()
  const money = useMoney()
  const { data: c, error } = useLoad<Detail>('/console/customers/' + id)
  const basis = c?.source === 'live' ? 'live' : 'estimated'

  return (
    <ConsoleShell title="Customer view" sub="Masked profile, shown only with customer consent">
      <div className="row between wrap g8">
        <Link to={'/console/customers' + (c ? '?segment=' + c.segment : '')} className="chip"><Icon name="chevl" size={14} />Back to {c ? c.segment_name.toLowerCase() : 'customers'}</Link>
        {c && <span className="row g6 xs t2">{c.source === 'live' ? 'Computed from this customer\'s real transactions' : 'Modelled pilot profile'} <BasisTag b={basis} /></span>}
      </div>
      <Err msg={error} />
      {!c ? !error && <Skeleton h={400} /> : <>
        <div className="cpair">
          <div className="card col g16 cside">
            <div className="row g12"><span className="av" style={{ width: 48, height: 48, fontSize: 16 }}>{c.segment_name[0]}•</span><div className="col g4"><span className="h3 num">Customer #{c.masked}</span><span className="xs mu">{c.state} · {c.age_band} · joined {c.joined}</span></div></div>
            <div className="row g8 wrap"><span className="chip green"><Icon name="check" size={12} />Consent given</span><span className="chip">Tier {c.tier}</span><span className="chip">{c.segment_name}</span></div>
            <div className="div" />
            {[['Products', c.products.join(', ')], ['Linked accounts', c.banks.join(', ')], ['Uses NURU', c.weekly ? `${c.weekly} times a week` : 'Less than weekly'],
              ['Questions asked', fmt(c.questions)], ['Preferred language', c.language], ['Last active', when(c.last_active)],
              ['Personal offers', c.consent.offers ? 'Allowed' : 'Turned off'], ['Linked other banks', c.consent.open_banking ? 'Allowed' : 'Not allowed']].map(([l, v]) => (
              <div key={l} className="row between g12"><span className="s t2">{l}</span><span className="s w6" style={{ textAlign: 'right' }}>{v}</span></div>
            ))}
            <div className="soft col g6"><div className="row g8"><Icon name="eyeoff" size={15} color="var(--muted)" /><span className="xs w6">What staff cannot see</span></div><span className="xs t2">Name, phone, email, chat messages, PIN, face data, payees and full account numbers are never shown here.</span></div>
          </div>
          <div className="col g16 grow" style={{ minWidth: 0 }}>
            <div className="grid g-3" style={{ gap: 16 }}>
              <Kpi icon="heart" label="Financial health" value={String(c.health)} note={c.health >= 700 ? 'Good' : c.health >= 550 ? 'Fair' : 'Needs care'} tone={c.health >= 700 ? 'pos' : 'amber'} basis={basis} />
              <Kpi icon="trenddown" label="Churn risk" value={c.churn_level} note={`${Math.round(c.churn * 100)}% chance in 90 days`} tone={c.churn_level === 'Low' ? 'pos' : 'amber'} basis="estimated" />
              <Kpi icon="star" label="Lifetime value" value={money(c.ltv, { compact: true })} note={`Above ${c.ltv_pctl}% of segment`} basis="estimated" />
            </div>
            <div className="card col g10">
              <div className="row between"><span className="h3">Money in and out, last 3 months</span><BasisTag b={basis} /></div>
              <Bars labels={c.flow.map((f) => f.month)} series={[{ name: 'In', values: c.flow.map((f) => f.in) }, { name: 'Out', values: c.flow.map((f) => f.out) }]} colors={['var(--green)', 'var(--red)']} height={190} />
              <div className="row g10 wrap">{[['Avg monthly in', money(c.income)], ['Avg monthly out', money(c.spend)], ['Saves a month', money(c.savings)]].map(([l, v]) => <div key={l} className="soft col g4 grow"><span className="xs mu">{l}</span><span className="s w6 num">{v}</span></div>)}</div>
            </div>
          </div>
        </div>
        <div className="grid g-3">
          <div className="card col g10">
            <div className="row between"><span className="h3">Predicted needs</span><BasisTag b="estimated" /></div>
            {c.needs.map((n) => <div key={n.name} className="cbars"><div className="row between"><span className="s">{n.name}</span><span className="s w6">{n.score}%</span></div><Meter p={n.score} /></div>)}
          </div>
          <div className="card col g10">
            <div className="row between"><span className="h3">Insights shown to them</span><span className="xs mu">{c.acted} of {c.shown} acted on</span></div>
            {c.nudges.length ? c.nudges.slice(0, 5).map((n, i) => (
              <div key={i} className="row between g8"><div className="col g4"><span className="s w6">{n.title}</span>{n.at && <span className="xs mu">{when(n.at)}</span>}</div>
                <span className={'chip ' + (n.status === 'Acted' ? 'green' : n.status === 'Planned' ? 'blue' : '')}>{n.status}</span></div>
            )) : <span className="s t2">No insights yet.</span>}
          </div>
          <div className="card col g10">
            <div className="row between"><span className="h3">Risk flags</span>{c.flags.length || c.events.length ? <span className="chip red">{Math.max(c.flags.length, c.events.length)}</span> : <span className="chip green">Clear</span>}</div>
            {c.events.length ? c.events.map((e, i) => (
              <div key={i} className="row between g8"><div className="row g8"><Icon name="alert" size={16} color="var(--red)" /><span className="s">{EVENT[e.kind] || e.kind}</span></div><span className="xs mu">{e.count}x · {when(e.at)}</span></div>
            )) : <span className="s t2">No failed PINs, face mismatches or locked transfers in 90 days.</span>}
            {c.quick_loans && <div className="soft xs t2">Pays quick loan apps most months. A savings plan or small Zenith loan may help.</div>}
          </div>
        </div>
      </>}
    </ConsoleShell>
  )
}
