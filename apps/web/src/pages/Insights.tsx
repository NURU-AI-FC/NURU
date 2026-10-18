import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Compare, Forecast, Insight, Summary, Tx } from '../api'
import { Shell } from '../Shell'
import { useApp, useMoney } from '../store'
import { Bars, COLORS, Icon, Lines, Seg, Skeleton, Stat, useLoad } from '../ui'
import { TxTable } from './Home'
import { SubNav } from './insights/parts'

type Period = 'day' | 'week' | 'month' | 'year'
const toneIcon: Record<string, string> = { amber: 'trendup', blue: 'refresh', green: 'check', red: 'zap' }
const insightLink: Record<string, [string, string]> = {
  unusual: ['/insights/alert', 'Check this payment'], subscriptions: ['/insights/bills', 'See bills and subscriptions'],
  over: ['/insights/budgets', 'See budgets'], saving: ['/insights/goals', 'See goals'],
}

export default function Insights() {
  const { t } = useApp()
  const money = useMoney()
  const [period, setPeriod] = useState<Period>('month')
  const [cat, setCat] = useState('')
  const sum = useLoad<Summary>('/analytics/summary?period=' + period).data
  const cmp = useLoad<Compare>('/analytics/compare').data
  const fc = useLoad<Forecast>('/analytics/forecast').data
  const heat = useLoad<{ cells: number[]; start: string }>('/analytics/heat').data
  const ins = useLoad<Insight[]>('/insights').data
  const tx = useLoad<Tx[]>('/transactions?limit=15' + (cat ? '&category=' + encodeURIComponent(cat) : '')).data

  const maxCat = Math.max(1, ...(sum?.categories.map((c) => c.amount) || [1]))
  const maxHeat = Math.max(1, ...(heat?.cells || [1]))
  const labels: Record<Period, string> = { day: 'today', week: 'the last 7 days', month: 'this month', year: 'this year' }

  return (
    <Shell title={t('insights')} sub="Your accounts, analysed" right={<Seg value={period} onChange={setPeriod} options={[['day', t('daily')], ['week', t('weekly')], ['month', t('monthly')], ['year', t('yearly')]]} />}>
      <SubNav area="insights" />
      <div className="grid g-4">
        {sum ? <>
          <Stat icon="down" label={t('moneyIn')} value={money(sum.in)} note={labels[period]} />
          <Stat icon="up" label={t('moneyOut')} value={money(sum.out)} note={labels[period]} />
          <Stat icon="scale" label={t('net')} value={money(sum.in - sum.out, { sign: true })} tone={sum.in >= sum.out ? 'pos' : 'amber'} note={sum.in >= sum.out ? 'You kept more than you spent' : 'You spent more than came in'} />
          <Stat icon="target" label="Top category" value={sum.categories[0]?.category || '-'} note={sum.categories[0] ? money(sum.categories[0].amount) : undefined} />
        </> : [0, 1, 2, 3].map((i) => <Skeleton key={i} h={134} />)}
      </div>

      {ins && ins.length > 0 && (
        <div className="grid g-3">
          {ins.map((i) => (
            <div key={i.title} className="card col g8 flat">
              <span className={'chip ' + i.tone} style={{ alignSelf: 'flex-start' }}><Icon name={toneIcon[i.tone] || 'sparkles'} size={14} />{i.title}</span>
              <span className="s t2">{i.body}</span>
              {insightLink[i.kind] && <Link to={insightLink[i.kind][0]} className="xs lnk">{insightLink[i.kind][1]}</Link>}
            </div>
          ))}
        </div>
      )}

      <div className="grid g-21">
        <div className="card col g12">
          <div className="col g4"><span className="h3">{t('moneyIn')} and {t('moneyOut').toLowerCase()}</span><span className="xs mu">{labels[period]}</span></div>
          {sum ? <Bars labels={sum.series.map((p) => p.label)} series={[{ name: t('moneyIn'), values: sum.series.map((p) => p.in) }, { name: t('moneyOut'), values: sum.series.map((p) => p.out) }]} colors={['var(--c5)', 'var(--c1)']} /> : <Skeleton h={220} />}
        </div>
        <div className="card col g12">
          <div className="row between"><span className="h3">By category</span>{cat && <Link to={'/insights/category/' + encodeURIComponent(cat)} className="xs lnk">Open {cat}</Link>}</div>
          {sum?.categories.map((c, i) => (
            <button key={c.category} className="col g6" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }} onClick={() => setCat(cat === c.category ? '' : c.category)} aria-pressed={cat === c.category}>
              <span className="row between s"><span className={cat === c.category ? 'w7 red' : 'w6'}>{c.category}</span><span className="num t2">{money(c.amount)}</span></span>
              <span className="bar"><i style={{ width: `${(c.amount / maxCat) * 100}%`, background: COLORS[i % COLORS.length] }} /></span>
            </button>
          )) || <Skeleton h={200} />}
        </div>
      </div>

      <div className="grid g-3">
        <div className="card col g12">
          <div className="col g4"><span className="h3">{t('spending3')}</span><span className="xs mu">Week by week</span></div>
          {cmp ? <Bars height={200} labels={['W1', 'W2', 'W3', 'W4']} series={cmp.map((m) => ({ name: m.month, values: m.weeks }))} /> : <Skeleton h={200} />}
          {cmp && <div className="row g16 wrap xs">{cmp.map((m) => <span key={m.month} className="col"><span className="mu">{m.month}</span><b className="num">{money(m.total)}</b></span>)}</div>}
        </div>
        <div className="card col g12">
          <div className="col g4"><span className="h3">{t('forecast')}</span><span className="xs mu">{fc ? `About ${money(fc.daily_spend)} a day, salary included` : ''}</span></div>
          {fc ? <Lines height={200} labels={fc.points.map((p) => p.label)} series={[{ name: 'Balance', values: fc.points.map((p) => p.balance) }]} /> : <Skeleton h={200} />}
          {fc && <div className="row g16 xs"><span className="col"><span className="mu">Lowest</span><b className="num">{money(fc.lowest)}</b></span><span className="col"><span className="mu">In 30 days</span><b className="num">{money(fc.end)}</b></span></div>}
        </div>
        <div className="card col g12">
          <div className="col g4"><span className="h3">{t('heat')}</span><span className="xs mu">Last 4 weeks, darker means more</span></div>
          <div className="heat" style={{ marginTop: 4 }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="xs mu" style={{ textAlign: 'center' }}>{d}</span>)}
            {heat?.cells.map((v, i) => (
              <i key={i} title={money(v)} style={{ background: v ? `color-mix(in srgb, var(--red) ${Math.round(15 + (v / maxHeat) * 85)}%, var(--surface))` : 'var(--surface)' }} />
            ))}
          </div>
        </div>
      </div>

      <div id="transactions" className="card" style={{ padding: 0 }}>
        <div className="row between wrap g8" style={{ padding: '18px 20px 8px' }}>
          <span className="h3">{t('recentTx')}{cat && ` · ${cat}`}</span>
          {cat && <button className="btn sm" onClick={() => setCat('')}>Show all</button>}
        </div>
        <TxTable rows={tx} />
      </div>
    </Shell>
  )
}
