import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../../Shell'
import { useMoney } from '../../store'
import { Icon, Skeleton, useLoad } from '../../ui'
import { Back, Badge, Ic, Tile, ask, date, type Tone } from './kit'

export type Policy = { id: string; kind: string; provider: string; plan: string; policy_no: string; cover: number; premium: number; excess: number; renews_at: string; status: string }
type Ins = {
  policies: Policy[]; covered: number; premiums_due: number
  claims: { id: string; kind: string; provider: string; description: string; amount: number; status: string; created_at: string }[]
  gap?: { kind: string; dependants: number; cover: number; monthly: number }
}
export const kindIcon: Record<string, [string, Tone, string]> = { health: ['heart', 'red', 'Health'], car: ['car', 'blue', 'Car'], shop: ['building', 'gray', 'Shop'], life: ['shield', 'green', 'Life'] }

export default function Insurance() {
  const money = useMoney()
  const d = useLoad<Ins>('/insurance').data
  const [hide, setHide] = useState(false)

  return (
    <Shell title="Insurance" sub="Your policies, renewals and claims">
      <Back to="/money" label="Loans and savings" />
      <div className="grid g-2">
        {d ? <>
          <Tile icon="umbrella" tone="green" label="Covered for" value={money(d.covered)} note={`${d.policies.length} policies`} />
          <Tile icon="calendar" tone="amber" label="Premiums due" value={money(d.premiums_due)} note="next 30 days" />
        </> : <><Skeleton h={140} /><Skeleton h={140} /></>}
      </div>
      <div className="grid g-21">
        <div className="col g12">
          {d?.policies.map((p) => {
            const [ic, tone, label] = kindIcon[p.kind] || ['shield', 'gray', p.kind]
            return (
              <div key={p.id} className="card row g12 wrap" style={{ padding: 16 }}>
                <Ic name={ic} tone={tone} />
                <span className="col g4 grow"><span className="s w6">{label} · {p.provider}</span><span className="xs mu">{p.plan}</span><span className="xs t2">Renews {date(p.renews_at)} · {money(p.premium)} a month</span></span>
                <span className="col g8" style={{ alignItems: 'flex-end' }}>
                  <Badge tone={p.status === 'due' ? 'amber' : 'green'}>{p.status === 'due' ? 'Due soon' : 'Active'}</Badge>
                  <Link to={`/money/insurance/claim/${p.id}`} className="xs w6 red">Make a claim</Link>
                </span>
              </div>
            )
          })}
          {!d && <Skeleton h={260} />}
        </div>
        <div className="col g12">
          {d?.gap && !hide && (
            <div className="card col g10" style={{ borderColor: 'var(--red)' }}>
              <div className="row g10"><Icon name="sparkles" size={18} color="var(--red)" /><span className="s w6">Gap NURU found</span></div>
              <span className="xs t2">You have no life cover, but {d.gap.dependants} people depend on your income. Term life for {money(d.gap.cover)} costs about {money(d.gap.monthly)} a month.</span>
              <div className="row g8"><Link className="btn pri sm" to={ask(`Compare term life insurance quotes for ${money(d.gap.cover)} cover`)}>Compare quotes</Link><button className="btn sm" onClick={() => setHide(true)}>Not now</button></div>
            </div>
          )}
          <div className="card col g10">
            <span className="h3">Claims</span>
            {d?.claims.length ? d.claims.map((c) => (
              <div key={c.id} className="row g10">
                <span className="col grow"><span className="s w6">{(kindIcon[c.kind]?.[2] || c.kind)} · {c.provider}</span><span className="xs mu">{c.description.slice(0, 60)}</span></span>
                <span className="col g4" style={{ alignItems: 'flex-end' }}><span className="s num w6">{money(c.amount)}</span><Badge tone="amber">Submitted</Badge></span>
              </div>
            )) : <span className="s t2">No claims. Pick a policy to start one.</span>}
          </div>
        </div>
      </div>
    </Shell>
  )
}
