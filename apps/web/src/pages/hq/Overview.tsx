import { Link } from 'react-router-dom'
import { canHQ } from '../../access'
import { useApp, useMoney } from '../../store'
import { Icon, Skeleton, useGreeting, useLoad } from '../../ui'
import { CountLines, Err, Meter } from '../console/Layout'
import { HKpi, HQShell, RangePicker, n, useRange } from './Layout'

type Overview = {
  days: number; customers: number; new: number; active: number; weekly_active: number; answers: number; local_share: number
  moved: number; transfers: number; stopped: number
  daily: { label: string; value: number; last_week: number }[]
  funnel: { key: string; label: string; value: number }[]
  goals: { label: string; value: number; target: number; unit: string; pct: number; measured: boolean }[]
  uptime: { checks_up: number; checks: number; uptimerobot?: number }
  attention: { icon: string; tone: string; title: string; sub: string; area: string }[]
}
const AREA: Record<string, [string, string]> = { health: ['/hq/health', 'Platform health'], support: ['/hq/support', 'Support'], emails: ['/hq/emails', 'Emails'] }

// Overview is the CEO's view of how NURU is doing, counted from the database.
export default function Overview() {
  const { user } = useApp()
  const money = useMoney()
  const greet = useGreeting()
  const range = useRange()
  const { data: o, error } = useLoad<Overview>('/hq/overview?days=' + range.days)
  const top = Math.max(1, o?.funnel[0]?.value || 0)
  const thisWeek = o?.daily.reduce((s, d) => s + d.value, 0) || 0
  const lastWeek = o?.daily.reduce((s, d) => s + d.last_week, 0) || 0
  const change = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null

  return (
    <HQShell area="overview" title={`${greet}, ${(user?.name || '').split(' ')[0]}`} sub="How NURU is doing right now" right={<RangePicker range={range} />}>
      <Err msg={error} />
      <div className="cgrid-5">
        {o ? <>
          <HKpi icon="users" label="Customers" value={n(o.customers)} note={`+${n(o.new)} ${range.label}`} />
          <HKpi icon="zap" label={range.days === '1' ? 'Active today' : 'Active, ' + range.label.replace('last ', '')} value={n(o.active)}
            note={o.customers ? `${Math.round((o.active / o.customers) * 100)}% of customers` : 'No customers yet'} />
          <HKpi icon="message" label="Questions answered" value={n(o.answers)} note={o.answers ? `${o.local_share}% in Yorùbá, Igbo or Hausa` : 'None ' + range.label} tone={o.answers ? 'pos' : 'mu'} />
          <HKpi icon="send" label="Money moved" value={money(o.moved, { compact: true })} note={`${n(o.transfers)} transfer${o.transfers === 1 ? '' : 's'}, ${n(o.stopped)} stopped by safety checks`} tone={o.transfers ? 'pos' : 'mu'} />
          <HKpi icon="cpu" label="Uptime" value={o.uptime.uptimerobot != null ? o.uptime.uptimerobot + '%' : `${o.uptime.checks_up} of ${o.uptime.checks}`}
            note={o.uptime.uptimerobot != null ? '30 days, UptimeRobot' : o.uptime.checks_up === o.uptime.checks ? 'All live checks up' : 'Live checks, see health'}
            tone={o.uptime.checks_up === o.uptime.checks ? 'pos' : 'amber'} />
        </> : Array.from({ length: 5 }, (_, i) => <Skeleton key={i} h={128} />)}
      </div>

      <div className="grid g-21">
        <div className="card col g12">
          <div className="row between wrap g8">
            <div className="col g4"><span className="h3">Daily active customers</span><span className="xs mu">Signed in, asked NURU or sent money. Dashed line is last week</span></div>
            {change != null && <span className={'chip ' + (change >= 0 ? 'green' : 'red')}><Icon name={change >= 0 ? 'up' : 'down'} size={12} />{Math.abs(change)}%</span>}
          </div>
          {o ? <CountLines labels={o.daily.map((d) => d.label)} series={[{ name: 'This week', values: o.daily.map((d) => d.value) }, { name: 'Last week', values: o.daily.map((d) => d.last_week) }]} dashed="Last week" domain={[0, 'auto']} whole /> : <Skeleton h={220} />}
        </div>
        <div className="card col g12">
          <span className="h3">Sign up to first insight</span>
          {o ? o.funnel.map((f) => (
            <div key={f.key} className="cbars"><div className="row between"><span className="s">{f.label}</span><span className="s w6 num">{n(f.value)}</span></div><Meter p={(f.value / top) * 100} /></div>
          )) : <Skeleton h={200} />}
          <span className="xs mu">Acted on a tip counts customers who applied a NURU plan, recorded from this release on.</span>
        </div>
      </div>

      <div className="grid g-2">
        <div className="card col g12">
          <div className="row between"><span className="h3">Needs your attention</span>{o && <span className={'chip ' + (o.attention.length ? 'red' : 'green')}>{o.attention.length ? `${o.attention.length} open` : 'All clear'}</span>}</div>
          {o ? o.attention.length ? o.attention.map((a) => (
            <div key={a.title} className="hqattn">
              <span className={'tile ' + a.tone}><Icon name={a.icon} size={17} /></span>
              <div className="col g4 grow"><span className="s w6">{a.title}</span><span className="xs mu">{a.sub}</span></div>
              {canHQ(user, a.area) && AREA[a.area] && <Link to={AREA[a.area][0]} className="s red w6">{AREA[a.area][1]}</Link>}
            </div>
          )) : <span className="s t2">Nothing needs you right now. Services answer, no report has waited a day and replies come from Claude.</span> : <Skeleton h={150} />}
        </div>
        <div className="card col g12">
          <span className="h3">Zenith pilot goals</span>
          {o ? o.goals.map((g) => (
            <div key={g.label} className="cbars">
              <div className="row between"><span className="s">{g.label}</span><span className="xs mu num">{g.measured ? `${n(g.value, 1)}${g.unit} of ${n(g.target)}${g.unit}` : `Not measured yet · target ${g.target}${g.unit}`}</span></div>
              <Meter p={g.pct} color={g.pct >= 100 ? 'var(--green)' : 'var(--red)'} />
            </div>
          )) : <Skeleton h={150} />}
        </div>
      </div>
    </HQShell>
  )
}
