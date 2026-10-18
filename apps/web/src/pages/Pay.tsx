import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, type Account } from '../api'
import { Shell } from '../Shell'
import { useApp, useMoney } from '../store'
import { Icon, Modal, PinInput, Skeleton, useLoad } from '../ui'

const BANKS = ['Zenith Bank', 'OPay', 'Kuda', 'GTBank', 'Access Bank', 'First Bank', 'UBA', 'Moniepoint', 'PalmPay', 'Wema Bank']

export default function Pay() {
  const { t, rates, toast } = useApp()
  const money = useMoney()
  const [params] = useSearchParams()
  const save = params.get('save')
  const { data: accData, reload } = useLoad<{ accounts: Account[] }>('/accounts')
  const accts = accData?.accounts
  const [f, setF] = useState({ from: '', toName: save ? 'NURU Japa fund' : '', toBank: 'Zenith Bank', toAccount: save ? '1012345678' : '', amount: save || '', note: save ? 'Savings' : '' })
  const [step, setStep] = useState<'' | 'face' | 'pin' | 'done'>('')
  const [err, setErr] = useState('')
  const [receipt, setReceipt] = useState<{ reference: string; amount: number; to: string } | null>(null)
  const [fx, setFx] = useState({ amount: '100000', to: 'USD' })

  useEffect(() => { if (accts && !f.from) setF((x) => ({ ...x, from: accts[0]?.id || '' })) }, [accts]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })

  function start(e: FormEvent) {
    e.preventDefault()
    setErr('')
    if (!/^\d{10}$/.test(f.toAccount)) { setErr('Account numbers are 10 digits'); return }
    setStep(Number(f.amount) >= 50000 ? 'face' : 'pin')
  }

  async function confirm(pin: string) {
    try {
      const r = await api<{ reference: string; amount: number; to: string }>('/transfers', { body: { from: f.from, toName: f.toName, toBank: f.toBank, toAccount: f.toAccount, note: f.note, amount: Number(f.amount), pin } })
      setReceipt(r); setStep('done'); reload()
    } catch (e) { setErr((e as Error).message); setStep('') }
  }

  const from = accts?.find((a) => a.id === f.from)
  const converted = Number(fx.amount || 0) * (rates[fx.to] || 0)
  const updated = !rates.USD ? '' : 'Live rate'

  return (
    <Shell title={t('pay')} sub="Sandbox transfers. No real money moves.">
      <div className="grid g-21">
        <form className="card col g16" onSubmit={start}>
          <div className="row between"><span className="h3">{save ? 'Move money to savings' : 'Send money'}</span><span className="chip amber">Sandbox</span></div>
          <div className="field"><label htmlFor="from">{t('from')}</label>
            {accts ? <select id="from" className="input" value={f.from} onChange={set('from')}>{accts.map((a) => <option key={a.id} value={a.id}>{a.name} {a.number} · {money(a.balance)}</option>)}</select> : <Skeleton h={46} />}
          </div>
          <div className="grid g-2" style={{ gap: 12 }}>
            <div className="field"><label htmlFor="bank">{t('bank')}</label><select id="bank" className="input" value={f.toBank} onChange={set('toBank')}>{BANKS.map((b) => <option key={b}>{b}</option>)}</select></div>
            <div className="field"><label htmlFor="acct">{t('accountNo')}</label><input id="acct" className="input num" inputMode="numeric" maxLength={10} value={f.toAccount} onChange={(e) => setF({ ...f, toAccount: e.target.value.replace(/\D/g, '') })} required /></div>
          </div>
          <div className="field"><label htmlFor="to">{t('to')}</label><input id="to" className="input" value={f.toName} onChange={set('toName')} required /></div>
          <div className="grid g-2" style={{ gap: 12 }}>
            <div className="field"><label htmlFor="amt">{t('amount')} (₦)</label><input id="amt" className="input num" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/[^\d.]/g, '') })} required /></div>
            <div className="field"><label htmlFor="note">{t('note')}</label><input id="note" className="input" value={f.note} onChange={set('note')} maxLength={60} /></div>
          </div>
          {from && Number(f.amount) > from.balance && <span className="err">That is more than the {money(from.balance)} in this account.</span>}
          {err && <span className="err" role="alert">{err}</span>}
          <button className="btn pri" disabled={!f.amount || !f.toName}>{t('continue')}</button>
          <span className="xs mu row g6"><Icon name="shieldcheck" size={14} />PIN on every transfer. Face check from ₦50,000.</span>
        </form>

        <div className="col g20">
          <div className="card col g12">
            <div className="row between"><span className="h3">{t('convert')}</span><span className="xs mu">{updated}</span></div>
            <div className="row g8">
              <input className="input num grow" value={fx.amount} onChange={(e) => setFx({ ...fx, amount: e.target.value.replace(/[^\d.]/g, '') })} aria-label="Naira amount" />
              <span className="w6">NGN</span>
            </div>
            <div className="row g8">
              <div className="input row num w7" style={{ fontSize: 18 }}>{converted.toLocaleString('en', { maximumFractionDigits: 2 })}</div>
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

      {step === 'face' && <FaceCheck onDone={() => setStep('pin')} onClose={() => setStep('')} />}
      {step === 'pin' && (
        <Modal onClose={() => setStep('')}>
          <div className="col g16 center" style={{ textAlign: 'center' }}>
            <span className="tile" style={{ width: 48, height: 48, background: 'var(--red50)', color: 'var(--red)' }}><Icon name="lock" size={22} /></span>
            <span className="h3">{t('enterPin')}</span>
            <span className="t2 s">Sending {money(Number(f.amount))} to {f.toName}, {f.toBank}</span>
            <PinInput onDone={confirm} />
            <span className="xs mu">Demo PIN is 1234</span>
          </div>
        </Modal>
      )}
      {step === 'done' && receipt && (
        <Modal onClose={() => setStep('')}>
          <div className="col g12 center" style={{ textAlign: 'center' }}>
            <span className="tile" style={{ width: 56, height: 56, borderRadius: 28, background: 'var(--green50)', color: 'var(--green)' }}><Icon name="check" size={26} /></span>
            <span className="h2">{t('sent')}</span>
            <span className="big num">{money(receipt.amount)}</span>
            <span className="t2">to {receipt.to}</span>
            <span className="chip">Ref {receipt.reference}</span>
            <button className="btn pri block" onClick={() => setStep('')}>Done</button>
          </div>
        </Modal>
      )}
    </Shell>
  )
}

