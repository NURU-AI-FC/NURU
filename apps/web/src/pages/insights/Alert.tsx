import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Bars, Icon, Skeleton, catIcon, useLoad } from '../../ui'
import { SubNav, type MonthAmount } from './parts'

type Out = { found: boolean; id: string; merchant: string; category: string; account: string; amount: number; usual: number; times: number; at: string; months: MonthAmount[] }

// p06-12 Unusual spend alert
export default function Alert() {
  const { toast } = useApp()
  const money = useMoney()
  const [q] = useSearchParams()
  const { data: d } = useLoad<Out>('/analytics/unusual' + (q.get('id') ? '?id=' + encodeURIComponent(q.get('id')!) : ''))
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)

  async function answer(a: 'me' | 'freeze') {
    if (!d) return
    setBusy(true)
    try {
      const r = await api<{ message: string }>('/analytics/unusual/' + d.id, { body: { answer: a } })
      setDone(r.message)
      toast(a === 'me' ? 'Marked as yours' : 'Card frozen')
    } catch (e) { toast((e as Error).message) } finally { setBusy(false) }
  }

  const at = d?.at ? new Date(d.at) : null
  return (
    <Shell title="Unusual spend" sub="We check every payment against your usual">
      <SubNav area="insights" />
      {!d ? <Skeleton h={320} /> : !d.found || done ? (
        <div className="card col center g12" style={{ padding: 40, maxWidth: 560, alignSelf: 'center', width: '100%' }}>
          <span className="ic green" style={{ width: 64, height: 64, borderRadius: 20 }}><Icon name="shieldcheck" size={30} /></span>
          <span className="h2" style={{ textAlign: 'center' }}>{done ? 'Thanks for checking' : 'Nothing unusual'}</span>
          <span className="s t2" style={{ textAlign: 'center' }}>{done || 'Every payment in the last 30 days looks like your normal spending.'}</span>
          <Link to="/insights" className="btn sm">Back to insights</Link>
        </div>
      ) : (
        <div className="col g20" style={{ maxWidth: 640, width: '100%', alignSelf: 'center' }}>
          <div className="col center g8">
            <span className="ic red" style={{ width: 64, height: 64, borderRadius: 20 }}><Icon name="alert" size={30} /></span>
            <span className="h2">Was this you?</span>
            <span className="s t2" style={{ textAlign: 'center' }}>This payment is {d.times}× bigger than your usual {d.category.toLowerCase()} spend.</span>
          </div>
          <div className="card col g12">
            <div className="row g12">
              <span className="tile" style={{ width: 44, height: 44 }}><Icon name={catIcon(d.category)} size={20} /></span>
              <span className="col g4 grow"><span className="s w6">{d.merchant}</span><span className="xs mu">{d.category} · {at?.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })} {at?.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })} · {d.account}</span></span>
            </div>
            <div className="div" />
            <div className="row between"><span className="s t2">Amount</span><span className="h3 num">{money(d.amount)}</span></div>
            <div className="row between"><span className="s t2">Your usual</span><span className="s w6 num">{money(d.usual)}</span></div>
          </div>
          <div className="card col g8">
            <span className="xs mu">{d.category} spend · last 6 months</span>
            <Bars height={150} labels={d.months.map((m) => m.label)} series={[{ name: d.category, values: d.months.map((m) => m.amount) }]} colors={['var(--c1)']} />
          </div>
          <div className="grid g-2" style={{ gap: 12 }}>
            <button className="btn pri" disabled={busy} onClick={() => answer('me')}>Yes, it was me</button>
            <button className="btn" disabled={busy} style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => answer('freeze')}>No, freeze my card</button>
          </div>
        </div>
      )}
    </Shell>
  )
}
