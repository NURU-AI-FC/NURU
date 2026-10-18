import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { Shell } from '../Shell'
import { useApp, useMoney } from '../store'
import { Icon, Skeleton, useLoad } from '../ui'
import { SubNav } from './insights/parts'

type Rem = { id: string; title: string; kind: string; amount: number; due_at: string; done: boolean }
const kinds: [string, string][] = [['bill', 'Bill'], ['loan', 'Loan repayment'], ['salary', 'Salaries'], ['meeting', 'Meeting'], ['tax', 'Tax'], ['goal', 'Savings goal']]
const kindIcon: Record<string, string> = { bill: 'file', loan: 'landmark', salary: 'users', meeting: 'calendar', tax: 'receipt', goal: 'target' }

export default function Planner() {
  const { t, toast } = useApp()
  const money = useMoney()
  const { data, reload } = useLoad<Rem[]>('/reminders')
  const [rows, setRows] = useState<Rem[] | null>(null)
  const [f, setF] = useState({ title: '', kind: 'bill', amount: '', due: '' })
  const list = rows || data

  async function add(e: FormEvent) {
    e.preventDefault()
    try {
      setRows(await api<Rem[]>('/reminders', { body: { title: f.title, kind: f.kind, amount: Number(f.amount || 0), due_at: new Date(f.due + 'T09:00:00').toISOString() } }))
      setF({ title: '', kind: 'bill', amount: '', due: '' })
      toast('Reminder added')
    } catch (err) { toast((err as Error).message) }
  }
  async function toggle(id: string) {
    setRows(await api<Rem[]>('/reminders/' + id, { method: 'PATCH', body: {} }))
  }

  const open = list?.filter((r) => !r.done) || []
  const in30 = open.filter((r) => new Date(r.due_at).getTime() - Date.now() < 30 * 864e5)
  const due30 = in30.reduce((s, r) => s + r.amount, 0)

  return (
    <Shell title={t('planner')} sub="Bills, repayments, salaries and meetings">
      <SubNav area="planner" />
      <div className="grid g-21">
        <div className="card col g12">
          <div className="row between"><span className="h3">{t('reminders')}</span><span className="chip red">{money(due30)} due in 30 days</span></div>
          {list ? list.map((r) => {
            const days = Math.ceil((new Date(r.due_at).getTime() - Date.now()) / 864e5)
            return (
              <div key={r.id} className="row g12" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', opacity: r.done ? 0.5 : 1 }}>
                <button className="ib" style={{ width: 28, height: 28, borderRadius: 8, background: r.done ? 'var(--green)' : 'var(--surface)' }} onClick={() => toggle(r.id)} aria-label={r.done ? 'Mark not done' : 'Mark done'}>{r.done && <Icon name="check" size={16} color="#fff" />}</button>
                <span className="tile"><Icon name={kindIcon[r.kind] || 'bell'} size={16} /></span>
                <span className="col grow"><span className="s w6" style={{ textDecoration: r.done ? 'line-through' : undefined }}>{r.title}</span><span className="xs mu">{new Date(r.due_at).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}{!r.done && ` · ${days <= 0 ? 'today' : `in ${days} days`}`}</span></span>
                {r.amount > 0 && <span className="w6 num s">{money(r.amount)}</span>}
              </div>
            )
          }) : <Skeleton h={240} />}
          {data && rows === null && <button className="btn ghost sm" onClick={reload} style={{ alignSelf: 'flex-start' }}><Icon name="refresh" size={14} />Refresh</button>}
        </div>

        <form className="card col g12" onSubmit={add}>
          <span className="h3">{t('addReminder')}</span>
          <div className="field"><label htmlFor="rt">{t('title')}</label><input id="rt" className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="NEPA bill, staff salaries…" required /></div>
          <div className="field"><label htmlFor="rk">Type</label><select id="rk" className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{kinds.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="grid g-2" style={{ gap: 12 }}>
            <div className="field"><label htmlFor="ra">{t('amount')} (₦)</label><input id="ra" className="input num" inputMode="numeric" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/\D/g, '') })} /></div>
            <div className="field"><label htmlFor="rd">{t('due')}</label><input id="rd" className="input" type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} required /></div>
          </div>
          <button className="btn pri">{t('add')}</button>
          <div className="div" />
          <span className="s w6">Plan ahead with NURU</span>
          {['Plan my December spending', 'How much should I save for rent?', 'Can I pay salaries and the loan next week?'].map((q) => (
            <Link key={q} to={'/ask?q=' + encodeURIComponent(q)} className="soft row g8 s"><Icon name="sparkles" size={14} color="var(--red)" />{q}</Link>
          ))}
        </form>
      </div>
    </Shell>
  )
}
