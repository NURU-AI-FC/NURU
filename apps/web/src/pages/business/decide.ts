// Decision Room maths. Both scenarios compare two options month by month
// using the business's own cash, profit and payroll.
import { lastFull, type Biz } from './data'

export type Scenario = 'kitchen' | 'lease'
export type Knob = { key: string; label: string; min: number; max: number; step: number; def: number; fmt: 'money' | 'pct' | 'num' | 'months' }

export const scenarios: Record<Scenario, { title: string; question: string; a: string; b: string; knobs: Knob[] }> = {
  kitchen: {
    title: 'Second kitchen', question: 'Should I open a second kitchen with a loan?', a: 'Open the second kitchen', b: 'Stay with one kitchen',
    knobs: [
      { key: 'loan', label: 'Loan amount', min: 1_000_000, max: 15_000_000, step: 250_000, def: 5_000_000, fmt: 'money' },
      { key: 'orders', label: 'Expected daily orders', min: 20, max: 200, step: 5, def: 85, fmt: 'num' },
      { key: 'rate', label: 'Interest rate', min: 10, max: 40, step: 1, def: 24, fmt: 'pct' },
    ],
  },
  lease: {
    title: 'Buy or lease', question: 'Should I buy a delivery van with a loan or lease one?', a: 'Buy with a loan', b: 'Lease',
    knobs: [
      { key: 'price', label: 'Price to buy', min: 1_000_000, max: 15_000_000, step: 250_000, def: 6_500_000, fmt: 'money' },
      { key: 'lease', label: 'Lease per month', min: 50_000, max: 600_000, step: 10_000, def: 240_000, fmt: 'money' },
      { key: 'rate', label: 'Interest rate', min: 10, max: 40, step: 1, def: 24, fmt: 'pct' },
      { key: 'months', label: 'How long you need it', min: 12, max: 60, step: 6, def: 36, fmt: 'months' },
    ],
  },
}

const ORDER = 3000 // average order value
const CONTRIB = 0.25 // left from each order after ingredients, packs and app fees
const LOAN_MONTHS = 24

export const pay = (p: number, ratePct: number, n: number) => {
  const r = ratePct / 1200
  return r ? (p * r) / (1 - Math.pow(1 + r, -n)) : p / n
}

export type Verdict = {
  scenario: Scenario; tone: 'green' | 'amber' | 'red'; headline: string; confidence: number; summary: string
  a: { label: string; value: string }[]; b: { label: string; value: string }[]
  kpis: { label: string; value: string; note: string }[]
  steps: string[]; risks: string[]; planNote: string; planAmount: number; loan: number
}

type Fmt = (v: number, o?: { sign?: boolean; compact?: boolean }) => string

function kitchenRun(b: Biz, v: Record<string, number>, contrib = CONTRIB) {
  const payroll = b.payroll || 400_000
  const fixed = payroll * 0.6 + 350_000
  const payment = pay(v.loan, v.rate, LOAN_MONTHS)
  let cum = 0, op = 0, be = 0, low = 0, yearOp = 0
  for (let m = 1; m <= 36; m++) {
    const ramp = Math.min(1, 0.3 + (0.7 * (m - 1)) / 5)
    op = v.orders * 30 * ORDER * contrib * ramp - fixed
    cum += op
    if (!be && cum >= v.loan) be = m
    low = Math.min(low, cum - payment * Math.min(m, LOAN_MONTHS))
    if (m <= 12) yearOp += op
  }
  return { payment, be, low, year: yearOp - payment * 12, full: op }
}

function kitchen(b: Biz, v: Record<string, number>, money: Fmt): Verdict {
  const k = kitchenRun(b, v)
  const now = lastFull(b).profit * 12
  const floor = (b.payroll || 400_000) * 2
  const minCash = b.cash + k.low
  const slow = kitchenRun(b, { ...v, orders: Math.max(20, Math.round(v.orders * 0.7)) })
  const dear = kitchenRun(b, v, CONTRIB * 0.8)
  const tone = k.be && k.be <= 12 && minCash >= floor ? 'green' : k.be && k.be <= 18 ? 'amber' : 'red'
  const beDate = new Date()
  beDate.setMonth(beDate.getMonth() + (k.be || 0))
  return {
    scenario: 'kitchen', tone, loan: v.loan,
    headline: tone === 'green' ? 'Yes, with conditions' : tone === 'amber' ? 'Maybe, test demand first' : 'Not yet',
    confidence: Math.round(Math.max(40, Math.min(88, 90 - (k.be || 30) * 2.5 - (minCash < floor ? 15 : 0)))),
    summary: k.be
      ? `The second kitchen pays back the ${money(v.loan)} loan in about ${k.be} months if you reach ${v.orders} orders a day. Your cash ${minCash >= floor ? `stays above ${money(Math.max(0, Math.floor(minCash / 100_000) * 100_000))}` : `drops to ${money(minCash)}`} along the way.`
      : `At ${v.orders} orders a day the second kitchen does not pay back the loan within 3 years.`,
    kpis: [
      { label: 'Break-even', value: k.be ? `${k.be} months` : 'Over 3 years', note: k.be ? beDate.toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }) : 'raise orders' },
      { label: 'Year-1 profit', value: money(now + k.year), note: now ? `${Math.round((k.year / Math.abs(now)) * 100) >= 0 ? '+' : ''}${Math.round((k.year / Math.abs(now)) * 100)}% vs one kitchen` : '' },
    ],
    a: [{ label: 'Year-1 profit', value: money(now + k.year) }, { label: 'Monthly loan payment', value: money(k.payment) }, { label: 'Lowest cash', value: money(minCash) }],
    b: [{ label: 'Year-1 profit', value: money(now) }, { label: 'Monthly loan payment', value: money(0) }, { label: 'Lowest cash', value: money(b.cash) }],
    steps: [`Keep 2 months of payroll (about ${money(floor, { compact: true })}) untouched`, 'Test demand in the new area with delivery apps for 4 weeks', 'Choose a fixed-rate loan, not variable'],
    risks: [
      `Orders at ${Math.round(v.orders * 0.7)} a day ${slow.be ? `delay break-even to ${slow.be} months` : 'never pay back the loan in 3 years'}`,
      `Food prices up 20% cut the new kitchen's monthly profit by ${Math.round((1 - dear.full / k.full) * 100)}%`,
    ],
    planNote: `${v.orders} orders a day, ${money(v.loan)} at ${v.rate}%, break-even ${k.be || '36+'} months`, planAmount: v.loan,
  }
}

