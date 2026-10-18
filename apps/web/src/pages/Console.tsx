import { langNames } from '../i18n'
import type { Cat, Lang } from '../api'
import { Shell } from '../Shell'
import { Bars, Donut, Icon, Legend, Skeleton, Stat, useLoad, when } from '../ui'

type Overview = { customers: number; questions: number; ai_blocked: number; languages: Record<string, number>; categories: Cat[]; events: { kind: string; detail: string; at: string }[] }
const label: Record<string, [string, string]> = {
  ai_injection: ['Prompt injection blocked', 'red'], ai_off_topic: ['Off topic question declined', 'amber'],
  login_failed: ['Failed sign in', 'amber'], pin_failed: ['Wrong transfer PIN', 'red'],
}

// Console is the bank staff view: totals across customers who opted in,
// with no names or account numbers, plus the assistant's safety log.
export default function Console() {
  const { data: o } = useLoad<Overview>('/console/overview')
  const langs = Object.entries(o?.languages || {}).map(([k, v]) => ({ name: langNames[k as Lang] || k, value: v }))
  const total = langs.reduce((s, l) => s + l.value, 0)

  return (
    <Shell title="Bank console" sub="Anonymised view across NURU customers">
      <div className="grid g-4">
        {o ? <>
          <Stat icon="users" label="Customers" value={o.customers.toLocaleString()} note="Opted in to insights" />
          <Stat icon="message" label="Questions asked" value={o.questions.toLocaleString()} />
          <Stat icon="shield" label="Unsafe prompts stopped" value={o.ai_blocked.toLocaleString()} tone="red" note="Injection and off topic" />
          <Stat icon="globe" label="Non English questions" value={total ? `${Math.round(((total - (o.languages.en || 0)) / total) * 100)}%` : '0%'} note="Yorùbá, Igbo and Hausa" />
        </> : [0, 1, 2, 3].map((i) => <Skeleton key={i} h={134} />)}
      </div>
      <div className="grid g-21">
        <div className="card col g12">
          <div className="col g4"><span className="h3">Where customers spend this month</span><span className="xs mu">All opted in customers, by category</span></div>
          {o ? <Bars labels={o.categories.map((c) => c.category)} series={[{ name: 'Spend', values: o.categories.map((c) => c.amount) }]} colors={['var(--c1)']} /> : <Skeleton h={220} />}
          <span className="xs mu">Use this to target products: high Food and Transport spend suggests a cashback card campaign.</span>
        </div>
        <div className="card col g12">
          <span className="h3">Questions by language</span>
          {langs.length ? <div className="row g16 wrap"><Donut data={langs} center={String(total)} sub="questions" height={140} /><Legend items={langs} total={total} /></div> : <span className="t2 s">No questions yet.</span>}
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="row between" style={{ padding: '18px 20px 8px' }}><span className="h3">Risk and AI safety log</span><span className="xs mu">Account numbers masked</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tx">
            <thead><tr><th>Event</th><th>Detail</th><th className="right">When</th></tr></thead>
            <tbody>
              {o?.events.map((e, i) => {
                const [l, tone] = label[e.kind] || [e.kind, '']
                return <tr key={i}><td><span className={'chip ' + tone}><Icon name="shield" size={12} />{l}</span></td><td className="t2 s">{e.detail}</td><td className="right t2 s">{when(e.at)}</td></tr>
              })}
              {o && !o.events.length && <tr><td colSpan={3} className="t2">Nothing flagged.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  )
}
