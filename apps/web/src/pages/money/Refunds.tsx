import { useState } from 'react'
import { api, type Tx } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Icon, Modal, Skeleton, useLoad, when } from '../../ui'
import { Back, Badge, Prog, Tile, date, type Tone } from './kit'

type Dispute = { id: string; title: string; reason: string; detail: string; amount: number; status: string; label: string; created_at: string; paid_at: string }
type Disputes = { items: Dispute[]; refunded: number; refunded_count: number; open: number; open_count: number }

const tone: Record<string, [Tone, number]> = { review: ['amber', 60], investigating: ['amber', 35], refunded: ['green', 100], reversed: ['green', 100], declined: ['red', 100] }
const reasons = ['Item not delivered', 'Charged twice', 'Wrong amount', 'Service cancelled, still charged', 'Failed transfer, money not received', 'I did not make this payment']

export default function Refunds() {
  const { toast } = useApp()
  const money = useMoney()
  const { data: d, reload } = useLoad<Disputes>('/disputes')
  const [open, setOpen] = useState(false)
  const txs = useLoad<Tx[]>(open ? '/transactions?limit=40' : null).data?.filter((t) => t.direction === 'debit')
  const [pick, setPick] = useState<Tx | null>(null)
  const [reason, setReason] = useState(reasons[0])
  const [detail, setDetail] = useState('')
  const [busy, setBusy] = useState(false)

  const close = () => { setOpen(false); setPick(null); setDetail('') }
  const submit = async () => {
    if (!pick) return
    setBusy(true)
    try {
      await api('/disputes', { body: { transaction_id: pick.id, reason, detail } })
      toast('Claim opened. Zenith will update you here.')
      close()
      reload()
    } catch (e) { toast((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Shell title="Refunds" sub="Disputes and money you are owed back" right={<button className="ib" onClick={() => setOpen(true)} aria-label="New claim"><Icon name="plus" /></button>}>
      <Back to="/money" label="Loans and savings" />
      <div className="grid g-2">
        {d ? <>
          <Tile icon="undo" tone="green" label="Refunded this year" value={money(d.refunded)} note={`${d.refunded_count} refund${d.refunded_count === 1 ? '' : 's'}`} />
          <Tile icon="clock" tone="amber" label="In progress" value={money(d.open)} note={`${d.open_count} claim${d.open_count === 1 ? '' : 's'}`} />
        </> : <><Skeleton h={140} /><Skeleton h={140} /></>}
      </div>
      <div className="row between"><span className="h3">Claims</span><button className="btn sm" onClick={() => setOpen(true)}><Icon name="plus" size={16} />Dispute a payment</button></div>
      <div className="grid g-2">
        {d?.items.map((c) => {
          const [t, pct] = tone[c.status] || ['gray', 50]
          return (
            <div key={c.id} className="card col g10 flat">
              <div className="row g12">
                <span className="col g4 grow"><span className="s w6">{c.title}</span><span className="xs mu">{c.reason} · paid {date(c.paid_at)}</span></span>
                <span className="col g4" style={{ alignItems: 'flex-end' }}><span className="s w6 num">{money(c.amount)}</span><Badge tone={t}>{c.label}</Badge></span>
              </div>
              {pct < 100 && <Prog pct={pct} tone="amber" />}
            </div>
          )
        })}
        {d && !d.items.length && <div className="card flat t2">No claims yet. Dispute a payment if something went wrong.</div>}
      </div>

      {open && (
        <Modal onClose={close}>
          <div className="col g16">
            <div className="row between"><span className="h2">{pick ? 'What went wrong?' : 'Pick the payment'}</span><button className="ib" onClick={close} aria-label="Close"><Icon name="x" /></button></div>
            {!pick ? (
              <div className="col kit-list" style={{ maxHeight: 380, overflowY: 'auto' }}>
                {txs ? txs.map((t) => (
                  <button key={t.id} className="row g12 kit-click" style={{ border: 0, padding: '10px 4px' }} onClick={() => setPick(t)}>
                    <span className="col grow"><span className="s w6">{t.merchant}</span><span className="xs mu">{t.category} · {when(t.at)}</span></span>
                    <span className="s num w6">{money(t.amount)}</span>
                  </button>
                )) : <Skeleton h={200} />}
              </div>
            ) : (
              <>
                <div className="soft row between"><span className="col"><span className="s w6">{pick.merchant}</span><span className="xs mu">{when(pick.at)}</span></span><span className="w6 num">{money(pick.amount)}</span></div>
                <div className="field"><label htmlFor="reason">Reason</label>
                  <select id="reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>{reasons.map((r) => <option key={r}>{r}</option>)}</select>
                </div>
                <div className="field"><label htmlFor="detail">Anything else? (optional)</label>
                  <textarea id="detail" className="input" maxLength={500} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Order number, what the merchant said" />
                </div>
                <div className="kit-actions"><button className="btn" onClick={() => setPick(null)}>Back</button><button className="btn pri" disabled={busy} onClick={submit}>Open claim</button></div>
              </>
            )}
          </div>
        </Modal>
      )}
    </Shell>
  )
}
