import { Link } from 'react-router-dom'
import { Shell } from '../Shell'
import { useApp, useMoney } from '../store'
import { Donut, Icon, Legend, Skeleton, useLoad } from '../ui'

import type { Loan } from './money/LoanDetail'
type Inv = { kind: string; name: string; value: number; contributed: number; monthly: number; growth: number }
const tools: [string, string, string, string][] = [
  ['/money/borrow', 'percent', 'Borrow', 'See how much you qualify for'], ['/money/vaults', 'target', 'Savings vaults', 'Save for rent, japa and more'],
  ['/money/deposit', 'landmark', 'Fixed deposit', 'Lock money for up to 19%'], ['/money/pension', 'shield', 'Pension', 'RSA balance and projection'],
  ['/money/insurance', 'umbrella', 'Insurance', 'Policies, renewals and claims'], ['/money/refunds', 'undo', 'Refunds', 'Dispute a payment'],
]
const d = (s: string) => new Date(s).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })

export default function Money() {
  const { t } = useApp()
  const money = useMoney()
  const loans = useLoad<Loan[]>('/loans').data
  const inv = useLoad<Inv[]>('/investments').data
  const total = inv?.reduce((s, i) => s + i.value, 0) || 0

  return (
    <Shell title={t('money')} sub="Loans, investments, pension and savings goals">
      <div className="grid g-3">
        {tools.map(([to, ic, h, p]) => (
          <Link key={to} to={to} className="card flat row g12" style={{ padding: 16 }}>
            <span className="tile" style={{ background: 'var(--red50)', color: 'var(--red)' }}><Icon name={ic} /></span>
            <span className="col grow"><span className="s w6">{h}</span><span className="xs mu">{p}</span></span>
            <Icon name="chevr" size={16} color="var(--muted)" />
          </Link>
        ))}
      </div>
      <div className="grid g-2">
        <div className="col g20">
          <span className="h3">{t('loans')}</span>
          {loans ? loans.length ? loans.map((l) => {
            const owed = l.principal + l.total_interest
            return (
              <Link key={l.id} to={`/money/loans/${l.id}`} className="card col g16">
                <div className="row between"><span className="row g10"><span className="tile" style={{ background: 'var(--red50)', color: 'var(--red)' }}><Icon name="landmark" /></span><span className="col"><span className="w6">{l.lender}</span><span className="xs mu">{money(l.principal)} at {l.rate_pct}% · {l.months} months</span></span></span><span className="chip green">On track</span></div>
                <div className="col g6">
                  <div className="row between s"><span className="t2">{l.paid_instalments} of {l.months} {t('paid')}</span><span className="w6 num">{money(owed - l.balance)} / {money(owed)}</span></div>
                  <div className="bar"><i style={{ width: `${((owed - l.balance) / owed) * 100}%` }} /></div>
                </div>
                <div className="grid g-2" style={{ gap: 12 }}>
                  {[[t('balanceLeft'), money(l.balance)], [t('nextPayment'), `${money(l.monthly)} · ${d(l.next_due_at)}`], [t('interest'), `${money(l.total_interest)} total`], [t('disbursed'), d(l.disbursed_at)]].map(([k, v]) => (
                    <div key={k} className="soft col g4"><span className="xs mu">{k}</span><span className="s w6 num">{v}</span></div>
                  ))}
                </div>
              </Link>
            )
          }) : <div className="card flat t2">No active loans.</div> : <Skeleton h={260} />}
          <div className="card col g10 flat">
            <span className="h3">Can I afford a new loan?</span>
            <span className="s t2">Ask NURU with an amount and it checks your income, bills and current repayments.</span>
            <div className="row g8 wrap"><Link className="btn pri sm" to="/money/borrow"><Icon name="percent" size={16} color="#fff" />Check what I can borrow</Link><Link className="btn sm" to="/ask?q=Can%20I%20afford%20a%20%E2%82%A65m%20loan%3F"><Icon name="sparkles" size={16} />Ask NURU</Link></div>
          </div>
        </div>

        <div className="col g20">
          <span className="h3">{t('investments')}</span>
          <div className="card col g16">
            {inv ? <div className="row g20 wrap">
              <Donut data={inv.map((i) => ({ name: i.name, value: i.value }))} center={money(total, { compact: true })} sub="Total" height={150} />
              <Legend items={inv.map((i) => ({ name: i.name, value: i.value }))} total={total} />
            </div> : <Skeleton h={150} />}
          </div>
          {inv?.map((i) => (
            <div key={i.name} className="card col g10 flat">
              <div className="row between"><span className="row g10"><span className="tile"><Icon name={i.kind === 'pension' ? 'shield' : i.kind === 'tbills' ? 'landmark' : 'trendup'} /></span><span className="col"><span className="w6">{i.name}</span><span className="xs mu">{i.monthly ? `${money(i.monthly)} a month` : 'One off'}</span></span></span><span className="w7 num">{money(i.value)}</span></div>
              <div className="row between xs"><span className="mu">{t('contributed')} {money(i.contributed)}</span><span className="pos w6">{t('growth')} {money(i.growth, { sign: true })} ({Math.round((i.growth / i.contributed) * 1000) / 10}%)</span></div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )
}
