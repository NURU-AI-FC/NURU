import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Donut, Icon, Skeleton, useLoad } from '../../ui'
import { Back, Badge, Row, date, daysFrom, type Tone } from './kit'

export type Instalment = { n: number; due_at: string; payment: number; interest: number; principal: number; balance: number; status: 'paid' | 'due' | 'upcoming' }
export type Loan = {
  id: string; lender: string; principal: number; rate_pct: number; months: number; disbursed_at: string; next_due_at: string; final_due_at: string
  monthly: number; balance: number; outstanding_principal: number; paid_instalments: number; total_interest: number; schedule?: Instalment[]
}

export default function LoanDetail() {
  const { id } = useParams()
  const { toast } = useApp()
  const money = useMoney()
  const { data: l, error } = useLoad<Loan>('/loans/' + id)
  const [all, setAll] = useState(false)
  const [saved, setSaved] = useState(false)

  const remind = async () => {
    if (!l) return
    const at = new Date(l.next_due_at)
    at.setDate(at.getDate() - 2)
    try {
      await api('/reminders', { body: { title: `Loan repayment, ${l.lender}`, kind: 'loan', amount: l.monthly, due_at: at.toISOString() } })
      setSaved(true)
      toast('Reminder set for 2 days before')
    } catch (e) { toast((e as Error).message) }
  }

  if (error) return <Shell title="Loan"><Back to="/money" label="Loans and savings" /><div className="card flat t2">{error}</div></Shell>
  const owed = l ? l.principal + l.total_interest : 0
  const pct = l ? Math.round(((owed - l.balance) / owed) * 100) : 0
  const sched = l?.schedule || []
  const shown = all ? sched : sched.filter((s) => s.status !== 'paid').slice(0, 4)
  const lastPaid = [...sched].reverse().find((s) => s.status === 'paid')
  const label = (s: Instalment): [string, Tone] => {
    if (s.status === 'paid') return ['Paid', 'green']
    if (s.status === 'due') { const d = daysFrom(s.due_at); return [d < 0 ? 'Overdue' : d === 0 ? 'Due today' : `Due in ${d} days`, d < 0 ? 'red' : 'amber'] }
    return ['Upcoming', 'gray']
  }

  return (
    <Shell title={l?.lender || 'Loan'} sub="Repayment schedule">
      <Back to="/money" label="Loans and savings" />
      <div className="grid g-2 kit-wide">
        <div className="col g20">
          {l ? (
            <div className="card col g12">
              <div className="row between">
                <div className="col g4"><span className="xs mu">Still to pay</span><span className="big num">{money(l.balance)}</span></div>
                <Donut data={[{ name: 'Repaid', value: owed - l.balance }, { name: 'Left', value: l.balance }]} center={`${pct}%`} height={80} />
              </div>
              <div className="div" />
              <Row l="Borrowed" r={money(l.principal)} />
              <Row l="Interest" r={`${l.rate_pct}% a year · ${money(l.total_interest)} total`} />
              <Row l="Principal left" r={money(l.outstanding_principal)} />
              <Row l="Disbursed" r={date(l.disbursed_at, true)} />
              <Row l="Final payment" r={date(l.final_due_at, true)} />
              <Row l="Monthly payment" r={money(l.monthly)} />
            </div>
          ) : <Skeleton h={300} />}
          <div className="kit-actions">
            <button className="btn" onClick={remind} disabled={!l || saved}><Icon name="bell" size={16} />{saved ? 'Reminder set' : 'Set reminder'}</button>
            <Link className="btn pri" to={'/ask?q=' + encodeURIComponent(`Should I pay my ${l?.lender || ''} loan early?`)}><Icon name="sparkles" size={16} color="#fff" />Pay early?</Link>
          </div>
        </div>

        <div className="card col g12">
          <div className="row between"><span className="h3">Repayment schedule</span><button className="btn ghost sm" onClick={() => setAll(!all)}>{all ? 'Show next 4' : `All ${sched.length}`}</button></div>
          {!all && lastPaid && <span className="xs mu">{l?.paid_instalments} of {l?.months} paid, last on {date(lastPaid.due_at)}</span>}
          {l ? shown.map((s) => {
            const [t, tone] = label(s)
            return (
              <div key={s.n} className="row g12">
                <span className="dot" style={{ borderRadius: 5, background: tone === 'gray' ? 'var(--border)' : `var(--${tone})` }} />
                <span className="col grow"><span className="s w6">{date(s.due_at, all)}</span><span className="xs mu">{money(s.principal)} principal · {money(s.interest)} interest</span></span>
                <Badge tone={tone}>{t}</Badge>
                <span className="s num w6" style={{ minWidth: 80, textAlign: 'right' }}>{money(s.payment)}</span>
              </div>
            )
          }) : <Skeleton h={200} />}
        </div>
      </div>
    </Shell>
  )
}
