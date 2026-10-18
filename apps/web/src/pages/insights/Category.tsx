import { Link, useParams } from 'react-router-dom'
import { Shell } from '../../Shell'
import { useMoney } from '../../store'
import { Bars, Icon, Skeleton, catIcon, useLoad } from '../../ui'
import { TxTable } from '../Home'
import { Prog, SubNav, Tip, type CategoryDetail } from './parts'

// p06-04 Category detail
export default function Category() {
  const { name = '' } = useParams()
  const money = useMoney()
  const { data: d, error } = useLoad<CategoryDetail>('/analytics/category?name=' + encodeURIComponent(name))
  const change = d && d.prev ? Math.round(((d.total - d.prev) / d.prev) * 100) : 0
  const over = d && d.budget > 0 ? d.total - d.budget : 0

  return (
    <Shell title={name} sub="Category detail" right={<Link to="/insights" className="btn sm noprint"><Icon name="chevl" size={16} />Insights</Link>}>
      <SubNav area="insights" />
      {error && <div className="card err">{error}</div>}
      <div className="grid g-21">
        <div className="card col g12">
          {d ? <>
            <div className="row between start wrap g12">
              <div className="row g12">
                <span className="tile" style={{ width: 44, height: 44 }}><Icon name={catIcon(name)} size={20} /></span>
                <div className="col g4"><span className="xs mu">{d.month}</span><span className="big num">{money(d.total)}</span></div>
              </div>
              <div className="col g4" style={{ alignItems: 'flex-end' }}>
                {d.prev > 0 && <span className={'chip ' + (change > 0 ? 'red' : 'green')}><Icon name={change > 0 ? 'up' : 'down'} size={12} />{Math.abs(change)}% vs last month</span>}
                <span className="xs mu">{d.budget > 0 ? `Budget ${money(d.budget)}` : `Usual ${money(d.avg)} a month`}</span>
              </div>
            </div>
            {d.budget > 0 && <>
              <Prog pct={(d.total / d.budget) * 100} color={over > 0 ? 'var(--red)' : 'var(--green)'} />
              <span className={'xs w6 ' + (over > 0 ? 'red' : 'pos')}>{over > 0 ? `${money(over)} over budget with ${d.days_left} days left` : `${money(-over)} left with ${d.days_left} days to go`}</span>
            </>}
            {d.budget === 0 && <Link to="/insights/budgets" className="xs lnk">Set a budget for {name}</Link>}
          </> : <Skeleton h={130} />}
        </div>
        <div className="card col g12">
          <span className="h3">Last 6 months</span>
          {d ? <Bars height={170} labels={d.months.map((m) => m.label)} series={[{ name, values: d.months.map((m) => m.amount) }]} colors={['var(--c1)']} /> : <Skeleton h={170} />}
        </div>
      </div>

      <div className="grid g-2">
        <div className="card col g12">
          <span className="h3">Top places</span>
          {d?.merchants.length === 0 && <span className="s mu">No spending here yet this month.</span>}
          {d ? d.merchants.map((m, i) => (
            <div key={m.merchant} className="row g12">
              <span className={'ic ' + (i === 0 ? 'red' : i === 1 ? 'amber' : '')}><Icon name={catIcon(name)} size={18} /></span>
              <span className="col g4 grow"><span className="s w6">{m.merchant}</span><span className="xs mu">{m.count} {m.count === 1 ? 'visit' : 'visits'}</span></span>
              <span className="s w6 num">{money(m.amount)}</span>
            </div>
          )) : <Skeleton h={160} />}
        </div>
        <div className="col g12">
          {d?.tip && <Tip>{d.tip}</Tip>}
          <Link to={'/ask?q=' + encodeURIComponent(`How can I spend less on ${name}?`)} className="soft row g8 s"><Icon name="sparkles" size={14} color="var(--red)" />How can I spend less on {name}?</Link>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '18px 20px 8px' }}><span className="h3">Transactions</span></div>
        <TxTable rows={d?.transactions || null} />
      </div>
    </Shell>
  )
}
