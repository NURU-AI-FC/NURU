import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type Account, type Summary } from '../api'
import { BANK as PARTNER } from '../bank'
import { Shell } from '../Shell'
import { useApp, useMoney } from '../store'
import { Icon, Lines, Modal, Skeleton, useLoad } from '../ui'
import { TxGroups, type TxFull } from './History'
import './Home.css'

const BANK: Record<string, string> = { [PARTNER.name]: 'var(--red)', Kuda: 'var(--c7)', OPay: 'var(--c6)', GTBank: 'var(--c4)', 'Access Bank': 'var(--c2)', 'First Bank': 'var(--blue)', UBA: 'var(--red600)', Moniepoint: 'var(--blue)' }
export const LINKABLE = ['GTBank', 'Access Bank', 'First Bank', 'UBA', 'Moniepoint', 'Kuda', 'OPay']

export function BankTile({ bank, size = 40 }: { bank: string; size?: number }) {
  return <span className="btile" style={{ background: BANK[bank] || 'var(--c2)', width: size, height: size }}>{bank[0]}</span>
}

const synced = (via: string) => via === 'sandbox' ? 'Synced 2 min ago' : via.startsWith('mono') ? 'Synced with Mono today' : 'Synced today'

// LinkModal adds a sandbox account at another bank through the Mono sandbox.
export function LinkModal({ have, onClose, onDone }: { have: string[]; onClose: () => void; onDone: () => void }) {
  const { toast } = useApp()
  const [busy, setBusy] = useState('')
  async function link(bank: string) {
    setBusy(bank)
    try { await api('/accounts/link', { body: { bank } }); toast(bank + ' linked'); onDone(); onClose() } catch (e) { toast((e as Error).message) } finally { setBusy('') }
  }
  return (
    <Modal onClose={onClose}>
      <div className="col g16">
        <div className="col g4"><span className="h2">Link an account</span><span className="s t2">Read only and secured by Mono. This sandbox adds an account with a starting balance.</span></div>
        <div className="col g4">
          {LINKABLE.map((b) => (
            <button key={b} className="txr" style={{ border: 0, background: 'transparent', textAlign: 'left' }} disabled={!!busy || have.includes(b)} onClick={() => link(b)}>
              <BankTile bank={b} size={36} /><span className="s w6 grow">{b}</span>
              <span className="xs mu">{have.includes(b) ? 'Linked' : busy === b ? 'Linking…' : ''}</span>
              {!have.includes(b) && <Icon name="chevr" color="var(--muted)" />}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export default function Accounts() {
  const { t } = useApp()
  const money = useMoney()
  const nav = useNavigate()
  const { data, reload } = useLoad<{ accounts: Account[]; total: number }>('/accounts')
  const month = useLoad<Summary>('/analytics/summary?period=month').data
  const inv = useLoad<{ name: string; value: number }[]>('/investments').data
  const [open, setOpen] = useState(false)
  const accts = data?.accounts || []
  const invested = inv?.reduce((s, i) => s + i.value, 0) || 0
  const net = (data?.total || 0) + invested
  const flow = month ? month.in - month.out : 0

  return (
    <Shell title={t('connectedAccounts')} sub={data ? `${accts.length} accounts` : undefined}
      right={<button className="ib" onClick={() => setOpen(true)} aria-label={t('linkAnother')}><Icon name="plus" /></button>}>
      <div className="narrow">
        {!data ? <Skeleton h={120} /> : (
          <div className="card col g6">
            <span className="xs mu">{t('netWorth')}</span>
            <span className="big num">{money(net)}</span>
            <span className={'xs w6 ' + (flow >= 0 ? 'pos' : 'amber')}>{money(flow, { sign: true })} this month{invested ? ` · includes ${money(invested, { compact: true })} in investments` : ''}</span>
          </div>
        )}
        {!data ? <Skeleton h={260} /> : accts.length === 0 ? (
          <div className="card col center g12" style={{ padding: 28, textAlign: 'center' }}>
            <span className="ic red" style={{ width: 56, height: 56, borderRadius: 18 }}><Icon name="link" size={26} /></span>
            <span className="h3">{t('connectFirst')}</span>
            <span className="s t2">Link a bank to see balances and history here.</span>
          </div>
        ) : accts.map((a) => (
          <Link key={a.id} to={'/accounts/' + a.id} className="card row g12" style={{ padding: 14 }}>
            <BankTile bank={a.bank} />
            <span className="col g4 grow" style={{ minWidth: 0 }}><span className="s w6">{a.name}{a.kind === 'business' && <span className="chip" style={{ height: 20, marginLeft: 6 }}>Business</span>}</span><span className="xs mu">{a.kind[0].toUpperCase() + a.kind.slice(1)} {a.number}</span></span>
            <span className="col g4" style={{ alignItems: 'flex-end' }}><span className="s w6 num">{money(a.balance)}</span><span className="xs mu">{synced(a.linked_via)}</span></span>
          </Link>
        ))}
        {inv?.map((i) => (
          <div key={i.name} className="card row g12" style={{ padding: 14, boxShadow: 'none' }}>
            <span className="ic blue"><Icon name="trendup" size={18} /></span>
            <span className="col g4 grow" style={{ minWidth: 0 }}><span className="s w6">{i.name}</span><span className="xs mu">Investment · updated monthly</span></span>
            <span className="s w6 num">{money(i.value)}</span>
          </div>
        ))}
        <button className="btn block" onClick={() => setOpen(true)}><Icon name="link" />{t('linkAnother')}</button>
        <button className="btn ghost sm" onClick={() => nav('/history')}><Icon name="history" size={16} />See all transactions</button>
      </div>
      {open && <LinkModal have={accts.map((a) => a.bank)} onClose={() => setOpen(false)} onDone={reload} />}
    </Shell>
  )
}

type AcctDetail = { account: Account; holder: string; in: number; out: number; month: string; points: { label: string; balance: number }[] }

export function AccountDetail() {
  const { id } = useParams()
  const { t } = useApp()
  const money = useMoney()
  const nav = useNavigate()
  const { data, error } = useLoad<AcctDetail>('/accounts/' + id)
  const tx = useLoad<TxFull[]>(`/transactions?account=${id}&limit=12`).data

  if (error) return <Shell title={t('connectedAccounts')}><div className="card col center g12" style={{ padding: 32 }}><span className="h3">We could not find that account</span><Link to="/accounts" className="btn sm">All accounts</Link></div></Shell>
  const a = data?.account
  return (
    <Shell title={a?.name || t('connectedAccounts')} sub={a ? `${a.bank} · ${a.number}` : undefined}
      right={<button className="ib" onClick={() => nav('/accounts')} aria-label="All accounts"><Icon name="chevl" /></button>}>
      <div className="narrow">
        {!data || !a ? <Skeleton h={260} /> : <>
          <div className="card col g10">
            <div className="row g10"><BankTile bank={a.bank} size={36} /><span className="col g4"><span className="s w6">{a.kind[0].toUpperCase() + a.kind.slice(1)} {a.number}</span><span className="xs mu">{data.holder}</span></span></div>
            <span className="big num" style={{ fontSize: 34 }}>{money(a.balance)}</span>
            <Lines labels={data.points.map((p) => p.label)} series={[{ name: 'Balance', values: data.points.map((p) => p.balance) }]} height={150} />
          </div>
          <div className="row g12">
            <div className="card col g4 grow" style={{ padding: 14 }}><span className="xs mu">{t('moneyIn')} · {data.month}</span><span className="h3 num pos">{money(data.in, { sign: true })}</span></div>
            <div className="card col g4 grow" style={{ padding: 14 }}><span className="xs mu">{t('moneyOut')} · {data.month}</span><span className="h3 num">{money(-data.out)}</span></div>
          </div>
        </>}
        <div className="card" style={{ padding: '14px 14px 10px' }}>
          <div className="row between" style={{ padding: '0 6px' }}><span className="h3">Transactions</span><Link className="s w6 red" to={'/history?account=' + id}>{t('seeAll')}</Link></div>
          {!tx ? <Skeleton h={200} /> : tx.length ? <TxGroups rows={tx} /> : <p className="s t2" style={{ padding: 6 }}>No transactions yet.</p>}
        </div>
      </div>
    </Shell>
  )
}
