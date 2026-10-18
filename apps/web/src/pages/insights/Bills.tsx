import { Link } from 'react-router-dom'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Icon, Skeleton, Stat, catIcon, useLoad } from '../../ui'
import { SubNav, Tip, shortDate, type Recurring } from './parts'

type Out = { monthly: number; due7: number; due7_count: number; items: Recurring[]; tip: string }

function soon(next: string) {
  const days = Math.round((new Date(next).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return new Date(next).toLocaleDateString('en-NG', { weekday: 'short' })
  return shortDate(next)
}

const every = (d: number) => (d === 30 ? 'Monthly' : d === 7 ? 'Weekly' : `Usually every ${d} days`)

// p06-06 Bills and subscriptions
export default function Bills() {
  const { t } = useApp()
  const money = useMoney()
  const { data } = useLoad<Out>('/analytics/recurring')
  return (
    <Shell title="Bills and subscriptions" sub="Recurring debits we found in your transactions">
      <SubNav area="insights" />
      <div className="grid g-4">
        {data ? <>
          <Stat icon="refresh" label="Monthly recurring" value={money(data.monthly)} note={`${data.items.length} active`} />
          <Stat icon="calendar" label="Due in 7 days" value={money(data.due7)} note={`${data.due7_count} ${data.due7_count === 1 ? 'bill' : 'bills'}`} tone={data.due7_count ? 'amber' : undefined} />
        </> : [0, 1].map((i) => <Skeleton key={i} h={134} />)}
      </div>
      <div className="grid g-21">
        <div className="card col g12">
          <span className="h3">Coming up</span>
          {data?.items.length === 0 && <span className="s mu">No regular payments found in the last 6 months.</span>}
          {data ? data.items.map((b, i) => {
            const label = soon(b.next)
            return (
              <div key={b.merchant} className="row g12" style={{ padding: '6px 0', borderBottom: i < data.items.length - 1 ? '1px solid var(--border)' : undefined }}>
                <span className={'ic ' + (label === 'Today' || label === 'Tomorrow' ? 'amber' : 'blue')}><Icon name={catIcon(b.category)} size={18} /></span>
                <span className="col g4 grow"><span className="s w6">{b.merchant}</span><span className="xs mu">{every(b.every_days)} · {b.category} · paid {b.count} times</span></span>
                <span className="col g4" style={{ alignItems: 'flex-end' }}><span className="s w6 num">{money(b.amount)}</span><span className={'chip ' + (label === 'Today' || label === 'Tomorrow' ? 'amber' : '')}>{label}</span></span>
              </div>
            )
          }) : <Skeleton h={220} />}
        </div>
        <div className="col g12">
          {data?.tip && <Tip><b className="w6" style={{ color: 'var(--text)' }}>Subscriptions to review. </b>{data.tip}</Tip>}
          <Link to="/planner/calendar" className="soft row g8 s"><Icon name="calendar" size={14} color="var(--red)" />See them on your money calendar</Link>
          <Link to="/planner" className="soft row g8 s"><Icon name="bell" size={14} color="var(--red)" />{t('addReminder')}</Link>
        </div>
      </div>
    </Shell>
  )
}
