import { Link } from 'react-router-dom'
import type { Summary } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Bars, Icon, Skeleton, useLoad } from '../../ui'
import { SubNav, type Merchant } from '../insights/parts'

type Week = { from: string; to: string; name: string; saved: number; changes: { category: string; now: number; before: number; pct: number }[]; merchants: Merchant[] }

// p11-09 Weekly recap
export default function Recap() {
  const { toast } = useApp()
  const money = useMoney()
  const sum = useLoad<Summary>('/analytics/summary?period=week').data
  const wk = useLoad<Week>('/analytics/week').data
  const diff = sum && sum.prev_out ? Math.round(((sum.out - sum.prev_out) / sum.prev_out) * 100) : 0
  const good = diff <= 0
  const hi = sum ? sum.series.reduce((m, p, i, a) => (p.out > a[m].out ? i : m), 0) : -1
  const up = wk?.changes.filter((c) => c.now > c.before).slice(0, 2) || []
  const down = wk?.changes.filter((c) => c.now < c.before).slice(0, 2) || []
  const top = wk?.merchants[0]

  const lines: [string, string, string, string][] = [
    ...down.map((c) => ['trenddown', 'green', `${c.category} down ${Math.abs(c.pct) || 100}%`, `${money(c.now)} this week, ${money(c.before)} the week before`] as [string, string, string, string]),
    ...up.map((c) => ['trendup', 'red', c.before ? `${c.category} up ${c.pct}%` : `New spending on ${c.category}`, `${money(c.now)} this week, ${money(c.before)} the week before`] as [string, string, string, string]),
  ]
  if (top) lines.push(['star', 'amber', 'Tip for next week', `${top.merchant} took ${money(top.amount)} over ${top.count} ${top.count === 1 ? 'payment' : 'payments'}. Setting a weekly cap there is an easy win.`])

  function listen() {
    if (!('speechSynthesis' in window) || !sum) return toast('Your browser cannot read aloud')
    speechSynthesis.cancel()
    speechSynthesis.speak(new SpeechSynthesisUtterance(`You spent ${Math.round(sum.out)} naira this week. ` + lines.map((l) => `${l[2]}. ${l[3]}.`).join(' ').replace(/₦/g, '')))
  }

  return (
    <Shell title="Your week" sub={wk ? `${wk.from} to ${wk.to}` : 'Weekly recap'} right={<button className="ib" onClick={listen} aria-label="Listen to your recap"><Icon name="volume" /></button>}>
      <SubNav area="planner" />
      {sum && wk && <span className="h2">{good ? 'A good week' : 'A busier week'}{wk.name ? `, ${wk.name}` : ''}</span>}
      <div className="grid g-4">
        {sum ? <div className="card col g4"><span className="xs mu">Spent</span><span className="big num">{money(sum.out)}</span><span className={'xs w6 ' + (good ? 'pos' : 'red')}>{sum.prev_out ? `${Math.abs(diff)}% ${good ? 'less' : 'more'} than last week` : 'First week of data'}</span></div> : <Skeleton h={110} />}
        {wk ? <div className="card col g4"><span className="xs mu">Saved</span><span className="big num">{money(wk.saved)}</span><span className={'xs w6 ' + (wk.saved > 0 ? 'pos' : 'mu')}>{wk.saved > 0 ? 'Into your goals' : 'Nothing saved this week'}</span></div> : <Skeleton h={110} />}
      </div>
      <div className="grid g-21">
        <div className="card col g12">
          <span className="h3">Daily spending</span>
          {sum ? <Bars height={200} labels={sum.series.map((_, i, a) => new Date(Date.now() - (a.length - 1 - i) * 864e5).toLocaleDateString('en-NG', { weekday: 'short' }))} series={[{ name: 'Spent', values: sum.series.map((p) => p.out) }]} colors={['var(--c1)']} /> : <Skeleton h={200} />}
          {hi >= 0 && sum && sum.series[hi]?.out > 0 && <span className="xs mu">Biggest day: {sum.series[hi].label}, {money(sum.series[hi].out)}</span>}
        </div>
        <div className="card col g12">
          <span className="h3">What changed</span>
          {wk && lines.length === 0 && <span className="s mu">Much the same as last week.</span>}
          {lines.map(([ic, tn, t, s]) => (
            <div key={t} className="row g12"><span className={'ic ' + tn} style={{ width: 36, height: 36, borderRadius: 11 }}><Icon name={ic} size={16} /></span><span className="col g4 grow"><span className="s w6">{t}</span><span className="xs mu">{s}</span></span></div>
          ))}
          <Link to="/insights/merchants" className="xs lnk">See where you spend</Link>
        </div>
      </div>
    </Shell>
  )
}
