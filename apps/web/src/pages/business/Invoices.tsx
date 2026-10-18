import { useState } from 'react'
import { api } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Icon, Modal, Skeleton, useLoad } from '../../ui'
import { Back, Badge, Tip, daysFrom, date, num, type Tone } from '../money/kit'

type Invoice = { id: string; number: string; customer: string; amount: number; issued_at: string; due_at: string; paid_at: string | null }
type Invoices = { items: Invoice[]; owed: number; owed_count: number; overdue: number; overdue_count: number }

const status = (i: Invoice): [string, Tone] => {
  if (i.paid_at) return ['Paid', 'green']
  const d = daysFrom(i.due_at)
  return d < 0 ? [`${-d} day${d === -1 ? '' : 's'} late`, 'red'] : [d === 0 ? 'Due today' : 'Due ' + date(i.due_at), 'amber']
}

export default function Invoices() {
  const { toast } = useApp()
  const money = useMoney()
  const { data: d, reload } = useLoad<Invoices>('/business/invoices')
  const [mark, setMark] = useState<Invoice | null>(null)
  const [add, setAdd] = useState(false)
  const [f, setF] = useState({ customer: '', amount: '', due: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10) })
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true)
    try { await fn(); toast(msg); setMark(null); setAdd(false); setF({ ...f, customer: '', amount: '' }); reload() } catch (e) { toast((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Shell title="Invoices" sub="Money customers owe you" right={<button className="ib" onClick={() => setAdd(true)} aria-label="New invoice"><Icon name="plus" /></button>}>
      <Back to="/business" label="Business" />
      <div className="grid g-2">
        {d ? <>
          <div className="card col g4"><span className="xs mu">Owed to you</span><span className="big num">{money(d.owed)}</span><span className="xs t2 w6">{d.owed_count} invoices</span></div>
          <div className="card col g4"><span className="xs mu">Overdue</span><span className="big num">{money(d.overdue)}</span><span className="xs red w6">{d.overdue_count} invoices</span></div>
        </> : <><Skeleton h={110} /><Skeleton h={110} /></>}
      </div>
      <div className="grid g-21">
        <div className="card col kit-list" style={{ paddingTop: 8, paddingBottom: 8 }}>
          {d ? d.items.map((i) => {
            const [t, tone] = status(i)
            return (
              <div key={i.id} className="row g12">
                <span className="col g4 grow"><span className="s w6">{i.customer}</span><span className="xs mu">{i.number} · sent {date(i.issued_at)}</span></span>
                <span className="col g6" style={{ alignItems: 'flex-end' }}>
                  <span className="s w6 num">{money(i.amount)}</span>
                  <span className="row g8">{!i.paid_at && <button className="btn sm ghost" style={{ height: 26, padding: '0 8px' }} onClick={() => setMark(i)}>Mark paid</button>}<Badge tone={tone}>{t}</Badge></span>
                </span>
              </div>
            )
          }) : <Skeleton h={240} />}
          {d && !d.items.length && <span className="t2 s">No invoices yet.</span>}
        </div>
        <div className="col g12">
          {d && d.overdue_count > 0 && (
            <Tip action={<button className="btn sm ghost red" disabled={sent} onClick={() => { setSent(true); toast(`Reminders sent to ${d.overdue_count} customers (sandbox)`) }}>{sent ? 'Sent' : 'Send'}</button>}>
              Send polite reminders to {d.overdue_count} late customer{d.overdue_count === 1 ? '' : 's'} by WhatsApp and email?
            </Tip>
          )}
          <button className="btn pri" onClick={() => setAdd(true)}><Icon name="plus" size={16} color="#fff" />New invoice</button>
        </div>
      </div>

      {mark && (
        <Modal onClose={() => setMark(null)}>
          <div className="col g16">
            <span className="h2">Mark {mark.number} paid?</span>
            <span className="s t2">{money(mark.amount)} from {mark.customer} is recorded as Sales in your business account.</span>
            <div className="kit-actions"><button className="btn" onClick={() => setMark(null)}>Cancel</button><button className="btn pri" disabled={busy} onClick={() => run(() => api(`/business/invoices/${mark.id}`, { method: 'PATCH', body: {} }), `${mark.number} marked paid`)}>Mark paid</button></div>
          </div>
        </Modal>
      )}
      {add && (
        <Modal onClose={() => setAdd(false)}>
          <div className="col g16">
            <span className="h2">New invoice</span>
            <div className="field"><label htmlFor="ic">Customer</label><input id="ic" className="input" maxLength={80} value={f.customer} onChange={(e) => setF({ ...f, customer: e.target.value })} placeholder="Yaba Coworking" /></div>
            <div className="grid g-2" style={{ gap: 12 }}>
              <div className="field"><label htmlFor="ia">Amount</label><input id="ia" className="input num" inputMode="numeric" value={num(f.amount) ? num(f.amount).toLocaleString('en-NG') : ''} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="₦0" /></div>
              <div className="field"><label htmlFor="idue">Due</label><input id="idue" className="input" type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></div>
            </div>
            <div className="kit-actions"><button className="btn" onClick={() => setAdd(false)}>Cancel</button>
              <button className="btn pri" disabled={busy || !f.customer.trim() || !num(f.amount) || !f.due} onClick={() => run(() => api('/business/invoices', { body: { customer: f.customer, amount: num(f.amount), due_at: new Date(f.due + 'T17:00').toISOString() } }), 'Invoice created')}>Create</button>
            </div>
          </div>
        </Modal>
      )}
    </Shell>
  )
}