function lease(b: Biz, v: Record<string, number>, money: Fmt): Verdict {
  const n = Math.min(LOAN_MONTHS, v.months)
  const payment = pay(v.price, v.rate, n)
  const resale = (m: number) => v.price * Math.max(0.2, 1 - (0.18 * m) / 12)
  const buyCost = payment * n - resale(v.months)
  const leaseCost = v.lease * v.months
  let be = 0
  for (let m = 1; m <= 120 && !be; m++) if (v.lease * m >= payment * Math.min(m, n) - resale(m)) be = m
  const profit = lastFull(b).profit
  const floor = (b.payroll || 400_000) * 2
  const lowBuy = Math.min(b.cash, b.cash + n * (profit - payment))
  const lowLease = Math.min(b.cash, b.cash + v.months * (profit - v.lease))
  const buy = buyCost < leaseCost
  const tight = buy ? lowBuy < floor || payment > profit * 0.5 : lowLease < floor
  const save = Math.abs(leaseCost - buyCost)
  const dearer = pay(v.price, v.rate + 8, n) * n - payment * n
  return {
    scenario: 'lease', tone: tight ? 'amber' : 'green', loan: buy ? v.price : 0,
    headline: (buy ? 'Buy it' : 'Lease it') + (tight ? ', with conditions' : ''),
    confidence: Math.round(Math.max(50, Math.min(90, 55 + (save / Math.max(buyCost, leaseCost)) * 120 - (tight ? 12 : 0)))),
    summary: `Over ${v.months} months ${buy ? 'buying' : 'leasing'} costs ${money(save)} less${buy ? `, after selling the van for about ${money(resale(v.months), { compact: true })} at the end` : ''}. ${buy ? `The loan is ${money(payment)} a month for ${n} months` : `The lease is ${money(v.lease)} a month`}, against a monthly profit of about ${money(profit)}.`,
    kpis: [
      { label: 'Break-even', value: be ? `${be} months` : 'Never', note: 'when buying beats leasing' },
      { label: buy ? 'You save by buying' : 'You save by leasing', value: money(save), note: `over ${v.months} months` },
    ],
    a: [{ label: 'Total cost', value: money(buyCost) }, { label: 'Monthly', value: `${money(payment)} for ${n} months` }, { label: 'Lowest cash', value: money(lowBuy) }],
    b: [{ label: 'Total cost', value: money(leaseCost) }, { label: 'Monthly', value: `${money(v.lease)} for ${v.months} months` }, { label: 'Lowest cash', value: money(lowLease) }],
    steps: buy
      ? [`Keep 2 months of payroll (about ${money(floor, { compact: true })}) untouched`, 'Get a fixed-rate asset loan and insure the van from day one', 'Budget for servicing every 3 months']
      : ['Negotiate a lease that includes servicing and insurance', `Check the lease price again in ${Math.max(6, be - 6)} months`, 'Keep the money you would have put down earning in a fixed deposit'],
    risks: [
      be ? `If you need it for less than ${be} months, leasing is cheaper` : 'Buying never beats leasing at these numbers',
      `A rate of ${v.rate + 8}% adds ${money(dearer)} to buying`,
    ],
    planNote: `${buy ? 'Buy' : 'Lease'} a delivery van, ${money(buy ? payment : v.lease)} a month`, planAmount: buy ? -v.price * 0.2 : -v.lease,
  }
}

export const decide = (s: Scenario, b: Biz, v: Record<string, number>, money: Fmt) => (s === 'kitchen' ? kitchen(b, v, money) : lease(b, v, money))

export const values = (s: Scenario, q: URLSearchParams) =>
  Object.fromEntries(scenarios[s].knobs.map((k) => {
    const n = Number(q.get(k.key))
    return [k.key, Number.isFinite(n) && n >= k.min && n <= k.max ? n : k.def]
  }))
