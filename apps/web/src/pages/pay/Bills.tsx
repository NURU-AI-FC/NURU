import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Account } from '../../api'
import { TransferGuard, type Receipt } from '../../Guard'
import { useApp, useMoney } from '../../store'
import { Icon, Seg, useLoad } from '../../ui'
import { AccountSelect, ReceiptView, Sub } from './common'

type Cat = { key: string; icon: string; label: string; field: string; billers: string[] }
const CATS: Cat[] = [
  { key: 'power', icon: 'zap', label: 'Electricity', field: 'Meter number', billers: ['IKEDC prepaid', 'EKEDC prepaid', 'AEDC prepaid', 'PHED prepaid'] },
  { key: 'tv', icon: 'tv', label: 'TV', field: 'Smartcard number', billers: ['DStv', 'GOtv', 'StarTimes'] },
  { key: 'net', icon: 'wifi', label: 'Internet', field: 'Customer ID', billers: ['Spectranet', 'Smile', 'ipNX'] },
  { key: 'data', icon: 'phone', label: 'Data', field: 'Phone number', billers: ['MTN data', 'Airtel data', 'Glo data', '9mobile data'] },
]

const PREFIX: Record<string, string[]> = {
  MTN: ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'],
  Airtel: ['0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912'],
  Glo: ['0805', '0807', '0705', '0815', '0811', '0905', '0915'],
  '9mobile': ['0809', '0818', '0817', '0909', '0908'],
}
const network = (p: string) => Object.entries(PREFIX).find(([, v]) => v.includes(p.slice(0, 4)))?.[0] || ''
const AIRTIME = [100, 200, 500, 1000, 2000, 5000]
const DATA: [string, number][] = [['1GB, 1 day', 350], ['2GB, 7 days', 1000], ['6GB, 7 days', 2500], ['10GB, 30 days', 4500], ['25GB, 30 days', 9000], ['75GB, 30 days', 20000]]

function usePay() {
  const { data, reload } = useLoad<{ accounts: Account[] }>('/accounts')
  const accts = data?.accounts
  const [from, setFrom] = useState('')
  useEffect(() => { if (accts && !from) setFrom(accts[0]?.id || '') }, [accts]) // eslint-disable-line react-hooks/exhaustive-deps
  return { accts, from, setFrom, reload, acct: accts?.find((a) => a.id === from) }
}

export function Bills() {
  const money = useMoney()
  const { toast } = useApp()
  const nav = useNavigate()
  const p = usePay()
  const [cat, setCat] = useState(CATS[0])
  const [biller, setBiller] = useState(CATS[0].billers[0])
  const [q, setQ] = useState('')
  const [customer, setCustomer] = useState('')
  const [amount, setAmount] = useState('15000')
  const [repeat, setRepeat] = useState(false)
  const [guard, setGuard] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)

  const all = CATS.flatMap((c) => c.billers.map((b) => [c, b] as [Cat, string]))
  const found = q ? all.filter(([, b]) => b.toLowerCase().includes(q.toLowerCase())) : []
  const amt = Number(amount || 0)
  const valid = /^[0-9A-Za-z-]{4,20}$/.test(customer.replace(/\s/g, '')) && amt >= 50 && amt <= 500000 && !!p.acct && amt <= p.acct.balance

  async function done(r: Receipt) {
    setGuard(false)
    setReceipt(r)
    p.reload()
    if (repeat) {
      const due = new Date(); due.setMonth(due.getMonth() + 1); due.setHours(9, 0, 0, 0)
      try { await api('/reminders', { body: { title: biller, kind: 'bill', amount: amt, due_at: due.toISOString() } }); toast('Repeat scheduled for next month') } catch { /* optional */ }
    }
  }

  if (receipt) return <Sub title="Bill paid"><ReceiptView r={receipt} title="Paid" detail={customer} onDone={() => nav('/pay')} /></Sub>

  return (
    <Sub title="Pay bills" sub="Sandbox bill payments">
      <div className="card col g16" style={{ maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <div className="input row g8"><Icon name="search" size={18} color="var(--muted)" />
          <input style={{ border: 0, outline: 0, background: 'transparent', color: 'inherit', flex: 1, font: 'inherit' }} placeholder="Search billers" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search billers" /></div>
        {q && <div className="col g4">{found.length ? found.map(([c, b]) => <button key={b} className="payrow" onClick={() => { setCat(c); setBiller(b); setQ('') }}><span className="tile"><Icon name={c.icon} size={16} /></span><span className="s w6">{b}</span></button>) : <span className="s t2">No biller found.</span>}</div>}
        <div className="paycats">
          {CATS.map((c) => <button key={c.key} className={cat.key === c.key ? 'on' : ''} onClick={() => { setCat(c); setBiller(c.billers[0]) }}><span className="tile"><Icon name={c.icon} size={22} /></span>{c.label}</button>)}
        </div>
        <div className="field"><label htmlFor="biller">Biller</label><select id="biller" className="input" value={biller} onChange={(e) => setBiller(e.target.value)}>{cat.billers.map((b) => <option key={b}>{b}</option>)}</select></div>
        <div className="field"><label htmlFor="cust">{cat.field}</label><input id="cust" className="input num" inputMode="numeric" maxLength={20} value={customer} onChange={(e) => setCustomer(e.target.value.replace(/[^\d\s-]/g, ''))} /></div>
        <div className="field"><label htmlFor="bamt">Amount (₦)</label><input id="bamt" className="input num w6" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} /></div>
        <div className="field"><label htmlFor="bfrom">From</label><AccountSelect id="bfrom" accts={p.accts} value={p.from} onChange={p.setFrom} /></div>
        {p.acct && amt > p.acct.balance && <span className="err">That is more than the {money(p.acct.balance)} in this account.</span>}
        <div className="soft row g10"><Icon name="sparkles" size={18} color="var(--red)" /><span className="xs t2 grow">Repeat this payment every month? NURU adds it to your scheduled payments.</span>
          <button className={'paytgl' + (repeat ? ' on' : '')} onClick={() => setRepeat(!repeat)} aria-pressed={repeat} aria-label="Repeat monthly"><i /></button></div>
        <button className="btn pri block" disabled={!valid} onClick={() => setGuard(true)}>Pay {money(amt)}</button>
        <span className="xs mu row g6"><Icon name="shieldcheck" size={14} />Face check and PIN on every payment.</span>
      </div>
      {guard && p.acct && <TransferGuard path="/payments/bill" draft={{ from: p.from, toName: biller, amount: amt, category: 'Bills', biller, customer }} onClose={() => setGuard(false)} onDone={done} />}
    </Sub>
  )
}

