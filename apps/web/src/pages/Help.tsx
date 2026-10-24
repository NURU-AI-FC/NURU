import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../Shell'
import { useApp } from '../store'
import { SUPPORT_HREF } from '../bank'
import { Icon } from '../ui'
import { Ic, Item, Top } from './settings/kit'

const FAQ: [string, string][] = [
  ['A transfer failed but I was debited', 'Most failed transfers reverse on their own within 24 hours. If the money is not back by then, open a chat with us and we raise a claim with the receiving bank. You get a claim number and an automatic refund if the bank cannot credit the recipient.'],
  ['How do I reset my transaction PIN?', 'Go to Settings, then Security, then Transaction PIN. You need your current PIN to choose a new one. If you have forgotten it, chat with us and we will verify you with a face check before resetting it.'],
  ['Why was my transfer held for a face check?', 'Every transfer needs your PIN and a face match against the template you enrolled. After three failed tries transfers pause for a short while to protect you. Check you are in good light and try again.'],
  ['How does NURU keep my chats private?', 'Chats are encrypted with a key unique to you before they are stored. Account numbers are masked before the assistant sees them, and bank staff cannot read your conversations.'],
  ['How do I link an OPay account?', 'Go to Settings, then Linked accounts, then Link another account, and pick OPay. In the sandbox any user ID and password work. NURU gets read-only access and can never move money from a linked account.'],
  ['What are account tiers?', 'Tier 1 accounts have low limits. Verifying your BVN or NIN with a selfie check moves you to Tier 2. Tier 3 needs a proof of address, which you can submit at any branch.'],
  ['I forgot my password', 'On the sign in page choose Forgot password. We send a code to your email, then you set a new password. Every device is signed out afterwards for your safety.'],
]

export default function Help() {
  const { t } = useApp()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<number | null>(null)
  const list = FAQ.map((f, i) => [f, i] as const).filter(([[qq, a]]) => (qq + ' ' + a).toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <Shell title={t('help')} sub="Answers, chat and fraud reporting">
      <div className="k-flow">
        <Top back="/settings" />
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: 14 }}><Icon name="search" color="var(--muted)" /></span>
          <input className="input" style={{ paddingLeft: 42, background: 'var(--surface)', borderColor: 'transparent' }} placeholder="Search help" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search help" />
        </div>
        <div className="row g12">
          <Link to="/help/chat" className="card col g8 grow" style={{ padding: 14 }}><Ic name="message" tone="red" size={17} /><span className="s w6">Chat with us</span><span className="xs mu">Replies in minutes</span></Link>
          <a href={SUPPORT_HREF} className="card col g8 grow" style={{ padding: 14 }}><Ic name="phone" tone="red" size={17} /><span className="s w6">Call your bank</span><span className="xs mu">Customer support</span></a>
        </div>
        <span className="k-label">Popular questions</span>
        <div className="col">
          {list.map(([[question, answer], i]) => (
            <div key={i} className="k-acc">
              <button aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}><span className="s grow">{question}</span><Icon name={open === i ? 'chevd' : 'chevr'} color="var(--muted)" /></button>
              {open === i && <div className="s t2">{answer}</div>}
            </div>
          ))}
          {!list.length && <span className="s mu">Nothing matches “{q}”. <Link className="red w6" to="/help/chat">Ask a person</Link></span>}
        </div>
        <span className="k-label">Report</span>
        <div className="card col" style={{ padding: '6px 20px' }}>
          <Item icon="alert" tone="red" title="Report fraud" sub="Freeze transfers in one tap, then talk to us" to="/settings/security" />
          <Item icon="book" title="Learn to spot scams" sub="Fake alerts, scam calls and phishing" to="/learn" />
        </div>
      </div>
    </Shell>
  )
}
