import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { FaceCam } from '../Guard'
import { Shell } from '../Shell'
import { useApp, useMoney } from '../store'
import { Icon, Modal, PinInput } from '../ui'
import { Done, Ic, Top } from './settings/kit'

type Kind = 'bvn' | 'nin'
type Match = { name: string; dob: string; phone: string; masked: string; kind: string }
type Step = 'intro' | 'choose' | 'number' | 'confirm' | 'selfie' | 'checking' | 'done'

const fmtDob = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const group = (v: string) => v.replace(/(\d{4})(\d{0,4})(\d{0,3})/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '))

export default function Verify() {
  const { user, refresh, toast } = useApp()
  const money = useMoney()
  const nav = useNavigate()
  const [step, setStep] = useState<Step>(user?.kyc_verified ? 'done' : 'intro')
  const [kind, setKind] = useState<Kind>('bvn')
  const [num, setNum] = useState('')
  const [dob, setDob] = useState('')
  const [match, setMatch] = useState<Match | null>(null)
  const [face, setFace] = useState<number[] | null>(null)
  const [checks, setChecks] = useState(0)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [pin, setPin] = useState<'' | 'new' | 'again'>('')
  const [pin1, setPin1] = useState('')
  const label = kind === 'bvn' ? 'BVN' : 'NIN'
  const body = () => (kind === 'bvn' ? { bvn: num } : { nin: num })

  async function lookup() {
    setErr(''); setBusy(true)
    try { setMatch(await api<Match>('/me/kyc', { body: { ...body(), lookup: true } })); setStep('confirm') } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  // The checks run one after another so the customer sees each pass.
  useEffect(() => {
    if (step !== 'checking' || !face) return
    let live = true
    const tick = (n: number) => new Promise((r) => setTimeout(() => { if (live) setChecks(n); r(null) }, 700))
    ;(async () => {
      try {
        setChecks(0)
        await tick(1)
        const sec = await api<{ face_enrolled: boolean }>('/me/security')
        if (!sec.face_enrolled) await api('/me/face', { body: { descriptor: face } })
        await tick(2)
        await api('/me/kyc', { body: body() })
        await tick(3)
        await tick(4)
        await refresh()
        if (live) setStep('done')
      } catch (e) { if (live) { setErr((e as Error).message); setStep('selfie') } }
    })()
    return () => { live = false }
  }, [step, face]) // eslint-disable-line react-hooks/exhaustive-deps

  async function savePin(p: string) {
    if (p !== pin1) { toast('PINs don’t match. Try again.'); setPin1(''); setPin('new'); return }
    if (/^(\d)\1{3}$/.test(p) || p === '1234') { toast('Pick something harder to guess than ' + p); setPin1(''); setPin('new'); return }
    try { await api('/me/pin', { body: { pin: p } }); setPin(''); toast('PIN saved'); await refresh(); nav('/') } catch (e) { toast((e as Error).message); setPin('') }
  }

  if (!user) return null
  let view
  if (step === 'intro') {
    view = (
      <>
        <Top back="/settings" />
        <Ic name="shieldcheck" tone="red" lg />
        <div className="col g6"><h2 className="h2" style={{ fontSize: 24 }}>Let’s confirm it’s really you</h2><span className="t2">CBN rules require identity checks before you can move money. It takes about two minutes.</span></div>
        <div className="card col g16">
          {[['landmark', 'BVN or NIN', 'Your 11 digit Bank Verification or National Identity Number'], ['user', 'Confirm your details', 'Name and date of birth from the record'], ['camera', 'Selfie liveness check', 'A short look at the camera'], ['lock', 'Transaction PIN', 'Used to approve transfers']].map(([i, t, s], k) => (
            <div key={t} className="row g12"><Ic name={i} tone={k === 0 ? 'red' : ''} /><span className="col g4 grow"><span className="s w6">{t}</span><span className="xs mu">{s}</span></span><span className="xs mu">{k + 1}/4</span></div>
          ))}
        </div>
        <div className="soft row g10"><Icon name="lock" color="var(--red)" /><span className="xs t2">Checked securely through a licensed KYC partner (sandbox). NURU keeps only the last four digits of your BVN or NIN.</span></div>
        <div className="k-flow-cta"><button className="btn pri block" onClick={() => setStep('choose')}>Start verification</button></div>
      </>
    )
  } else if (step === 'choose') {
    view = (
      <>
        <Top onBack={() => setStep('intro')} step={1} />
        <div className="col g6"><h2 className="h2" style={{ fontSize: 24 }}>Which ID will you use?</h2><span className="t2">Either one raises your account to Tier 2.</span></div>
        {([['bvn', 'landmark', 'Bank Verification Number', 'Dial *565*0# on the phone linked to your bank'], ['nin', 'user', 'National Identity Number', 'On your NIN slip, or dial *346# from your registered line']] as const).map(([k, i, t, s]) => (
          <button key={k} className={'k-opt' + (kind === k ? ' on' : '')} onClick={() => setKind(k)} aria-pressed={kind === k}>
            <Ic name={i} tone={kind === k ? 'red' : ''} /><span className="col g4 grow"><span className="s w6">{t}</span><span className="xs mu">{s}</span></span><span className={'k-radio' + (kind === k ? ' on' : '')} />
          </button>
        ))}
        <div className="k-flow-cta"><button className="btn pri block" onClick={() => { setNum(''); setErr(''); setStep('number') }}>Continue with {label}</button></div>
      </>
    )
  } else if (step === 'number') {
    view = (
      <>
        <Top onBack={() => setStep('choose')} step={1} />
        <div className="col g6"><h2 className="h2" style={{ fontSize: 24 }}>Enter your {label}</h2><span className="t2">{kind === 'bvn' ? 'Dial *565*0# on the phone linked to your bank to get your BVN.' : 'Find it on your NIN slip or dial *346# from your registered line.'}</span></div>
        <div className="field"><label htmlFor="idn">{kind === 'bvn' ? 'Bank Verification Number' : 'National Identity Number'}</label>
          <div style={{ position: 'relative' }}>
            <input id="idn" className="input num" style={{ fontSize: 20, letterSpacing: 4, fontWeight: 600, height: 54 }} inputMode="numeric" autoComplete="off" autoFocus
              value={group(num)} onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 11))} />
            <span style={{ position: 'absolute', right: 14, top: 17 }}>{num.length === 11 ? <Icon name="check" color="var(--green)" /> : <span className="xs mu">{num.length}/11</span>}</span>
          </div>
          <span className="xs mu">11 digits</span>
        </div>
        {kind === 'bvn' && <div className="field"><label htmlFor="dob">Date of birth</label><input id="dob" className="input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} /></div>}
        <div className="soft col g8"><div className="row g8"><Icon name="info" size={16} color="var(--blue)" /><span className="s w6">Why we need this</span></div>
          <span className="xs t2">{kind === 'bvn' ? 'Your BVN confirms your name, phone and date of birth with NIBSS. It does not give NURU access to your bank accounts.' : 'Verified with NIMC. We keep only a masked copy and a verification reference.'}</span></div>
        {err && <span className="err" role="alert">{err}</span>}
        <div className="k-flow-cta"><button className="btn pri block" disabled={num.length !== 11 || busy} onClick={lookup}>{busy ? 'Checking…' : 'Verify ' + label}</button></div>
      </>
    )
  } else if (step === 'confirm' && match) {
    const sameName = match.name.toLowerCase().split(' ')[0] === user.name.toLowerCase().split(' ')[0]
    view = (
      <>
        <Top onBack={() => setStep('number')} step={2} />
        <div className="row g10"><Ic name="check" tone="green" /><span className="col g4"><span className="h3">{label} found</span><span className="xs mu">Matched with {kind === 'bvn' ? 'NIBSS' : 'NIMC'} just now · sandbox</span></span></div>
        <div className="card col g12">
          {[['Full name', match.name], ['Date of birth', fmtDob(match.dob)], ...(match.phone ? [['Phone', match.phone]] : []), [label, match.masked]].map(([k, v], i) => (
            <div key={k} className="col g12">{i > 0 && <div className="div" />}<div className="row between g12"><span className="s t2">{k}</span><span className="s w6 right">{v}</span></div></div>
          ))}
        </div>
        <div className="row g10 soft"><Icon name={sameName ? 'check' : 'alert'} color={sameName ? 'var(--green)' : 'var(--amber)'} /><span className="s">{sameName ? 'Name matches your NURU profile' : 'Name differs from your NURU profile'}</span></div>
        {kind === 'bvn' && dob && <div className="row g10 soft"><Icon name={dob === match.dob ? 'check' : 'info'} color={dob === match.dob ? 'var(--green)' : 'var(--blue)'} /><span className="s">{dob === match.dob ? 'Date of birth matches what you entered' : 'Sandbox records use a sample date of birth'}</span></div>}
        <div className="k-flow-cta">
          <button className="btn pri block" onClick={() => { setErr(''); setStep('selfie') }}>Yes, this is me</button>
          <button className="btn ghost block" onClick={() => { setNum(''); setStep('number') }}>These details are wrong</button>
        </div>
      </>
    )
  } else if (step === 'selfie') {
    view = (
      <>
        <Top onBack={() => setStep('confirm')} step={3} />
        <div className="col center g16" style={{ textAlign: 'center' }}>
          <FaceCam mode="enrol" onFace={(d) => { setFace(d); setStep('checking') }} />
          <div className="col center g6"><span className="h3">Look straight at the camera</span><span className="s t2">Keep your face inside the oval, in good light, without glasses or a cap.</span></div>
        </div>
        {err && <span className="err" role="alert">{err}</span>}
        <div className="row center g8 xs mu"><Icon name="lock" size={14} color="var(--muted)" /> No photo leaves your device, only an encrypted face template</div>
      </>
    )
  } else if (step === 'checking') {
    const rows: [string, string][] = [[label + ' matched', kind === 'bvn' ? 'NIBSS' : 'NIMC'], ['Face template saved', 'Encrypted with your key'], [label + ' record confirmed', 'Sandbox KYC partner'], ['Liveness confirmed', checks >= 4 ? 'Done' : 'Running anti-spoof checks']]
    view = (
      <div className="col center g20" style={{ padding: '32px 0', textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 120, height: 120 }}>
          <svg width="120" height="120" viewBox="0 0 120 120" className="k-spin" aria-hidden="true"><circle cx="60" cy="60" r="54" fill="none" stroke="var(--surface2)" strokeWidth="6" /><circle cx="60" cy="60" r="54" fill="none" stroke="var(--red)" strokeWidth="6" strokeLinecap="round" strokeDasharray="90 340" /></svg>
          <span className="col center" style={{ position: 'absolute', inset: 0 }}><Icon name="scanface" size={48} color="var(--red)" stroke={1.6} /></span>
        </div>
        <div className="col center g8"><h2 className="h2" style={{ fontSize: 24 }}>Checking your details</h2><span className="t2">This usually takes less than 20 seconds. Please keep the app open.</span></div>
        <div className="card col g16" style={{ width: '100%', textAlign: 'left' }} aria-live="polite">
          {rows.map(([t, s], i) => <div key={t} className="row g12"><Ic name={i < checks ? 'check' : 'clock'} tone={i < checks ? 'green' : ''} size={16} /><span className="col g4 grow"><span className="s w6">{t}</span><span className="xs mu">{s}</span></span></div>)}
        </div>
      </div>
    )
  } else {
    view = (
      <>
        <Done icon="shieldcheck" title="You’re verified" body={user.has_pin ? 'Your account is now Tier 2. You can send money with your PIN and face check.' : 'Your account is now Tier 2. Set a transaction PIN to start sending money.'}>
          <div className="card col g12" style={{ width: '100%', textAlign: 'left' }}>
            <div className="row between"><span className="s t2">Account tier</span><span className="chip green">Tier 2</span></div><div className="div" />
            <div className="row between"><span className="s t2">Daily transfer limit</span><span className="s w6 num">{money(200000)}</span></div><div className="div" />
            <div className="row between"><span className="s t2">Maximum balance</span><span className="s w6 num">{money(500000)}</span></div>
          </div>
          <Link to="/help" className="s red w6">How to upgrade to Tier 3</Link>
        </Done>
        <div className="k-flow-cta">
          {user.has_pin ? <button className="btn pri block" onClick={() => nav('/link')}>Link a bank account</button> : <button className="btn pri block" onClick={() => setPin('new')}>Create transaction PIN</button>}
          <button className="btn ghost block" onClick={() => nav('/')}>Go to my dashboard</button>
        </div>
      </>
    )
  }

  return (
    <Shell title="Verify identity" sub="BVN or NIN, then a selfie check">
      <div className="k-flow">{view}</div>
      {pin && (
        <Modal onClose={() => setPin('')}>
          <div className="col g16 center" style={{ textAlign: 'center' }}>
            <Ic name="lock" tone="red" lg />
            <span className="h3">{pin === 'new' ? 'Create a 4 digit PIN' : 'Confirm your PIN'}</span>
            <span className="s t2">{pin === 'new' ? 'You’ll use this PIN to approve every transfer and payment.' : 'Enter the same 4 digits again.'}</span>
            <PinInput key={pin + pin1} onDone={(p) => { if (pin === 'new') { setPin1(p); setPin('again') } else savePin(p) }} />
            <span className="xs mu">Avoid 1234, 0000 or your birth year</span>
          </div>
        </Modal>
      )}
    </Shell>
  )
}
