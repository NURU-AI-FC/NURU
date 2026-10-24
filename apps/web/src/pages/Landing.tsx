import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Lang } from '../api'
import { HEAD_OFFICE, directions, known, km } from '../branches'
import { langNames } from '../i18n'
import { MapView } from '../LazyMap'
import { useApp } from '../store'
import { ThemePicker } from '../ThemePicker'
import { Icon, Logo, Modal } from '../ui'
import './landing.css'

const copy: Record<Lang, { a: string; b: string; p: string; cta: string }> = {
  en: { a: 'Your money, explained', b: 'in your language.', p: 'NURU is an AI copilot that reads your account history and tells you, in English, Yorùbá, Igbo or Hausa, where your money went and what to do next.', cta: 'Try the live demo' },
  yo: { a: 'Owó rẹ, ní àlàyé', b: 'ní èdè rẹ.', p: 'NURU ń ka ìtàn àkáǹtì rẹ, ó sì ń sọ ibi tí owó rẹ ń lọ, ohun tó ń bọ̀ àti bí o ṣe lè fi pamọ́ sí i.', cta: 'Gbìyànjú demo' },
  ig: { a: 'Ego gị, a kọwara', b: 'n’asụsụ gị.', p: 'NURU na-agụ akụkọ akaụntụ gị ma na-agwa gị ebe ego gị na-aga, ihe na-abịa na otu ị ga-esi chekwaa karịa.', cta: 'Nwalee demo' },
  ha: { a: 'Kuɗinka, an bayyana', b: 'cikin harshenka.', p: 'NURU na karanta tarihin asusunka ya gaya maka inda kuɗinka ke tafiya, abin da ke zuwa da yadda za ka ƙara ajiya.', cta: 'Gwada demo' },
}

const SECTIONS: [string, string][] = [['features', 'Features'], ['languages', 'Languages'], ['business', 'Business'], ['security', 'Security'], ['branches', 'Branches'], ['demo', 'Try it']]

const FEATS: [string, string, string, string][] = [
  ['chart', 'red', 'Daily to yearly insights', 'Power BI-style charts for every account, with a 3-month comparison and a forecast of next month.'],
  ['message', 'blue', 'Ask NURU anything about money', 'Type or speak. NURU only answers money questions and refuses tricks that try to change its rules.'],
  ['briefcase', 'amber', 'Tools for your business', 'Payroll, vendors, invoices, ads spend, a 12-month plan and a Decision Room for big choices.'],
  ['landmark', 'green', 'Loans, savings and pension', 'See interest, disbursement and repayment dates, fixed deposits, insurance and pension in one place.'],
  ['shield', 'red', 'Bank-grade protection', 'Passkeys, PIN plus face check, BVN and NIN checks, one-time codes and encrypted private chats.'],
  ['exchange', 'blue', 'Live currency view', 'Switch your balance to dollars, pounds or euros with live rates, then switch back in one tap.'],
]

const LANGS: [string, string, string][] = [
  ['English', 'How much did I spend on food this month?', '₦132,000. That is ₦12,000 over your budget.'],
  ['Yorùbá', 'Èló ni mo ná lórí oúnjẹ lóṣù yìí?', '₦132,000. Ó ju ìnáwó rẹ lọ pẹ̀lú ₦12,000.'],
  ['Igbo', 'Ego ole ka m ji zụta nri n’ọnwa a?', '₦132,000. Ọ karịrị atụmatụ gị ₦12,000.'],
  ['Hausa', 'Nawa na kashe a kan abinci a wannan wata?', '₦132,000. Ya wuce kasafin ku da ₦12,000.'],
]

const SECURITY: [string, string, string][] = [
  ['fingerprint', 'Passkeys and PIN', 'Sign in without passwords. Hashed with Argon2id.'],
  ['scanface', 'Face check', 'Liveness check for large or unusual transfers.'],
  ['shieldcheck', 'BVN and NIN', 'Identity verified once, at sign up.'],
  ['lock', 'Private chats', 'Encrypted. Not even bank staff can read them.'],
  ['alert', 'Injection guard', 'Blocks prompts that try to change NURU’s rules.'],
]

