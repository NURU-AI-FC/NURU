import { useState } from 'react'
import { Shell } from '../Shell'
import { useApp } from '../store'
import { Icon, Modal } from '../ui'
import { Ic, Top } from './settings/kit'

type Lesson = { id: string; icon: string; tone: string; title: string; topic: string; mins: number; cards: string[] }

const LESSONS: Lesson[] = [
  { id: 'tbills', icon: 'landmark', tone: 'red', title: 'Treasury bills in plain words', topic: 'Investing', mins: 4, cards: [
    'A treasury bill is a short loan you give the Federal Government, usually for 91, 182 or 364 days.',
    'You pay less than the face value today and get the full face value at maturity. The difference is your interest.',
    'Example: pay ₦920,000 for a ₦1,000,000 bill that matures in a year. You earn ₦80,000, about 8.7%.',
    'T-bills are among the safest naira investments, but you usually cannot withdraw early without selling at the market price.',
    'Check the rate against inflation. If inflation is higher than your rate, your money still loses buying power.'] },
  { id: 'loans', icon: 'percent', tone: 'red', title: 'How loan interest really works', topic: 'Credit', mins: 5, cards: [
    'The headline rate is yearly. A 22% loan costs about 1.8% of the balance each month.',
    'Fees count too. Add management and insurance fees to see the true cost.',
    'Paying a little extra each month cuts the balance faster, so you pay less interest overall.',
    'Never borrow to cover routine spending. Use loans for things that pay you back, like stock for a business.',
    'Before you sign, ask NURU what the monthly repayment does to your month-end balance.'] },
  { id: 'budget', icon: 'target', tone: 'green', title: 'The 50/30/20 budget', topic: 'Saving', mins: 3, cards: [
    'Split take-home pay three ways: 50% for needs, 30% for wants, 20% for savings and debt.',
    'Needs are rent, food, transport and bills. Wants are eating out, shopping and subscriptions.',
    'If needs take more than half, trim wants first, then look for cheaper needs such as a data bundle that fits your use.'] },
  { id: 'payself', icon: 'briefcase', tone: 'blue', title: 'Pay yourself first as a business owner', topic: 'Business', mins: 4, cards: [
    'Keep business and personal money in separate accounts so you can see real profit.',
    'Pay yourself a fixed monthly salary instead of taking cash whenever you need it.',
    'Set aside tax and a buffer of at least one month of costs before drawings.',
    'NURU’s business view shows sales, costs and runway, so you know what you can safely take.'] },
  { id: 'scams', icon: 'shield', tone: 'amber', title: 'Spot fake alerts and scam calls', topic: 'Safety', mins: 3, cards: [
    'A credit SMS is not proof of payment. Always check your balance in the app before releasing goods.',
    'Your bank and NURU will never ask for your PIN, password or one time code by phone, SMS or chat.',
    'If someone pressures you to act fast, stop. Hang up and call the official number yourself.'] },
  { id: 'inflation', icon: 'trendup', tone: 'green', title: 'Beat inflation with your savings', topic: 'Investing', mins: 4, cards: [
    'Inflation means ₦100,000 buys less next year than it does today.',
    'Money in a regular savings account often grows slower than prices rise.',
    'Money market funds, T-bills and pension top-ups usually pay more, with different access rules.',
    'Keep three months of costs easy to reach, and invest the rest for longer goals.'] },
]
const TOPICS = ['All', 'Saving', 'Credit', 'Business', 'Investing', 'Safety']

function useProgress() {
  const [p, setP] = useState<Record<string, number>>(() => { try { return JSON.parse(localStorage.getItem('nuru.learn') || '{}') } catch { return {} } })
  const save = (id: string, n: number) => setP((x) => { const next = { ...x, [id]: Math.max(x[id] || 0, n) }; try { localStorage.setItem('nuru.learn', JSON.stringify(next)) } catch { /* ignore */ } return next })
  return [p, save] as const
}

export default function Learn() {
  const { t } = useApp()
  const [topic, setTopic] = useState('All')
  const [open, setOpen] = useState<Lesson | null>(null)
  const [card, setCard] = useState(0)
  const [done, save] = useProgress()
  const next = LESSONS.find((l) => (done[l.id] || 0) > 0 && done[l.id] < l.cards.length) || LESSONS.find((l) => !done[l.id]) || LESSONS[0]
  const nextAt = done[next.id] || 0
  const start = (l: Lesson) => { setOpen(l); setCard(Math.min(done[l.id] || 0, l.cards.length - 1)); save(l.id, 1) }
  const step = (n: number) => { setCard(n); if (open) save(open.id, n + 1) }

  return (
    <Shell title={t('learn')} sub="Short lessons about money">
      <div className="k-flow">
        <Top back="/settings" />
        <button className="k-hero col g10" style={{ border: 0, textAlign: 'left' }} onClick={() => start(next)}>
          <span className="xs" style={{ opacity: .85 }}>{nextAt ? 'Continue' : 'Start here'}</span>
          <span className="h3" style={{ color: '#fff' }}>{next.title}</span>
          <span className="xs" style={{ opacity: .85 }}>Card {Math.min(nextAt + 1, next.cards.length)} of {next.cards.length} · {next.mins} min</span>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.3)' }}><div style={{ width: (nextAt / next.cards.length) * 100 + '%', height: 6, borderRadius: 3, background: '#fff' }} /></div>
        </button>
        <div className="row g8 wrap">{TOPICS.map((x) => <button key={x} className={'chip' + (topic === x ? ' red' : '')} style={{ border: 0 }} onClick={() => setTopic(x)} aria-pressed={topic === x}>{x}</button>)}</div>
        <div className="col g12">
          {LESSONS.filter((l) => topic === 'All' || l.topic === topic).map((l) => {
            const n = done[l.id] || 0
            return (
              <button key={l.id} className="row g12" style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left' }} onClick={() => start(l)}>
                <Ic name={l.icon} tone={l.tone} />
                <span className="col g4 grow"><span className="s w6">{l.title}</span><span className="xs mu">{l.cards.length} cards · {l.topic}{n >= l.cards.length ? ' · Done' : n ? ` · ${n} read` : ''}</span></span>
                <Icon name={n >= l.cards.length ? 'check' : 'play'} color={n >= l.cards.length ? 'var(--green)' : 'var(--muted)'} />
              </button>
            )
          })}
        </div>
      </div>
      {open && (
        <Modal onClose={() => setOpen(null)}>
          <div className="col g16">
            <div className="row g10"><Ic name={open.icon} tone={open.tone} /><span className="col g4 grow"><span className="s w6">{open.title}</span><span className="xs mu">Card {card + 1} of {open.cards.length}</span></span>
              <button className="ib" style={{ width: 34, height: 34 }} onClick={() => setOpen(null)} aria-label="Close"><Icon name="x" size={16} /></button></div>
            <div className="bar" style={{ height: 6 }}><i style={{ width: ((card + 1) / open.cards.length) * 100 + '%' }} /></div>
            <p style={{ fontSize: 17, lineHeight: 1.5, margin: '8px 0', minHeight: 110 }}>{open.cards[card]}</p>
            <div className="row g10">
              <button className="btn grow" disabled={card === 0} onClick={() => setCard(card - 1)}>Back</button>
              {card < open.cards.length - 1
                ? <button className="btn pri grow" onClick={() => step(card + 1)}>Next</button>
                : <button className="btn pri grow" onClick={() => { save(open.id, open.cards.length); setOpen(null) }}>Finish</button>}
            </div>
          </div>
        </Modal>
      )}
    </Shell>
  )
}
