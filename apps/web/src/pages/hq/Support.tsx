import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../../api'
import { useApp } from '../../store'
import { Icon, Modal, Skeleton, useLoad } from '../../ui'
import { Err, Meter } from '../console/Layout'
import { Empty, HKpi, HQShell, n } from './Layout'

type Ticket = { id: string; ref: string; kind: string; kind_label: string; subject: string; status: 'open' | 'resolved'; created_at: string; resolved_at: string | null; owner: string; mine: boolean }
type Support = { open: number; late: number; resolved_week: number; opened_week: number; first_reply_minutes?: number; queue: Ticket[]; topics: { subject: string; count: number }[] }
const FILTERS: [string, string][] = [['', 'All'], ['dispute', 'Disputes'], ['security', 'Security'], ['report', 'Reports'], ['question', 'Questions']]

function waiting(t: Ticket) {
  if (t.status === 'resolved') return ['Closed', 'green']
  const h = (Date.now() - new Date(t.created_at).getTime()) / 36e5
  const label = h < 1 ? Math.max(1, Math.round(h * 60)) + 'm' : h < 48 ? Math.round(h) + 'h' : Math.round(h / 24) + 'd'
  return [label, h >= 24 ? 'red' : h >= 8 ? 'amber' : '']
}
const minutes = (m: number) => (m < 60 ? Math.round(m) + ' min' : m < 2880 ? (m / 60).toFixed(1).replace('.0', '') + ' h' : Math.round(m / 1440) + ' days')

// Support is the queue of customer reports and disputes. It shows the reason
// and reference only; customer details stay in the bank's own systems.
export default function Support() {
  const { toast } = useApp()
  const [kind, setKind] = useState('')
  const { data: loaded, error } = useLoad<Support>('/hq/support?kind=' + kind)
  const [s, setS] = useState<Support | null>(null)
  const [adding, setAdding] = useState(false)
  useEffect(() => { if (loaded) setS(loaded) }, [loaded])
  const max = Math.max(1, ...(s?.topics || []).map((t) => t.count))

  const act = async (t: Ticket, action: 'take' | 'resolve') => {
    try { const r = await api<Support>('/hq/support/' + t.id, { method: 'PATCH', body: { action } }); setS(r); setKind(''); toast(action === 'take' ? `${t.ref} is yours` : `${t.ref} resolved`) } catch (e) { toast((e as Error).message) }
  }

  return (
    <HQShell area="support" title="Support and reports" sub="Disputes, questions and feedback from customers"
      right={<button className="btn pri sm" onClick={() => setAdding(true)}><Icon name="plus" size={16} color="#fff" />New ticket</button>}>
      <Err msg={error} />
      <div className="cgrid-4">
        {s ? <>
          <HKpi icon="headphones" label="Open reports" value={n(s.open)} note={s.late ? `${s.late} waiting over 24 hours` : 'None waiting over a day'} tone={s.late ? 'red' : 'pos'} />
          <HKpi icon="clock" label="First reply" value={s.first_reply_minutes != null ? minutes(s.first_reply_minutes) : '—'} note={s.first_reply_minutes != null ? 'Median, target under 1 hour' : 'No ticket taken yet'} tone={s.first_reply_minutes != null && s.first_reply_minutes <= 60 ? 'pos' : 'mu'} />
          <HKpi icon="check" label="Resolved this week" value={n(s.resolved_week)} note={`${n(s.opened_week)} opened this week`} tone="mu" />
          <HKpi icon="star" label="Customer rating" value="—" note="Not collected yet" tone="mu" />
        </> : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} h={128} />)}
      </div>

      <div className="grid g-21">
        <div className="card col" style={{ padding: 0 }}>
          <div className="row between wrap g8" style={{ padding: '16px 18px 6px' }}>
            <span className="h3">Queue</span>
            <div className="row g8 wrap">{FILTERS.map(([k, l]) => <button key={k} className={'chip' + (kind === k ? ' red' : '')} onClick={() => setKind(k)}>{l}</button>)}</div>
          </div>
          <div className="cscroll">
            <table className="tx">
              <thead><tr><th>Reference</th><th>Subject</th><th className="hide-sm">Type</th><th>Waiting</th><th className="hide-sm">Owner</th><th></th></tr></thead>
              <tbody>
                {s?.queue.map((t) => {
                  const [w, tone] = waiting(t)
                  return (
                    <tr key={t.id}>
                      <td className="num s w6" style={{ whiteSpace: 'nowrap' }}>{t.ref}</td>
                      <td className="s">{t.subject}</td>
                      <td className="hide-sm"><span className="chip">{t.kind_label}</span></td>
                      <td><span className={'chip ' + tone}>{w}</span></td>
                      <td className="t2 s hide-sm">{t.owner || 'Unassigned'}</td>
                      <td>{t.status === 'open' && <div className="row g6">
                        {!t.mine && <button className="btn sm ghost" onClick={() => act(t, 'take')}>Take</button>}
                        <button className="btn sm ghost" onClick={() => act(t, 'resolve')} aria-label={'Resolve ' + t.ref}><Icon name="check" size={14} /></button>
                      </div>}</td>
                    </tr>
                  )
                })}
                {s && !s.queue.length && <tr><td colSpan={6}><Empty icon="headphones" title="The queue is empty" body="Reports customers send from a payment, and disputes they open, land here." /></td></tr>}
                {!s && <tr><td colSpan={6}><Skeleton h={220} /></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card col g12">
          <span className="h3">What customers struggle with</span>
          {s ? s.topics.length ? s.topics.map((t) => (
            <div key={t.subject} className="cbars"><div className="row between"><span className="s">{t.subject}</span><span className="xs mu num">{t.count}</span></div><Meter p={(t.count / max) * 100} /></div>
          )) : <span className="s t2">No tickets in the last 30 days.</span> : <Skeleton h={160} />}
          <div className="soft row g10"><Icon name="lock" size={16} color="var(--green)" /><span className="xs t2 grow">Support sees the reason and reference only. Names, payees and chats stay out of HQ.</span></div>
        </div>
      </div>
      {adding && <NewTicket onClose={() => setAdding(false)} onDone={(r) => { setS(r); setKind(''); setAdding(false); toast('Ticket logged') }} />}
    </HQShell>
  )
}

function NewTicket({ onClose, onDone }: { onClose: () => void; onDone: (s: Support) => void }) {
  const [kind, setKind] = useState('question')
  const [subject, setSubject] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  async function save(e: FormEvent) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try { onDone(await api<Support>('/hq/support', { body: { kind, subject } })) } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <Modal onClose={onClose}>
      <form className="col g16" onSubmit={save}>
        <div className="col g4"><span className="h2">New ticket</span><span className="s t2">For something that came in by phone or email. Leave names, emails and account numbers out.</span></div>
        <div className="field"><label htmlFor="tkind">Type</label>
          <select id="tkind" className="input" value={kind} onChange={(e) => setKind(e.target.value)}><option value="question">Question</option><option value="feedback">Feedback</option><option value="security">Security</option><option value="report">Report</option></select>
        </div>
        <div className="field"><label htmlFor="tsub">Subject</label><input id="tsub" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={80} placeholder="Hausa voice sounds robotic" required autoFocus /></div>
        {err && <span className="err" role="alert">{err}</span>}
        <div className="row g8"><button type="button" className="btn grow" onClick={onClose}>Cancel</button><button className="btn pri grow" disabled={busy}>Log ticket</button></div>
      </form>
    </Modal>
  )
}
