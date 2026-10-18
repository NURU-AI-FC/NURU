import { useSearchParams } from 'react-router-dom'
import type { Cat } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Donut, Icon, Legend, Skeleton, useLoad } from '../../ui'
import { SubNav } from './parts'

type Out = {
  month: string; label: string; short: string; name: string; in: number; out: number; kept: number; saved: number; rate: number; score: number
  prev_in: number; prev_out: number; categories: Cat[]; budgets_kept: number; budgets: number
  highlights: { icon: string; tone: string; title: string; body: string }[]; months: { value: string; label: string }[]
}

// p06-13 Monthly report
export default function Report() {
  const { toast } = useApp()
  const money = useMoney()
  const [q, setQ] = useSearchParams()
  const month = q.get('month') || ''
  const { data: d } = useLoad<Out>('/analytics/report' + (month ? '?month=' + encodeURIComponent(month) : ''))

  const text = d ? `${d.label} money report: ${money(d.in)} in, ${money(d.out)} out. You ${d.kept >= 0 ? 'kept' : 'overspent by'} ${money(Math.abs(d.kept))}. ` + d.highlights.map((h) => `${h.title}. ${h.body}.`).join(' ') : ''
  function listen() {
    if (!('speechSynthesis' in window)) return toast('Your browser cannot read aloud')
    speechSynthesis.cancel()
    speechSynthesis.speak(new SpeechSynthesisUtterance(text.replace(/₦/g, 'naira ')))
  }
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: `NURU ${d?.label} report`, text })
      else { await navigator.clipboard.writeText(text); toast('Report copied') }
    } catch { /* closed */ }
  }
  const cats = d?.categories.map((c) => ({ name: c.category, value: c.amount })) || []

  return (
    <Shell title={d ? `${d.short} report` : 'Monthly report'} sub="A one page summary you can print or share"
      right={<div className="row g8 noprint">
        {d && <select className="input" style={{ height: 40, width: 'auto' }} value={d.month} onChange={(e) => setQ({ month: e.target.value })} aria-label="Month">{d.months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>}
        <button className="ib" onClick={() => print()} aria-label="Print or save as PDF"><Icon name="download" /></button>
      </div>}>
      <SubNav area="insights" />
      {!d ? <Skeleton h={420} /> : <>
        <div className="hero col g10">
          <span className="xs" style={{ opacity: 0.85 }}>{d.label}{d.name ? ` · ${d.name}` : ''}</span>
          <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.25 }}>{d.kept >= 0 ? `You kept ${money(d.kept)} of what you earned.` : `You spent ${money(-d.kept)} more than came in.`}</span>
          <div className="row g8 wrap">
            <span className="pill">Kept {d.rate}%</span>
            <span className="pill">Score {d.score}</span>
            {d.budgets > 0 && <span className="pill">{d.budgets_kept} of {d.budgets} budgets kept</span>}
            {d.saved > 0 && <span className="pill">{money(d.saved)} auto-saved</span>}
          </div>
        </div>
        <div className="grid g-4">
          {[['Money in', d.in, d.prev_in], ['Money out', d.out, d.prev_out]].map(([l, v, p]) => {
            const ch = p ? Math.round((((v as number) - (p as number)) / (p as number)) * 100) : 0
            return <div key={l as string} className="card col g6"><span className="t2">{l}</span><span className="big num">{money(v as number)}</span><span className="xs mu">{ch >= 0 ? '+' : ''}{ch}% vs the month before</span></div>
          })}
        </div>
        <div className="grid g-2">
          <div className="card col g12">
            <span className="h3">Highlights</span>
            {d.highlights.map((h) => (
              <div key={h.title} className="row g12">
                <span className={'ic ' + h.tone} style={{ width: 36, height: 36, borderRadius: 11 }}><Icon name={h.icon} size={17} /></span>
                <span className="col g4"><span className="s w6">{h.title}</span><span className="xs mu">{h.body}</span></span>
              </div>
            ))}
          </div>
          <div className="card col g12">
            <span className="h3">Where it went</span>
            {cats.length ? <div className="row g16 wrap"><Donut data={cats} height={150} center={money(d.out, { compact: true })} /><Legend items={cats} total={cats.reduce((a, b) => a + b.value, 0)} /></div> : <span className="s mu">No spending this month.</span>}
          </div>
        </div>
        <div className="row g10 noprint">
          <button className="btn grow" onClick={listen}><Icon name="volume" size={18} />Listen</button>
          <button className="btn grow" onClick={share}><Icon name="send" size={18} />Share</button>
        </div>
      </>}
    </Shell>
  )
}
