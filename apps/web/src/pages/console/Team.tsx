import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useApp } from '../../store'
import { Icon, Skeleton, useLoad } from '../../ui'
import { AuditLog, InviteModal, type Person, type TeamData } from '../team'
import { ConsoleShell, Err } from './Layout'

const ROLE_INFO: [string, string][] = [
  ['viewer', 'Overview and segments'], ['analyst', 'Adds customer view and CSV export'], ['campaigns', 'Creates campaigns, sent for approval'],
  ['risk', 'Risk, AI safety and fraud signals'], ['admin', 'Invites staff and approves campaigns'],
]
const RULES = ['Segments under 50 customers are hidden', 'Customer view needs the customer’s consent', 'Exports are masked and expire after 7 days', 'Access ends automatically after 90 days unused']

// Team is where a console admin decides who at Zenith can use the console.
export default function Team() {
  const { toast } = useApp()
  const { data: loaded, error } = useLoad<TeamData>('/console/team')
  const [data, setData] = useState<TeamData | null>(null)
  const [invite, setInvite] = useState(false)
  useEffect(() => { if (loaded) setData(loaded) }, [loaded])

  const change = async (p: Person, body: { role?: string; active?: boolean }) => {
    try { setData(await api<TeamData>('/console/team/' + p.id, { method: 'PATCH', body })); toast('Saved. The change applies straight away.') } catch (e) { toast((e as Error).message) }
  }

  return (
    <ConsoleShell title="Team and access" sub="Who at Zenith can use the console">
      <Err msg={error} />
      <div className="grid g-21">
        <div className="card col" style={{ padding: 0 }}>
          <div className="row between wrap g8" style={{ padding: '16px 18px 6px' }}>
            <div className="col g4"><span className="h3">Zenith staff with access</span><span className="xs mu">Only @zenithbank.com accounts can be invited</span></div>
            <button className="btn pri sm" onClick={() => setInvite(true)}><Icon name="plus" size={16} color="#fff" />Invite staff</button>
          </div>
          <div className="cscroll">
            <table className="tx">
              <thead><tr><th>Name</th><th className="hide-sm">Work email</th><th>Role</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {data?.people.map((p) => (
                  <tr key={p.id}>
                    <td><div className="col g4"><span className="w6 s">{p.name}{p.me && <span className="xs mu"> · you</span>}</span><span className="xs mu show-sm">{p.email}</span></div></td>
                    <td className="t2 s hide-sm">{p.email}</td>
                    <td>{p.me || p.status === 'Deactivated' ? <span className="chip">{p.role_label}</span> : (
                      <select className="input tsel" value={p.role} onChange={(e) => change(p, { role: e.target.value })} aria-label={'Role for ' + p.name}>
                        {Object.entries(data.roles).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                    )}</td>
                    <td><span className={'chip ' + (p.status === 'Active' ? 'green' : p.status === 'Invited' ? 'amber' : '')}>{p.status}</span></td>
                    <td>{!p.me && (p.status === 'Deactivated'
                      ? <button className="btn sm ghost" onClick={() => change(p, { active: true })}>Turn on</button>
                      : <button className="btn sm ghost" onClick={() => change(p, { active: false })} aria-label={'Deactivate ' + p.name}>Deactivate</button>)}</td>
                  </tr>
                ))}
                {!data && <tr><td colSpan={5}><Skeleton h={200} /></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card col g10">
          <span className="h3">Roles</span>
          {ROLE_INFO.map(([k, d]) => (
            <div key={k} className="rolecard"><Icon name="key" size={16} color="var(--red)" /><div className="col g4 grow"><span className="s w6">{data?.roles[k] || k}</span><span className="xs mu">{d}</span></div></div>
          ))}
        </div>
      </div>
      <div className="grid g-2">
        <div className="card col g10">
          <span className="h3">Access rules</span>
          {RULES.map((t) => <div key={t} className="row g10"><Icon name="check" size={16} color="var(--green)" /><span className="s">{t}</span></div>)}
        </div>
        {data ? <AuditLog rows={data.audit} file="nuru-console-audit.csv" /> : <Skeleton h={220} />}
      </div>
      {invite && data && <InviteModal roles={data.roles} path="/console/team" domain="@zenithbank.com" onClose={() => setInvite(false)} onDone={(d) => { setData(d); setInvite(false); toast('Invite sent') }} />}
    </ConsoleShell>
  )
}
