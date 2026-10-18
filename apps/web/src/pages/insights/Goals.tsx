import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Icon, Modal, Skeleton, useLoad } from '../../ui'
import { Ring, SubNav, Tip, shortDate, type Goal } from './parts'

const ICONS = ['target', 'building', 'umbrella', 'laptop', 'globe', 'car', 'grad', 'heart', 'home']

// p06-11 Goals
export default function Goals() {
  const { t, toast } = useApp()
  const money = useMoney()
  const { data } = useLoad<Goal[]>('/goals')
  const [rows, setRows] = useState<Goal[] | null>(null)
  const [adding, setAdding] = useState(false)
  const list = rows || data
  const saved = list?.reduce((a, g) => a + g.saved, 0) || 0
  const tipGoal = list?.find((g) => g.saved < g.target && g.monthly_needed > g.auto_amount)

  async function create(body: GoalBody) {
    try {
      setRows(await api<Goal[]>('/goals', { body }))
      setAdding(false)
      toast('Goal created')
    } catch (e) { toast((e as Error).message) }
  }

  return (
    <Shell title={t('goals')} sub={list ? `${money(saved)} saved across ${list.length} ${list.length === 1 ? 'goal' : 'goals'}` : 'What you are saving for'} right={<button className="btn pri sm" onClick={() => setAdding(true)}><Icon name="plus" size={16} color="#fff" />{t('newGoal')}</button>}>
      <SubNav area="insights" />
      <div className="grid g-2">
        {list ? list.map((g, k) => (
          <Link key={g.id} to={'/planner/goal/' + g.id} className="card row g16" style={{ padding: 16 }}>
            <Ring pct={g.pct} size={60} stroke={6} color={g.pct >= 75 || k === 0 && g.pct >= 50 ? 'var(--green)' : 'var(--red)'} />
            <span className="col g4 grow">
              <span className="s w6">{g.name}</span>
              <span className="xs mu">{g.note || 'Savings goal'}{g.due_at ? ` · due ${shortDate(g.due_at, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</span>
              <span className="xs t2"><b className="w6" style={{ color: 'var(--text)' }}>{money(g.saved)}</b> of {money(g.target)}</span>
            </span>
            <Icon name={g.icon} size={20} color="var(--muted)" />
          </Link>
        )) : [0, 1, 2, 3].map((i) => <Skeleton key={i} h={92} />)}
      </div>
      {list?.length === 0 && <div className="card col center g8" style={{ padding: 32 }}><span className="s t2">No goals yet. Start with an emergency fund.</span></div>}
      {tipGoal && <Tip>Auto-save {money(tipGoal.monthly_needed)} every payday to finish {tipGoal.name} on time.</Tip>}
      <button className="btn pri" style={{ alignSelf: 'flex-start' }} onClick={() => setAdding(true)}><Icon name="plus" size={18} color="#fff" />{t('newGoal')}</button>
      {adding && <GoalForm onSave={create} onClose={() => setAdding(false)} />}
    </Shell>
  )
}

export type GoalBody = { name: string; note: string; icon: string; target: number; due_at: string; auto_amount: number; auto_day: number; contribute?: number }

export function GoalForm({ goal, onSave, onClose }: { goal?: Goal; onSave: (b: GoalBody) => void; onClose: () => void }) {
  const { t } = useApp()
  const [f, setF] = useState({
    name: goal?.name || '', note: goal?.note || '', icon: goal?.icon || 'target', target: goal ? String(goal.target) : '',
    due: goal?.due_at?.slice(0, 10) || '', auto: goal?.auto_amount ? String(goal.auto_amount) : '', day: goal?.auto_day ? String(goal.auto_day) : '26', first: '',
  })
  const num = (v: string) => v.replace(/\D/g, '')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSave({ name: f.name, note: f.note, icon: f.icon, target: Number(f.target), due_at: f.due, auto_amount: Number(f.auto || 0), auto_day: f.auto ? Number(f.day || 0) : 0, ...(goal ? {} : { contribute: Number(f.first || 0) }) })
  }
  return (
    <Modal onClose={onClose}>
      <form className="col g12" onSubmit={submit}>
        <span className="h2">{goal ? 'Edit goal' : t('newGoal')}</span>
        <div className="field"><label htmlFor="gn">What are you saving for?</label><input id="gn" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Rent fund, new laptop…" required autoFocus /></div>
        <div className="field"><label htmlFor="gd">Note</label><input id="gd" className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Optional" /></div>
        <div className="grid g-2" style={{ gap: 12 }}>
          <div className="field"><label htmlFor="gt">Target (₦)</label><input id="gt" className="input num" inputMode="numeric" value={f.target} onChange={(e) => setF({ ...f, target: num(e.target.value) })} required /></div>
          <div className="field"><label htmlFor="gu">By</label><input id="gu" className="input" type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></div>
          <div className="field"><label htmlFor="ga">Auto-save (₦)</label><input id="ga" className="input num" inputMode="numeric" value={f.auto} onChange={(e) => setF({ ...f, auto: num(e.target.value) })} placeholder="0" /></div>
          <div className="field"><label htmlFor="gy">On day</label><input id="gy" className="input num" inputMode="numeric" value={f.day} onChange={(e) => setF({ ...f, day: num(e.target.value).slice(0, 2) })} /></div>
        </div>
        {!goal && <div className="field"><label htmlFor="gf">First deposit (₦)</label><input id="gf" className="input num" inputMode="numeric" value={f.first} onChange={(e) => setF({ ...f, first: num(e.target.value) })} placeholder="0" /></div>}
        <div className="row g6 wrap" role="radiogroup" aria-label="Icon">
          {ICONS.map((i) => <button type="button" key={i} role="radio" aria-checked={f.icon === i} aria-label={i} className="ib" style={{ width: 36, height: 36, background: f.icon === i ? 'var(--red50)' : undefined, color: f.icon === i ? 'var(--red)' : undefined }} onClick={() => setF({ ...f, icon: i })}><Icon name={i} size={16} /></button>)}
        </div>
        <div className="row g10"><button type="button" className="btn grow" onClick={onClose}>Cancel</button><button className="btn pri grow" disabled={!f.name.trim() || !Number(f.target)}>{t('save')}</button></div>
      </form>
    </Modal>
  )
}
