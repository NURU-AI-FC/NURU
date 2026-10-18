import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { homeFor } from '../../access'
import { api, type User } from '../../api'
import { useApp } from '../../store'
import { Icon } from '../../ui'
import './console.css'

const COPY = {
  console: {
    brand: 'NURU Console', title: 'Customer insights for Zenith Bank staff',
    body: 'Anonymised segments, campaigns and risk signals from customers who chose to share. No names, chats or full account numbers.',
    points: [['shieldcheck', 'Zenith work accounts only'], ['key', 'Role based access, approved by a console admin'], ['eye', 'Every view and export is logged']],
    sub: 'Use your Zenith Bank work account.', placeholder: 'amaka.obi@zenithbank.com',
    help: 'No access yet? Ask your console admin to invite you. Personal emails cannot sign in.', demo: 'staff@nuru.app',
  },
  hq: {
    brand: 'NURU HQ', title: 'How NURU is doing, for the NURU team',
    body: 'Counts, health and support for the people who run NURU. Customer names, chats and balances never reach HQ.',
    points: [['eyeoff', 'No customer data, counts only'], ['key', 'Each role sees only its own pages'], ['eye', 'Every change to the team is logged']],
    sub: 'Use the email you were invited with.', placeholder: 'you@nuru.app',
    help: 'No access yet? Ask the HQ owner to invite you.', demo: 'ceo@nuru.app',
  },
}

// Login is the staff sign in: a work email and a one time code, no password.
// Zenith SSO switches on when Zenith connects its identity provider.
export default function Login({ area }: { area: 'console' | 'hq' }) {
  const { user, ready, signIn } = useApp()
  const nav = useNavigate()
  const c = COPY[area]
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [hint, setHint] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (ready && user) return <Navigate to={homeFor(user)} replace />

  async function start(e: FormEvent) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const r = await api<{ demo_code?: string }>('/auth/staff', { body: { email, area } })
      setHint(r.demo_code || '')
      if (r.demo_code) setCode(r.demo_code)
      setStep('code')
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  async function verify(e: FormEvent) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const r = await api<{ token: string; user: User }>('/auth/verify', { body: { email, code } })
      signIn(r.token, r.user)
      nav(homeFor(r.user))
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className="slogin">
      <aside className="slogin-side">
        <div className="row g10"><span className="mark" style={{ width: 36, height: 36, fontSize: 20 }}>N</span><span className="h3" style={{ color: '#fff', fontSize: 18 }}>{c.brand}</span></div>
        <div className="grow" />
        <h1 className="slogin-title">{c.title}</h1>
        <span style={{ color: '#b3b3bd', fontSize: 15 }}>{c.body}</span>
        {c.points.map(([ic, t]) => <div key={t} className="row g10"><Icon name={ic} size={18} color="#4ade80" /><span className="s" style={{ color: '#e6e6ea' }}>{t}</span></div>)}
      </aside>
      <main className="slogin-main">
        <div className="col g16" style={{ width: '100%', maxWidth: 400 }}>
          <div className="row g10 slogin-brand"><span className="mark">N</span><span className="h3">{c.brand}</span></div>
          {step === 'email' ? (
            <form className="col g16" onSubmit={start}>
              <div className="col g6"><h1 className="h1" style={{ fontSize: 34 }}>Staff sign in</h1><span className="s t2">{c.sub}</span></div>
              {area === 'console' && <>
                <button type="button" className="btn pri" style={{ height: 52 }} disabled aria-describedby="sso-note"><Icon name="building" size={18} color="#fff" />Continue with Zenith SSO</button>
                <span id="sso-note" className="xs mu" style={{ marginTop: -8 }}>Switches on when Zenith connects its identity provider.</span>
                <div className="row g10"><div className="div grow" /><span className="xs mu">or</span><div className="div grow" /></div>
              </>}
              <div className="field"><label htmlFor="wemail">Work email</label><input id="wemail" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={c.placeholder} autoComplete="email" required /></div>
              {err && <span className="err" role="alert">{err}</span>}
              <button className="btn" style={{ height: 52 }} disabled={busy}><Icon name="mail" size={18} />{busy ? 'Sending…' : 'Email me a sign in code'}</button>
              <div className="soft row g10"><Icon name="info" size={16} color="var(--blue)" /><span className="xs t2 grow">{c.help}</span></div>
              <button type="button" className="xs mu" style={{ background: 'none', border: 0, textAlign: 'left', padding: 0 }} onClick={() => setEmail(c.demo)}>Demo for judges: {c.demo} · code 000000</button>
            </form>
          ) : (
            <form className="col g16" onSubmit={verify}>
              <span className="tile" style={{ width: 48, height: 48, background: 'var(--red50)', color: 'var(--red)' }}><Icon name="mail" size={22} /></span>
              <div className="col g4"><h1 className="h2" style={{ fontSize: 26 }}>Enter your code</h1><span className="t2">If {email} has access, we sent it a 6 digit code.</span></div>
              <input className="input num" style={{ fontSize: 24, letterSpacing: 12, textAlign: 'center', height: 58 }} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" aria-label="One time code" autoFocus />
              {hint && <span className="xs mu">Demo mode: the code is {hint}. A live deployment emails it.</span>}
              {err && <span className="err" role="alert">{err}</span>}
              <button className="btn pri block" disabled={busy || code.length !== 6}>Sign in</button>
              <button type="button" className="btn ghost" onClick={() => { setStep('email'); setErr('') }}>Use another email</button>
            </form>
          )}
          <Link to="/" className="xs mu" style={{ textAlign: 'center' }}>Not staff? Go to NURU</Link>
        </div>
      </main>
    </div>
  )
}
