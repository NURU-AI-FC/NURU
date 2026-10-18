import { Link } from 'react-router-dom'
import { Shell } from '../../Shell'
import { useMoney } from '../../store'
import { Icon, Skeleton, catIcon, useLoad } from '../../ui'
import { Prog, Ring, SubNav, Tip, tone, type Budgets } from '../insights/parts'

// p11-06 Budget
export default function Budget() {
  const money = useMoney()
  const { data: b } = useLoad<Budgets>('/budgets')
  const pct = b && b.limit ? Math.round((b.spent / b.limit) * 100) : 0
  const left = b ? b.limit - b.spent : 0
  const over = b?.items.filter((x) => x.spent > x.limit).sort((a, c) => c.spent - c.limit - (a.spent - a.limit))[0]

  return (
    <Shell title={b ? `${b.month} budget` : 'Budget'} sub="How this month is going" right={<Link to="/insights/budgets" className="ib" aria-label="Edit budgets"><Icon name="edit" /></Link>}>
      <SubNav area="planner" />
      <div className="grid g-21">
        <div className="col g16">
          {b ? (
            <div className="card row g20 wrap">
              <Ring pct={pct} size={96} stroke={10} color={tone(pct)} />
              <div className="col g4 grow">
                <span className="xs mu">Spent of {money(b.limit)}</span>
                <span className="big num">{money(b.spent)}</span>
                <span className={'xs w6 ' + (left >= 0 ? 'pos' : 'red')}>{left >= 0 ? `${money(left)} left` : `${money(-left)} over`} · {b.days_left} days to go</span>
              </div>
            </div>
          ) : <Skeleton h={136} />}
          <div className="card col g16">
            {b?.items.length === 0 && <span className="s mu">No budgets yet. <Link to="/insights/budgets" className="lnk">Create one</Link> or <Link to="/planner/plan" className="lnk">use a monthly plan</Link>.</span>}
            {b ? b.items.map((x, i) => (
              <div key={x.id} className="col g8">
                <div className="row g10">
                  <Icon name={catIcon(x.category)} size={18} color="var(--text2)" />
                  <Link to={'/insights/category/' + encodeURIComponent(x.category)} className="s w6 grow">{x.category}</Link>
                  <span className={'xs num ' + (x.spent > x.limit ? 'red w6' : 't2')}>{money(x.spent)} / {money(x.limit)}</span>
                </div>
                <Prog pct={x.pct} h={6} color={x.spent > x.limit ? 'var(--red)' : ['var(--blue)', 'var(--amber)', 'var(--green)', 'var(--c7)', 'var(--c6)'][i % 5]} />
              </div>
            )) : <Skeleton h={240} />}
          </div>
        </div>
        <div className="col g12">
          {over && <Tip icon="bulb" color="var(--amber)">{over.category} is {money(over.spent - over.limit)} over. Spending a little less there for the next {b?.days_left} days would bring it back.</Tip>}
          {b && !over && b.items.length > 0 && <Tip icon="check" color="var(--green)">Every category is within its limit so far. Keep it up.</Tip>}
          <Link to="/planner/plan" className="soft row g8 s"><Icon name="sparkles" size={14} color="var(--red)" />Let NURU suggest next month's budget</Link>
          <Link to="/insights/budgets" className="soft row g8 s"><Icon name="edit" size={14} color="var(--red)" />Add or change budgets</Link>
        </div>
      </div>
    </Shell>
  )
}
