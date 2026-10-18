import { useMoney } from '../../store'
import { Icon, Skeleton, useLoad, when } from '../../ui'
import { BasisTag, ConsoleShell, CountBars, CountLines, Err, Kpi, fmt, useScope } from './Layout'

type T = { total: number; live: number }
type Risk = {
  days: number; modelled: boolean; labels: string[]; series: Record<string, number[]>; live: Record<string, number[]>
  kpis: { ai_injection: T; ai_off_topic: T; pin_failed: T; face_failed: T; transfers_locked: T; login_failed: T; fraud_alerts: number; fraud_confirmed: number; held: number; uptime: number; latency: number }
  uptime: number[]; latency: number[]; log: { kind: string; detail: string; at: string }[]; flagged_customers: number
}
const KIND: Record<string, [string, string]> = {
  ai_injection: ['Prompt injection', 'red'], ai_off_topic: ['Off topic', ''], pin_failed: ['Wrong PIN', 'amber'], face_failed: ['Face mismatch', 'red'],
  transfers_locked: ['Transfers locked', 'red'], login_failed: ['Failed sign in', 'amber'],
}
const RESULT: Record<string, string> = { ai_injection: 'Blocked', ai_off_topic: 'Declined politely', pin_failed: 'Transfer refused', face_failed: 'Transfer refused', transfers_locked: 'Paused 30 minutes', login_failed: 'Code not sent' }
const SAFE: [string, string][] = [
  ['lock', 'Customer chats are encrypted. Staff cannot read them.'], ['shieldcheck', 'Every reply is checked against a money only policy.'],
  ['key', 'Payments always need a PIN plus a face match.'], ['eyeoff', 'Names and numbers are masked before they reach the AI model.'],
  ['database', 'Customers can download or delete their data.'],
]

export default function Risk() {
  const scope = useScope()
  const money = useMoney()
  const { data: r, error } = useLoad<Risk>('/console/risk?' + scope.qs)
  const basis = r?.modelled ? 'mixed' : 'live'
  const live = (t: T) => (r?.modelled ? `${fmt(t.live)} live` : 'Measured')
  const period = scope.days === '90' ? 'last 3 months' : `last ${scope.days} days`

  return (
    <ConsoleShell title="Risk and AI safety" sub="Guardrails, fraud signals and audit trail" scope={scope}>
      <Err msg={error} />
      <div className="grid g-4">
        {r ? <>
          <Kpi icon="shield" label="Prompt attacks blocked" value={fmt(r.kpis.ai_injection.total)} note={live(r.kpis.ai_injection) + ', ' + period} tone="pos" basis={basis} />
          <Kpi icon="x" label="Off topic questions declined" value={fmt(r.kpis.ai_off_topic.total)} note="NURU only answers money questions" basis={basis} />
          <Kpi icon="alert" label="Fraud alerts raised" value={fmt(r.kpis.fraud_alerts)} note={`${fmt(r.kpis.fraud_confirmed)} confirmed${r.kpis.held ? ', ' + money(r.kpis.held, { compact: true }) + ' held' : ''}`} tone="red" basis={basis} />
          <Kpi icon="cpu" label="Uptime" value={r.kpis.uptime + '%'} note={`Average reply in ${r.kpis.latency}s`} tone="pos" basis="estimated" />
          <Kpi icon="key" label="Failed PINs" value={fmt(r.kpis.pin_failed.total)} note={live(r.kpis.pin_failed)} basis={basis} />
          <Kpi icon="scanface" label="Face mismatches" value={fmt(r.kpis.face_failed.total)} note={live(r.kpis.face_failed)} basis={basis} />
          <Kpi icon="lock" label="Transfers locked" value={fmt(r.kpis.transfers_locked.total)} note="After 3 failed checks" tone="amber" basis={basis} />
          <Kpi icon="users" label="Customers with risk flags" value={fmt(r.flagged_customers)} note="Opted in profiles" basis={basis} />
        </> : Array.from({ length: 8 }, (_, i) => <Skeleton key={i} h={128} />)}
      </div>

      <div className="grid g-2">
        <div className="card col g12">
          <div className="row between"><div className="col g4"><span className="h3">AI guardrail blocks, by day</span><span className="xs mu">Prompt injection and off topic questions</span></div>{r && <BasisTag b={basis} />}</div>
          {r ? <CountBars labels={r.labels} series={[{ name: 'Prompt injection', values: r.series.ai_injection }, { name: 'Off topic', values: r.series.ai_off_topic }]} colors={['var(--c1)', 'var(--c5)']} stacked /> : <Skeleton h={220} />}
        </div>
        <div className="card col g12">
          <div className="row between"><div className="col g4"><span className="h3">Payment checks that failed, by day</span><span className="xs mu">Wrong PINs, face mismatches and locked transfers</span></div>{r && <BasisTag b={basis} />}</div>
          {r ? <CountLines labels={r.labels} series={[{ name: 'Wrong PIN', values: r.series.pin_failed }, { name: 'Face mismatch', values: r.series.face_failed }, { name: 'Transfers locked', values: r.series.transfers_locked }]} colors={['var(--c4)', 'var(--c1)', 'var(--c2)']} /> : <Skeleton h={220} />}
        </div>
      </div>

      <div className="grid g-21">
        <div className="card col" style={{ padding: 0 }}>
          <div className="row between" style={{ padding: '16px 18px 6px' }}><span className="h3">AI safety and audit log</span><span className="row g6 xs mu">Live events, masked <BasisTag b="live" /></span></div>
          <div className="cscroll">
            <table className="tx">
              <thead><tr><th>Time</th><th>What was tried</th><th>Type</th><th className="hide-sm">Result</th></tr></thead>
              <tbody>
                {r?.log.map((e, i) => {
                  const [l, tone] = KIND[e.kind] || [e.kind, '']
                  return (
                    <tr key={i}>
                      <td className="t2 xs num" style={{ whiteSpace: 'nowrap' }}>{when(e.at)}</td>
                      <td className="s">{e.kind.startsWith('ai_') ? `"${e.detail}"` : e.detail}</td>
                      <td><span className={'chip ' + tone}>{l}</span></td>
                      <td className={'s w6 hide-sm ' + (e.kind === 'ai_off_topic' ? 't2' : 'pos')}>{RESULT[e.kind] || 'Logged'}</td>
                    </tr>
                  )
                })}
                {r && !r.log.length && <tr><td colSpan={4} className="t2 s">Nothing flagged yet. Try asking NURU to ignore its rules and it will show up here.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="col g16">
          <div className="card col g12">
            <span className="h3">How NURU stays safe</span>
            {SAFE.map(([ic, t]) => <div key={t} className="row g10" style={{ alignItems: 'flex-start' }}><span className="chip green" style={{ width: 30, height: 30, padding: 0, justifyContent: 'center', flex: 'none' }}><Icon name={ic} size={15} /></span><span className="s t2">{t}</span></div>)}
          </div>
          <div className="card col g10">
            <div className="row between"><span className="h3">Reply time, seconds</span><BasisTag b="estimated" /></div>
            {r ? <CountLines labels={r.labels} series={[{ name: 'Average reply', values: r.latency }]} height={140} domain={[0, 3]} unit="s" /> : <Skeleton h={140} />}
          </div>
        </div>
      </div>
    </ConsoleShell>
  )
}
