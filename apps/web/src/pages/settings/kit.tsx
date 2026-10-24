import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { User } from '../../api'
import { BANK } from '../../bank'
import { Icon } from '../../ui'
import './kit.css'

export const Toggle = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button type="button" className={'k-tgl' + (on ? ' on' : '')} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}><i /></button>
)

export const Radio = ({ on }: { on: boolean }) => <span className={'k-radio' + (on ? ' on' : '')} aria-hidden="true" />

export const Ic = ({ name, tone = '', size = 18, lg = false }: { name: string; tone?: string; size?: number; lg?: boolean }) => (
  <span className={'k-ic ' + tone + (lg ? ' lg' : '')}><Icon name={name} size={lg ? 26 : size} /></span>
)

// Item is one settings row; it links when given a route.
export function Item({ icon, title, sub, to, onClick, right, tone = '' }: { icon: string; title: string; sub?: ReactNode; to?: string; onClick?: () => void; right?: ReactNode; tone?: string }) {
  const body = (
    <>
      <Ic name={icon} tone={tone} size={17} />
      <span className="col g4 grow"><span className="s w6">{title}</span>{sub && <span className="xs mu">{sub}</span>}</span>
      {right}
      {(to || onClick) && <Icon name="chevr" color="var(--muted)" />}
    </>
  )
  if (to) return <Link to={to} className="k-item">{body}</Link>
  if (onClick) return <button type="button" className="k-item" onClick={onClick}>{body}</button>
  return <div className="k-item">{body}</div>
}

// Top is the back arrow and step counter above a flow screen.
export function Top({ back, step, total = 4, onBack }: { back?: string; step?: number; total?: number; onBack?: () => void }) {
  const nav = useNavigate()
  return (
    <div className="col g10">
      <div className="k-flow-top">
        <button className="ib" aria-label="Back" onClick={() => onBack ? onBack() : back ? nav(back) : nav(-1)}><Icon name="chevl" /></button>
        <span className="grow" />
        {step !== undefined && <span className="xs mu">{step} of {total}</span>}
      </div>
      {step !== undefined && <div className="bar" style={{ height: 6 }}><i style={{ width: (step / total) * 100 + '%' }} /></div>}
    </div>
  )
}

export function Done({ icon = 'check', title, body, children }: { icon?: string; title: string; body: ReactNode; children?: ReactNode }) {
  return (
    <div className="col center g20" style={{ textAlign: 'center', padding: '24px 0' }}>
      <div className="k-done-ring"><span><Icon name={icon} size={40} color="#fff" stroke={2.6} /></span></div>
      <div className="col center g8"><h2 className="h1" style={{ fontSize: 30 }}>{title}</h2><span className="t2" style={{ fontSize: 15, maxWidth: 420 }}>{body}</span></div>
      {children}
    </div>
  )
}

export const BANKS: [string, string, string][] = [
  [BANK.name, '#E30613', BANK.name[0]], ['Access Bank', '#F57C00', 'A'], ['GTBank', '#DD4F05', 'G'], ['First Bank', '#0B3B7A', 'F'],
  ['UBA', '#C8102E', 'U'], ['Kuda', '#40196D', 'K'], ['OPay', '#1DCF9F', 'O'], ['Moniepoint', '#0357EE', 'M'],
]
export function bankLook(name: string): [string, string] {
  const b = BANKS.find(([n]) => n === name)
  return b ? [b[1], b[2]] : ['#3f3f46', name[0] || '?']
}
export const BankLogo = ({ bank, sm = false }: { bank: string; sm?: boolean }) => {
  const [c, l] = bankLook(bank)
  return <span className={'k-blogo' + (sm ? ' sm' : '')} style={{ background: c }}>{l}</span>
}

export const hasPasskey = () => { try { return !!localStorage.getItem('nuru.passkey') } catch { return false } }

// createPasskey registers a platform passkey on this device. The sandbox keeps
// only a flag; production would send the public key to the API to verify later.
export async function createPasskey(user: User) {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'NURU' },
    user: { id: new TextEncoder().encode(user.id), name: user.email, displayName: user.name },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { userVerification: 'required', residentKey: 'preferred' }, timeout: 60000,
  } })
  if (!cred) return false
  try { localStorage.setItem('nuru.passkey', (cred as PublicKeyCredential).id) } catch { /* private mode */ }
  return true
}

export const ago = (at: string | null | undefined) => {
  if (!at) return ''
  const s = (Date.now() - new Date(at).getTime()) / 1000
  if (s < 120) return 'just now'
  if (s < 3600) return Math.round(s / 60) + ' minutes ago'
  if (s < 86400) return Math.round(s / 3600) + ' hours ago'
  const d = Math.round(s / 86400)
  if (d < 30) return d === 1 ? 'yesterday' : d + ' days ago'
  const m = Math.round(d / 30)
  return m === 1 ? 'a month ago' : m + ' months ago'
}

export type Prefs = { voice: 'female' | 'male'; speed: 'slow' | 'normal' | 'fast'; read_aloud: boolean; hold_to_talk: boolean; save_chats: boolean; use_insights: boolean; improve: boolean; login_alerts: boolean }
