import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Icon, Lines, Modal, Skeleton, useLoad } from '../../ui'
import { Back, Badge, Ic, ask, date, num, type Tone } from '../money/kit'

export type PlanItem = { id: string; kind: string; title: string; note: string; amount: number; due_at: string }
type Plan = { cash: number; monthly_net: number; lowest: number; end: number; from: string; to: string; forecast: { label: string; cash: number }[]; items: PlanItem[] }

export const planIcon: Record<string, [string, Tone]> = {
  insurance: ['umbrella', 'green'], funding: ['landmark', 'blue'], marketing: ['megaphone', 'red'], meeting: ['calendar', 'amber'],
  decision: ['scale', 'blue'], hiring: ['users', 'gray'], other: ['flag', 'gray'],
}

export default function Plan() {
  const { toast } = useApp()
  const money = useMoney()
  const { data: p, reload } = useLoad<Plan>('/business/plan')
  const [add, setAdd] = useState(false)
  const [f, setF] = useState({ kind: 'marketing', title: '', note: '', amount: '', sign: '-', due: new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10) })
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      await api('/business/plan', { body: { kind: f.kind, title: f.title, note: f.note, amount: (f.sign === '-' ? -1 : 1) * num(f.amount), due_at: new Date(f.due + 'T09:00').toISOString() } })
      toast('Added to your plan')
      setAdd(false)
      setF({ ...f, title: '', note: '', amount: '' })
      reload()
    } catch (e) { toast((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Shell title="12-month plan" sub="Cash forecast and what is coming up" right={<button className="ib" onClick={() => setAdd(true)} aria-label="Add plan item"><Icon name="plus" /></button>}>
      <Back to="/business" label="Business" />
      <div className="grid g-21">
        <div className="card col g12">
          <div className="row between wrap g8"><span className="h3">Cash forecast</span>{p && <Badge tone="blue">{new Date(p.from).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })} to {new Date(p.to).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })}</Badge>}</div>
          {p ? <>
            <Lines labels={p.forecast.map((x) => x.label)} series={[{ name: 'Cash', values: p.forecast.map((x) => x.cash) }]} height={220} />
            <span className="xs t2">Starts at {money(p.cash)} and grows by about {money(p.monthly_net)} a month, your average over the last 3 full months, plus the plan items below. Lowest point {money(p.lowest)}.</span>
          </> : <Skeleton h={240} />}
        </div>
        <div className="col g12">
          <span className="h3">Plan items</span>
          {p?.items.map((it) => {
            const [ic, tone] = planIcon[it.kind] || planIcon.other
            return (
              <div key={it.id} className="row g12">
                <Ic name={ic} tone={tone} />
                <span className="col g4 grow"><span className="s w6">{it.title}</span><span className="xs mu">{it.note}{it.amount ? ` · ${money(it.amount, { sign: true })}` : ''}</span></span>
                <Badge>{date(it.due_at)}</Badge>
              </div>
            )
          })}
          {p && !p.items.length && <span className="s t2">No plan items yet.</span>}
          <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setAdd(true)}><Icon name="plus" size={16} />Add item</button>
          <Link className="btn pri" to={ask('Stress-test my 12-month business plan')}><Icon name="sparkles" size={16} color="#fff" />Ask NURU to stress-test this plan</Link>
        </div>
      </div>

      {add && (
        <Modal onClose={() => setAdd(false)}>
          <div className="col g16">
            <span className="h2">Add to plan</span>
            <div className="field"><label htmlFor="pk">Type</label>
              <select id="pk" className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
                {Object.keys(planIcon).map((k) => <option key={k} value={k}>{k[0].toUpperCase() + k.slice(1)}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="pt">Title</label><input id="pt" className="input" maxLength={80} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Hire a second cook" /></div>
            <div className="field"><label htmlFor="pn">Note</label><input id="pn" className="input" maxLength={300} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
            <div className="grid g-2" style={{ gap: 12 }}>
              <div className="field"><label htmlFor="pa">Cash effect</label>
                <div className="row g8">
                  <select className="input" style={{ width: 90 }} value={f.sign} onChange={(e) => setF({ ...f, sign: e.target.value })} aria-label="In or out"><option value="-">Out</option><option value="+">In</option></select>
                  <input id="pa" className="input num" inputMode="numeric" value={num(f.amount) ? num(f.amount).toLocaleString('en-NG') : ''} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="₦0" />
                </div>
              </div>
              <div className="field"><label htmlFor="pd">When</label><input id="pd" className="input" type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></div>
            </div>
            <div className="kit-actions"><button className="btn" onClick={() => setAdd(false)}>Cancel</button><button className="btn pri" disabled={busy || !f.title.trim() || !f.due} onClick={save}>Add</button></div>
          </div>
        </Modal>
      )}
    </Shell>
  )
}
