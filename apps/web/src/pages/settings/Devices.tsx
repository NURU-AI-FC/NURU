import { api } from '../../api'
import { Shell } from '../../Shell'
import { useApp } from '../../store'
import { Icon, Skeleton, useLoad } from '../../ui'
import { ago, Ic, Top } from './kit'

type Session = { id: string; device: string; ip: string; created_at: string; last_seen_at: string; revoked_at: string | null; current: boolean }

const iconFor = (d: string) => /iphone|android|ipad/i.test(d) || /samsung|phone/i.test(d) ? 'phone' : 'laptop'

export default function Devices() {
  const { t, toast } = useApp()
  const { data, reload } = useLoad<Session[]>('/me/sessions')
  const others = (data || []).filter((s) => !s.current && !s.revoked_at)

  async function remove(id: string) {
    try { await api('/me/sessions/' + id, { method: 'DELETE' }); toast('Device signed out'); reload() } catch (e) { toast((e as Error).message) }
  }
  async function all() {
    try { const r = await api<{ revoked: number }>('/me/sessions', { method: 'DELETE' }); toast(r.revoked ? `Signed out ${r.revoked} other device${r.revoked === 1 ? '' : 's'}` : 'No other devices were signed in'); reload() } catch (e) { toast((e as Error).message) }
  }

  return (
    <Shell title={t('devices')} sub="Devices and sessions">
      <div className="k-flow">
        <Top back="/settings/security" />
        <span className="t2">Devices that signed in to NURU. Remove any you don’t recognise.</span>
        {!data ? <Skeleton h={180} /> : data.map((s) => {
          const live = !s.revoked_at
          return (
            <div key={s.id} className="card row g12" style={{ padding: 14, opacity: live ? 1 : .7 }}>
              <Ic name={iconFor(s.device)} tone={s.current ? 'red' : ''} />
              <span className="col g4 grow">
                <span className="s w6">{s.device}</span>
                <span className="xs mu">{s.current ? 'This device · ' : ''}IP {s.ip || 'unknown'} · first seen {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                <span className={'xs ' + (s.current ? 'pos w6' : 'mu')}>{s.current ? 'Active now' : live ? 'Active ' + ago(s.last_seen_at) : 'Signed out ' + ago(s.revoked_at)}</span>
              </span>
              {s.current ? <span className="chip green">This device</span> : live ? <button className="btn sm" onClick={() => remove(s.id)}>Remove</button> : null}
            </div>
          )
        })}
        {data && !data.some((s) => s.current) && <span className="xs mu">This browser signed in before device tracking. Sign in again to see it here.</span>}
        <div className="soft col g8"><div className="row g8"><Icon name="alert" size={16} color="var(--amber)" /><span className="s w6">New device rule</span></div>
          <span className="xs t2">A new device needs your password and a one time code to sign in, and every transfer from it still needs your PIN and a face check.</span></div>
        <div className="k-flow-cta"><button className="btn pri block" onClick={all} disabled={!others.length}>Sign out of all other devices</button></div>
      </div>
    </Shell>
  )
}
