import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useApp } from '../../store'
import { Icon, Skeleton, useLoad } from '../../ui'
import { Err } from '../console/Layout'
import { AuditLog, InviteModal, initials, stamp, type Person, type TeamData } from '../team'
import { HQShell } from './Layout'

const ROLE_INFO: [string, string, string][] = [
  ['owner', 'Everything, including the team', 'red'], ['ops', 'Overview, health, support, emails', 'blue'], ['support', 'Support queue and masked reports', 'amber'],
  ['engineer', 'Platform health and releases', ''], ['analyst', 'Overview and emails, read only', 'green'],
]

// Team is where the HQ owner decides who on the NURU team sees what.
export default function Team() {
  const { toast } = useApp()
  const { data: loaded, error } = useLoad<TeamData>('/hq/team')
  const [data, setData] = useState<TeamData | null>(null)
  const [invite, setInvite] = useState(false)
  useEffect(() => { if (loaded) setData(loaded) }, [loaded])

  const save = async (p: Person, body: { role?: string } | null) => {
    if (!body && !confirm(`Remove ${p.name} from NURU HQ? They are signed out straight away.`)) return
    try {
      setData(await api<TeamData>('/hq/team/' + p.id, body ? { method: 'PATCH', body } : { method: 'DELETE' }))
      toast(body ? 'Role changed. It applies straight away.' : p.name + ' removed')
    } catch (e) { toast((e as Error).message) }
  }

  return (
    <HQShell area="team" title="Team and access" sub="Who can see what inside NURU HQ">
      <Err msg={error} />
      <div className="grid g-21">
        <div className="card col" style={{ padding: 0 }}>
          <div className="row between wrap g8" style={{ padding: '16px 18px 6px' }}>
            <div className="col g4"><span className="h3">NURU team</span><span className="xs mu">Everyone signs in with a one time code sent to their email</span></div>
            <button className="btn pri sm" onClick={() => setInvite(true)}><Icon name="plus" size={16} color="#fff" />Invite</button>
          </div>
          <div className="cscroll">
            <table className="tx">
              <thead><tr><th>Name</th><th>Role</th><th className="hide-sm">Sign in</th><th className="hide-sm">Last active</th><th></th></tr></thead>
              <tbody>
                {data?.people.map((p) => (
                  <tr key={p.id}>
                    <td><div className="row g10"><span className="av" style={{ width: 30, height: 30, fontSize: 11 }}>{initials(p.name)}</span><div className="col"><span className="w6 s">{p.name}{p.me && <span className="xs mu"> · you</span>}</span><span className="xs mu">{p.email}</span></div></div></td>
                    <td>{p.me ? <span className="chip">{p.role_label}</span> : (
                      <select className="input tsel" value={p.role} onChange={(e) => save(p, { role: e.target.value })} aria-label={'Role for ' + p.name}>
                        {Object.entries(data.roles).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                    )}</td>
                    <td className="t2 s hide-sm">{p.sign_in}</td>
                    <td className="t2 s hide-sm">{p.status === 'Invited' ? '—' : stamp(p.last_active)}</td>
                    <td>{!p.me && <button className="btn sm ghost" onClick={() => save(p, null)} aria-label={'Remove ' + p.name} title="Remove"><Icon name="trash" size={15} /></button>}</td>
                  </tr>
                ))}
                {!data && <tr><td colSpan={5}><Skeleton h={200} /></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card col g10">
          <span className="h3">Roles</span>
          {ROLE_INFO.map(([k, d, tone]) => (
            <div key={k} className="rolecard"><span className={'tile ' + tone} style={{ width: 32, height: 32 }}><Icon name="key" size={15} /></span><div className="col g4 grow"><span className="s w6">{data?.roles[k] || k}</span><span className="xs mu">{d}</span></div></div>
          ))}
        </div>
      </div>
      {data ? <AuditLog rows={data.audit} file="nuru-hq-audit.csv" /> : <Skeleton h={200} />}
      {invite && data && <InviteModal roles={data.roles} path="/hq/team" onClose={() => setInvite(false)} onDone={(d) => { setData(d); setInvite(false); toast('Invite sent') }} />}
    </HQShell>
  )
}
