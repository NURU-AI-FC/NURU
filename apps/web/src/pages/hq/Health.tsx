import { Icon, Skeleton, useLoad } from '../../ui'
import { CountBars, Err } from '../console/Layout'
import { CountDonut, Dot, Empty, HKpi, HQShell, RangePicker, n, useRange } from './Layout'

type Check = { key: string; name: string; runs: string; status: 'up' | 'warn' | 'down' | 'configured' | 'off' | 'unknown'; note: string; ms: number }
type Health = {
  started: string; requests: number; errors: number; error_rate: number; p95_ms: number; samples: number; ai_p95_ms?: number
  hours: { label: string; requests: number; errors: number }[]; checks: Check[]; engines: Record<string, number>
  releases: { service: string; sha: string; message: string; at?: string }[]
  uptimerobot: { connected: boolean; error: string; average: number; monitors: { name: string; status: string; uptime: number; ms: number | string }[] | null }
  sentry: { connected: boolean; error: string; open: number; new: number; reporting?: boolean }
}
const STATUS: Record<string, [string, string]> = {
  up: ['Up', 'var(--green)'], warn: ['Degraded', 'var(--amber)'], down: ['Down', 'var(--red)'], configured: ['Configured', 'var(--green)'], off: ['Off', 'var(--muted)'], unknown: ['Unknown', 'var(--muted)'],
}
const ENGINES: [string, string, string][] = [
  ['claude', 'Answered by Claude', '#15803D'], ['template', 'Template fallback', '#F59E0B'], ['blocked', 'Blocked attacks', '#E30613'],
  ['off_topic', 'Off topic declined', '#94A3B8'], ['action', 'Payment and reminder confirmations', '#1D4ED8'], ['unrecorded', 'Before tracking began', '#D4D4D8'],
]
const KEYWORD: Record<string, string> = { web: 'web', api: 'api', db: 'data', ai: 'ai', voice: 'voice' }

const time = (at: string) => new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

