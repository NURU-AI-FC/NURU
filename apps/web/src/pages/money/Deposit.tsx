import { useState } from 'react'
import { api } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Icon, Modal, Seg, Skeleton, useLoad } from '../../ui'
import { Back, Badge, Prog, Row, Sandbox, Tip, date, num } from './kit'

type Dep = {
  id: string; principal: number; rate_pct: number; days: number; started_at: string; matures_at: string; interest: number; interest_so_far: number
  wht: number; wht_so_far: number; receive: number; pct: number; break_cost: number; rollover: boolean; status: string; payout: number; closed_at: string | null
}
type Deps = { items: Dep[]; rates: Record<string, number>; wht_pct: number; break_pct: number }

export default function Deposit() {
  const { toast } = useApp()
  const money = useMoney()
  const { data, reload } = useLoad<Deps>('/deposits')
  const [amt, setAmt] = useState('500000')
  const [days, setDays] = useState('180')
  const [confirm, setConfirm] = useState<'' | 'create' | string>('')
  const [busy, setBusy] = useState(false)
  const active = data?.items.filter((d) => d.status === 'active') || []
  const closed = data?.items.filter((d) => d.status !== 'active') || []
  const p = num(amt), rate = data?.rates[days] || 0
  const interest = Math.round((p * rate * Number(days)) / 36500)
  const wht = Math.round(interest * 0.1)
  const end = new Date(Date.now() + Number(days) * 864e5)

  const act = async () => {
    setBusy(true)
    try {
      if (confirm === 'create') await api('/deposits', { body: { amount: p, days: Number(days) } })
      else await api(`/deposits/${confirm}/withdraw`, { method: 'POST' })
      toast(confirm === 'create' ? 'Deposit started' : 'Money is back in your Zenith account')
      setConfirm('')
      reload()
    } catch (e) { toast((e as Error).message) } finally { setBusy(false) }
  }
  const leaving = active.find((d) => d.id === confirm)

  return (
    <Shell title="Fixed deposit" sub="Lock money away for a better rate">
      <Back to="/money" label="Loans and savings" />
      <div className="grid g-2">
        <div className="col g16">
          {!data && <Skeleton h={300} />}
          {active.map((d) => (
            <div key={d.id} className="col g12">
              <div className="card col g12">
                <span className="xs mu">You will receive on {date(d.matures_at, true)}</span>
                <span className="big num">{money(d.receive)}</span>
                <div className="row g8 wrap"><Badge tone="green">+{money(d.interest - d.wht)} interest</Badge><Badge>{d.rate_pct}% a year</Badge></div>
                <Prog pct={d.pct} tone="green" />
                <div className="row between xs mu"><span>Started {date(d.started_at)}</span><span>{d.pct}% of term</span><span>{date(d.matures_at)}</span></div>
              </div>
              <div className="card col g10">
                <Row l="Principal" r={money(d.principal)} />
                <Row l="Interest so far" r={money(d.interest_so_far)} />
                <Row l={`Withholding tax (${data?.wht_pct}%)`} r={'-' + money(d.wht_so_far)} />
                <Row l="Rollover" r={d.rollover ? 'Auto, with interest' : 'Off'} />
              </div>
              {d.pct < 100 && <Tip icon="alert" tone="amber">Breaking it early costs {data?.break_pct}% of interest earned (about {money(d.break_cost)}).</Tip>}
              <div className="kit-actions">
                <button className="btn" onClick={() => setConfirm(d.id)}>Withdraw</button>
                <a className="btn pri" href="#new"><Icon name="plus" size={16} color="#fff" />Top up</a>
              </div>
            </div>
          ))}
          {data && !active.length && <div className="card flat t2">No active deposit. Start one with the calculator.</div>}
          {closed.length > 0 && (
            <div className="card col g8 flat">
              <span className="s w6">Closed</span>
              {closed.map((d) => <Row key={d.id} l={`${money(d.principal)} for ${d.days} days`} r={`${money(d.payout)} paid ${d.closed_at ? date(d.closed_at) : ''}`} />)}
            </div>
          )}
        </div>

        <div className="card col g16" id="new">
          <span className="h3">New deposit</span>
          <div className="field"><label htmlFor="fd-amt">Amount</label>
            <input id="fd-amt" className="input num w6" inputMode="numeric" value={p ? p.toLocaleString('en-NG') : ''} onChange={(e) => setAmt(e.target.value)} placeholder="₦0" />
          </div>
          <div className="field"><label>Term</label>
            <Seg value={days} onChange={setDays} options={[['30', '30 days'], ['90', '90 days'], ['180', '180 days'], ['365', '1 year']]} />
          </div>
          <div className="soft col g8">
            <Row l="Rate" r={`${rate}% a year`} />
            <Row l="Interest" r={money(interest)} />
            <Row l="Withholding tax (10%)" r={'-' + money(wht)} />
            <div className="div" />
            <Row strong l={`You get on ${date(end, true)}`} r={money(p + interest - wht)} />
          </div>
          <button className="btn pri" disabled={p < 10000} onClick={() => setConfirm('create')}>Start deposit</button>
          {p > 0 && p < 10000 && <span className="err">The smallest deposit is ₦10,000.</span>}
          <Sandbox>Sandbox deposit. Money moves from your Zenith account inside NURU only.</Sandbox>
        </div>
      </div>

      {confirm && (
        <Modal onClose={() => setConfirm('')}>
          <div className="col g16">
            <span className="h2">{confirm === 'create' ? 'Start this deposit?' : 'Withdraw early?'}</span>
            {confirm === 'create'
              ? <span className="t2 s">{money(p)} leaves your Zenith account today and comes back with {money(interest - wht)} interest on {date(end, true)}.</span>
              : leaving && <span className="t2 s">You get {money(leaving.principal + Math.round((leaving.interest_so_far - leaving.break_cost) * 0.9))} now instead of {money(leaving.receive)} on {date(leaving.matures_at)}.</span>}
            <div className="kit-actions"><button className="btn" onClick={() => setConfirm('')}>Cancel</button><button className="btn pri" disabled={busy} onClick={act}>{confirm === 'create' ? 'Start' : 'Withdraw'}</button></div>
          </div>
        </Modal>
      )}
    </Shell>
  )
}
