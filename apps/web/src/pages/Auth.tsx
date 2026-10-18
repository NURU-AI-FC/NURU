import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, type User } from '../api'
import { homeFor } from '../access'
import { useApp } from '../store'
import { Icon, Logo } from '../ui'

export default function Auth({ mode }: { mode: 'login' | 'signup' | 'forgot' }) {
  if (mode === 'forgot') return <Frame><Forgot /></Frame>
  return <Frame><SignIn mode={mode} /></Frame>
}

function SignIn({ mode }: { mode: 'login' | 'signup' }) {
  const { t, signIn } = useApp()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const demo = params.get('demo') === '1'
  const [form, setForm] = useState({ name: '', email: demo ? 'judge@nuru.app' : '', phone: '', password: demo ? 'Zecathon-2026' : '', business: false })
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [code, setCode] = useState('')
  const [hint, setHint] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const r = await api<{ demo_code?: string }>('/auth/' + mode, { body: form })
      setHint(r.demo_code || '')
      if (r.demo_code) setCode(r.demo_code)
      setStep('otp')
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const r = await api<{ token: string; user: User }>('/auth/verify', { body: { email: form.email, code } })
      signIn(r.token, r.user)
      nav(r.user.role !== 'customer' ? homeFor(r.user) : mode === 'signup' ? '/welcome' : '/')
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <>
          {step === 'form' ? (
            <form className="col g16" onSubmit={submit}>
              <div className="col g4">
                <h1 className="h2" style={{ fontSize: 26 }}>{mode === 'login' ? 'Welcome back' : 'Create your NURU account'}</h1>
                <span className="t2">{mode === 'login' ? 'Sign in to see your money clearly.' : 'It takes a minute. We will link your accounts after.'}</span>
              </div>
              {mode === 'login' && (
                <button type="button" className="soft row g10" style={{ border: '1px dashed var(--red)', textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => setForm({ ...form, email: 'judge@nuru.app', password: 'Zecathon-2026' })}>
                  <Icon name="sparkles" color="var(--red)" />
                  <span className="col"><span className="s w6">{t('demo')}</span><span className="xs t2">judge@nuru.app · Zecathon-2026 · code 000000</span></span>
                </button>
              )}
              {mode === 'signup' && <div className="field"><label htmlFor="name">{t('fullName')}</label><input id="name" className="input" value={form.name} onChange={set('name')} autoComplete="name" required /></div>}
              <div className="field"><label htmlFor="email">{t('email')}</label><input id="email" className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" required /></div>
              {mode === 'signup' && <div className="field"><label htmlFor="phone">{t('phone')}</label><input id="phone" className="input" type="tel" value={form.phone} onChange={set('phone')} placeholder="0803 000 0000" autoComplete="tel" /></div>}
              <div className="field">
                <label htmlFor="pw">{t('password')}</label>
                <div style={{ position: 'relative' }}>
                  <input id="pw" className="input" type={show ? 'text' : 'password'} value={form.password} onChange={set('password')} minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
                  <button type="button" className="ib" style={{ position: 'absolute', right: 4, top: 3, background: 'transparent' }} onClick={() => setShow(!show)} aria-label="Show password"><Icon name={show ? 'eyeoff' : 'eye'} color="var(--muted)" /></button>
                </div>
              </div>
              {mode === 'login' && <Link className="s red w6" style={{ alignSelf: 'flex-end', marginTop: -8 }} to="/forgot">Forgot password?</Link>}
              {mode === 'signup' && <label className="row g8 s"><input type="checkbox" checked={form.business} onChange={set('business')} />{t('haveBiz')}</label>}
              {err && <span className="err" role="alert">{err}</span>}
              <button className="btn pri block" disabled={busy}>{busy ? '…' : mode === 'login' ? t('login') : t('signup')}</button>
              <span className="s t2" style={{ textAlign: 'center' }}>
                {mode === 'login' ? <>{t('noAccount')} <Link className="red w6" to="/signup">{t('signup')}</Link></> : <>{t('haveAccount')} <Link className="red w6" to="/login">{t('login')}</Link></>}
              </span>
            </form>
          ) : (
            <form className="col g16" onSubmit={verify}>
              <span className="tile" style={{ width: 48, height: 48, background: 'var(--red50)', color: 'var(--red)' }}><Icon name="mail" size={22} /></span>
              <div className="col g4"><h1 className="h2" style={{ fontSize: 26 }}>{t('otpTitle')}</h1><span className="t2">{t('otpSent')} {form.email}</span></div>
              <input className="input num" style={{ fontSize: 24, letterSpacing: 12, textAlign: 'center', height: 58 }} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" aria-label="One time code" autoFocus />
              {hint && <span className="xs mu">Demo mode: the code is {hint}. A live deployment sends it by SMS or email.</span>}
              {err && <span className="err" role="alert">{err}</span>}
              <button className="btn pri block" disabled={busy || code.length !== 6}>{t('verify')}</button>
              <button type="button" className="btn ghost" onClick={() => setStep('form')}>Back</button>
            </form>
          )}
    </>
  )
}

const RULES: [string, (p: string) => boolean][] = [
  ['At least 12 characters', (p) => p.length >= 12],
  ['One number and one symbol', (p) => /\d/.test(p) && /[^A-Za-z0-9]/.test(p)],
  ['Upper and lower case', (p) => /[a-z]/.test(p) && /[A-Z]/.test(p)],
]

