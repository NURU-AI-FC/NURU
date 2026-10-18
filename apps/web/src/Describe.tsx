import { useState } from 'react'
import { api, type Pending, type PendingTx } from './api'
import { useApp, useMoney } from './store'
import { Icon } from './ui'

// NURU asks what a payment was for when it came with no description, and saves
// the answer encrypted so later advice can tell salary from a loan or a sale.
export const IN_LABELS = ['Salary', 'Business sale', 'Family support', 'Refund', 'Loan', 'Other']
export const OUT_LABELS = ['Food', 'Transport', 'Shopping', 'Bills', 'Family', 'Other']

export type Described = Pending & { label: string; purpose: string; category: string }

export const when = (at: string) => {
  const d = new Date(at), days = Math.floor((Date.now() - d.getTime()) / 864e5)
  const t = d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase()
  return days < 1 && d.getDate() === new Date().getDate() ? `Today ${t}` : d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })
}

export const askLine = (p: PendingTx, money: (n: number) => string) => p.direction === 'credit'
  ? `You received ${money(p.amount)} from ${p.merchant} ${when(p.at).startsWith('Today') ? 'today' : 'on ' + when(p.at)}, but it came with no description. What was it for? I will remember it when I plan your month.`
  : `${money(p.amount)} left your ${p.account} account at ${p.merchant} ${when(p.at).startsWith('Today') ? 'today' : 'on ' + when(p.at)} with no description. What was it for?`

export function DescribeCard({ item, onSaved, onUnknown, initial }: {
  item: PendingTx; onSaved: (r: Described) => void; onUnknown?: () => void; initial?: { label: string; purpose: string }
}) {
  const money = useMoney()
  const { toast } = useApp()
  const credit = item.direction === 'credit'
  const [label, setLabel] = useState(initial?.label || '')
  const [purpose, setPurpose] = useState(initial?.purpose || '')
  const [busy, setBusy] = useState(false)
  const ok = !!label || purpose.trim().length >= 2
  async function save() {
    setBusy(true)
    try { onSaved(await api<Described>(`/transactions/${item.id}/describe`, { body: { label, purpose: purpose.trim() } })) } catch (e) { toast((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <div className="card col g12 dcard">
      <div className="row between"><span className="xs mu w6 upper">Needs a description</span><span className={'chip ' + (credit ? 'green' : 'red')}>{credit ? 'Money in' : 'Money out'}</span></div>
      <div className="row g12">
        <span className="tile" style={{ width: 40, height: 40, borderRadius: 12, background: credit ? 'var(--green50)' : 'var(--red50)', color: credit ? 'var(--green)' : 'var(--red)' }}><Icon name={credit ? 'down' : 'up'} size={18} /></span>
        <span className="col g4 grow" style={{ minWidth: 0 }}><span className="s w6">{item.merchant}</span><span className="xs mu">{when(item.at)} · {item.account} · no narration</span></span>
        <span className="s w6 num" style={{ color: credit ? 'var(--green)' : undefined, whiteSpace: 'nowrap' }}>{credit ? '+' : '-'}{money(item.amount)}</span>
      </div>
      <div className="row g6 wrap" role="radiogroup" aria-label="What was it for">
        {(credit ? IN_LABELS : OUT_LABELS).map((l) => <button key={l} type="button" role="radio" aria-checked={label === l} className={'chip' + (label === l ? ' on' : '')} onClick={() => setLabel(label === l ? '' : l)}>{l}</button>)}
      </div>
      <input className="input" style={{ height: 44 }} maxLength={200} placeholder="Describe it in your own words" aria-label="Describe it in your own words" value={purpose} onChange={(e) => setPurpose(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && ok) save() }} />
      <div className="row g8">
        <button className="btn pri sm grow" disabled={!ok || busy} onClick={save}>{busy ? 'Saving…' : 'Save description'}</button>
        {onUnknown && !credit && <button className="btn sm ghost" onClick={onUnknown}>I don't know this</button>}
      </div>
      <span className="row g6 xs mu"><Icon name="lock" size={12} />Encrypted. Only you and NURU can read it.</span>
    </div>
  )
}
