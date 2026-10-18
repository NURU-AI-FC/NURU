import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Account, Compare, Insight, Summary, Tx } from '../api'
import { Shell } from '../Shell'
import { useApp, useMoney } from '../store'
import { Bars, catIcon, Donut, Icon, Legend, Seg, Skeleton, Stat, useGreeting, useLoad, when } from '../ui'

type Period = 'day' | 'week' | 'month' | 'year'

export default function Home() {
  const { t, user } = useApp()
  const money = useMoney()
  const greet = useGreeting()
  const [period, setPeriod] = useState<Period>('month')
  const accts = useLoad<{ accounts: Account[] }>('/accounts').data?.accounts
  const month = useLoad<Summary>('/analytics/summary?period=month').data
  const week = useLoad<Summary>('/analytics/summary?period=week').data
  const cmp = useLoad<Compare>('/analytics/compare').data
  const series = useLoad<Summary>(period === 'month' ? null : '/analytics/summary?period=' + period).data
  const tx = useLoad<Tx[]>('/transactions?limit=6').data
  const ins = useLoad<Insight[]>('/insights').data
  const inv = useLoad<{ value: number; monthly: number }[]>('/investments').data
  const rem = useLoad<{ title: string; amount: number; due_at: string; done: boolean }[]>('/reminders').data

  const personal = accts?.filter((a) => a.kind !== 'business') || []
  const total = personal.reduce((s, a) => s + a.balance, 0)
  const bill = rem?.find((r) => !r.done && r.amount > 0)
  const monthName = new Date().toLocaleString('en', { month: 'long' })
  const diff = month && month.prev_out ? Math.round(((month.out - month.prev_out) / month.prev_out) * 100) : 0
  const cats = month?.categories || []
  const top = cats.slice(0, 4), other = cats.slice(4).reduce((s, c) => s + c.amount, 0)
  const pie = [...top.map((c) => ({ name: c.category, value: c.amount })), ...(other ? [{ name: 'Other', value: other }] : [])]
  const tip = ins?.find((i) => i.kind === 'over')

  const sub = new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ` · ${personal.length} ${t('linked')}`

  return (
    <Shell title={`${greet}, ${user?.name.split(' ')[0] || ''}`} sub={sub}>
      <div className="grid g-4">
        {accts && month && week ? <>
          <Stat icon="wallet" label={t('totalBalance')} value={money(total)} note={`${money(week.in - week.out, { sign: true })} ${t('thisWeek')}`} tone={week.in - week.out >= 0 ? 'pos' : 'amber'} />
          <Stat icon="down" label={`${t('spentIn')} ${monthName}`} value={money(month.out)} note={diff ? `${Math.abs(diff)}% ${diff < 0 ? t('lessThan') : t('moreThan')} last month by this date` : undefined} tone={diff <= 0 ? 'pos' : 'amber'} />
          <Stat icon="target" label={t('investments')} value={money(inv?.reduce((s, i) => s + i.value, 0) || 0)} note={`${money(inv?.reduce((s, i) => s + i.monthly, 0) || 0, { sign: true })} a month`} tone="pos" />
          <Stat icon="calendar" label={t('nextBill')} value={bill ? money(bill.amount) : '-'} note={bill ? `${bill.title} · ${new Date(bill.due_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}` : undefined} tone="red" />
        </> : [0, 1, 2, 3].map((i) => <Skeleton key={i} h={134} />)}
      </div>

      <div className="grid g-21">
        <div className="card col g16">
          <div className="row between wrap g12">
            <div className="col g4"><span className="h3">{period === 'month' ? t('spending3') : t('moneyOut')}</span><span className="xs mu">{period === 'month' ? `${t('eachWeek')} ${cmp?.map((m) => m.month).join(', ') || ''}` : period === 'day' ? 'Today by hour' : period === 'week' ? 'Last 7 days' : 'This year by month'}</span></div>
            <Seg value={period} onChange={setPeriod} options={[['day', t('daily')], ['week', t('weekly')], ['month', t('monthly')], ['year', t('yearly')]]} />
          </div>
          {period === 'month'
            ? cmp ? <Bars labels={['Week 1', 'Week 2', 'Week 3', 'Week 4']} series={cmp.map((m) => ({ name: m.month, values: m.weeks }))} /> : <Skeleton h={220} />
            : series ? <Bars labels={series.series.map((p) => p.label)} series={[{ name: t('moneyIn'), values: series.series.map((p) => p.in) }, { name: t('moneyOut'), values: series.series.map((p) => p.out) }]} colors={['var(--c5)', 'var(--c1)']} /> : <Skeleton h={220} />}
          {period === 'month' && cmp && (
            <div className="row g24 wrap">
              {cmp.map((m, i) => (
                <div key={m.month} className="col g4">
                  <span className="row g6 xs mu"><span className="dot" style={{ background: ['var(--c5)', 'var(--c2)', 'var(--c1)'][i] }} />{m.month}</span>
                  <span className="w7 num" style={{ fontSize: 16 }}>{money(m.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card col g16">
          <span className="h3">{t('whereWent')}</span>
          {month ? (
            <div className="row g20 wrap">
              <Donut data={pie} center={money(month.out, { compact: true })} sub={monthName.slice(0, 3)} height={150} />
              <Legend items={pie} total={month.out} />
            </div>
          ) : <Skeleton h={150} />}
          {tip && (
            <Link to={'/ask?q=' + encodeURIComponent(`How can I spend less on ${tip.title.split(' is ')[0]}?`)} className="soft row g10 start">
              <Icon name="sparkles" size={16} color="var(--red)" />
              <span className="xs t2">{tip.body}</span>
            </Link>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="row between" style={{ padding: '18px 20px 8px' }}><span className="h3">{t('recentTx')}</span><Link to="/insights#transactions" className="s w6 red">{t('seeAll')}</Link></div>
        <TxTable rows={tx} />
      </div>
    </Shell>
  )
}

export function TxTable({ rows }: { rows: Tx[] | null }) {
  const { t } = useApp()
  const money = useMoney()
  if (!rows) return <div style={{ padding: 20 }}><Skeleton h={160} /></div>
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="tx">
        <thead><tr><th>{t('name')}</th><th className="hide-sm">{t('category')}</th><th className="hide-sm">{t('account')}</th><th>{t('date')}</th><th className="right">{t('amount')}</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><span className="row g10"><span className="tile"><Icon name={catIcon(r.category)} size={16} /></span><span className="w6">{r.merchant}</span></span></td>
              <td className="hide-sm t2">{r.category}</td>
              <td className="hide-sm t2">{r.account}</td>
              <td className="t2">{when(r.at)}</td>
              <td className={'right w6 num ' + (r.direction === 'credit' ? 'pos' : '')}>{money(r.direction === 'credit' ? r.amount : -r.amount, { sign: r.direction === 'credit' })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
