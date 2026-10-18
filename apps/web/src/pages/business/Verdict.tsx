import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Icon, Skeleton, useLoad } from '../../ui'
import { Back, Ic, Sandbox } from '../money/kit'
import type { Biz } from './data'
import { decide, scenarios, values, type Scenario } from './decide'

export default function Verdict() {
  const { toast } = useApp()
  const money = useMoney()
  const b = useLoad<Biz>('/business').data
  const [q] = useSearchParams()
  const s: Scenario = q.get('s') === 'lease' ? 'lease' : 'kitchen'
  const r = b?.enabled ? decide(s, b, values(s, q), money) : null
  const [saved, setSaved] = useState(false)

  const save = async () => {
    if (!r) return
    const due = new Date()
    due.setMonth(due.getMonth() + 2)
    try {
      await api('/business/plan', { body: { kind: 'decision', title: `${scenarios[s].title}: ${r.headline}`, note: r.planNote, amount: s === 'kitchen' ? 0 : r.planAmount, due_at: due.toISOString() } })
      setSaved(true)
      toast('Saved to your 12-month plan')
    } catch (e) { toast((e as Error).message) }
  }

  return (
    <Shell title="Verdict" sub={scenarios[s].question}>
      <Back to={'/business/decide?' + q} label="Decision Room" />
      {r ? (
        <div className="grid g-2">
          <div className="col g16">
            <div className="card col g10" style={{ borderColor: `var(--${r.tone})` }}>
              <div className="row g10"><Ic name={r.tone === 'red' ? 'x' : r.tone === 'amber' ? 'alert' : 'check'} tone={r.tone} /><span className="col g4"><span className="h3">{r.headline}</span><span className="xs mu">Confidence {r.confidence}%</span></span></div>
              <span className="s t2">{r.summary}</span>
            </div>
            <span className="h3">Do these first</span>
            {r.steps.map((t, i) => <div key={t} className="row g12"><span className="kit-num">{i + 1}</span><span className="s grow">{t}</span></div>)}
            <span className="h3">Risks</span>
            {r.risks.map((t) => <div key={t} className="row g10"><Icon name="alert" size={16} color="var(--amber)" /><span className="s grow">{t}</span></div>)}
          </div>
          <div className="col g16">
            <div className="card col g8 flat">
              {r.kpis.map((k) => <div key={k.label} className="row between"><span className="s t2">{k.label}</span><span className="s w6 num">{k.value}</span></div>)}
            </div>
            <Sandbox>NURU's verdict is a model built from your business account and the numbers you chose. It is not financial advice.</Sandbox>
            <div className="kit-actions">
              <button className="btn" disabled={saved} onClick={save}>{saved ? 'Saved' : 'Save to plan'}</button>
              {r.loan > 0 ? <Link className="btn pri" to={'/ask?q=' + encodeURIComponent(`Find me a business loan of ${money(r.loan)}`)}>Find a loan</Link>
                : <Link className="btn pri" to="/business/plan">Open plan</Link>}
            </div>
          </div>
        </div>
      ) : <Skeleton h={320} />}
    </Shell>
  )
}
