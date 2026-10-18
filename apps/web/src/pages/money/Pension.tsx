import { Link } from 'react-router-dom'
import { Shell } from '../../Shell'
import { useMoney } from '../../store'
import { Bars, Icon, Skeleton, useLoad } from '../../ui'
import { Back, Badge, Tile, Tip, ask } from './kit'

type Pension = {
  enabled: boolean; provider: string; name: string; balance: number; pin: string; fund: string
  contributions: { month: string; employer: number; employee: number }[]; employer: number; employee: number
  missed: { month: string; amount: number }[] | null; age: number; retire_age: number; real_return_pct: number
  at_retirement: number; voluntary: number; voluntary_adds: number
}

export default function Pension() {
  const money = useMoney()
  const p = useLoad<Pension>('/pension').data

  if (p && !p.enabled) return <Shell title="Pension"><Back to="/money" label="Loans and savings" /><div className="card flat t2">No retirement savings account is linked yet.</div></Shell>
  const miss = p?.missed?.[0]

  return (
    <Shell title="Pension" sub="Your retirement savings account">
      <Back to="/money" label="Loans and savings" />
      <div className="grid g-21">
        <div className="card col g12">
          {p ? <>
            <div className="row between wrap g8">
              <div className="col g4"><span className="xs mu">Retirement savings account</span><span className="big num">{money(p.balance)}</span></div>
              <Badge tone="blue">{p.provider}</Badge>
            </div>
            <span className="xs t2">PIN {p.pin} · {p.fund}</span>
            <Bars labels={p.contributions.map((c) => c.month)} series={[{ name: 'Employer', values: p.contributions.map((c) => c.employer) }, { name: 'You', values: p.contributions.map((c) => c.employee) }]} colors={['var(--blue)', 'var(--c4)']} height={180} />
          </> : <Skeleton h={280} />}
        </div>
        <div className="col g16">
          {miss && (
            <Tip icon="alert" tone="amber" action={<Link className="s w6 red" to={ask(`Draft a polite letter to HR about my missing ${miss.month} pension contribution of ${money(miss.amount)}`)}>Draft letter</Link>}>
              Your employer skipped {miss.month}'s contribution ({money(miss.amount)}). NURU can draft a letter to HR.
            </Tip>
          )}
          <div className="grid g-2" style={{ gap: 12 }}>
            {p ? <>
              <Tile icon="briefcase" tone="gray" label="Employer 10%" value={money(p.employer)} note="monthly" />
              <Tile icon="user" tone="gray" label="You 8%" value={money(p.employee)} note="monthly" />
            </> : <><Skeleton h={130} /><Skeleton h={130} /></>}
          </div>
          {p && (
            <div className="card col g8">
              <span className="s w6">At {p.retire_age} you could have</span>
              <span className="h2 num">{money(p.at_retirement)}</span>
              <span className="xs t2">In today's money, if contributions continue and returns average {p.real_return_pct}% a year above inflation. We assumed you are {p.age}. Adding {money(p.voluntary)} voluntary monthly adds {money(p.voluntary_adds)}.</span>
              <Link className="btn sm" style={{ alignSelf: 'flex-start' }} to={ask('Should I make voluntary pension contributions?')}><Icon name="sparkles" size={16} />Ask NURU</Link>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
