import { Link } from 'react-router-dom'
import './Business.css'
import { Shell } from '../Shell'
import { useApp, useMoney } from '../store'
import { Bars, Icon, Skeleton, Stat, useLoad } from '../ui'
import { lastFull, type Biz } from './business/data'

const tools: [string, string, string][] = [
  ['/business/payroll', 'users', 'Payroll'], ['/business/vendors', 'package', 'Vendors'], ['/business/invoices', 'file', 'Invoices'], ['/business/expenses', 'receipt', 'Expenses'],
  ['/business/plan', 'flag', '12-month plan'], ['/business/decide', 'scale', 'Decision Room'], ['/business/investor', 'briefcase', 'Investor prep'], ['/business/setup', 'edit', 'Business details'],
]

const funding = [
  ['Zenith SME loan', 'Working capital up to ₦50m for registered businesses with 6 months of statements.'],
  ['Bank of Industry', 'Lower interest funding for food processing and manufacturing.'],
  ['Business insurance', 'Fire, burglary and goods in transit cover for your kitchen and stock.'],
]

export default function Business() {
  const { t } = useApp()
  const money = useMoney()
  const { data: b } = useLoad<Biz>('/business')
  const meetings = useLoad<{ title: string; kind: string; due_at: string; done: boolean }[]>('/reminders').data?.filter((r) => r.kind === 'meeting' && !r.done)

  if (b && !b.enabled) {
    return (
      <Shell title={t('business')}>
        <div className="card col g12 center" style={{ padding: 48, textAlign: 'center' }}>
          <Icon name="briefcase" size={40} color="var(--red)" />
          <span className="h2">Run a business?</span>
          <span className="t2" style={{ maxWidth: 420 }}>Link your business account to see payroll, tax, cash runway and advertising spend next to your personal money.</span>
          <Link to="/business/setup" className="btn pri">Set up your business</Link>
        </div>
      </Shell>
    )
  }
  const last = b ? lastFull(b) : undefined
  const prev = b?.monthly[b.monthly.length - 3]
  const growth = last && prev?.profit ? Math.round(((last.profit - prev.profit) / Math.abs(prev.profit)) * 100) : null
  const due = b?.payroll_due
  const ads = b?.advertising.reduce((s, a) => s + a.spend, 0) || 0

  return (
    <Shell title={b?.name || t('business')} sub={b?.type}>
      <div className="grid g-4">
        {b ? <>
          <Stat icon="trendup" label={`${t('profit')} · ${last?.month || ''}`} value={money(last?.profit || 0, { sign: true })} note={growth === null ? undefined : `${Math.abs(growth)}% ${growth >= 0 ? 'more' : 'less'} than ${prev?.month}`} tone={growth !== null && growth < 0 ? 'amber' : 'pos'} />
          <Stat icon="wallet" label={t('cash')} value={money(b.cash)} note={`${b.runway_days} ${t('days')} of runway`} tone={b.runway_days < 60 ? 'red' : 'pos'} />
          <Stat icon="file" label="Unpaid invoices" value={money(b.unpaid)} note={b.overdue_count ? `${b.overdue_count} overdue` : `${b.unpaid_count} open`} tone={b.overdue_count ? 'red' : undefined} />
          <Stat icon="users" label="Payroll due" value={money(due?.amount || 0)} note={due?.paid_at ? `Paid · next ${new Date(due.due_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}` : `${due ? new Date(due.due_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : ''} · ${b.staff.length} staff`} tone={due?.paid_at ? 'pos' : 'amber'} />
        </> : [0, 1, 2, 3].map((i) => <Skeleton key={i} h={134} />)}
      </div>

      <div className="biz-tools">
        {tools.map(([to, ic, l]) => (
          <Link key={to} to={to} className="col center g8"><span className="tile" style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--blue50)', color: 'var(--blue)' }}><Icon name={ic} size={22} /></span><span className="xs w6" style={{ textAlign: 'center' }}>{l}</span></Link>
        ))}
      </div>

      <div className="grid g-21">
        <div className="card col g12">
          <div className="col g4"><span className="h3">{t('sales')}, {t('costs').toLowerCase()} and {t('profit').toLowerCase()}</span><span className="xs mu">Last 6 months, this month so far</span></div>
          {b ? <Bars labels={b.monthly.map((m) => m.month)} series={[{ name: t('sales'), values: b.monthly.map((m) => m.sales) }, { name: t('costs'), values: b.monthly.map((m) => m.costs) }, { name: t('profit'), values: b.monthly.map((m) => m.profit) }]} colors={['var(--c5)', 'var(--c2)', 'var(--c1)']} /> : <Skeleton h={220} />}
        </div>
        <div className="card col g12">
          <span className="h3">{t('advertising')}</span>
          <span className="xs mu">Last 90 days · {money(ads)}</span>
          {b?.advertising.map((a) => (
            <div key={a.channel} className="col g6">
              <div className="row between s"><span className="w6">{a.channel}</span><span className="num t2">{money(a.spend)}</span></div>
              <div className="bar"><i style={{ width: `${(a.spend / ads) * 100}%` }} /></div>
            </div>
          ))}
          <Link to={'/ask?q=' + encodeURIComponent('Is my advertising spend paying off?')} className="soft row g8 s"><Icon name="sparkles" size={16} color="var(--red)" />Is my advertising paying off?</Link>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="row between wrap g8" style={{ padding: '18px 20px 8px' }}><span className="col g4"><span className="h3">{t('staff')}</span><span className="xs mu">PAYE estimated at 6.33%, pension 8% and NHF 2.5% employee share</span></span><Link to="/business/payroll" className="btn pri sm">Run payroll</Link></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tx">
            <thead><tr><th>{t('name')}</th><th className="hide-sm">Role</th><th className="right">Gross</th><th className="right hide-sm">PAYE</th><th className="right hide-sm">Pension</th><th className="right">Net pay</th></tr></thead>
            <tbody>
              {b?.staff.map((s) => (
                <tr key={s.id}><td className="w6"><Link to={`/business/payslip/${s.id}`}>{s.name}</Link></td><td className="hide-sm t2">{s.role}</td><td className="right num">{money(s.gross)}</td><td className="right num t2 hide-sm">{money(s.paye)}</td><td className="right num t2 hide-sm">{money(s.pension)}</td><td className="right num w6">{money(s.net)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid g-2">
        <div className="card col g12">
          <span className="h3">{t('funding')}</span>
          {funding.map(([h, p]) => <div key={h} className="soft col g4"><span className="s w6">{h}</span><span className="xs t2">{p}</span></div>)}
        </div>
        <div className="card col g12">
          <div className="row between"><span className="h3">Investor meetings</span><Link to="/planner" className="s w6 red">{t('planner')}</Link></div>
          {meetings?.length ? meetings.map((m) => (
            <div key={m.title} className="row g10"><span className="tile"><Icon name="calendar" size={16} /></span><span className="col grow"><span className="s w6">{m.title}</span><span className="xs mu">{new Date(m.due_at).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' })}</span></span></div>
          )) : <span className="t2 s">No meetings booked. Add one in the planner.</span>}
          <Link to="/business/investor" className="btn sm" style={{ alignSelf: 'flex-start' }}><Icon name="sparkles" size={16} />Prepare my numbers</Link>
        </div>
      </div>
    </Shell>
  )
}