// Health shows live checks run by the API, its own request counts and, when
// connected, UptimeRobot and Sentry.
export default function Health() {
  const range = useRange()
  const { data: h, error } = useLoad<Health>('/hq/health?days=' + range.days)
  const startedToday = h && new Date(h.started).toDateString() === new Date().toDateString()
  const ur = h?.uptimerobot
  const monitorFor = (c: Check) => ur?.monitors?.find((m) => m.name.toLowerCase().includes(KEYWORD[c.key]))
  const eng = ENGINES.map(([k, l, c]) => ({ name: l, value: h?.engines[k] || 0, color: c, key: k })).filter((e) => e.value > 0 || ['claude', 'template', 'blocked', 'off_topic'].includes(e.key))
  const total = eng.reduce((s, e) => s + e.value, 0)
  const claude = total ? Math.round(((h?.engines.claude || 0) / total) * 100) : 0

  return (
    <HQShell area="health" title="Platform health" sub="Uptime, errors, speed and AI usage" right={<RangePicker range={range} />}>
      <Err msg={error} />
      <div className="cgrid-4">
        {h ? <>
          <HKpi icon="zap" label={startedToday ? 'Requests since ' + time(h.started) : 'Requests today'} value={n(h.requests)} note={startedToday ? 'Counted since the API last started' : 'Counted by the API'} tone="mu" />
          <HKpi icon="alert" label="Errors" value={h.sentry.connected && !h.sentry.error ? n(h.sentry.open) : h.error_rate + '%'}
            note={h.sentry.connected ? h.sentry.error || `Unresolved in Sentry, ${h.sentry.new} new today` : `${n(h.errors)} server errors · ${h.sentry.reporting ? 'Sentry reporting, not read here' : 'Sentry not connected'}`} tone={h.errors || h.sentry.open ? 'red' : 'pos'} />
          <HKpi icon="clock" label="API p95" value={h.samples ? h.p95_ms + 'ms' : '—'} note={h.samples ? `Target under 300ms · last ${n(h.samples)} requests` : 'No requests yet'} tone={h.p95_ms <= 300 ? 'pos' : 'amber'} />
          <HKpi icon="sparkles" label="AI reply p95" value={h.ai_p95_ms != null ? (h.ai_p95_ms / 1000).toFixed(1) + 's' : '—'} note={h.ai_p95_ms != null ? 'Target under 2s, ' + range.label : 'No timed replies ' + range.label} tone={h.ai_p95_ms != null && h.ai_p95_ms <= 2000 ? 'pos' : 'mu'} />
        </> : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} h={128} />)}
      </div>

      <div className="grid g-21">
        <div className="card col" style={{ padding: 0 }}>
          <div className="row between wrap g8" style={{ padding: '16px 18px 6px' }}>
            <div className="col g4"><span className="h3">Services</span><span className="xs mu">Checked live by the API when this page loads{ur?.connected ? ' · 30 days from UptimeRobot' : ''}</span></div>
            {ur && !ur.connected && <span className="notconn"><Icon name="info" size={14} />UptimeRobot not connected</span>}
          </div>
          <div className="cscroll">
            <table className="tx">
              <thead><tr><th>Service</th><th className="hide-sm">Runs on</th><th>Status</th><th>30 days</th><th>Response</th></tr></thead>
              <tbody>
                {h?.checks.map((c) => {
                  const m = monitorFor(c)
                  return (
                    <tr key={c.key} title={c.note}>
                      <td><div className="col g4"><span className="w6 s">{c.name}</span>{c.note && <span className="xs mu">{c.note}</span>}</div></td>
                      <td className="t2 s hide-sm">{c.runs || '—'}</td>
                      <td><span className="row g6"><Dot c={STATUS[c.status][1]} /><span className="s">{STATUS[c.status][0]}</span></span></td>
                      <td className="num s">{m ? m.uptime + '%' : '—'}</td>
                      <td className="num s">{c.ms ? (c.ms >= 1000 ? (c.ms / 1000).toFixed(1) + 's' : Math.max(1, Math.round(c.ms)) + 'ms') : c.status === 'up' || c.status === 'warn' ? '<1ms' : '—'}</td>
                    </tr>
                  )
                })}
                {!h && <tr><td colSpan={5}><Skeleton h={220} /></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card col g12">
          <div className="row between"><span className="h3">Errors by hour, today</span><span className="xs mu">{h?.sentry.connected && !h.sentry.error ? 'Sentry events' : 'API server errors'}</span></div>
          {h ? <CountBars labels={h.hours.map((x) => x.label)} series={[{ name: 'Errors', values: h.hours.map((x) => x.errors) }]} height={150} whole /> : <Skeleton h={150} />}
          <div className="soft row g10"><Icon name="info" size={16} color="var(--blue)" /><span className="xs t2 grow">
            {h?.sentry.connected ? h.sentry.error || 'From Sentry, unresolved issues in the last 24 hours.' : 'Sentry is not connected. Set SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT on the API to see errors from every service. Until then this counts the API’s own 5xx answers.'}
          </span></div>
        </div>
      </div>

      <div className="grid g-2">
        <div className="card col g10">
          <span className="h3">Latest releases</span>
          {h ? h.releases.length ? h.releases.map((r) => (
            <div key={r.service + r.sha} className="row g12"><span className="chip">{r.service}</span><span className="s grow">{r.message || 'No commit message'}</span><span className="xs mu num">{r.sha}</span><Dot c="var(--green)" /></div>
          )) : <Empty icon="refresh" title="No release information" body="Railway sets RAILWAY_GIT_COMMIT_SHA and RAILWAY_GIT_COMMIT_MESSAGE on deploy. Running locally, they are not set." /> : <Skeleton h={120} />}
        </div>
        <div className="card col g10">
          <span className="h3">AI answers, {range.label}</span>
          {h ? total ? (
            <div className="row g16 wrap">
              <CountDonut data={eng} center={claude + '%'} sub="Claude" />
              <div className="col g8 grow" style={{ minWidth: 200 }}>
                {eng.map((e) => <div key={e.name} className="row g8"><span className="dot" style={{ background: e.color }} /><span className="s grow">{e.name}</span><span className="s w6 num">{n(e.value)}</span></div>)}
              </div>
            </div>
          ) : <Empty icon="message" title="No answers yet" body={'Nobody asked NURU anything ' + range.label + '.'} /> : <Skeleton h={120} />}
        </div>
      </div>
    </HQShell>
  )
}
