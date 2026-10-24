import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Shell } from '../Shell'
import { useApp, useMoney } from '../store'
import { Icon, Modal } from '../ui'
import { BankLogo, BANKS, Done, Ic, Toggle, Top } from './settings/kit'

type Linked = { id: string; bank: string; name: string; number: string; kind: string; balance: number; imported: number }
const SCOPES: [string, string, string, string, boolean][] = [
  ['balances', 'wallet', 'Balances', 'Current and available balance', true],
  ['transactions', 'history', 'Transactions', 'Last 6 months, then ongoing', true],
  ['identity', 'user', 'Account identity', 'Name and account number', true],
  ['statements', 'receipt', 'Statements', 'Monthly PDF statements', false],
]

// Link walks through a Mono style sandbox connection: pick a bank, log in,
// choose what NURU may read, and the account arrives with its history.
export default function LinkAccount() {
  const { user } = useApp()
  const money = useMoney()
  const nav = useNavigate()
  const [step, setStep] = useState<'bank' | 'consent' | 'linking' | 'done'>('bank')
  const [q, setQ] = useState('')
  const [bank, setBank] = useState('')
  const [login, setLogin] = useState(false)
  const [creds, setCreds] = useState({ id: '', pw: '' })
  const [show, setShow] = useState(false)
  const [scope, setScope] = useState<Record<string, boolean>>(() => Object.fromEntries(SCOPES.map(([k, , , , on]) => [k, on])))
  const [acct, setAcct] = useState<Linked | null>(null)
  const [err, setErr] = useState('')
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (step !== 'done' || !acct) return
    setShown(0)
    const id = setInterval(() => setShown((n) => { const next = Math.min(acct.imported, n + Math.ceil(acct.imported / 12)); if (next >= acct.imported) clearInterval(id); return next }), 120)
    return () => clearInterval(id)
  }, [step, acct])

  if (!user) return null
  const pick = (b: string) => { setBank(b); setCreds({ id: b === 'Demo Bank' ? 'demo.judge' : '', pw: b === 'Demo Bank' ? 'sandbox' : '' }); setErr(''); setLogin(true) }
  const signIn = (e: FormEvent) => { e.preventDefault(); setLogin(false); setStep('consent') }

  async function allow() {
    setErr(''); setStep('linking')
    try {
      setAcct(await api<Linked>('/accounts/link', { body: { bank, scope: Object.keys(scope).filter((k) => scope[k]) } }))
      setStep('done')
    } catch (e) { setErr((e as Error).message); setStep('consent') }
  }

  const list = BANKS.filter(([n]) => n.toLowerCase().includes(q.trim().toLowerCase()))
  let view
  if (step === 'bank') {
    view = (
      <>
        <Top back="/settings/accounts" />
        <div className="col g6"><h2 className="h2" style={{ fontSize: 24 }}>Choose your bank</h2><span className="t2">NURU reads your transactions to build insights. It can never move money without your PIN and face check.</span></div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: 14 }}><Icon name="search" color="var(--muted)" /></span>
          <input className="input" style={{ paddingLeft: 42 }} placeholder="Search banks and wallets" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search banks" />
        </div>
        <button className="k-opt" style={{ border: '1.5px dashed var(--red)', background: 'var(--red50)' }} onClick={() => pick('Demo Bank')}>
          <span className="k-ic red" style={{ background: 'var(--bg)' }}><Icon name="sparkles" /></span>
          <span className="col g4 grow"><span className="s w6">Use the demo bank</span><span className="xs t2">Six months of sample transactions, no real login</span></span>
          <Icon name="chevr" color="var(--red)" />
        </button>
        <span className="k-label">Popular</span>
        <div className="row wrap" style={{ gap: 12 }}>
          {list.map(([n]) => (
            <button key={n} className="col center g8" style={{ width: 76, border: 0, background: 'transparent', padding: 0 }} onClick={() => pick(n)}>
              <BankLogo bank={n} /><span className="xs t2" style={{ textAlign: 'center' }}>{n}</span>
            </button>
          ))}
          {!list.length && <span className="s mu">No bank matches “{q}” in the sandbox yet.</span>}
        </div>
        <div className="row center g6 xs mu" style={{ marginTop: 8 }}><Icon name="lock" size={13} color="var(--muted)" /> Secured by Mono open banking · read-only · sandbox</div>
      </>
    )
  } else if (step === 'consent' || step === 'linking') {
    view = (
      <>
        <Top onBack={() => setStep('bank')} />
        <div className="col g6"><h2 className="h2" style={{ fontSize: 24 }}>Allow NURU to read</h2><span className="t2">Choose what NURU can see from {bank}. You can change this any time.</span></div>
        <div className="card col g12">
          {SCOPES.map(([k, i, t, s], n) => (
            <div key={k} className="col g12">{n > 0 && <div className="div" />}
              <div className="row g12"><Ic name={i} /><span className="col g4 grow"><span className="s w6">{t}</span><span className="xs mu">{s}</span></span>
                <Toggle on={scope[k]} label={t} onChange={(v) => setScope({ ...scope, [k]: k === 'transactions' || k === 'balances' ? true : v })} />
              </div>
            </div>
          ))}
        </div>
        <span className="xs mu">Balances and transactions are needed for insights.</span>
        <div className="soft row g10"><Icon name="alert" color="var(--amber)" /><span className="xs t2">NURU cannot make payments from this link. Transfers always need your PIN and face check.</span></div>
        <div className="row g8 xs mu"><Icon name="clock" size={14} color="var(--muted)" /> Access expires in 12 months unless you renew it</div>
        {err && <span className="err" role="alert">{err}</span>}
        <div className="k-flow-cta"><button className="btn pri block" disabled={step === 'linking'} onClick={allow}>{step === 'linking' ? 'Linking…' : 'Allow and continue'}</button></div>
      </>
    )
  } else if (acct) {
    const pct = acct.imported ? Math.round((shown / acct.imported) * 100) : 100
    view = (
      <>
        <Done icon="link" title={acct.bank + ' linked'} body={pct < 100 ? 'NURU is reading your history. Your first insights will be ready in a moment.' : 'Your history is in. Insights and charts now include this account.'}>
          <div className="card col g12" style={{ width: '100%', textAlign: 'left' }}>
            <div className="row g12"><BankLogo bank={acct.bank} sm /><span className="col g4 grow"><span className="s w6">{acct.name} {acct.number}</span><span className="xs mu">{user.name}</span></span><span className="h3 num">{money(acct.balance)}</span></div>
            <div className="div" />
            <div className="col g8"><div className="row between"><span className="xs t2">Importing transactions</span><span className="xs w6 num">{shown.toLocaleString()} of {acct.imported.toLocaleString()}</span></div><div className="bar"><i style={{ width: pct + '%', transition: 'width .1s' }} /></div></div>
          </div>
        </Done>
        <div className="k-flow-cta">
          <button className="btn pri block" onClick={() => nav('/')}>Go to my dashboard</button>
          <button className="btn ghost block" onClick={() => { setAcct(null); setStep('bank') }}>Link another account</button>
        </div>
      </>
    )
  }

  return (
    <Shell title="Link an account" sub="Read-only open banking, sandbox">
      <div className="k-flow">{view}</div>
      {login && (
        <Modal onClose={() => setLogin(false)}>
          <form className="col g16" onSubmit={signIn}>
            <div className="row between">
              <div className="row g10"><BankLogo bank={bank} sm /><span className="col g4"><span className="h3">{bank}</span><span className="xs mu">Internet banking login</span></span></div>
              <button type="button" className="ib" style={{ width: 34, height: 34, borderRadius: 99 }} onClick={() => setLogin(false)} aria-label="Close"><Icon name="x" size={16} /></button>
            </div>
            <div className="field"><label htmlFor="uid">User ID</label><input id="uid" className="input" value={creds.id} onChange={(e) => setCreds({ ...creds, id: e.target.value })} autoComplete="off" required autoFocus /></div>
            <div className="field"><label htmlFor="bpw">Password</label>
              <div style={{ position: 'relative' }}>
                <input id="bpw" className="input" type={show ? 'text' : 'password'} value={creds.pw} onChange={(e) => setCreds({ ...creds, pw: e.target.value })} autoComplete="off" required />
                <button type="button" className="ib" style={{ position: 'absolute', right: 4, top: 3, background: 'transparent' }} onClick={() => setShow(!show)} aria-label="Show password"><Icon name={show ? 'eyeoff' : 'eye'} color="var(--muted)" /></button>
              </div>
            </div>
            <div className="soft col g8"><div className="row g8"><Icon name="shieldcheck" size={16} color="var(--green)" /><span className="s w6">Read-only access</span></div>
              <span className="xs t2">Your login goes straight to the bank through Mono. NURU never sees or stores your bank password.</span></div>
            <button className="btn pri block">Log in securely</button>
            <div className="row center g6 xs mu"><Icon name="lock" size={13} color="var(--muted)" /> Sandbox mode · test credentials accepted</div>
          </form>
        </Modal>
      )}
    </Shell>
  )
}