const TOUR: [string, string, string][] = [
  ['chart', 'See where your money went', 'All your bank and wallet accounts in one view, with daily to yearly charts and a forecast for next month.'],
  ['mic', 'Ask in your own language', 'Hold the mic and ask “Èló ni mo ná lọ́sẹ̀ yìí?”. NURU answers from your own numbers, out loud.'],
  ['send', 'Send money from the chat', 'Say “send ₦5,000 to Tunde”. NURU checks your PIN and your face before anything moves.'],
  ['briefcase', 'Run your business', 'Payroll with PAYE and pension, invoices, runway and a Decision Room for big choices.'],
  ['pin', 'Find a branch', 'When you need a person, NURU shows the closest branch with one-tap directions.'],
]

const MAP_CENTER: [number, number] = [6.437, 3.435]
const MAP_FIT = { tl: [40, 50] as [number, number], br: [40, 170] as [number, number] }

const DEMO: [string, string][] = [['Email', 'demo@nuru.app'], ['Password', 'Nuru-Demo-2026'], ['OTP code', '000000'], ['Transaction PIN', 'You create it on your first transfer']]

const Check = ({ children }: { children: string }) => <div className="row g10"><Icon name="check" color="var(--green)" /><span className="t2">{children}</span></div>
const Pill = ({ ic, children }: { ic: string; children: string }) => <span className="lp-pill"><Icon name={ic} size={15} />{children}</span>

function Phone({ small = false }: { small?: boolean }) {
  const bars = [9, 14, 7, 18, 11, 16, 8]
  return (
    <div className={'lp-phone' + (small ? ' sm' : '')} aria-hidden="true">
      <div className="lp-screen">
        <div className="row between lp-status"><span>9:41</span><Icon name="wifi" size={13} /></div>
        <div className="col g12" style={{ padding: '6px 16px' }}>
          <div className="row between"><div className="col"><span className="xs" style={{ color: '#8C8C97' }}>Good morning</span><span className="w7">Adaeze</span></div><span className="av" style={{ width: 32, height: 32, fontSize: 12 }}>AO</span></div>
          <div className="lp-bal"><span className="xs" style={{ opacity: 0.85 }}>Total balance</span><span className="lp-balv">₦1,284,500</span><span className="xs" style={{ opacity: 0.85 }}>3 accounts · +₦62,400 this week</span></div>
          <div className="lp-week">
            <span className="s w6">This week</span>
            <div className="lp-bars">{bars.map((v, i) => <div key={i} className="col center g4" style={{ flex: 1 }}><i style={{ height: v * 4, background: i === 3 ? '#E30613' : '#EFEFF2', animationDelay: i * 60 + 'ms' }} /><span>{'MTWTFSS'[i]}</span></div>)}</div>
          </div>
          <div className="lp-tip"><span className="row g6 xs w6" style={{ color: '#E30613' }}><Icon name="sparkles" size={13} />NURU</span><span className="s">You spent 12% less on food this week. Move ₦15,000 to your Japa fund?</span></div>
        </div>
      </div>
    </div>
  )
}

function Tour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % TOUR.length), 4200); return () => clearInterval(t) }, [])
  const [ic, h, p] = TOUR[i]
  return (
    <Modal onClose={onClose}>
      <div className="col g16 lp-tour">
        <div className="row between"><span className="xs mu w6 upper">NURU in 60 seconds · {i + 1} of {TOUR.length}</span><button className="ib" style={{ width: 34, height: 34 }} onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button></div>
        <div key={i} className="col g12 lp-tour-step">
          <span className="lp-ic red big"><Icon name={ic} size={30} /></span>
          <span className="h2">{h}</span>
          <span className="t2">{p}</span>
        </div>
        <div className="row g6">{TOUR.map((_, k) => <button key={k} className={'lp-dot' + (k === i ? ' on' : '')} onClick={() => setI(k)} aria-label={'Step ' + (k + 1)} />)}</div>
        <Link to="/login?demo=1" className="btn pri block">Try it yourself<Icon name="chevr" color="#fff" /></Link>
      </div>
    </Modal>
  )
}

