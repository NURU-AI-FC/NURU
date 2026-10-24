import { useState } from 'react'
import { api } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { COLORS, Donut, Icon, Modal, Seg, Skeleton, useLoad } from '../../ui'
import { Back, Prog, Sandbox, Tip, date, num } from './kit'

type Vault = { id: string; name: string; balance: number; target: number; rate_pct: number; note: string; unlocks_at: string | null; locked: boolean }
type Vaults = { vaults: Vault[]; total: number; rate_pct: number; auto_save: number }

export default function Vaults() {
  const { toast } = useApp()
  const money = useMoney()
  const { data: d, reload } = useLoad<Vaults>('/vaults')
  const [move, setMove] = useState<{ v: Vault; dir: 'in' | 'out' } | null>(null)
  const [create, setCreate] = useState(false)
  const [amt, setAmt] = useState('')
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [lock, setLock] = useState('0')
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true)
    try { await fn(); toast(msg); setMove(null); setCreate(false); setAmt(''); setName(''); setTarget(''); reload() } catch (e) { toast((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Shell title="Savings" sub="Vaults for the things you are saving for" right={<button className="ib" onClick={() => setCreate(true)} aria-label="New vault"><Icon name="plus" /></button>}>
      <Back to="/money" label="Loans and savings" />
      <div className="grid g-21">
        <div className="col g16">
          {d ? (
            <div className="card row g20 wrap">
              <Donut data={d.vaults.map((v) => ({ name: v.name, value: v.balance }))} center={String(d.vaults.length)} sub="vaults" height={120} />
              <div className="col g6 grow"><span className="xs mu">Total saved</span><span className="big num">{money(d.total)}</span><span className="xs pos w6">Earning about {d.rate_pct}% a year</span></div>
            </div>
          ) : <Skeleton h={160} />}
          {d?.vaults.map((v, i) => (
            <div key={v.id} className="card col g10 flat">
              <div className="row g12">
                <span style={{ width: 10, height: 36, borderRadius: 5, background: COLORS[i % COLORS.length], flex: 'none' }} />
                <span className="col g4 grow"><span className="s w6">{v.name}</span><span className="xs mu">{v.locked && v.unlocks_at ? `Unlocks ${date(v.unlocks_at, true)}` : v.note} · {v.rate_pct}%</span></span>
                <span className="s w6 num">{money(v.balance)}</span>
              </div>
              {v.target > 0 && <><Prog pct={(v.balance / v.target) * 100} tone="green" /><span className="xs mu">{Math.round((v.balance / v.target) * 100)}% of {money(v.target)}</span></>}
              <div className="row g8">
                <button className="btn sm" onClick={() => setMove({ v, dir: 'in' })}><Icon name="plus" size={14} />Add money</button>
                <button className="btn sm ghost" disabled={v.locked || !v.balance} onClick={() => setMove({ v, dir: 'out' })}>{v.locked ? <><Icon name="lock" size={14} />Locked</> : 'Withdraw'}</button>
              </div>
            </div>
          ))}
        </div>
        <div className="col g12">
          {d && d.auto_save > 0 && <Tip icon="refresh" tone="green">Auto-save on: {money(d.auto_save)} every payday.</Tip>}
          <Tip icon="info" tone="gray">Moving money in or out is an internal transfer with your main account. Locked vaults pay more but can only be opened on their unlock date.</Tip>
          <button className="btn pri" onClick={() => setCreate(true)}><Icon name="plus" size={16} color="#fff" />New vault</button>
        </div>
      </div>

      {move && (
        <Modal onClose={() => setMove(null)}>
          <div className="col g16">
            <span className="h2">{move.dir === 'in' ? `Add to ${move.v.name}` : `Withdraw from ${move.v.name}`}</span>
            <span className="s t2">{move.dir === 'in' ? 'From your main account.' : `Back to your main account. ${money(move.v.balance)} available.`}</span>
            <input className="input num w6" autoFocus inputMode="numeric" value={num(amt) ? num(amt).toLocaleString('en-NG') : ''} onChange={(e) => setAmt(e.target.value)} placeholder="₦0" aria-label="Amount" />
            <div className="kit-actions"><button className="btn" onClick={() => setMove(null)}>Cancel</button>
              <button className="btn pri" disabled={busy || !num(amt)} onClick={() => run(() => api(`/vaults/${move.v.id}/move`, { body: { amount: num(amt), direction: move.dir } }), 'Done')}>{move.dir === 'in' ? 'Add' : 'Withdraw'}</button>
            </div>
          </div>
        </Modal>
      )}
      {create && (
        <Modal onClose={() => setCreate(false)}>
          <div className="col g16">
            <span className="h2">New vault</span>
            <div className="field"><label htmlFor="vn">Name</label><input id="vn" className="input" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="New phone" /></div>
            <div className="field"><label htmlFor="vt">Target (optional)</label><input id="vt" className="input num" inputMode="numeric" value={num(target) ? num(target).toLocaleString('en-NG') : ''} onChange={(e) => setTarget(e.target.value)} placeholder="₦0" /></div>
            <div className="field"><label>Lock</label><Seg value={lock} onChange={setLock} options={[['0', 'Flexible'], ['6', '6 months'], ['12', '1 year'], ['24', '2 years']]} /></div>
            <Sandbox>Rates are sandbox figures: 10% flexible, up to 15% locked.</Sandbox>
            <div className="kit-actions"><button className="btn" onClick={() => setCreate(false)}>Cancel</button>
              <button className="btn pri" disabled={busy || !name.trim()} onClick={() => run(() => api('/vaults', { body: { name, target: num(target), months: Number(lock) } }), 'Vault created')}>Create</button>
            </div>
          </div>
        </Modal>
      )}
    </Shell>
  )
}
