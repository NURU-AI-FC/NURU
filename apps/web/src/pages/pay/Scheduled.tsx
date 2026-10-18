import { useState, type FormEvent } from 'react'
import { api } from '../../api'
import { useApp, useMoney } from '../../store'
import { Icon, Modal, Skeleton, useLoad } from '../../ui'
import { remIcon, type Rem } from './Hub'
import { Sub } from './common'

const KINDS: [string, string][] = [['transfer', 'Transfer'], ['bill', 'Bill'], ['loan', 'Loan repayment'], ['goal', 'Savings']]
const TONE: Record<string, string> = { transfer: 'var(--red)', bill: 'var(--blue)', loan: 'var(--amber)', goal: 'var(--green)' }

export default function Scheduled() {
  const money = useMoney()
  const { toast } = useApp()
  const loaded = useLoad<Rem[]>('/reminders').data
  const [rows, setRows] = useState<Rem[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ title: '', kind: 'transfer', amount: '', due: '' })
  const [err, setErr] = useState('')
  const list = (rows || loaded)?.filter((r) => r.amount > 0)
  const soon = list?.filter((r) => !r.done && new Date(r.due_at).getTime() < Date.now() + 30 * 864e5) || []
  const total = soon.reduce((s, r) => s + r.amount, 0)

  async function toggle(r: Rem) {
    try { setRows(await api<Rem[]>('/reminders/' + r.id, { method: 'PATCH' })); toast(r.done ? 'Payment resumed' : 'Payment paused') } catch (e) { toast((e as Error).message) }
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    setErr('')
    if (!(Number(f.amount) > 0)) { setErr('Add an amount'); return }
    try {
      setRows(await api<Rem[]>('/reminders', { body: { title: f.title, kind: f.kind, amount: Number(f.amount), due_at: new Date(f.due + 'T09:00:00').toISOString() } }))
      setAdding(false)
      setF({ title: '', kind: 'transfer', amount: '', due: '' })
      toast('Scheduled')
    } catch (e) { setErr((e as Error).message) }
  }

  return (
    <Sub title="Scheduled" sub="Payments NURU reminds you about" right={<button className="ib" onClick={() => setAdding(true)} aria-label="Schedule a payment"><Icon name="plus" /></button>}>
      <div className="soft row between">
        <div className="col g4"><span className="xs mu">Going out in the next 30 days</span><span className="h3 num">{money(total)}</span></div>
        <span className="chip amber">{soon.length} {soon.length === 1 ? 'payment' : 'payments'}</span>
      </div>
      {list ? list.length ? list.map((r) => (
        <div key={r.id} className="card row g12" style={{ padding: 14, opacity: r.done ? 0.6 : 1 }}>
          <span className="tile" style={{ width: 40, height: 40, borderRadius: 12, color: TONE[r.kind] || 'var(--text2)' }}><Icon name={remIcon[r.kind] || 'calendar'} size={18} /></span>
          <span className="col grow g4"><span className="s w6">{r.title}</span><span className="xs mu">{r.done ? 'Paused' : 'Next ' + new Date(r.due_at).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}</span></span>
          <span className="col g6" style={{ alignItems: 'flex-end' }}>
            <span className="s w6 num">{money(r.amount)}</span>
            <button className={'paytgl' + (!r.done ? ' on' : '')} onClick={() => toggle(r)} aria-pressed={!r.done} aria-label={r.done ? 'Resume' : 'Pause'}><i /></button>
          </span>
        </div>
      )) : <div className="card s t2">Nothing scheduled yet. Use the plus button to add rent, upkeep or a bill.</div> : <Skeleton h={240} />}
      <span className="xs mu row g6"><Icon name="info" size={12} />In the sandbox NURU reminds you on the day; you confirm each payment with your face and PIN.</span>

      {adding && (
        <Modal onClose={() => setAdding(false)}>
          <form className="col g12" onSubmit={add}>
            <span className="h3">Schedule a payment</span>
            <div className="field"><label htmlFor="st">What is it for</label><input id="st" className="input" required maxLength={60} placeholder="Rent to Mr Okafor" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
            <div className="field"><label htmlFor="sk">Type</label><select id="sk" className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div className="grid g-2" style={{ gap: 12 }}>
              <div className="field"><label htmlFor="sa">Amount (₦)</label><input id="sa" className="input num" inputMode="decimal" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/[^\d.]/g, '') })} /></div>
              <div className="field"><label htmlFor="sd">Date</label><input id="sd" className="input" type="date" required value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></div>
            </div>
            {err && <span className="err" role="alert">{err}</span>}
            <button className="btn pri">Schedule</button>
          </form>
        </Modal>
      )}
    </Sub>
  )
}
