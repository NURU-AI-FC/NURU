import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Icon, Modal, Skeleton, catIcon, useLoad } from '../../ui'
import { Prog, SubNav, tone, type Budget, type Budgets as Out } from './parts'

// p06-10 Budgets
export default function Budgets() {
  const { t, toast } = useApp()
  const money = useMoney()
  const { data } = useLoad<Out>('/budgets')
  const [rows, setRows] = useState<Out | null>(null)
  const [edit, setEdit] = useState<Budget | 'new' | null>(null)
  const b = rows || data
  const pct = b && b.limit ? (b.spent / b.limit) * 100 : 0

  async function save(category: string, limit: number) {
    try {
      setRows(edit === 'new' || !edit ? await api<Out>('/budgets', { body: { category, limit } }) : await api<Out>('/budgets/' + edit.id, { method: 'PATCH', body: { category, limit } }))
      toast('Budget saved')
      setEdit(null)
    } catch (e) { toast((e as Error).message) }
  }
  async function remove(x: Budget) {
    if (!confirm(`Delete the ${x.category} budget?`)) return
    setRows(await api<Out>('/budgets/' + x.id, { method: 'DELETE' }))
    toast('Budget deleted')
  }

  return (
    <Shell title={t('budgets')} sub="Limits for each category, tracked against this month's spending" right={<button className="btn pri sm" onClick={() => setEdit('new')}><Icon name="plus" size={16} color="#fff" />{t('newBudget')}</button>}>
      <SubNav area="insights" />
      {b ? (
        <div className="card col g8">
          <div className="row between"><span className="xs mu">{b.month} budget</span><span className="xs mu">{b.days_left} days left</span></div>
          <div className="row between wrap g8"><span className="big num">{money(b.spent)}</span><span className="s t2">of {money(b.limit)}</span></div>
          <Prog pct={pct} color={tone(pct)} />
        </div>
      ) : <Skeleton h={120} />}
      {b?.items.length === 0 && <div className="card col center g8" style={{ padding: 32 }}><span className="s t2">No budgets yet.</span><button className="btn pri sm" onClick={() => setEdit('new')}>{t('newBudget')}</button></div>}
      <div className="grid g-3">
        {b?.items.map((x) => {
          const c = tone(x.pct)
          return (
            <div key={x.id} className="card col g10" style={{ padding: 16 }}>
              <div className="row g10">
                <span className="tile" style={{ width: 34, height: 34 }}><Icon name={catIcon(x.category)} size={16} /></span>
                <Link to={'/insights/category/' + encodeURIComponent(x.category)} className="s w6 grow">{x.category}</Link>
                <span className="xs w6" style={{ color: c }}>{x.pct}%</span>
                <button className="ib" style={{ width: 30, height: 30 }} onClick={() => setEdit(x)} aria-label={`Edit ${x.category} budget`}><Icon name="edit" size={14} /></button>
                <button className="ib" style={{ width: 30, height: 30 }} onClick={() => remove(x)} aria-label={`Delete ${x.category} budget`}><Icon name="trash" size={14} /></button>
              </div>
              <Prog pct={x.pct} color={c} />
              <div className="row between xs t2"><span>{money(x.spent)} spent</span><span className={x.pct >= 100 ? 'over w6' : ''}>{x.pct >= 100 ? `${money(x.spent - x.limit)} over` : `${money(x.limit - x.spent)} left`}</span></div>
            </div>
          )
        })}
      </div>
      {edit && <BudgetForm budget={edit === 'new' ? null : edit} categories={b?.categories || []} taken={b?.items.map((x) => x.category) || []} onSave={save} onClose={() => setEdit(null)} />}
    </Shell>
  )
}

export function BudgetForm({ budget, categories, taken, onSave, onClose }: { budget: Budget | null; categories: string[]; taken: string[]; onSave: (c: string, l: number) => void; onClose: () => void }) {
  const { t } = useApp()
  const free = categories.filter((c) => !taken.includes(c) || c === budget?.category)
  const [cat, setCat] = useState(budget?.category || free[0] || '')
  const [limit, setLimit] = useState(budget ? String(budget.limit) : '')
  const submit = (e: FormEvent) => { e.preventDefault(); onSave(cat.trim(), Number(limit)) }
  return (
    <Modal onClose={onClose}>
      <form className="col g16" onSubmit={submit}>
        <span className="h2">{budget ? `Edit ${budget.category}` : t('newBudget')}</span>
        <div className="field">
          <label htmlFor="bc">{t('category')}</label>
          <input id="bc" className="input" list="bcats" value={cat} onChange={(e) => setCat(e.target.value)} required />
          <datalist id="bcats">{free.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div className="field"><label htmlFor="bl">Monthly limit (₦)</label><input id="bl" className="input num" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ''))} required autoFocus /></div>
        <div className="row g10"><button type="button" className="btn grow" onClick={onClose}>Cancel</button><button className="btn pri grow" disabled={!cat.trim() || !Number(limit)}>{t('save')}</button></div>
      </form>
    </Modal>
  )
}
