import { useState } from 'react'
import { api } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Icon, Modal, Seg, Skeleton, useLoad } from '../../ui'
import { Back, Badge, Ic, daysFrom, date, num } from '../money/kit'

type Vendor = { id: string; name: string; note: string; amount: number; due_at: string; paid_at: string | null }

const dueLabel = (v: Vendor) => {
  if (v.paid_at) return 'Paid ' + date(v.paid_at)
  const d = daysFrom(v.due_at)
  if (d < 0) return `${-d} days late`
  if (d === 0) return 'Due today'
  if (d < 7) return 'Due ' + new Date(v.due_at).toLocaleDateString('en-NG', { weekday: 'short' })
  return 'Due ' + date(v.due_at)
}

export default function Vendors() {
  const { toast } = useApp()
  const money = useMoney()
  const { data: list, reload } = useLoad<Vendor[]>('/business/vendors')
  const [filter, setFilter] = useState<'all' | 'due' | 'paid'>('all')
  const [pay, setPay] = useState<Vendor | null>(null)
  const [add, setAdd] = useState(false)
  const [f, setF] = useState({ name: '', note: '', amount: '', due: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10) })
  const [busy, setBusy] = useState(false)
  const shown = list?.filter((v) => filter === 'all' || (filter === 'paid') === !!v.paid_at) || []
  const due = list?.filter((v) => !v.paid_at).reduce((s, v) => s + v.amount, 0) || 0

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true)
    try { await fn(); toast(msg); setPay(null); setAdd(false); reload() } catch (e) { toast((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Shell title="Vendors" sub={list ? `${money(due)} to pay suppliers` : undefined} right={<button className="ib" onClick={() => setAdd(true)} aria-label="Add vendor bill"><Icon name="plus" /></button>}>
      <Back to="/business" label="Business" />
      <div className="row between wrap g12">
        <Seg value={filter} onChange={setFilter} options={[['all', 'All'], ['due', 'Due soon'], ['paid', 'Paid']]} />
        <button className="btn sm" onClick={() => setAdd(true)}><Icon name="plus" size={16} />Add bill</button>
      </div>
      <div className="grid g-2">
        {list ? shown.map((v) => (
          <div key={v.id} className="card row g12 flat" style={{ padding: 16 }}>
            <Ic name="package" />
            <span className="col g4 grow"><span className="s w6">{v.name}</span><span className="xs mu">{v.note}</span></span>
            <span className="col g6" style={{ alignItems: 'flex-end' }}>
              <span className="s w6 num">{money(v.amount)}</span>
              <Badge tone={v.paid_at ? 'green' : daysFrom(v.due_at) < 0 ? 'red' : 'amber'}>{dueLabel(v)}</Badge>
              {!v.paid_at && <button className="btn pri sm" onClick={() => setPay(v)}>Pay</button>}
            </span>
          </div>
        )) : <Skeleton h={200} />}
        {list && !shown.length && <div className="card flat t2">Nothing here.</div>}
      </div>

      {pay && (
        <Modal onClose={() => setPay(null)}>
          <div className="col g16">
            <span className="h2">Pay {pay.name}?</span>
            <span className="s t2">{money(pay.amount)} leaves your business account and is recorded as Supplies.</span>
            <div className="kit-actions"><button className="btn" onClick={() => setPay(null)}>Cancel</button><button className="btn pri" disabled={busy} onClick={() => run(() => api(`/business/vendors/${pay.id}/pay`, { method: 'POST' }), `Paid ${pay.name}`)}>Pay {money(pay.amount)}</button></div>
          </div>
        </Modal>
      )}
      {add && (
        <Modal onClose={() => setAdd(false)}>
          <div className="col g16">
            <span className="h2">Add a vendor bill</span>
            <div className="field"><label htmlFor="vn">Vendor</label><input id="vn" className="input" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Gas Plus Ikota" /></div>
            <div className="field"><label htmlFor="vd">What for</label><input id="vd" className="input" maxLength={120} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Cooking gas" /></div>
            <div className="grid g-2" style={{ gap: 12 }}>
              <div className="field"><label htmlFor="va">Amount</label><input id="va" className="input num" inputMode="numeric" value={num(f.amount) ? num(f.amount).toLocaleString('en-NG') : ''} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="₦0" /></div>
              <div className="field"><label htmlFor="vdue">Due</label><input id="vdue" className="input" type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></div>
            </div>
            <div className="kit-actions"><button className="btn" onClick={() => setAdd(false)}>Cancel</button>
              <button className="btn pri" disabled={busy || !f.name.trim() || !num(f.amount) || !f.due} onClick={() => run(() => api('/business/vendors', { body: { name: f.name, note: f.note, amount: num(f.amount), due_at: new Date(f.due + 'T09:00').toISOString() } }), 'Bill added')}>Add</button>
            </div>
          </div>
        </Modal>
      )}
    </Shell>
  )
}