// Forgot sends a reset code to the email, then sets a new password with it.
function Forgot() {
  const nav = useNavigate()
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [hint, setHint] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function send(e: FormEvent) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const r = await api<{ demo_code?: string }>('/auth/forgot', { body: { email } })
      setHint(r.demo_code || '')
      if (r.demo_code) setCode(r.demo_code)
      setStep('reset')
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  async function reset(e: FormEvent) {
    e.preventDefault()
    if (pw !== pw2) { setErr('The passwords do not match'); return }
    setErr(''); setBusy(true)
    try { await api('/auth/reset', { body: { email, code, password: pw } }); setStep('done') } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  if (step === 'done') return (
    <div className="col g16">
      <span className="tile" style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--green50)', color: 'var(--green)' }}><Icon name="check" size={26} /></span>
      <div className="col g4"><h1 className="h2" style={{ fontSize: 26 }}>Password updated</h1><span className="t2">We signed you out on every device. Sign in with your new password.</span></div>
      <button className="btn pri block" onClick={() => nav('/login')}>Sign in</button>
    </div>
  )
  if (step === 'reset') {
    const ok = RULES.every(([, f]) => f(pw))
    return (
      <form className="col g16" onSubmit={reset}>
        <div className="col g4"><h1 className="h2" style={{ fontSize: 26 }}>Create a new password</h1><span className="t2">Enter the code we sent to {email}. Your new password must be different from the old one.</span></div>
        <div className="field"><label htmlFor="code">Reset code</label>
          <input id="code" className="input num" style={{ fontSize: 20, letterSpacing: 8, textAlign: 'center', height: 54 }} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required />
          {hint && <span className="xs mu">Demo mode: the code is {hint}. A live deployment sends it by SMS or email.</span>}
        </div>
        <div className="field"><label htmlFor="npw">New password</label>
          <div style={{ position: 'relative' }}>
            <input id="npw" className="input" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required />
            <button type="button" className="ib" style={{ position: 'absolute', right: 4, top: 3, background: 'transparent' }} onClick={() => setShow(!show)} aria-label="Show password"><Icon name={show ? 'eyeoff' : 'eye'} color="var(--muted)" /></button>
          </div>
        </div>
        <div className="field"><label htmlFor="npw2">Confirm password</label>
          <div style={{ position: 'relative' }}>
            <input id="npw2" className="input" type={show ? 'text' : 'password'} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required />
            {pw2 && pw2 === pw && <span style={{ position: 'absolute', right: 14, top: 14 }}><Icon name="check" color="var(--green)" /></span>}
          </div>
        </div>
        <div className="soft col g8">
          {RULES.map(([t, f]) => <div key={t} className="row g8"><Icon name={f(pw) ? 'check' : 'x'} size={16} color={f(pw) ? 'var(--green)' : 'var(--muted)'} /><span className="s">{t}</span></div>)}
        </div>
        {err && <span className="err" role="alert">{err}</span>}
        <button className="btn pri block" disabled={busy || !ok || code.length !== 6 || pw !== pw2}>{busy ? '…' : 'Update password'}</button>
        <button type="button" className="btn ghost" onClick={() => setStep('email')}>Back</button>
      </form>
    )
  }
  return (
    <form className="col g16" onSubmit={send}>
      <span className="tile" style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--red50)', color: 'var(--red)' }}><Icon name="key" size={26} /></span>
      <div className="col g4"><h1 className="h2" style={{ fontSize: 26 }}>Forgot your password?</h1><span className="t2">Enter your email. We’ll send a code to confirm it’s you, then you can set a new password.</span></div>
      <div className="field"><label htmlFor="femail">Email</label><input id="femail" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus /></div>
      <div className="soft row g10"><Icon name="info" color="var(--blue)" /><span className="xs t2">For your safety, every device is signed out after a password reset.</span></div>
      {err && <span className="err" role="alert">{err}</span>}
      <button className="btn pri block" disabled={busy}>{busy ? '…' : 'Send reset code'}</button>
      <Link className="s t2" style={{ textAlign: 'center' }} to="/login">Back to <span className="red w6">sign in</span></Link>
    </form>
  )
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="row" style={{ minHeight: '100vh', alignItems: 'stretch' }}>
      <div className="col center grow" style={{ padding: 24 }}>
        <div className="col g20" style={{ width: '100%', maxWidth: 400 }}>
          <Link to="/"><Logo /></Link>
          {children}
        </div>
      </div>
      <div className="col center hide-sm" style={{ flex: '0 0 44%', background: 'var(--red)', color: '#fff', padding: 48, display: window.innerWidth < 900 ? 'none' : 'flex' }}>
        <div className="col g16" style={{ maxWidth: 420 }}>
          <Icon name="shieldcheck" size={40} color="#fff" />
          <h2 className="h1" style={{ fontSize: 34 }}>Bank grade security on every step.</h2>
          <span style={{ opacity: .9, fontSize: 16 }}>Passwords hashed with Argon2id, one time codes on sign in, a PIN and face check before money moves, and chats encrypted so only you can read them.</span>
        </div>
      </div>
    </div>
  )
}
