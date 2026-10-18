import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Icon, Skeleton, useLoad } from '../../ui'
import { GoalForm, type GoalBody } from '../insights/Goals'
import { Ring, SubNav, Tip, shortDate, type Goal as G } from '../insights/parts'

const monthYear = { month: 'short', year: 'numeric' } as const

// p11-07 Savings goal, with contributions
export default function Goal() {
  const { id } = useParams()
  const nav = useNavigate()
  const { toast, rates } = useApp()
  const money = useMoney()
  const { data } = useLoad<G[]>('/goals')
  const [rows, setRows] = useState<G[] | null>(null)
  const [amt, setAmt] = useState('')
  const [editing, setEditing] = useState(false)
  const list = rows || data
  const g = list?.find((x) => x.id === id) || (id ? undefined : list?.[0])

  async function patch(body: Partial<GoalBody>, msg: string) {
    if (!g) return
    try {
      setRows(await api<G[]>('/goals/' + g.id, { method: 'PATCH', body }))
      toast(msg)
    } catch (e) { toast((e as Error).message) }
  }
  async function move(e: FormEvent, sign: 1 | -1) {
    e.preventDefault()
    if (!Number(amt)) return
    await patch({ contribute: sign * Number(amt) }, sign > 0 ? `${money(Number(amt))} added` : `${money(Number(amt))} taken out`)
    setAmt('')
  }
  async function remove() {
    if (!g || !confirm(`Delete ${g.name}? Its history goes too.`)) return
    await api('/goals/' + g.id, { method: 'DELETE' })
    toast('Goal deleted')
    nav('/insights/goals')
  }

  const usd = rates.USD && g ? g.saved * rates.USD : 0
  // milestones: each quarter of the target, dated when the running total first reached it
  const marks = g ? [25, 50, 75, 100].map((p) => {
    let run = 0, at = ''
    for (const c of [...g.contributions].reverse()) { run += c.amount; if (!at && run >= (g.target * p) / 100) at = c.at }
    return { p, at }
  }) : []
  const ahead = g && g.finish_at && g.due_at ? Math.round((new Date(g.due_at).getTime() - new Date(g.finish_at).getTime()) / (30.4 * 864e5)) : 0

  return (
    <Shell title={g?.name || 'Savings goal'} sub="Track a goal and add to it" right={g && <div className="row g8"><button className="ib" onClick={() => setEditing(true)} aria-label="Edit goal"><Icon name="edit" /></button><button className="ib" onClick={remove} aria-label="Delete goal"><Icon name="trash" /></button></div>}>
      <SubNav area="planner" />
      {list && list.length > 1 && (
        <div className="row g8 wrap">{list.map((x) => <Link key={x.id} to={'/planner/goal/' + x.id} className={'chip' + (x.id === g?.id ? ' red' : '')}>{x.name}</Link>)}</div>
      )}
      {!list ? <Skeleton h={300} /> : !g ? (
        <div className="card col center g8" style={{ padding: 32 }}><span className="s t2">No goal here yet.</span><Link to="/insights/goals" className="btn pri sm">Create a goal</Link></div>
      ) : (
        <div className="grid g-21">
          <div className="col g16">
            <div className="hero col g12">
              <div className="row between g16">
                <div className="col g4">
                  <span className="xs" style={{ opacity: 0.85 }}>{g.name}{g.note ? ` · ${g.note}` : ''}</span>
                  <span className="big num">{money(g.saved)}</span>
                  <span className="xs" style={{ opacity: 0.85 }}>of {money(g.target)}{g.due_at ? ` by ${shortDate(g.due_at, monthYear)}` : ''}</span>
                </div>
                <Ring pct={g.pct} size={76} stroke={8} color="#fff" track="rgba(255,255,255,.3)" />
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.3)' }}><div style={{ width: `${g.pct}%`, height: 6, borderRadius: 3, background: '#fff' }} /></div>
            </div>
            <div className="grid g-2" style={{ gap: 12 }}>
              <div className="card col g4" style={{ padding: 16 }}><span className="xs mu">Auto-save</span><span className="h3 num">{g.auto_amount ? money(g.auto_amount) : 'Off'}</span><span className="xs t2">{g.auto_amount ? `every ${g.auto_day}${['th', 'st', 'nd', 'rd'][g.auto_day % 10 > 3 || [11, 12, 13].includes(g.auto_day) ? 0 : g.auto_day % 10]}` : 'Turn it on in edit'}</span></div>
              <div className="card col g4" style={{ padding: 16 }}><span className="xs mu">{usd ? 'In dollars today' : 'Needed each month'}</span><span className="h3 num">{usd ? '$' + Math.round(usd).toLocaleString('en-US') : money(g.monthly_needed)}</span><span className="xs t2">{usd ? `at ₦${(1 / rates.USD).toLocaleString('en-NG', { maximumFractionDigits: 2 })}` : 'to finish on time'}</span></div>
            </div>
            <form className="card col g12" onSubmit={(e) => move(e, 1)}>
              <span className="h3">Add money</span>
              <div className="row g10 wrap">
                <input className="input num grow" style={{ minWidth: 140 }} inputMode="numeric" placeholder="Amount (₦)" aria-label="Amount" value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ''))} />
                <button className="btn pri" disabled={!Number(amt)}>Add</button>
                <button type="button" className="btn" disabled={!Number(amt)} onClick={(e) => move(e, -1)}>Take out</button>
              </div>
            </form>
          </div>
          <div className="col g16">
            <div className="card col g12">
              <span className="h3">Milestones</span>
              {marks.map((m) => (
                <div key={m.p} className="row g12">
                  <span className={'ic ' + (m.at ? 'green' : '')} style={{ width: 32, height: 32, borderRadius: 10 }}><Icon name={m.at ? 'check' : 'flag'} size={16} /></span>
                  <span className={'s grow ' + (m.at ? '' : 't2')}>{m.p === 100 ? 'Goal reached' : `${m.p}% saved`} · {money((g.target * m.p) / 100)}</span>
                  <span className="xs mu">{m.at ? shortDate(m.at, monthYear) : m.p === 100 && g.due_at ? shortDate(g.due_at, monthYear) : ''}</span>
                </div>
              ))}
            </div>
            <div className="card col g10">
              <span className="h3">Contributions</span>
              {g.contributions.length === 0 && <span className="s mu">Nothing added yet.</span>}
              {g.contributions.slice(0, 8).map((c) => (
                <div key={c.id} className="row between s"><span className="col"><span className="w6">{c.note}</span><span className="xs mu">{shortDate(c.at, { day: 'numeric', month: 'short', year: 'numeric' })}</span></span><span className={'w6 num ' + (c.amount > 0 ? 'pos' : '')}>{money(c.amount, { sign: c.amount > 0 })}</span></div>
              ))}
            </div>
            {g.saved < g.target && <Tip>{ahead > 0 ? `At this pace you finish ${ahead} ${ahead === 1 ? 'month' : 'months'} early.` : g.monthly_needed > g.auto_amount ? `Saving ${money(g.monthly_needed)} a month gets you there on time.` : 'You are on track to reach this goal on time.'}</Tip>}
          </div>
        </div>
      )}
      {editing && g && <GoalForm goal={g} onClose={() => setEditing(false)} onSave={async (b) => { await patch(b, 'Goal saved'); setEditing(false) }} />}
    </Shell>
  )
}
