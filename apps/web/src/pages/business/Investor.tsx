import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Icon, Skeleton, useLoad } from '../../ui'
import { Back, Ic, Row, ask } from '../money/kit'

type Inv = {
  business: string; meeting: { title: string; due_at: string } | null; revenue_12m: number; profit_12m: number; gross_margin: number
  monthly_growth: number; months: number; ask: number; ask_note: string; equity_pct: number; questions: string[]
}

export default function Investor() {
  const { toast } = useApp()
  const money = useMoney()
  const d = useLoad<Inv>('/business/investor').data
  const [reminded, setReminded] = useState(false)
  const at = d?.meeting ? new Date(d.meeting.due_at) : null

  const remind = async () => {
    if (!d?.meeting || !at) return
    const before = new Date(at.getTime() - 864e5)
    try {
      await api('/reminders', { body: { title: `Prepare for ${d.meeting.title}`, kind: 'meeting', amount: 0, due_at: (before.getTime() > Date.now() ? before : at).toISOString() } })
      setReminded(true)
      toast('Reminder set for the day before')
    } catch (e) { toast((e as Error).message) }
  }

  return (
    <Shell title="Investor meeting" sub={d?.business}>
      <Back to="/business" label="Business" />
      <div className="grid g-2">
        <div className="col g16">
          {d ? d.meeting && at ? (
            <div className="card row g12"><Ic name="calendar" tone="blue" size={44} /><span className="col g4 grow"><span className="s w6">{d.meeting.title}</span><span className="xs mu">{at.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })} · {at.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })}</span></span></div>
          ) : <div className="card flat row g12"><Ic name="calendar" /><span className="s t2 grow">No investor meeting booked.</span><Link to="/planner" className="s w6 red">Add one</Link></div> : <Skeleton h={80} />}
          <span className="h3">One-page summary NURU drafted</span>
          {d ? (
            <div className="card col g10">
              <Row l={`Revenue (last ${d.months} months)`} r={money(d.revenue_12m)} />
              <Row l={`Profit (last ${d.months} months)`} r={money(d.profit_12m)} />
              <Row l="Gross margin" r={`${d.gross_margin}%`} />
              <Row l="Monthly growth" r={`${d.monthly_growth}%`} />
              <Row l="Asking" r={d.ask ? `${money(d.ask)} for ${d.equity_pct}%` : 'Not set'} />
              {d.ask_note && <span className="xs mu">{d.ask_note}</span>}
            </div>
          ) : <Skeleton h={220} />}
        </div>
        <div className="col g16">
          <span className="h3">Questions to expect</span>
          {d?.questions.map((t) => <Link key={t} to={ask(`Help me answer this investor question: ${t}`)} className="row g10"><Icon name="help" size={16} color="var(--muted)" /><span className="s grow">{t}</span><Icon name="chevr" size={14} color="var(--muted)" /></Link>)}
          <span className="xs mu">Tap a question to practise your answer with NURU.</span>
          <div className="kit-actions no-print">
            <button className="btn" disabled={!d?.meeting || reminded} onClick={remind}><Icon name="bell" size={16} />{reminded ? 'Reminder set' : 'Remind me'}</button>
            <button className="btn pri" disabled={!d} onClick={() => print()}><Icon name="download" size={16} color="#fff" />Export PDF</button>
          </div>
        </div>
      </div>
    </Shell>
  )
}
