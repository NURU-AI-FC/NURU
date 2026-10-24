import { useState, type FormEvent } from 'react'
import { api } from '../api'
import { Icon, Modal } from '../ui'

// Shared pieces of the two Team and access pages: HQ for the NURU team and
// the console for bank staff.

export type Person = {
  id: string; name: string; email: string; role: string; role_label: string; status: 'Active' | 'Invited' | 'Deactivated'
  sign_in: string; last_active: string | null; invited_at: string | null; me: boolean
}
export type AuditRow = { actor: string; action: string; detail: string; at: string }
export type TeamData = { people: Person[]; roles: Record<string, string>; audit: AuditRow[] }

const VERB: Record<string, (d: string) => string> = {
  signed_in: () => 'signed in',
  invited: (d) => 'invited ' + d,
  role_changed: (d) => 'changed ' + d,
  deactivated: (d) => 'turned off access for ' + d,
  removed: (d) => 'removed ' + d + ' from HQ',
  reactivated: (d) => 'turned access back on for ' + d,
  customer_viewed: (d) => 'opened customer ' + d,
  exported: (d) => 'exported ' + d,
  export_downloaded: () => 'downloaded an export again',
  campaign_drafted: (d) => `saved campaign “${d}” as a draft`,
  campaign_for_approval: (d) => `sent campaign “${d}” for approval`,
  campaign_pending: (d) => `sent campaign “${d}” for approval`,
  campaign_approved: (d) => `approved campaign “${d}”`,
  campaign_sent: (d) => `marked campaign “${d}” as sent`,
  campaign_stopped: (d) => `stopped campaign “${d}”`,
  ticket_created: (d) => 'logged ticket ' + d,
  ticket_taken: (d) => 'took ticket ' + d,
  ticket_resolved: (d) => 'resolved ticket ' + d,
}

export function auditText(a: AuditRow) {
  return `${a.actor || 'Someone'} ${(VERB[a.action] || ((d: string) => a.action.replace(/_/g, ' ') + (d ? ' ' + d : '')))(a.detail)}`
}

export function stamp(at: string | null) {
  if (!at) return '—'
  const d = new Date(at), now = new Date()
  const mins = Math.round((now.getTime() - d.getTime()) / 60000)
  if (mins < 2) return 'Now'
  if (mins < 60) return mins + ' min ago'
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })
  if (mins < 2880) return 'Yesterday'
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

const clock = (at: string) => {
  const d = new Date(at)
  return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

function csvOf(rows: AuditRow[]) {
  const q = (s: string) => '"' + s.replace(/"/g, '""') + '"'
  return ['Time,Event', ...rows.map((a) => q(new Date(a.at).toISOString()) + ',' + q(auditText(a)))].join('\n')
}

export function AuditLog({ rows, file }: { rows: AuditRow[]; file: string }) {
  const save = () => {
    const url = URL.createObjectURL(new Blob([csvOf(rows)], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = file
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="card col g10">
      <div className="row between"><span className="h3">Audit log</span>{rows.length > 0 && <button className="chip" onClick={save}><Icon name="download" size={14} />Export</button>}</div>
      {rows.length ? rows.slice(0, 12).map((a, i) => (
        <div key={i} className="audit"><span className="xs mu num t">{clock(a.at)}</span><span className="s">{auditText(a)}</span></div>
      )) : <span className="s t2">Nothing logged yet.</span>}
    </div>
  )
}

export const initials = (n: string) => n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

export function InviteModal({ roles, path, domain, onClose, onDone }: { roles: Record<string, string>; path: string; domain?: string; onClose: () => void; onDone: (d: TeamData) => void }) {
  const keys = Object.keys(roles)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState(keys.includes('viewer') ? 'viewer' : keys.includes('analyst') ? 'analyst' : keys[0])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  async function send(e: FormEvent) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try { onDone(await api<TeamData>(path, { body: { email, name, role } })) } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <Modal onClose={onClose}>
      <form className="col g16" onSubmit={send}>
        <div className="col g4"><span className="h2">Invite someone</span><span className="s t2">They sign in with a one time code sent to this email.{domain ? ` Only ${domain} emails can be invited.` : ''}</span></div>
        <div className="field"><label htmlFor="iemail">Work email</label><input id="iemail" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={domain ? 'name' + domain : 'name@nuru.app'} required autoFocus /></div>
        <div className="field"><label htmlFor="iname">Name <span className="mu">(optional)</span></label><input id="iname" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
        <div className="field"><label htmlFor="irole">Role</label>
          <select id="irole" className="input" value={role} onChange={(e) => setRole(e.target.value)}>{keys.map((k) => <option key={k} value={k}>{roles[k]}</option>)}</select>
        </div>
        {err && <span className="err" role="alert">{err}</span>}
        <div className="row g8"><button type="button" className="btn grow" onClick={onClose}>Cancel</button><button className="btn pri grow" disabled={busy}>{busy ? 'Sending…' : 'Send invite'}</button></div>
      </form>
    </Modal>
  )
}
