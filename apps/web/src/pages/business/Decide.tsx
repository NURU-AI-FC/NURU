import { Link, useSearchParams } from 'react-router-dom'
import { Shell } from '../../Shell'
import { useMoney } from '../../store'
import { Icon, Seg, Skeleton, useLoad } from '../../ui'
import { Back } from '../money/kit'
import type { Biz } from './data'
import { decide, scenarios, values, type Knob, type Scenario } from './decide'

export default function Decide() {
  const money = useMoney()
  const b = useLoad<Biz>('/business').data
  const [q, setQ] = useSearchParams()
  const s: Scenario = q.get('s') === 'lease' ? 'lease' : 'kitchen'
  const sc = scenarios[s]
  const v = values(s, q)
  const r = b?.enabled ? decide(s, b, v, money) : null
  const show = (k: Knob, n: number) => k.fmt === 'money' ? money(n) : k.fmt === 'pct' ? `${n}% a year` : k.fmt === 'months' ? `${n} months` : String(n)
  const set = (key: string, n: number) => { const next = new URLSearchParams(q); next.set('s', s); next.set(key, String(n)); setQ(next, { replace: true }) }
  const params = new URLSearchParams({ s, ...Object.fromEntries(Object.entries(v).map(([k, n]) => [k, String(n)])) })

  return (
    <Shell title="Decision Room" sub="Compare two options with your own numbers">
      <Back to="/business" label="Business" />
      <Seg value={s} onChange={(x) => setQ({ s: x }, { replace: true })} options={[['kitchen', scenarios.kitchen.title], ['lease', scenarios.lease.title]]} />
      <div className="grid g-2">
        <div className="col g16">
          <div className="soft col g6"><span className="xs mu">You asked</span><span className="s w6">{sc.question}</span></div>
          <span className="s w6 t2">Change the numbers</span>
          {sc.knobs.map((k) => (
            <div key={k.key} className="col g8">
              <div className="row between"><label className="s t2" htmlFor={'k-' + k.key}>{k.label}</label><span className="s w6 num">{show(k, v[k.key])}</span></div>
              <input id={'k-' + k.key} className="kit-range" type="range" min={k.min} max={k.max} step={k.step} value={v[k.key]} onChange={(e) => set(k.key, Number(e.target.value))} />
            </div>
          ))}
          {b && <span className="xs mu">Using your business: {money(b.cash)} cash, {money(b.payroll)} monthly payroll and last month's profit.</span>}
        </div>
        <div className="col g16">
          {r ? <>
            <div className="grid g-2" style={{ gap: 12 }}>
              {r.kpis.map((k) => <div key={k.label} className="card col g4"><span className="xs mu">{k.label}</span><span className="h2 num">{k.value}</span><span className="xs pos w6">{k.note}</span></div>)}
            </div>
            <div className="grid g-2" style={{ gap: 12 }}>
              {([[sc.a, r.a], [sc.b, r.b]] as const).map(([name, rows]) => (
                <div key={name} className="card col g8 flat">
                  <span className="s w6">{name}</span>
                  {rows.map((x) => <div key={x.label} className="col"><span className="xs mu">{x.label}</span><span className="s w6 num">{x.value}</span></div>)}
                </div>
              ))}
            </div>
          </> : b && !b.enabled ? <div className="card flat t2">Set up your business first so NURU can use your numbers.</div> : <Skeleton h={260} />}
          <Link className="btn pri block" to={'/business/decide/result?' + params}><Icon name="sparkles" size={16} color="#fff" />See NURU's verdict</Link>
        </div>
      </div>
    </Shell>
  )
}
