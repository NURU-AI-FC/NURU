import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell } from '../../Shell'
import { useApp } from '../../store'
import { Icon } from '../../ui'

type Msg = { who: 'me' | 'agent'; text: string; at: number }

// The sandbox support chat answers from canned replies picked by keyword,
// so judges can see the hand-off from NURU to a person.
const REPLIES: [RegExp, string][] = [
  [/fail|debit|not receiv|reverse|stuck|pending/i, 'Sorry about that. Failed transfers usually reverse within 24 hours. I have raised a claim with the receiving bank, and if they cannot credit the recipient we refund you automatically. Your claim number is ZB-%n.'],
  [/pin/i, 'You can change your PIN in Settings, then Security. If you have forgotten it, I can reset it after a quick face check. Shall I send you the link?'],
  [/fraud|scam|stole|hack|unauthori/i, 'I am sorry this happened. Please freeze your account in Settings, then Security, which stops transfers for 24 hours and signs out other devices. I have flagged your account for our fraud team, reference FR-%n.'],
  [/card|atm/i, 'I can block your card right away. In the live app this happens from the Cards screen. For now I have noted your request, reference CD-%n.'],
  [/loan|repay/i, 'Your Zenith Personal Loan details are under Loans and savings. If you need to reschedule a repayment, I can request it for you.'],
  [/limit|tier|verify|bvn|nin/i, 'Verifying your BVN or NIN with a selfie moves you to Tier 2 with a daily limit of ₦200,000. You can start from Settings, Verify BVN or NIN.'],
  [/thank|ok|great|bye/i, 'You are welcome. Is there anything else I can help with?'],
]
const FALLBACK = 'Thanks for the detail. Let me check that for you. A colleague who handles this will follow up in this chat shortly.'

const time = (at: number) => new Date(at).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })
const KEY = 'nuru.support'

export default function Support() {
  const { t, user } = useApp()
  const nav = useNavigate()
  const first = user?.name.split(' ')[0] || 'there'
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try { const s = sessionStorage.getItem(KEY); if (s) return JSON.parse(s) } catch { /* ignore */ }
    return [{ who: 'agent', text: `Hello ${first}, I am Tunde from Zenith support. How can I help today?`, at: Date.now() }]
  })
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(msgs)) } catch { /* ignore */ } end.current?.scrollIntoView({ block: 'end' }) }, [msgs, typing])

  function send(e: FormEvent) {
    e.preventDefault()
    const m = text.trim()
    if (!m) return
    setText('')
    setMsgs((x) => [...x, { who: 'me', text: m, at: Date.now() }])
    setTyping(true)
    const reply = (REPLIES.find(([re]) => re.test(m))?.[1] || FALLBACK).replace('%n', String(80000 + Math.floor(Math.random() * 19999)))
    setTimeout(() => { setTyping(false); setMsgs((x) => [...x, { who: 'agent', text: reply, at: Date.now() }]) }, 1200 + Math.min(1500, reply.length * 8))
  }

  return (
    <Shell title={t('supportChat')} sub="Sandbox support, replies are samples">
      <div className="k-flow">
        <div className="row g12">
          <button className="ib" aria-label="Back" onClick={() => nav('/help')}><Icon name="chevl" /></button>
          <span className="av" style={{ background: 'var(--blue)' }}>TB</span>
          <span className="col g4 grow"><span className="s w6">Tunde B. · Zenith support</span><span className="xs pos w6">Online</span></span>
          <a className="ib" href="tel:0700936484" aria-label="Call support"><Icon name="phone" /></a>
        </div>
        <div className="row center"><span className="chip"><Icon name="sparkles" size={11} /> NURU passed your chat to a person</span></div>
        <div className="col g12" aria-live="polite">
          {msgs.map((m, i) => (
            <div key={i} className="col g4" style={{ alignItems: m.who === 'me' ? 'flex-end' : 'flex-start' }}>
              <div className={'bubble ' + (m.who === 'me' ? 'me' : 'ai')}>{m.text}</div>
              <span className="xs mu">{time(m.at)}</span>
            </div>
          ))}
          {typing && <div className="bubble ai xs mu">Tunde is typing…</div>}
          <div ref={end} />
        </div>
        <form className="composer k-composer" onSubmit={send}>
          <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" aria-label="Message"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }} />
          <button className="ib" style={{ background: 'var(--red)' }} aria-label="Send" disabled={!text.trim()}><Icon name="send" color="#fff" /></button>
        </form>
      </div>
    </Shell>
  )
}
