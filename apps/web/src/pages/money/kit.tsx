// Small building blocks shared by the money and business pages.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../ui'
import './kit.css'

export type Tone = 'red' | 'green' | 'amber' | 'blue' | 'gray'

export const Back = ({ to, label }: { to: string; label: string }) => (
  <Link to={to} className="kit-back s w6 t2"><Icon name="chevl" size={16} />{label}</Link>
)

export const Row = ({ l, r, strong }: { l: ReactNode; r: ReactNode; strong?: boolean }) => (
  <div className="row between g12"><span className={'s ' + (strong ? 'w6' : 't2')}>{l}</span><span className={'num ' + (strong ? 'w7' : 's w6')}>{r}</span></div>
)

export const Prog = ({ pct, tone = 'red' }: { pct: number; tone?: Tone }) => (
  <div className="bar" style={{ height: 6 }}><i style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: tone === 'gray' ? 'var(--muted)' : `var(--${tone})` }} /></div>
)

export const Badge = ({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) => (
  <span className={'chip kit-badge ' + (tone === 'gray' ? '' : tone)}>{children}</span>
)

export const Ic = ({ name, tone = 'gray', size = 40 }: { name: string; tone?: Tone; size?: number }) => (
  <span className={'kit-ic ' + tone} style={{ width: size, height: size }}><Icon name={name} size={Math.round(size * 0.45)} /></span>
)

export const Tip = ({ icon = 'sparkles', tone = 'red', children, action }: { icon?: string; tone?: Tone; children: ReactNode; action?: ReactNode }) => (
  <div className={'soft row g10 kit-tip ' + tone}><Icon name={icon} size={18} color={`var(--${tone === 'gray' ? 'muted' : tone})`} /><span className="xs t2 grow">{children}</span>{action}</div>
)

export const Tile = ({ icon, tone, label, value, note }: { icon: string; tone: Tone; label: string; value: string; note?: string }) => (
  <div className="card col g8" style={{ padding: 16 }}>
    <Ic name={icon} tone={tone} size={34} />
    <span className="xs mu">{label}</span>
    <span className="h2 num">{value}</span>
    {note && <span className="xs t2">{note}</span>}
  </div>
)

export const Sandbox = ({ children }: { children: ReactNode }) => (
  <Tip icon="info" tone="gray">{children}</Tip>
)

export const date = (s: string | Date, year = false) => new Date(s).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) })
export const daysFrom = (s: string) => Math.round((new Date(s).getTime() - Date.now()) / 864e5)
export const num = (s: string) => Number(s.replace(/[^\d.]/g, '')) || 0
export const ask = (q: string) => '/ask?q=' + encodeURIComponent(q)