export function Airtime() {
  const money = useMoney()
  const nav = useNavigate()
  const p = usePay()
  const [mode, setMode] = useState<'airtime' | 'data'>('airtime')
  const [phone, setPhone] = useState('')
  const [amt, setAmt] = useState(1000)
  const [plan, setPlan] = useState(1)
  const [guard, setGuard] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)

  const net = network(phone)
  const amount = mode === 'airtime' ? amt : DATA[plan][1]
  const biller = `${net || 'Mobile'} ${mode === 'airtime' ? 'airtime' : 'data ' + DATA[plan][0].split(',')[0]}`
  const valid = /^0\d{10}$/.test(phone) && !!p.acct && amount <= p.acct.balance

  if (receipt) return <Sub title="Top up done"><ReceiptView r={receipt} title="Done" detail={phone} onDone={() => nav('/pay')} /></Sub>

  return (
    <Sub title="Airtime and data" sub="Sandbox top up">
      <div className="card col g16" style={{ maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <Seg value={mode} options={[['airtime', 'Airtime'], ['data', 'Data']]} onChange={setMode} />
        <div className="field"><label htmlFor="ph">Phone number</label>
          <div className="input row g8">{net && <span className="chip amber">{net}</span>}
            <input id="ph" className="num" style={{ border: 0, outline: 0, background: 'transparent', color: 'inherit', flex: 1, font: 'inherit' }} inputMode="tel" maxLength={11} placeholder="0803 555 1234" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} /></div></div>
        <span className="s w6">{mode === 'airtime' ? 'Choose amount' : 'Choose a plan'}</span>
        <div className="paypick">
          {mode === 'airtime'
            ? AIRTIME.map((a) => <button key={a} className={'num' + (a === amt ? ' on' : '')} onClick={() => setAmt(a)}>₦{a.toLocaleString('en')}</button>)
            : DATA.map(([l, a], i) => <button key={l} className={i === plan ? 'on' : ''} onClick={() => setPlan(i)} style={{ height: 64 }}><span className="col"><span className="s">{l}</span><span className="xs num">₦{a.toLocaleString('en')}</span></span></button>)}
        </div>
        <div className="field"><label htmlFor="afrom">From</label><AccountSelect id="afrom" accts={p.accts} value={p.from} onChange={p.setFrom} /></div>
        {phone.length === 11 && !net && <span className="xs mu">We could not tell the network from this number. It will still go through in the sandbox.</span>}
        <button className="btn pri block" disabled={!valid} onClick={() => setGuard(true)}>Buy {money(amount)} {mode}</button>
        <span className="xs mu row g6"><Icon name="shieldcheck" size={14} />Face check and PIN on every payment.</span>
      </div>
      {guard && <TransferGuard path="/payments/bill" draft={{ from: p.from, toName: biller, amount, category: 'Airtime', biller, customer: phone }} onClose={() => setGuard(false)} onDone={(r) => { setGuard(false); setReceipt(r); p.reload() }} />}
    </Sub>
  )
}
