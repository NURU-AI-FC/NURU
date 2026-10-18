import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Donut, Legend, Seg, Skeleton, useLoad } from '../../ui'
import { Prog, SubNav, type MonthAmount, type Merchant } from './parts'

type Out = { merchants: Merchant[]; categories: Merchant[]; channels: MonthAmount[] }
type Period = 'week' | 'month' | 'year'

// p06-07 Top merchants and products
export default function Merchants() {
  const { t } = useApp()
  const money = useMoney()
  const [view, setView] = useState<'m' | 'p' | 'c'>('m')
  const [period, setPeriod] = useState<Period>('month')
  const { data } = useLoad<Out>('/analytics/merchants?period=' + period)
  const rows = view === 'm' ? data?.merchants : data?.categories
  const max = Math.max(1, ...(rows?.map((r) => r.amount) || [1]))
  const ch = data?.channels.filter((c) => c.amount > 0).map((c) => ({ name: c.label, value: c.amount })) || []
  const chTotal = ch.reduce((a, b) => a + b.value, 0)

  return (
    <Shell title={t('whereSpend')} sub="Merchants, categories and how you pay" right={<Seg value={period} onChange={setPeriod} options={[['week', t('weekly')], ['month', t('monthly')], ['year', t('yearly')]]} />}>
      <SubNav area="insights" />
      <div><Seg value={view} onChange={setView} options={[['m', 'Merchants'], ['p', 'Products'], ['c', 'Channels']]} /></div>
      {view === 'c' ? (
        <div className="card col g16">
          <div className="col g4"><span className="h3">Card and POS, transfer and online</span><span className="xs mu">Share of what you spent</span></div>
          {data ? <div className="row g24 wrap"><Donut data={ch} height={170} center={money(chTotal, { compact: true })} sub="spent" /><Legend items={ch} total={chTotal} /></div> : <Skeleton h={170} />}
        </div>
      ) : (
        <div className="card col g12">
          {rows?.length === 0 && <span className="s mu">Nothing spent in this period yet.</span>}
          {rows ? rows.map((r, i) => {
            const body = (
              <div className="row g12" style={{ padding: '4px 0' }}>
                <span className="s w7 mu" style={{ width: 18 }}>{i + 1}</span>
                <span className="col g6 grow">
                  <span className="row between g8"><span className="s w6">{r.merchant}</span><span className="s w6 num">{money(r.amount)}</span></span>
                  <span className="row g8"><span className="grow"><Prog pct={(r.amount / max) * 100} h={6} color={i === 0 ? 'var(--red)' : 'var(--c2)'} /></span><span className="xs mu" style={{ minWidth: 90, textAlign: 'right' }}>{view === 'm' ? r.category : `${r.count} payments`}</span></span>
                </span>
              </div>
            )
            return view === 'p' ? <Link key={r.merchant} to={'/insights/category/' + encodeURIComponent(r.merchant)}>{body}</Link> : <div key={r.merchant}>{body}</div>
          }) : <Skeleton h={300} />}
        </div>
      )}
    </Shell>
  )
}
