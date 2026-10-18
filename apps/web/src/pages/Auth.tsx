import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, type User } from '../api'
import { useApp } from '../store'
import { Icon, Logo } from '../ui'

export default function Auth({ mode }: { mode: 'login' | 'signup' }) {
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
      nav(r.user.role === 'staff' ? '/console' : mode === 'signup' ? '/settings?welcome=1' : '/')
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className="row" style={{ minHeight: '100vh', alignItems: 'stretch' }}>
      <div className="col center grow" style={{ padding: 24 }}>
        <div className="col g20" style={{ width: '100%', maxWidth: 400 }}>
          <Link to="/"><Logo /></Link>
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
                  <span className="col"><span className="s w6">{t('demo')}</span><span className="xs t2">judge@nuru.app · Zecathon-2026 · code 000000 · PIN 1234</span></span>
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
