import { useState } from 'react'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Icon, Skeleton, useLoad } from '../../ui'
import { SubNav } from '../insights/parts'

type Ev = { date: string; at: string; title: string; kind: string; source: string; amount: number; credit: boolean; status: string }
type Out = { month: string; label: string; today: string; events: Ev[] }

const color = (e: Ev) => e.credit ? 'var(--green)' : e.kind === 'meeting' ? 'var(--blue)' : e.source === 'recurring' ? 'var(--muted)' : e.kind === 'loan' ? 'var(--red)' : 'var(--amber)'
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const iso = (d: Date) => `${ym(d)}-${String(d.getDate()).padStart(2, '0')}`

// p11-05 Money calendar
export default function Calendar() {
  const { t } = useApp()
  const money = useMoney()
  const [month, setMonth] = useState(() => ym(new Date()))
  const [sel, setSel] = useState('')
  const { data } = useLoad<Out>('/planner/calendar?month=' + month)
  const [y, m] = month.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const lead = (first.getDay() + 6) % 7
  const days = new Date(y, m, 0).getDate()
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => i - lead + 1)
  const byDay: Record<string, Ev[]> = {}
  data?.events.forEach((e) => { (byDay[e.date] ||= []).push(e) })
  const shift = (n: number) => { setSel(''); setMonth(ym(new Date(y, m - 1 + n, 1))) }

  const today = data?.today || iso(new Date())
  const week = new Date(today); week.setDate(week.getDate() + 7)
  const list = sel ? byDay[sel] || [] : data?.events.filter((e) => e.date >= today && e.date <= iso(week) && e.status !== 'done' && e.status !== 'paid') || []
  const net = list.reduce((a, e) => a + (e.credit ? e.amount : -e.amount), 0)

  return (
    <Shell title="Money calendar" sub="Reminders, regular bills and expected salary in one place">
      <SubNav area="planner" />
      <div className="grid g-21">
        <div className="card col g12">
          <div className="row between">
            <button className="ib" onClick={() => shift(-1)} aria-label="Previous month"><Icon name="chevl" /></button>
            <span className="h3">{data?.label || first.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}</span>
            <button className="ib" onClick={() => shift(1)} aria-label="Next month"><Icon name="chevr" /></button>
          </div>
          <div className="cal">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="xs mu w6" style={{ textAlign: 'center' }}>{d}</span>)}
            {cells.map((d, i) => {
              if (d < 1 || d > days) return <span key={i} />
              const key = `${month}-${String(d).padStart(2, '0')}`
              const ev = byDay[key] || []
              const isToday = key === today
              return (
                <button key={i} className={'d' + (isToday ? ' today' : '') + (sel === key ? ' sel' : '')} onClick={() => setSel(sel === key ? '' : key)} aria-label={`${d}, ${ev.length} ${ev.length === 1 ? 'event' : 'events'}`} aria-pressed={sel === key}>
                  <span className="s">{d}</span>
                  <span className="dots">{ev.slice(0, 3).map((e, j) => <i key={j} style={{ background: isToday ? '#fff' : color(e) }} />)}</span>
                </button>
              )
            })}
          </div>
          {!data && <Skeleton h={40} />}
          <div className="row g12 wrap xs t2">
            {[['var(--green)', 'Salary'], ['var(--amber)', 'Bills and reminders'], ['var(--red)', 'Loans'], ['var(--blue)', 'Meetings'], ['var(--muted)', 'Regular debits']].map(([c, l]) => <span key={l} className="row g6"><span className="dot" style={{ background: c, borderRadius: 5 }} />{l}</span>)}
          </div>
        </div>
        <div className="card col g12">
          <div className="row between"><span className="h3">{sel ? new Date(sel).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Next 7 days'}</span>{list.length > 0 && <span className={'chip ' + (net >= 0 ? 'green' : 'red')}>{money(net, { sign: true })}</span>}</div>
          {list.length === 0 && <span className="s mu">{sel ? 'Nothing on this day.' : 'Nothing due in the next 7 days.'}</span>}
          {list.map((e, i) => (
            <div key={i} className="row g12">
              <span className="stripe" style={{ background: color(e) }} />
              <span className="col g4 grow">
                <span className="s w6">{e.title}</span>
                <span className="xs mu">{new Date(e.at).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}{e.kind === 'meeting' ? ' · ' + new Date(e.at).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' }) : ''} · {e.status}</span>
              </span>
              <span className={'s w6 num ' + (e.credit ? 'pos' : '')}>{e.amount > 0 ? money(e.credit ? e.amount : -e.amount, { sign: e.credit }) : e.kind === 'meeting' ? 'Meet' : ''}</span>
            </div>
          ))}
          <div className="div" />
          <span className="xs mu">Add bills and meetings under {t('reminders')}. Regular debits and salary are found from your transactions.</span>
        </div>
      </div>
    </Shell>
  )
}
