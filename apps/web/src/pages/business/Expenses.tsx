import { useMemo, useState } from 'react'
import type { Tx } from '../../api'
import { Shell } from '../../Shell'
import { useMoney } from '../../store'
import { Donut, Legend, Seg, Skeleton, catIcon, useLoad, when } from '../../ui'
import { Back, Ic, Tip } from '../money/kit'

const label: Record<string, string> = { Payroll: 'Salaries', Supplies: 'Ingredients and supplies' }

export default function Expenses() {
  const money = useMoney()
  const txs = useLoad<Tx[]>('/transactions?scope=business&limit=500').data
  const [days, setDays] = useState('30')

  const v = useMemo(() => {
    if (!txs) return null
    const from = Date.now() - Number(days) * 864e5
    const out = txs.filter((t) => t.direction === 'debit' && new Date(t.at).getTime() >= from)
    const cats = new Map<string, number>()
    out.forEach((t) => cats.set(t.category, (cats.get(t.category) || 0) + t.amount))
    const total = out.reduce((s, t) => s + t.amount, 0)
    const ads = new Map<string, { spend: number; n: number }>()
    txs.filter((t) => t.direction === 'debit' && t.category === 'Advertising' && new Date(t.at).getTime() >= Date.now() - 90 * 864e5)
      .forEach((t) => { const a = ads.get(t.merchant) || { spend: 0, n: 0 }; ads.set(t.merchant, { spend: a.spend + t.amount, n: a.n + 1 }) })
    const sales = txs.filter((t) => t.direction === 'credit' && new Date(t.at).getTime() >= from).reduce((s, t) => s + t.amount, 0)
    return {
      total, sales, list: out.slice(0, 12),
      cats: [...cats].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name: label[name] || name, value })),
      ads: [...ads].sort((a, b) => b[1].spend - a[1].spend),
    }
  }, [txs, days])
  const adTotal = v?.ads.reduce((s, [, a]) => s + a.spend, 0) || 0
  const top = v?.cats[0]

  return (
    <Shell title="Business expenses" sub="From your business account">
      <Back to="/business" label="Business" />
      <Seg value={days} onChange={setDays} options={[['30', 'Last 30 days'], ['90', 'Last 90 days'], ['365', 'This year']]} />
      <div className="grid g-21">
        <div className="col g16">
          <div className="card row g20 wrap">
            {v ? <>
              <Donut data={v.cats} center={money(v.total, { compact: true })} sub="spent" height={150} />
              <Legend items={v.cats.slice(0, 6)} total={v.total} />
            </> : <Skeleton h={150} />}
          </div>
          {v && top && v.sales > 0 && <Tip icon="bulb" tone="amber">{top.name} is {Math.round((top.value / v.total) * 100)}% of costs. You spent {Math.round((v.total / v.sales) * 100)}% of what came in over this period.</Tip>}
          <div className="card col g10">
            <span className="h3">Recent payments</span>
            {v?.list.map((t) => (
              <div key={t.id} className="row g12">
                <Ic name={catIcon(t.category)} size={34} />
                <span className="col grow"><span className="s w6">{t.merchant}</span><span className="xs mu">{label[t.category] || t.category} · {when(t.at)}</span></span>
                <span className="s num w6">-{money(t.amount)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card col g12">
          <span className="h3">Advertising</span>
          <span className="xs mu">Last 90 days · {money(adTotal)}</span>
          {v?.ads.map(([name, a]) => (
            <div key={name} className="row g12">
              <Ic name="megaphone" tone="red" size={36} />
              <span className="col g4 grow"><span className="s w6">{name}</span><span className="xs mu">{a.n} payments</span></span>
              <span className="col g4" style={{ alignItems: 'flex-end' }}><span className="s w6 num">{money(a.spend)}</span><span className="xs t2">{adTotal ? Math.round((a.spend / adTotal) * 100) : 0}% of ads</span></span>
            </div>
          ))}
          {v && !v.ads.length && <span className="s t2">No advertising in the last 90 days.</span>}
          {v && v.ads.length > 1 && <Tip icon="bulb" tone="amber">NURU cannot see orders from {v.ads[v.ads.length - 1][0]}. Track it with a promo code, or move that money to the channel that brings orders you can count.</Tip>}
        </div>
      </div>
    </Shell>
  )
}
