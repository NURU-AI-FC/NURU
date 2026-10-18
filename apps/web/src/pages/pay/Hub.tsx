import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import type { Account, Payee } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Icon, Skeleton, useLoad } from '../../ui'
import { Avatar } from './common'
import './Pay.css'

export type Rem = { id: string; title: string; kind: string; amount: number; due_at: string; done: boolean }
export const remIcon: Record<string, string> = { bill: 'file', loan: 'landmark', salary: 'users', tax: 'receipt', goal: 'target', transfer: 'heart', rent: 'building' }

const TILES: [string, string, string][] = [
  ['send', 'Send money', '/pay/send'], ['users', 'Beneficiaries', '/pay/beneficiaries'], ['zap', 'Pay bills', '/pay/bills'],
  ['phone', 'Airtime', '/pay/airtime'], ['qr', 'Scan to pay', '/pay/scan'], ['calendar', 'Scheduled', '/pay/scheduled'],
]

export default function Hub() {
  const { t, rates, toast } = useApp()
  const money = useMoney()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const accts = useLoad<{ accounts: Account[] }>('/accounts').data?.accounts
  const payees = useLoad<Payee[]>('/payees').data
  const rems = useLoad<Rem[]>('/reminders').data
  const [pick, setPick] = useState(0)
  const [fx, setFx] = useState({ amount: '100000', to: 'USD' })
  if (params.get('save')) return <Navigate to={'/pay/send?save=' + params.get('save')} replace />

  const acct = accts?.[pick % (accts.length || 1)]
  const people = payees ? [...payees].sort((a, b) => Number(b.starred) - Number(a.starred) || (b.times || 0) - (a.times || 0)).slice(0, 6) : null
  const scheduled = rems?.filter((r) => r.amount > 0 && !r.done).slice(0, 3)
  const converted = Number(fx.amount || 0) * (rates[fx.to] || 0)

  return (
    <Shell title={t('pay')} sub="Sandbox. No real money moves.">
      <div className="grid g-21 payhub">
        <div className="col g20">
          <div className="soft row between" style={{ padding: '14px 16px' }}>
            {acct ? <div className="col g4"><span className="xs mu">{acct.name} {acct.number}</span><span className="h3 num">{money(acct.balance)}</span></div> : <Skeleton h={44} />}
            {accts && accts.length > 1 && <button className="chip" style={{ border: 0, cursor: 'pointer' }} onClick={() => setPick((p) => p + 1)}>Change<Icon name="chevd" size={14} /></button>}
          </div>
          <div className="paytiles">
            {TILES.map(([ic, label, to]) => <Link key={to} to={to} className="paytile"><span className="ic"><Icon name={ic} size={24} /></span>{label}</Link>)}
          </div>

          <div className="card col g12">
            <div className="row between"><span className="h3">Recent people</span><Link to="/pay/beneficiaries" className="s w6 red">{t('seeAll')}</Link></div>
            {people ? people.length ? (
              <div className="paypeople">
                {people.map((p) => <button key={p.id} className="payperson paylink" onClick={() => nav('/pay/send?payee=' + p.id)}><Avatar name={p.name} size={48} />{p.name.split(/[\s,]+/)[0]}</button>)}
              </div>
            ) : <span className="s t2">No saved people yet. Send money once and they appear here.</span> : <Skeleton h={72} />}
          </div>

          <div className="card col g12">
            <div className="row between"><span className="h3">Scheduled</span><Link to="/pay/scheduled" className="s w6 red">Manage</Link></div>
            {scheduled ? scheduled.length ? scheduled.map((r) => (
              <div key={r.id} className="row g12">
                <span className="tile"><Icon name={remIcon[r.kind] || 'calendar'} size={16} /></span>
                <span className="col grow"><span className="s w6">{r.title}</span><span className="xs mu">Next {new Date(r.due_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span></span>
                <span className="s w6 num">{money(r.amount)}</span>
              </div>
            )) : <span className="s t2">Nothing scheduled.</span> : <Skeleton h={100} />}
          </div>
        </div>

        <div className="col g20">
          <div className="card col g12">
            <div className="row between"><span className="h3">{t('convert')}</span><span className="xs mu">{rates.USD ? 'Live rate' : ''}</span></div>
            <div className="row g8">
              <input className="input num grow" value={fx.amount} onChange={(e) => setFx({ ...fx, amount: e.target.value.replace(/[^\d.]/g, '') })} aria-label="Naira amount" />
              <span className="w6">NGN</span>
            </div>
            <div className="row g8">
              <div className="input row num w6 grow" style={{ fontSize: 18 }}>{converted.toLocaleString('en', { maximumFractionDigits: 2 })}</div>
              <select className="input" style={{ width: 100 }} value={fx.to} onChange={(e) => setFx({ ...fx, to: e.target.value })} aria-label="Currency">
                {Object.keys(rates).filter((c) => c !== 'NGN').map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            {rates[fx.to] && <span className="xs mu">1 {fx.to} = ₦{(1 / rates[fx.to]).toLocaleString('en', { maximumFractionDigits: 2 })}</span>}
          </div>
          <div className="card col g12">
            <div className="row between"><span className="h3">Linked accounts</span><button className="btn sm" onClick={() => toast('Mono sandbox: OPay, Kuda and Zenith are linked for the demo')}><Icon name="plus" size={16} />Link</button></div>
            {accts?.map((a) => (
              <div key={a.id} className="row g10">
                <span className="tile"><Icon name={a.kind === 'business' ? 'briefcase' : a.kind === 'wallet' ? 'wallet' : 'landmark'} size={16} /></span>
                <span className="col grow"><span className="s w6">{a.name}</span><span className="xs mu">{a.bank} {a.number} · {a.linked_via === 'mono-sandbox' ? 'via Mono' : 'Zenith'}</span></span>
                <span className="w6 num s">{money(a.balance)}</span>
              </div>
            )) || <Skeleton h={160} />}
          </div>
        </div>
      </div>
    </Shell>
  )
}