// FaceCheck shows the camera for a moment as the second factor. In the
// sandbox any face passes; production would call a liveness provider.
function FaceCheck({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<'ask' | 'scan' | 'ok' | 'none'>('ask')
  useEffect(() => {
    let stream: MediaStream | null = null
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' } }).then((s) => {
      stream = s
      if (video.current) video.current.srcObject = s
      setState('scan')
      setTimeout(() => setState('ok'), 1800)
      setTimeout(onDone, 2600)
    }).catch(() => setState('none'))
    return () => stream?.getTracks().forEach((tr) => tr.stop())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal onClose={onClose}>
      <div className="col g16 center" style={{ textAlign: 'center' }}>
        <span className="h3">Face check</span>
        <div style={{ width: 200, height: 200, borderRadius: 100, overflow: 'hidden', background: 'var(--surface)', border: `4px solid ${state === 'ok' ? 'var(--green)' : 'var(--red)'}` }} className="col center">
          {state === 'none' ? <Icon name="scanface" size={64} color="var(--muted)" /> : <video ref={video} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />}
        </div>
        <span className="t2 s">{state === 'ask' ? 'Allow the camera to continue' : state === 'scan' ? 'Hold still…' : state === 'ok' ? 'Verified' : 'No camera found. In the sandbox you can continue with your PIN.'}</span>
        {state === 'none' && <button className="btn pri block" onClick={onDone}>Continue with PIN</button>}
      </div>
    </Modal>
  )
}
