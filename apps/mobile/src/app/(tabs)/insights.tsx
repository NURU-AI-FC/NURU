import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import type { Budgets, Goal, Health, Summary } from '@/lib/api'
import { catIcon, monthName } from '@/lib/format'
import { useApp, useMoney } from '@/lib/store'
import { cat, useTheme } from '@/lib/theme'
import { useLoad } from '@/lib/useLoad'
import { Bars, Donut, Legend, LineChart, Ring } from '@/ui/charts'
import { Icon, type IconName } from '@/ui/Icon'
import { Badge, Card, Col, ErrorNote, Ic, IconBtn, Note, Progress, Row, Screen, SectionTitle, Seg, Skeleton, T, TopBar } from '@/ui/kit'
import { MenuButton } from '@/components/Drawer'

type Period = 'day' | 'week' | 'month' | 'year'
const PERIOD_NAME: Record<Period, string> = { day: 'today', week: 'this week', month: 'in ' + monthName(), year: 'this year' }

// p06 "01 Insights overview", then categories (03), budgets (10), goals (11) and health (09).
export default function Insights() {
  const { c } = useTheme()
  const { t } = useApp()
  const money = useMoney()
  const [period, setPeriod] = useState<Period>('month')
  const sum = useLoad<Summary>('/analytics/summary?period=' + period)
  const s = sum.data
  const budgets = useLoad<Budgets>('/budgets').data
  const goals = useLoad<Goal[]>('/goals').data
  const health = useLoad<Health>('/analytics/health').data

  const diff = s && s.prev_out ? Math.round(((s.out - s.prev_out) / s.prev_out) * 100) : 0
  const saved = s && s.in > 0 ? Math.round(((s.in - s.out) / s.in) * 100) : 0
  const cats = s?.categories || []
  const top = cats.slice(0, 5)
  const totalCat = cats.reduce((a, x) => a + x.amount, 0) || 1
  const series = s?.series.map((p) => p.out) || []
  const labels = s?.series.map((p) => p.label) || []
  const every = Math.ceil(labels.length / 6)
  const shortLabels = labels.map((l, i) => (i % every === 0 || i === labels.length - 1 ? l.replace(':00', '') : ''))

  return (
    <Screen tab gap={14} top={<TopBar title={t('insights')} left={<MenuButton />} right={<IconBtn name="calendar" label="Planner" onPress={() => router.push('/planner')} />} />}>
      <Seg value={period} onChange={setPeriod} options={[['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year']]} />
      {sum.error ? <ErrorNote text={sum.error} onRetry={sum.reload} /> : null}

      <Card style={{ gap: 10 }}>
        <Row between style={{ alignItems: 'flex-start' }}>
          <Col gap={4}>
            <T v="xs" tone="mu">Spent {PERIOD_NAME[period]}</T>
            <T v="h1" num>{s ? money(s.out) : '—'}</T>
          </Col>
          {!!diff && <Badge tone={diff > 0 ? 'red' : 'green'} icon={diff > 0 ? 'up' : 'down'} label={`${Math.abs(diff)}% vs last`} />}
        </Row>
        {s ? (period === 'day' || period === 'year'
          ? <Bars values={series} labels={shortLabels} hi={series.indexOf(Math.max(...series))} h={90} gap={0.25} rx={3} />
          : <LineChart values={series.length > 1 ? series : [0, 0]} labels={shortLabels.filter(Boolean)} h={90} dots={series.length <= 12} />)
          : <Skeleton h={110} />}
      </Card>

      <Row gap={12}>
        <Kpi label="Income" value={s ? money(s.in) : '—'} note={s ? (s.in >= s.out ? 'More in than out' : 'Less in than out') : ''} good={!!s && s.in >= s.out} />
        <Kpi label="Saved" value={s ? `${Math.max(saved, 0)}%` : '—'} note={saved >= 20 ? 'On a healthy pace' : 'Aim for 20%'} good={saved >= 20} />
      </Row>

      {top.length > 0 && (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Donut values={top.map((x) => x.amount)} size={116} sw={16} center={String(top.length)} sub="top" />
          <View style={{ flex: 1 }}>
            <Legend items={top.map((x) => [x.category, '', Math.round((x.amount / totalCat) * 100) + '%'])} />
          </View>
        </Card>
      )}

      <SectionTitle title="Categories" />
      <Col gap={4}>
        {s ? cats.map((x, i) => {
          const pct = Math.round((x.amount / totalCat) * 100)
          const color = cat[i % cat.length]
          return (
            <View key={x.category} style={{ gap: 8, paddingVertical: 6 }}>
              <Row gap={12}>
                <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={catIcon(x.category)} size={17} color={color} />
                </View>
                <T v="s" w={600} style={{ flex: 1 }}>{x.category}</T>
                <Col style={{ alignItems: 'flex-end' }}><T v="s" w={600} num>{money(x.amount)}</T><T v="xs" tone="mu">{pct}%</T></Col>
              </Row>
              <Progress pct={Math.min(100, pct * 3)} color={color} />
            </View>
          )
        }) : <Skeleton h={200} />}
      </Col>

      <SectionTitle title={t('budgets')} />
      {budgets ? <>
        <Card style={{ gap: 8 }}>
          <Row between><T v="xs" tone="mu">{budgets.month} budget</T><T v="xs" tone="mu">{budgets.days_left} days left</T></Row>
          <Row between><T v="h2" num>{money(budgets.spent)}</T><T v="s" tone="t2">of {money(budgets.limit)}</T></Row>
          <Progress pct={(budgets.spent / Math.max(1, budgets.limit)) * 100} />
        </Card>
        {budgets.items.map((b) => {
          const color = b.pct >= 100 ? c.red : b.pct > 85 ? c.amber : c.green
          return (
            <Card key={b.id} pad={14} style={{ gap: 8 }}>
              <Row gap={10}>
                <Ic name={catIcon(b.category)} size={34} r={10} iconSize={16} />
                <T v="s" w={600} style={{ flex: 1 }}>{b.category}</T>
                <T v="xs" w={600} color={color}>{b.pct}%</T>
              </Row>
              <Progress pct={b.pct} color={color} />
              <Row between>
                <T v="xs" tone="t2">{money(b.spent)} spent</T>
                <T v="xs" tone="t2">{b.spent > b.limit ? `${money(b.spent - b.limit)} over` : `${money(b.limit - b.spent)} left`}</T>
              </Row>
            </Card>
          )
        })}
      </> : <Skeleton h={120} />}

      <SectionTitle title={t('goals')} />
      {goals ? goals.map((g, k) => (
        <Card key={g.id} pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Ring pct={g.pct} size={56} sw={6} color={k === 0 ? c.green : c.red} />
          <Col gap={4} style={{ flex: 1 }}>
            <T v="s" w={600}>{g.name}</T>
            <T v="xs" tone="mu">{g.note}</T>
            <T v="xs" tone="t2"><T v="xs" w={600}>{money(g.saved)}</T> of {money(g.target)}</T>
          </Col>
          <Icon name={(g.icon as IconName) || 'target'} size={20} color={c.muted} />
        </Card>
      )) : <Skeleton h={160} />}
      {goals && goals[0]?.monthly_needed ? (
        <Note icon="sparkles" tint={c.red50}>{`Save ${money(goals[0].monthly_needed)} a month to finish ${goals[0].name.toLowerCase()} on time.`}</Note>
      ) : null}

      {health && <>
        <SectionTitle title={t('healthScore')} />
        <Card style={{ gap: 12 }}>
          <Row gap={16}>
            <Ring pct={health.score} size={84} sw={9} color={health.score >= 70 ? c.green : health.score >= 50 ? c.amber : c.red} label={String(health.score)} />
            <Col gap={4} style={{ flex: 1 }}>
              <T v="h3">{health.label}</T>
              <T v="xs" tone="t2">{health.change >= 0 ? 'Up' : 'Down'} {Math.abs(health.change)} points since {health.since}</T>
            </Col>
          </Row>
          {health.parts.map((p) => (
            <View key={p.key} style={{ gap: 6 }}>
              <Row between><T v="s" w={600}>{p.name}</T><T v="xs" tone="t2">{p.detail}</T></Row>
              <Progress pct={p.score} color={p.score >= 70 ? c.green : p.score >= 45 ? c.amber : c.red} />
            </View>
          ))}
        </Card>
        <Note icon="target" tint={c.red50}>{health.tip}</Note>
      </>}
    </Screen>
  )
}

function Kpi({ label, value, note, good }: { label: string; value: string; note: string; good: boolean }) {
  return (
    <Card pad={14} style={{ flex: 1, gap: 4 }}>
      <T v="xs" tone="mu">{label}</T>
      <T v="h4" num>{value}</T>
      <T v="xs" w={600} tone={good ? 'gr' : 'rd'}>{note}</T>
    </Card>
  )
}
