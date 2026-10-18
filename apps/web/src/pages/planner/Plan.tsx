import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { COLORS, Donut, Icon, Skeleton, useLoad } from '../../ui'
import { SubNav } from '../insights/parts'

type Line = { category: string; group: string; usual: number; limit: number }
type Out = { month: string; income: number; pay_day: number; needs: number; wants: number; savings: number; buffer: number; lines: Line[]; reasons: string[]; goals_need: number; budgeted: number }

// p11-08 Monthly plan
export default function Plan() {
  const { toast } = useApp()
  const money = useMoney()
  const nav = useNavigate()
  const { data: p } = useLoad<Out>('/planner/plan')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const parts = p ? [['Needs', p.needs], ['Wants', p.wants], ['Savings', p.savings], ['Buffer', p.buffer]] as [string, number][] : []

  async function apply() {
    setBusy(true)
    try {
      await api('/planner/plan', { method: 'POST' })
      toast('Plan saved as your budgets')
      nav('/planner/budget')
    } catch (e) { toast((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Shell title={p ? `${p.month} plan` : 'Monthly plan'} sub="How NURU suggests you split next month's money">
      <SubNav area="planner" />
      {!p ? <Skeleton h={360} /> : <>
        <div className="grid g-21">
          <div className="col g16">
            <div className="soft col g4"><span className="xs mu">Expected income</span><span className="big num">{money(p.income)}</span><span className="xs t2">Usually paid around the {p.pay_day}th, based on the last 6 months</span></div>
            <div className="card row g24 wrap">
              <Donut data={parts.map(([n, v]) => ({ name: n, value: v }))} height={160} center={money(p.income, { compact: true })} sub={p.month.slice(0, 3)} />
              <div className="col g12 grow" style={{ minWidth: 180 }}>
                {parts.map(([n, v], i) => (
                  <div key={n} className="row g8"><span className="dot" style={{ background: COLORS[i] }} /><span className="s grow">{n}</span><span className="xs t2 num">{p.income ? Math.round((v / p.income) * 100) : 0}%</span><span className="s w6 num" style={{ minWidth: 86, textAlign: 'right' }}>{money(v)}</span></div>
                ))}
              </div>
            </div>
          </div>
          <div className="card col g12">
            <span className="h3">Why NURU suggests this</span>
            {p.reasons.map((r) => <div key={r} className="row g10 start"><Icon name="check" size={16} color="var(--green)" /><span className="s grow">{r}</span></div>)}
          </div>
        </div>
        {open && (
          <div className="card col g10">
            <span className="h3">Limits by category</span>
            {p.lines.map((l) => (
              <div key={l.category} className="row g8 s"><span className="col grow"><span className="w6">{l.category}</span><span className="xs mu num">usually {money(l.usual)}</span></span><span className="chip">{l.group}</span><span className="w6 num" style={{ minWidth: 86, textAlign: 'right' }}>{money(l.limit)}</span></div>
            ))}
            <span className="xs mu">Rent and school fees are planned for but not turned into budgets.</span>
          </div>
        )}
        <div className="row g10">
          <button className="btn grow" onClick={() => setOpen(!open)}>{open ? 'Hide details' : 'Adjust'}</button>
          <button className="btn pri grow" disabled={busy} onClick={apply}>Use this plan</button>
        </div>
        {p.budgeted > 0 && <span className="xs mu">Using this plan replaces the limits of your {p.budgeted} current budgets for these categories.</span>}
      </>}
    </Shell>
  )
}
