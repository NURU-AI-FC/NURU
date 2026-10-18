import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Lang } from '../api'
import { useApp, useMoney } from '../store'
import { Icon, Logo } from '../ui'
import { createPasskey, hasPasskey, Ic, Top } from './settings/kit'

// Welcome runs once after sign up: three slides, language, passkey, then a
// checklist that leads into identity checks and account linking.
const SLIDES: [string, string][] = [
  ['See where every naira goes', 'NURU turns your transactions into clear charts and plain-language insights, so patterns are obvious at a glance.'],
  ['Talk to your money in your language', 'Ask questions by text or voice in English, Yorùbá, Igbo or Hausa. NURU answers with your real numbers.'],
  ['Bank-grade security, built in', 'Passkeys, PIN and face verification protect every transfer. Your conversations are encrypted end to end.'],
]

export const LANGS: [Lang, string, string, string][] = [
  ['en', 'English', 'Hello! Let’s understand your money.', 'en-NG'],
  ['yo', 'Yorùbá', 'Ẹ káàbọ̀! Ẹ jẹ́ ká mọ owó yín.', 'yo-NG'],
  ['ig', 'Igbo', 'Nnọọ! Ka anyị ghọta ego gị.', 'ig-NG'],
  ['ha', 'Hausa', 'Sannu! Mu fahimci kuɗin ka.', 'ha-NG'],
]

export function say(text: string, lang: string, rate = 1) {
  try {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = rate
    speechSynthesis.speak(u)
  } catch { /* no speech on this browser */ }
}

export const markWelcomed = () => { try { localStorage.setItem('nuru.welcomed', '1') } catch { /* ignore */ } }

