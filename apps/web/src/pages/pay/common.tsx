import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Account } from '../../api'
import { BANK } from '../../bank'
import type { Receipt } from '../../Guard'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Icon, Skeleton } from '../../ui'
import './Pay.css'

export const BANKS = [BANK.name, 'GTBank', 'Access Bank', 'First Bank', 'UBA', 'OPay', 'Kuda', 'Moniepoint', 'PalmPay', 'Wema Bank']
const TONES = ['var(--red)', 'var(--blue)', 'var(--green)', 'var(--amber)', 'var(--c7)', 'var(--c2)']

export const initials = (n: string) => n.split(/[\s,()]+/).filter((w) => /^\p{L}/u.test(w)).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
const tone = (n: string) => TONES[[...n].reduce((s, c) => s + c.charCodeAt(0), 0) % TONES.length]

export const Avatar = ({ name, size = 40 }: { name: string; size?: number }) => (
  <span className="av" style={{ width: size, height: size, background: tone(name), fontSize: size * 0.33 }}>{initials(name)}</span>
)

// Sub is the page frame for every screen under Pay, with a way back to the hub.
export function Sub({ title, sub, right, children, onBack }: { title: string; sub?: string; right?: ReactNode; children: ReactNode; onBack?: () => void }) {
  return (
    <Shell title={title} sub={sub} right={right}>
      <div className="col g16 paysub">
        {onBack
          ? <button className="row g6 s t2 payback paylink" onClick={onBack}><Icon name="chevl" size={16} />Back</button>
          : <Link to="/pay" className="row g6 s t2 payback"><Icon name="chevl" size={16} />Pay</Link>}
        {children}
      </div>
    </Shell>
  )
}

export function AccountSelect({ accts, value, onChange, id = 'from' }: { accts?: Account[]; value: string; onChange: (id: string) => void; id?: string }) {
  const money = useMoney()
  if (!accts) return <Skeleton h={46} />
  return (
    <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      {accts.map((a) => <option key={a.id} value={a.id}>{a.name} {a.number} · {money(a.balance)}</option>)}
    </select>
  )
}

export const Line = ({ l, r }: { l: ReactNode; r: ReactNode }) => (
  <div className="row between g12"><span className="s t2">{l}</span><span className="s" style={{ textAlign: 'right' }}>{r}</span></div>
)

const fmtDate = (at?: string) => new Date(at || Date.now()).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

// ReceiptView is the full receipt after any payment: details, copy, share and download.
export function ReceiptView({ r, title = 'Sent', detail, onDone }: { r: Receipt; title?: string; detail?: string; onDone: () => void }) {
  const money = useMoney()
  const { toast } = useApp()
  const text = [`NURU receipt (sandbox)`, `${title}: ${money(r.amount)} to ${r.to}`, `Reference: ${r.reference}`, r.session_id ? `Session ID: ${r.session_id}` : '', `Date: ${fmtDate(r.at)}`, `Fee: ${money(r.fee || 0)}`, 'Status: Successful'].filter(Boolean).join('\n')
  const copy = async (s: string, what: string) => { try { await navigator.clipboard.writeText(s); toast(what + ' copied') } catch { toast('Could not copy') } }
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: 'NURU receipt', text }) } catch { /* closed */ } return }
    copy(text, 'Receipt')
  }
  function download() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    a.download = `${r.reference}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  return (
    <div className="col g16" style={{ maxWidth: 460, width: '100%', margin: '0 auto' }}>
      <div className="col center g8" style={{ textAlign: 'center' }}>
        <span className="tile" style={{ width: 80, height: 80, borderRadius: 40, background: 'var(--green50)', color: 'var(--green)' }}><Icon name="check" size={40} stroke={2.6} /></span>
        <span className="h2">{title}</span>
        <span className="num payamt">{money(r.amount)}</span>
        <span className="s t2">to {r.to}{detail ? ` · ${detail}` : ''}</span>
      </div>
      <div className="card col g12">
        <Line l="Reference" r={<button className="row g6 s w6 paylink" onClick={() => copy(r.reference, 'Reference')}>{r.reference}<Icon name="copy" size={14} /></button>} />
        {r.session_id && <Line l="Session ID" r={<span className="num">{r.session_id}</span>} />}
        <Line l="Date" r={fmtDate(r.at)} />
        <Line l="Fee" r={money(r.fee || 0)} />
        <Line l="Status" r={<span className="chip green">Successful</span>} />
      </div>
      <div className="row g10">
        <button className="btn grow" onClick={download}><Icon name="download" size={18} />Receipt</button>
        <button className="btn grow" onClick={share}><Icon name="send" size={18} />Share</button>
      </div>
      <button className="btn pri block" onClick={onDone}>Done</button>
      <span className="xs mu center row g6"><Icon name="info" size={12} />Sandbox payment. No real money moved.</span>
    </div>
  )
}
