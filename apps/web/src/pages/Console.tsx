import { Link } from 'react-router-dom'
import type { Cat } from '../api'
import { useMoney } from '../store'
import { Bars, Donut, Icon, Legend, Skeleton, useLoad } from '../ui'
import { BasisTag, ConsoleShell, CountLines, Err, Kpi, Meter, compact, delta, fmt, useScope, type Basis } from './console/Layout'

type K = { key: string; value: number; prev: number; basis: Basis; note: string }
type Overview = {
  days: number; modelled: boolean; live_customers: number; kpis: K[]; weeks: { label: string; value: number }[]
  languages: Record<string, number>; voice_share: number; topics: { question: string; count: number }[]
  signals: { icon: string; tone: string; count: number; text: string; action: string; segment: string }[]; categories: Cat[]
}
const LANG: Record<string, string> = { en: 'English', yo: 'Yorùbá', ha: 'Hausa', ig: 'Igbo' }

// Console is the bank staff overview: anonymised totals across customers who
// opted in. Every figure is tagged live, mixed or estimated.
export default function Console() {
  const scope = useScope()
  const money = useMoney()
  const { data: o, error } = useLoad<Overview>('/console/overview?' + scope.qs)
  const k = Object.fromEntries((o?.kpis || []).map((x) => [x.key, x])) as Record<string, K>
  const langs = Object.entries(o?.languages || {}).sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ name: LANG[l] || l, value: v }))
  const total = langs.reduce((s, l) => s + l.value, 0)
  const local = total ? Math.round(((total - (o?.languages.en || 0)) / total) * 100) : 0
  const period = scope.days === '90' ? '3 months' : scope.days + ' days'
  const target = o?.weeks.length ? Math.round((o.weeks[0].value * 1.35) / 100) * 100 : 0
  const maxTopic = Math.max(1, ...(o?.topics || []).map((t) => t.count))

  return (
    <ConsoleShell title="Overview" sub="Anonymised insights from customers who opted in" scope={scope}>
      <Err msg={error} />
      {o?.modelled && (
        <div className="soft row g10 wrap">
          <Icon name="info" size={16} color="var(--blue)" />
          <span className="xs t2 grow">Figures combine <b>{fmt(o.live_customers)} live NURU customer{o.live_customers === 1 ? '' : 's'}</b> with a modelled pilot cohort sized to Zenith's retail base. Switch to Live only to see measured numbers alone.</span>
          <span className="row g6"><BasisTag b="live" /><BasisTag b="mixed" /><BasisTag b="estimated" /></span>
        </div>
      )}
      <div className="cgrid-5">
        {o ? <>
          <Kpi icon="users" label="Customers opted in" value={fmt(k.customers.value)} note={fmt(k.customers.prev) + ' live'} basis={k.customers.basis} />
          <Kpi icon="user" label={`Active users, ${period}`} value={fmt(k.active.value)} note={delta(k.active.value, k.active.prev)} tone="pos" basis={k.active.basis} />
          <Kpi icon="message" label="Questions asked" value={compact(k.questions.value)} note={`${local}% in a local language`} basis={k.questions.basis} />
          <Kpi icon="bulb" label="Insights acted on" value={k.acted.value + '%'} note={k.acted.note} basis={k.acted.basis} />
          <Kpi icon="trendup" label="Products taken up" value={money(k.products.value, { compact: true })} note={fmt(k.products.prev) + ' customers with 2+ products'} basis={k.products.basis} />
          <Kpi icon="trenddown" label="Average churn risk" value={k.churn.value + '%'} note={fmt(k.churn.prev) + ' at high risk in 90 days'} tone="amber" basis={k.churn.basis} />
          <Kpi icon="star" label="Lifetime value" value={money(k.ltv.value, { compact: true })} note={'Average. Book total ' + money(k.ltv.prev, { compact: true })} basis={k.ltv.basis} />
          <Kpi icon="alert" label="Fraud stopped" value={fmt(k.fraud.value)} note={k.fraud.prev ? money(k.fraud.prev, { compact: true }) + ' held before it left' : 'Locked transfers and face mismatches'} tone="red" basis={k.fraud.basis} />
          <Kpi icon="shield" label="Unsafe prompts blocked" value={fmt(k.blocked.value)} note={fmt(k.blocked.prev) + ' from live chats'} basis={k.blocked.basis} />
          <Kpi icon="cpu" label="Uptime" value={k.uptime.value + '%'} note={`Average reply in ${k.uptime.prev}s`} tone="pos" basis="estimated" />
        </> : Array.from({ length: 10 }, (_, i) => <Skeleton key={i} h={128} />)}
      </div>

      <div className="grid g-21">
        <div className="card col g12">
          <div className="row between wrap g8">
            <div className="col g4"><span className="h3">Weekly active users, last 12 weeks</span><span className="xs mu">Dashed line is the target</span></div>
            {o && o.weeks.length > 1 && <span className="chip green"><Icon name="up" size={12} />{delta(o.weeks[o.weeks.length - 1].value, o.weeks[0].value).replace(' vs previous period', ' in 12 weeks')}</span>}
          </div>
          {o ? <CountLines labels={o.weeks.map((w) => w.label)} series={[{ name: 'Active users', values: o.weeks.map((w) => w.value) }, { name: 'Target', values: o.weeks.map(() => target) }]} dashed="Target" /> : <Skeleton h={220} />}
        </div>
        <div className="card col g12">
          <div className="row between"><span className="h3">Language of questions</span>{o && <BasisTag b={k.questions.basis} />}</div>
          {langs.length && total ? <div className="row g16 wrap"><Donut data={langs} center={local + '%'} sub="local" height={140} /><Legend items={langs} total={total} /></div> : o ? <span className="t2 s">No questions yet.</span> : <Skeleton h={140} />}
          {o && <div className="soft row g10"><Icon name="mic" size={18} color="var(--red)" /><span className="xs t2 grow">{o.voice_share}% of local language users ask by voice.</span></div>}
        </div>
      </div>

      <div className="grid g-2">
        <div className="card col g12">
          <div className="row between"><span className="h3">What customers ask most</span><BasisTag b="estimated" /></div>
          {o ? o.topics.map((t) => (
            <div key={t.question} className="cbars"><div className="row between"><span className="s">{t.question}</span><span className="xs mu num">{compact(t.count)}</span></div><Meter p={(t.count / maxTopic) * 100} /></div>
          )) : <Skeleton h={180} />}
        </div>
        <div className="card col g12">
          <div className="row between"><span className="h3">Signals worth acting on</span>{o && <BasisTag b={k.customers.basis} />}</div>
          {o ? o.signals.map((s) => (
            <div key={s.text} className="row g12" style={{ alignItems: 'flex-start' }}>
              <span className={'tile chip ' + s.tone} style={{ width: 32, height: 32, padding: 0, justifyContent: 'center' }}><Icon name={s.icon} size={16} /></span>
              <div className="col g4 grow"><span className="s w6">{fmt(s.count)} {s.text}</span><Link to={'/console/campaigns?segment=' + s.segment} className="xs red w6">{s.action} →</Link></div>
            </div>
          )) : <Skeleton h={180} />}
        </div>
      </div>

      <div className="card col g12">
        <div className="row between wrap g8">
          <div className="col g4"><span className="h3">Where live customers spend, last {period}</span><span className="xs mu">All live opted in customers, by category</span></div>
          <BasisTag b="live" />
        </div>
        {o ? o.categories.length ? <Bars labels={o.categories.map((c) => c.category)} series={[{ name: 'Spend', values: o.categories.map((c) => c.amount) }]} colors={['var(--c1)']} /> : <span className="t2 s">No spending in this period.</span> : <Skeleton h={220} />}
        <span className="xs mu">High Food and Transport spend suggests a cashback card campaign.</span>
      </div>
    </ConsoleShell>
  )
}