export default function Welcome() {
  const { user, update, toast } = useApp()
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [lang, setLang] = useState<Lang>(user?.language || 'en')
  const [passkey, setPasskey] = useState(hasPasskey)
  if (!user) return null
  const first = user.name.split(' ')[0]

  async function addPasskey() {
    try { if (await createPasskey(user!)) { setPasskey(true); toast('Passkey added on this device') } } catch { toast('Passkey was not created') }
    setStep(5)
  }
  const finish = (to: string) => { markWelcomed(); nav(to) }

  let body: ReactNode
  if (step < 3) {
    body = (
      <>
        <div className="row between"><Logo size={28} /><button className="btn ghost sm" onClick={() => setStep(3)}>Skip</button></div>
        <div className="col center" style={{ minHeight: 300, padding: '12px 0' }}>{[<Art1 key={1} />, <Art2 key={2} />, <Art3 key={3} />][step]}</div>
        <div className="k-dots">{SLIDES.map((_, i) => <i key={i} className={i === step ? 'on' : ''} />)}</div>
        <h1 className="h1" style={{ fontSize: 32 }}>{SLIDES[step][0]}</h1>
        <span className="t2" style={{ fontSize: 15 }}>{SLIDES[step][1]}</span>
        <button className="btn pri block" onClick={() => setStep(step + 1)}>{step === 2 ? 'Get started' : 'Next'} <Icon name="chevr" color="#fff" /></button>
      </>
    )
  } else if (step === 3) {
    const name = LANGS.find((l) => l[0] === lang)![1]
    body = (
      <>
        <div className="k-flow-top"><button className="ib" aria-label="Back" onClick={() => setStep(2)}><Icon name="chevl" /></button><span className="grow" /><button className="btn ghost sm red" onClick={() => setStep(4)}>Skip</button></div>
        <div className="col g8"><h1 className="h1" style={{ fontSize: 30 }}>Choose your language</h1><span className="t2" style={{ fontSize: 15 }}>NURU will speak, write and explain your money in this language. You can change it any time.</span></div>
        <div className="col g12" role="radiogroup">
          {LANGS.map(([code, n, hello, voice]) => (
            <div key={code} className={'k-opt' + (lang === code ? ' on' : '')} role="radio" aria-checked={lang === code} tabIndex={0}
              onClick={() => setLang(code)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setLang(code)} style={{ cursor: 'pointer' }}>
              <span className="av" style={{ background: lang === code ? 'var(--red)' : 'var(--surface2)', color: lang === code ? '#fff' : 'var(--text)' }}>{code.toUpperCase()}</span>
              <span className="col g4 grow"><span className="h3">{n}</span><span className="xs t2">{hello}</span></span>
              {lang === code
                ? <span className="ib" style={{ width: 34, height: 34, borderRadius: 99, background: 'var(--red)' }}><Icon name="check" size={16} color="#fff" /></span>
                : <button className="ib" style={{ width: 34, height: 34, borderRadius: 99 }} aria-label={'Hear ' + n} onClick={(e) => { e.stopPropagation(); say(hello, voice) }}><Icon name="volume" size={16} color="var(--text2)" /></button>}
            </div>
          ))}
        </div>
        <div className="row g8"><Icon name="mic" size={16} color="var(--red)" /><span className="s t2">Voice replies available in all four languages</span></div>
        <button className="btn pri block" onClick={async () => { await update({ language: lang }).catch(() => {}); setStep(4) }}>Continue in {name}</button>
      </>
    )
  } else if (step === 4) {
    body = (
      <>
        <Top step={3} onBack={() => setStep(3)} />
        <div className="col center g20" style={{ textAlign: 'center', paddingTop: 12 }}>
          <span className="col center" style={{ width: 132, height: 132, borderRadius: 40, background: 'var(--red50)' }}><Icon name="scanface" size={64} color="var(--red)" stroke={1.6} /></span>
          <div className="col center g8"><h2 className="h2" style={{ fontSize: 24 }}>Sign in with your face or fingerprint</h2><span className="t2" style={{ fontSize: 15 }}>Create a passkey on this device. No password to remember, and it can’t be phished or reused on another device.</span></div>
          <div className="col g10" style={{ width: '100%' }}>
            {[['shieldcheck', 'Stored only on your device'], ['zap', 'Sign in in under a second'], ['lock', 'Works with Face ID and fingerprint']].map(([i, t]) => (
              <div key={t} className="row g12 soft"><Icon name={i} color="var(--red)" /><span className="s w6">{t}</span></div>
            ))}
          </div>
        </div>
        <div className="k-flow-cta">
          {passkey ? <button className="btn pri block" onClick={() => setStep(5)}><Icon name="check" color="#fff" /> Passkey already on this device</button>
            : <button className="btn pri block" onClick={addPasskey}><Icon name="fingerprint" color="#fff" /> Create passkey</button>}
          <button className="btn ghost block" onClick={() => setStep(5)}>Maybe later</button>
        </div>
      </>
    )
  } else {
    const items: [string, string, boolean, string][] = [
      ['check', 'Email verified', true, ''], [passkey ? 'check' : 'fingerprint', passkey ? 'Passkey created' : 'Passkey not set up yet', passkey, ''],
      ['user', 'Verify BVN or NIN', user.kyc_verified, '/verify'], ['link', 'Link a bank account', false, '/link'],
    ]
    body = (
      <div className="col center g20" style={{ textAlign: 'center', paddingTop: 24 }}>
        <div className="k-done-ring"><span><Icon name="check" size={44} color="#fff" stroke={3} /></span></div>
        <div className="col center g8"><h1 className="h1" style={{ fontSize: 30 }}>Welcome, {first}!</h1><span className="t2" style={{ fontSize: 15 }}>Your NURU account is ready. Next, verify your identity and link an account so NURU can start finding insights.</span></div>
        <div className="card col g12" style={{ width: '100%', textAlign: 'left' }}>
          {items.map(([i, t, d, to]) => {
            const row = <><Ic name={d ? 'check' : i} tone={d ? 'green' : ''} size={16} /><span className={'s w6 grow' + (d ? ' mu' : '')}>{t}</span>{!d && to && <Icon name="chevr" size={16} color="var(--muted)" />}</>
            return !d && to ? <Link key={t} to={to} onClick={markWelcomed} className="row g12">{row}</Link> : <div key={t} className="row g12">{row}</div>
          })}
        </div>
        <div className="k-flow-cta" style={{ width: '100%' }}>
          {user.kyc_verified ? <button className="btn pri block" onClick={() => finish('/link')}>Link an account</button> : <button className="btn pri block" onClick={() => finish('/verify')}>Verify my identity</button>}
          <button className="btn ghost block" onClick={() => finish('/')}>Go to my dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div className="col" style={{ minHeight: '100vh', padding: '20px 16px 32px' }}>
      <div className="k-flow" style={{ flex: 1 }}>{body}</div>
    </div>
  )
}

function Art1() {
  const money = useMoney()
  const bars = [30, 46, 38, 60, 52, 70, 44, 64, 58, 80, 66, 72]
  return (
    <div className="col g12" style={{ width: 300, maxWidth: '100%' }}>
      <div className="card" style={{ padding: 14, borderRadius: 18 }}>
        <div className="row between"><span className="xs mu">Monthly spend</span><span className="chip red"><Icon name="up" size={11} /> 12%</span></div>
        <div className="h2 num" style={{ marginTop: 4 }}>{money(405200)}</div>
        <div className="row g6" style={{ alignItems: 'flex-end', height: 70, marginTop: 10 }}>{bars.map((h, i) => <i key={i} style={{ display: 'block', flex: 1, height: h + '%', borderRadius: 4, background: i === 9 ? 'var(--red)' : 'var(--surface2)' }} />)}</div>
      </div>
      <div className="card row g10" style={{ padding: 14, borderRadius: 18, marginLeft: 30 }}>
        <Ic name="sparkles" tone="red" />
        <span className="col g4 grow"><span className="s w6">Food is your top category</span><span className="xs t2">31% of spend · {money(126400)}</span></span>
      </div>
    </div>
  )
}

function Art2() {
  const money = useMoney()
  return (
    <div className="col g12" style={{ width: 300, maxWidth: '100%' }}>
      <div className="row g8 wrap center">{['English', 'Yorùbá', 'Igbo', 'Hausa'].map((l, i) => <span key={l} className={'chip' + (i === 1 ? ' red' : '')} style={{ height: 36, fontSize: 14 }}>{l}</span>)}</div>
      <div className="bubble me" style={{ maxWidth: 250 }}>Kí ló gbé owó mi lọ lóṣù yìí?</div>
      <div className="bubble ai" style={{ maxWidth: 270 }}>Oúnjẹ ló gbà jù: {money(126400)}, ìyẹn 31% nínú gbogbo ìnáwó rẹ.</div>
      <div className="row g8" style={{ alignSelf: 'flex-start', background: 'var(--red50)', borderRadius: 999, padding: '8px 14px' }}>
        <Icon name="volume" size={16} color="var(--red)" />
        <span className="row g4">{[8, 14, 20, 12, 18, 10, 16, 6, 12].map((h, i) => <i key={i} style={{ display: 'block', width: 3, height: h, borderRadius: 2, background: 'var(--red)' }} />)}</span>
        <span className="xs red w6">0:06</span>
      </div>
    </div>
  )
}

function Art3() {
  return (
    <div className="col center g16" style={{ width: 300, maxWidth: '100%' }}>
      <span className="col center" style={{ width: 150, height: 150, borderRadius: 999, background: 'var(--red50)' }}>
        <span className="col center" style={{ width: 104, height: 104, borderRadius: 999, background: 'var(--red)', boxShadow: '0 16px 40px rgba(227,6,19,.35)' }}><Icon name="shieldcheck" size={52} color="#fff" stroke={1.8} /></span>
      </span>
      <div className="row g8 wrap center">{[['fingerprint', 'Passkey'], ['scanface', 'Face 2FA'], ['lock', 'PIN'], ['shield', 'Encrypted']].map(([i, l]) => <span key={l} className="chip"><Icon name={i} size={15} color="var(--red)" /> {l}</span>)}</div>
    </div>
  )
}
