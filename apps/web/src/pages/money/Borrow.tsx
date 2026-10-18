import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../../Shell'
import { useMoney } from '../../store'
import { Icon, Seg, Skeleton, useLoad } from '../../ui'
import { Back, Badge, Row, Sandbox, Tip, ask, num } from './kit'

type Elig = { income: number; salary_months: number; existing_monthly: number; limit: number; rate_monthly: number; terms: number[]; healthy_pct: number }

export const payment = (p: number, ratePct: number, n: number) => {
  const r = ratePct / 100
  return r ? (p * r) / (1 - Math.pow(1 + r, -n)) : p / n
}

export default function Borrow() {
  const money = useMoney()
  const e = useLoad<Elig>('/loans/eligibility').data
  const [amt, setAmt] = useState('300000')
  const [term, setTerm] = useState('6')
  const p = num(amt), n = Number(term)
  const pay = e ? Math.round(payment(p, e.rate_monthly, n)) : 0
  const share = e?.income ? Math.round(((e.existing_monthly + pay) / e.income) * 100) : 0
  const over = !!e && p > e.limit

  return (
    <Shell title="Borrow" sub="How much you could borrow, from your own numbers">
      <Back to="/money" label="Loans and savings" />
      <div className="col g16 kit-narrow">
        {e ? (
          <div className="card col center g8" style={{ textAlign: 'center' }}>
            <span className="xs mu">You can borrow up to</span>
            <span className="h1 num">{money(e.limit)}</span>
            <Badge tone="green"><Icon name="check" size={12} />Based on {e.salary_months} months of salary, about {money(e.income)} a month</Badge>
          </div>
        ) : <Skeleton h={140} />}
        <div className="field">
          <label htmlFor="amt">How much do you need?</label>
          <input id="amt" className="input num w6" inputMode="numeric" value={p ? p.toLocaleString('en-NG') : ''} onChange={(ev) => setAmt(ev.target.value)} placeholder="₦0" />
          {over && <span className="err">That is more than the {money(e!.limit)} your income supports.</span>}
        </div>
        <div className="field">
          <label>Pay back over</label>
          <Seg value={term} onChange={setTerm} options={(e?.terms || [3, 6, 12]).map((t) => [String(t), `${t} months`])} />
        </div>
        {e && p > 0 && (
          <div className="card col g10">
            <Row l="Monthly payment" r={money(pay)} />
            <Row l="Interest rate" r={`${e.rate_monthly}% monthly`} />
            <Row l="Total you repay" r={money(pay * n)} />
            <Row l="Money arrives" r="In 5 minutes" />
          </div>
        )}
        {e && p > 0 && (
          <Tip icon={share > e.healthy_pct ? 'alert' : 'info'} tone={share > e.healthy_pct ? 'amber' : 'gray'}>
            This would take your total monthly loan payments to {share}% of income{e.existing_monthly ? `, including ${money(e.existing_monthly)} you already repay` : ''}. Under {e.healthy_pct}% is healthy.
          </Tip>
        )}
        <Sandbox>This is a sandbox estimate from your transactions. No loan is created and nothing is checked with a credit bureau.</Sandbox>
        <Link className="btn pri block" to={ask(`Can I afford a ${money(p)} loan over ${n} months?`)}>
          <Icon name="sparkles" size={16} color="#fff" />Continue with NURU
        </Link>
      </div>
    </Shell>
  )
}
