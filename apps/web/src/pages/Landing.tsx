import { Link } from 'react-router-dom'
import type { Lang } from '../api'
import { langNames } from '../i18n'
import { useApp } from '../store'
import { Icon, Logo } from '../ui'

const copy: Record<Lang, { h: string; p: string; cta: string }> = {
  en: { h: 'Your money, explained in plain words.', p: 'NURU reads your Zenith, OPay and Kuda history and tells you where your money goes, what is coming up and how to save more. Ask in English, Yorùbá, Igbo or Hausa.', cta: 'Get started' },
  yo: { h: 'Owó rẹ, ní èdè tí o gbọ́.', p: 'NURU ń ka ìtàn àkáǹtì rẹ, ó sì ń sọ ibi tí owó rẹ ń lọ, ohun tó ń bọ̀ àti bí o ṣe lè fi pamọ́ sí i.', cta: 'Bẹ̀rẹ̀' },
  ig: { h: 'Ego gị, n\'asụsụ ị ghọtara.', p: 'NURU na-agụ akụkọ akaụntụ gị ma na-agwa gị ebe ego gị na-aga, ihe na-abịa na otu ị ga-esi chekwaa karịa.', cta: 'Bido' },
  ha: { h: 'Kuɗinka, cikin harshen da ka fahimta.', p: 'NURU na karanta tarihin asusunka ya gaya maka inda kuɗinka ke tafiya, abin da ke zuwa da yadda za ka ƙara ajiya.', cta: 'Fara' },
}

const features = [
  ['chart', 'Daily to yearly insights', 'Power BI style charts with a three month comparison, a 30 day forecast and a heat map of when you spend.'],
  ['sparkles', 'Ask anything about your money', 'Type or speak. NURU answers from your own numbers only and refuses anything that is not about your finances.'],
  ['briefcase', 'Tools for your business', 'Payroll with PAYE and pension, cash runway, advertising spend, reminders and investor meetings.'],
  ['shieldcheck', 'Bank grade security', 'Argon2 passwords, PIN and face check on transfers, OTP sign in, BVN or NIN, and encrypted chats.'],
]

export default function Landing() {
  const { lang, update } = useApp()
  const c = copy[lang]
  return (
    <div style={{ minHeight: '100vh' }}>
      <header className="row between" style={{ padding: '18px clamp(16px, 5vw, 64px)', borderBottom: '1px solid var(--border)' }}>
        <Logo />
        <div className="row g8">
          <select className="input" style={{ height: 40, width: 128 }} value={lang} onChange={(e) => update({ language: e.target.value as Lang })} aria-label="Language">
            {(Object.keys(langNames) as Lang[]).map((l) => <option key={l} value={l}>{langNames[l]}</option>)}
          </select>
          <Link to="/login" className="btn sm">Sign in</Link>
        </div>
      </header>

      <section className="row wrap g24" style={{ padding: 'clamp(32px, 7vw, 96px) clamp(16px, 5vw, 64px)', alignItems: 'center' }}>
        <div className="col g20 grow" style={{ flexBasis: 420 }}>
          <span className="chip red" style={{ alignSelf: 'flex-start' }}><Icon name="sparkles" size={14} />Zenith Bank Zecathon 6.0</span>
          <h1 className="h1" style={{ fontSize: 'clamp(34px, 5vw, 56px)' }}>{c.h}</h1>
          <p className="t2" style={{ fontSize: 17, maxWidth: 560, margin: 0 }}>{c.p}</p>
          <div className="row g12 wrap">
            <Link to="/signup" className="btn pri">{c.cta}<Icon name="chevr" color="#fff" /></Link>
            <Link to="/login?demo=1" className="btn">Try the demo account</Link>
          </div>
          <div className="row g8 wrap">{(Object.keys(langNames) as Lang[]).map((l) => <span key={l} className="chip">{langNames[l]}</span>)}</div>
        </div>
        <div className="card col g16 grow" style={{ flexBasis: 360, maxWidth: 480 }}>
          <div className="row g10"><span className="mark">N</span><span className="w6">NURU</span><span className="chip green" style={{ marginLeft: 'auto' }}>Private</span></div>
          <div className="bubble me" style={{ alignSelf: 'flex-end' }}>Where did my money go this week?</div>
          <div className="bubble ai">You spent ₦86,400 this week. Food took ₦31,200, mostly Glovo on Friday and Saturday. Cooking at home twice more would save about ₦12,000.</div>
          <div className="bubble me" style={{ alignSelf: 'flex-end' }}>Ṣé mo lè fi ₦50,000 pamọ́?</div>
          <div className="bubble ai">Bẹ́ẹ̀ni. Lẹ́yìn owó-iná àti gbèsè, ₦50,000 yóò kù fún ọ láti fi pamọ́ lóṣù yìí.</div>
        </div>
      </section>

      <section className="grid g-4" style={{ padding: '0 clamp(16px, 5vw, 64px) 64px' }}>
        {features.map(([ic, h, p]) => (
          <div key={h} className="card col g10 flat">
            <span className="tile" style={{ background: 'var(--red50)', color: 'var(--red)' }}><Icon name={ic} /></span>
            <span className="h3">{h}</span>
            <span className="t2 s">{p}</span>
          </div>
        ))}
      </section>
      <footer className="row between wrap g8 xs mu" style={{ padding: '20px clamp(16px, 5vw, 64px)', borderTop: '1px solid var(--border)' }}>
        <span>Built by team NURU for Zecathon 6.0. Sandbox data only.</span>
        <span>Your data stays yours. NURU never sells or shares it.</span>
      </footer>
    </div>
  )
}