export default function Landing() {
  const { lang, update } = useApp()
  const c = copy[lang]
  const [menu, setMenu] = useState(false)
  const [tour, setTour] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const near = useMemo(() => known().map((b) => ({ ...b, km: km(HEAD_OFFICE, [b.lat, b.lon]) })).filter((b) => b.km < 8), [])
  const ho = near.find((b) => b.id === 'ho')!

  useEffect(() => {
    const on = () => setScrolled(scrollY > 8)
    addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  useEffect(() => { document.body.style.overflow = menu ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [menu])

  // fade sections in as they scroll into view
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('in')), { threshold: 0.12 })
    document.querySelectorAll('.lp-reveal').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const go = (id: string) => { setMenu(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }
  const langPick = (cls = '') => (
    <select className={'input lp-lang ' + cls} value={lang} onChange={(e) => update({ language: e.target.value as Lang })} aria-label="Language">
      {(Object.keys(langNames) as Lang[]).map((l) => <option key={l} value={l}>{langNames[l]}</option>)}
    </select>
  )

  return (
    <div className="lp">
      <header className={'lp-nav' + (scrolled ? ' solid' : '')}>
        <Link to="/" aria-label="NURU home"><Logo size={34} /></Link>
        <nav className="lp-links">{SECTIONS.map(([id, l]) => <button key={id} onClick={() => go(id)}>{l}</button>)}</nav>
        <div className="row g12 lp-actions">
          <ThemePicker />
          <Link to="/login" className="btn ghost sm lp-hide-sm">Sign in</Link>
          <Link to="/signup" className="btn pri sm lp-hide-sm" style={{ height: 42, fontSize: 15 }}>Get started</Link>
          <button className="ib lp-burger" onClick={() => setMenu(true)} aria-label="Open menu"><Icon name="menu" /></button>
        </div>
      </header>

      {menu && (
        <div className="lp-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="row between lp-menu-top"><Logo size={28} /><button className="ib" onClick={() => setMenu(false)} aria-label="Close menu"><Icon name="x" /></button></div>
          <div className="col">{SECTIONS.map(([id, l]) => <button key={id} className="lp-menu-row" onClick={() => go(id)}><span className="h3">{l}</span><Icon name="chevr" color="var(--muted)" /></button>)}</div>
          <div className="row g10" style={{ marginTop: 24 }}><span className="s t2 grow">Theme</span><ThemePicker /></div>
          <div className="row g10" style={{ marginTop: 16 }}><span className="s t2 grow">Language</span>{langPick()}</div>
          <div className="col g10 lp-menu-cta"><Link to="/signup" className="btn pri block">Get started</Link><Link to="/login" className="btn block">Sign in</Link></div>
        </div>
      )}

      <section className="lp-hero lp-pad">
        <div className="col g24 lp-hero-copy">
          <Pill ic="sparkles">The AI copilot banks build into their own apps</Pill>
          <h1 className="lp-big xl">{c.a}<br /><span style={{ color: 'var(--red)' }}>{c.b}</span></h1>
          <p className="lp-lead">{c.p}</p>
          <div className="row g12 wrap">
            <Link to="/login?demo=1" className="btn pri lp-btn-lg">{c.cta}<Icon name="chevr" color="#fff" /></Link>
            <button className="btn lp-btn-lg lp-out" onClick={() => setTour(true)}><Icon name="play" />Watch 60-second tour</button>
          </div>
          <div className="row g24 lp-stats">
            {[['4', 'languages with voice'], ['13', 'kinds of insight'], ['0', 'data shared outside your bank']].map(([v, l], i) => (
              <div key={l} className="row g24">{i > 0 && <span className="lp-vr" />}<div className="col g4"><span className="lp-stat">{v}</span><span className="s t2">{l}</span></div></div>
            ))}
          </div>
        </div>
        <div className="lp-hero-art">
          <div className="lp-floats">
          <div className="card row g10 lp-float a"><Icon name="volume" color="var(--red)" /><div className="col g4"><span className="xs mu">Voice reply</span><span className="s w6">Ẹ kú àárọ̀, Adaeze</span></div></div>
          <div className="card row g10 lp-float b"><span className="lp-ic green sm"><Icon name="shieldcheck" size={16} /></span><div className="col g4"><span className="xs mu">Transfer protected</span><span className="s w6">Face check passed</span></div></div>
          </div>
          <Phone />
        </div>
      </section>

      <div className="lp-strip lp-pad">
        <span>Works with</span>
        {['OPay sandbox', 'Mono', 'Paystack test', 'Azure Speech', 'Spitch'].map((t) => <span key={t} className="t2">{t}</span>)}
      </div>

      <section id="features" className="lp-sec lp-pad lp-reveal">
        <div className="col g12 center" style={{ textAlign: 'center' }}>
          <Pill ic="grid">Features</Pill>
          <h2 className="lp-big">Everything your money needs</h2>
          <p className="lp-lead" style={{ margin: 0 }}>One app for spending, saving, borrowing and running a business.</p>
        </div>
        <div className="lp-grid3">
          {FEATS.map(([ic, tone, h, p]) => (
            <div key={h} className="card col g12 lp-feat"><span className={'lp-ic ' + tone}><Icon name={ic} size={24} /></span><span className="h3" style={{ fontSize: 20, lineHeight: '26px' }}>{h}</span><span className="t2">{p}</span></div>
          ))}
        </div>
      </section>

      <section id="languages" className="lp-sec lp-split lp-pad lp-alt lp-reveal">
        <div className="col g20 lp-side">
          <Pill ic="globe">Languages and voice</Pill>
          <h2 className="lp-big md">Speak to NURU the way you speak at home</h2>
          <p className="t2">Every screen and every answer works in four languages. Hold the mic to talk and NURU replies with a natural voice.</p>
          <Check>Yorùbá, Igbo, Hausa and Nigerian English</Check>
          <Check>Voice in and voice out, powered by Azure Speech and Spitch</Check>
          <Check>Switch language any time from the chat</Check>
        </div>
        <div className="lp-grid2 grow">
          {LANGS.map(([l, q, a]) => (
            <div key={l} className="card col g10"><span className="chip red" style={{ alignSelf: 'flex-start' }}>{l}</span><div className="bubble me">{q}</div><div className="bubble ai">{a}</div></div>
          ))}
        </div>
      </section>

      <section id="business" className="lp-sec lp-split lp-pad lp-reveal">
        <div className="card col g16 lp-biz">
          <div className="row between"><div className="col g4"><span className="s mu">Kemi Foods Ltd · profit</span><span className="h1 num">₦684,000</span></div><span className="chip green"><Icon name="up" size={11} />9% vs Sep</span></div>
          <svg viewBox="0 0 540 160" className="lp-line" aria-hidden="true">
            <polyline points="0,110 90,104 180,98 270,90 360,82 450,70 540,62" fill="none" stroke="var(--border)" strokeWidth="2" strokeDasharray="5 5" />
            <polyline className="lp-draw" points="0,90 90,110 180,52 270,72 360,32 450,14 540,4" fill="none" stroke="var(--green)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          <div className="row between xs mu">{['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((m) => <span key={m}>{m}</span>)}</div>
          <div className="lp-grid3 tight">{[['Payroll', '₦539,000', 'Due 28 Oct'], ['Unpaid invoices', '₦415,000', '3 overdue'], ['Runway', '41 days', 'Healthy']].map(([l, v, s]) => <div key={l} className="soft col g4"><span className="xs mu">{l}</span><span className="h3 num">{v}</span><span className="xs t2">{s}</span></div>)}</div>
        </div>
        <div className="col g20 grow">
          <Pill ic="briefcase">For business owners</Pill>
          <h2 className="lp-big md">Run payroll, chase invoices, plan the year</h2>
          <p className="t2">Switch to Business mode to manage staff salaries with PAYE and pension worked out, pay vendors, track ad spend per order and prepare for investor meetings.</p>
          <Check>Decision Room: test a loan or a new branch before you commit</Check>
          <Check>Reminders for repayments, insurance and meetings</Check>
          <Check>One-page investor summary drafted for you</Check>
        </div>
      </section>

      <section id="security" className="lp-sec lp-pad lp-dark lp-reveal">
        <div className="lp-sec-head">
          <div className="col g16"><span className="lp-pill dark"><Icon name="shield" size={15} />Security first</span><h2 className="lp-big md" style={{ color: '#fff' }}>Your money and your chats stay yours</h2></div>
          <p style={{ color: '#B3B3BD', maxWidth: 440, margin: 0 }}>NURU never moves money without your PIN and face check, and it cannot be talked into breaking its own rules.</p>
        </div>
        <div className="lp-grid5">
          {SECURITY.map(([ic, h, p]) => <div key={h} className="col g12 lp-sec-card"><span className="lp-ic onDark"><Icon name={ic} size={20} color="#FF2E3E" /></span><span className="h3" style={{ color: '#fff' }}>{h}</span><span className="s" style={{ color: '#B3B3BD' }}>{p}</span></div>)}
        </div>
      </section>

      <section id="branches" className="lp-sec lp-split lp-pad lp-alt lp-reveal">
        <div className="col g20 lp-side">
          <Pill ic="pin">Branches and ATMs</Pill>
          <h2 className="lp-big md">Find a branch near you</h2>
          <p className="t2">Need to visit in person? NURU shows the closest branches and ATMs on a live map, with opening hours and one-tap directions.</p>
          <Check>Uses your location once, never stored</Check>
          <Check>Open now, ATM and cash deposit filters</Check>
          <Check>Directions in Google Maps or Apple Maps</Check>
          <Link to="/branches" className="btn pri" style={{ alignSelf: 'flex-start' }}><Icon name="pin" color="#fff" />Find my nearest branch</Link>
        </div>
        <div className="card lp-mapcard grow">
          <MapView center={MAP_CENTER} branches={near} selected="ho" interactive={false} fit={MAP_FIT} />
          <div className="card col g8 lp-mappop">
            <div className="row between"><span className="s w6">{ho.name}</span><span className="chip green">Open</span></div>
            <span className="xs t2">Ajose Adeogun St · Victoria Island</span>
            <a className="btn pri sm" href={directions(ho)} target="_blank" rel="noreferrer"><Icon name="car" size={16} color="#fff" />Directions</a>
          </div>
        </div>
      </section>

      <section id="demo" className="lp-sec lp-split lp-pad lp-reveal">
        <div className="col g16 grow">
          <Pill ic="flag">Try it yourself</Pill>
          <h2 className="lp-big md">Test NURU in two minutes</h2>
          <p className="t2">Everything runs on sandbox data. No real money moves and no real bank login is needed.</p>
          {['Tap Try the live demo on any phone or laptop', 'Sign in with the demo account', 'Ask NURU in Yorùbá: “Èló ni mo ná lọ́sẹ̀ yìí?”', 'Say “send ₦5,000 to Tunde” and set up your PIN and face'].map((t, i) => (
            <div key={t} className="row g12"><span className="lp-num">{i + 1}</span><span>{t}</span></div>
          ))}
        </div>
        <div className="card col g16 lp-demo">
          <span className="h3">Demo account</span>
          {DEMO.map(([l, v]) => <div key={l} className="row between g12 lp-demo-row"><span className="s t2">{l}</span><span className="s w6 num" style={{ textAlign: 'right' }}>{v}</span></div>)}
          <Link to="/login?demo=1" className="btn pri block">Open the demo<Icon name="chevr" color="#fff" /></Link>
        </div>
      </section>

      <footer className="lp-foot lp-pad">
        <div className="lp-foot-top">
          <div className="col g12" style={{ maxWidth: 340 }}><Logo size={32} /><span className="s t2">An AI financial copilot that banks embed in their own apps. Built in Nigeria by team NURU.</span></div>
          <div className="lp-foot-cols">
            <div className="col g12"><span className="s w6">Product</span>{[['features', 'Insights'], ['languages', 'Ask NURU'], ['business', 'Business'], ['security', 'Security']].map(([id, l]) => <button key={l} className="lp-flink" onClick={() => go(id)}>{l}</button>)}<Link className="lp-flink" to="/branches">Branches</Link></div>
            <div className="col g12"><span className="s w6">Company</span><span className="s t2">About the team</span><span className="s t2">Contact</span><span className="s t2">Press kit</span></div>
            <div className="col g12"><span className="s w6">Legal</span><span className="s t2">Privacy policy</span><span className="s t2">Terms</span><span className="s t2">NDPA 2023</span></div>
          </div>
        </div>
        <div className="row between wrap g12"><span className="xs mu">© 2026 NURU. Demo product. Not a licensed bank. Sandbox data only.</span><ThemePicker /></div>
      </footer>

      {tour && <Tour onClose={() => setTour(false)} />}
    </div>
  )
}
