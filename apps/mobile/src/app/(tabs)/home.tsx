import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { api, type Account, type Compare, type Insight, type Reminder, type Summary, type Tx } from '@/lib/api'
import { catIcon, catTone, dueLabel, greeting, when } from '@/lib/format'
import { getItem, setItem } from '@/lib/storage'
import { useApp, useMoney } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { useLoad } from '@/lib/useLoad'
import { Bars } from '@/ui/charts'
import { Icon, type IconName } from '@/ui/Icon'
import { BankTile } from '@/components/BankTile'
import { Badge, Button, Card, Col, ErrorNote, Hero, Ic, IconBtn, Row, Screen, SectionTitle, Seg, Skeleton, T, TxRow } from '@/ui/kit'

const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR']

// p05 "01 Home" plus the accounts strip and upcoming bills the dashboard needs.
export default function Home() {
  const { c } = useTheme()
  const { user, t, update, toast } = useApp()
  const money = useMoney()
  const [hidden, setHidden] = useState(false)
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const acct = useLoad<{ accounts: Account[] }>('/accounts')
  const week = useLoad<Summary>('/analytics/summary?period=week').data
  const month = useLoad<Summary>('/analytics/summary?period=month').data
  const cmp = useLoad<Compare>('/analytics/compare').data
  const tx = useLoad<Tx[]>('/transactions?limit=5').data
  const ins = useLoad<Insight[]>('/insights').data
  const rem = useLoad<Reminder[]>('/reminders').data
  const unread = useLoad<{ unread: number }>('/notifications?count=1').data?.unread || 0

  useEffect(() => { getItem('nuru.hideBalance').then((v) => setHidden(v === '1')) }, [])
  const toggleHidden = () => { setHidden(!hidden); setItem('nuru.hideBalance', hidden ? '0' : '1') }

  const personal = acct.data?.accounts.filter((a) => a.kind !== 'business') || []
  const total = personal.reduce((s, a) => s + a.balance, 0)
  const diff = month && month.prev_out ? Math.round(((month.out - month.prev_out) / month.prev_out) * 100) : 0
  const tip = ins?.find((i) => i.kind === 'over') || ins?.[0]
  const bills = (rem || []).filter((r) => !r.done && r.amount > 0).slice(0, 3)
  const cur = user?.currency || 'NGN'
  const first = user?.name.split(' ')[0] || ''

  const weekVals = week?.series.map((p) => p.out) || []
  const weekLabels = weekVals.map((_, i) => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(Date.now() - (weekVals.length - 1 - i) * 864e5).getDay()])
  const thisMonth = cmp?.[cmp.length - 1]
  const chartVals = period === 'week' ? weekVals : thisMonth?.weeks || []
  const chartLabels = period === 'week' ? weekLabels : ['Week 1', 'Week 2', 'Week 3', 'Week 4']
  const hi = chartVals.indexOf(Math.max(...chartVals))

  if (acct.data && personal.length === 0) return <EmptyHome onLinked={acct.reload} name={first} />

  return (
    <Screen tab gap={14}
      top={
        <Row between style={{ height: 56, paddingHorizontal: 20 }}>
          <Row gap={10}>
            <IconBtn name="menu" label="Menu" onPress={() => router.push('/more')} />
            <Col><T v="xs" tone="mu">{t(greeting())}</T><T v="h4">{first}</T></Col>
          </Row>
          <Row gap={8}>
            <IconBtn name="search" label="Search" onPress={() => router.push('/history')} />
            <IconBtn name="bell" label="Notifications" badge={unread > 0} onPress={() => router.push('/notifications')} />
          </Row>
        </Row>
      }
    >
      {acct.error ? <ErrorNote text={acct.error} onRetry={acct.reload} /> : null}

      <Hero>
        <Row between>
          <T v="s" color="rgba(255,255,255,0.85)">{t('totalBalance')}</T>
          <Row gap={6}>
            <Pressable onPress={() => update({ currency: CURRENCIES[(CURRENCIES.indexOf(cur) + 1) % CURRENCIES.length] })} accessibilityLabel="Change display currency">
              <Badge light label={cur} icon="chevd" style={{ flexDirection: 'row-reverse' }} />
            </Pressable>
            <Pressable onPress={toggleHidden} accessibilityLabel={hidden ? t('showBalance') : t('hideBalance')} hitSlop={8}>
              <Icon name={hidden ? 'eyeoff' : 'eye'} size={18} color="#FFFFFF" />
            </Pressable>
          </Row>
        </Row>
        <Pressable onPress={() => router.push('/accounts')}>
          <T num color="#FFFFFF" w={800} style={{ fontSize: 34, lineHeight: 42, letterSpacing: -1 }}>{acct.data ? (hidden ? '••••••' : money(total)) : '—'}</T>
        </Pressable>
        <Row between>
          <T v="xs" color="rgba(255,255,255,0.8)">All accounts · {personal.length} linked</T>
          {!!diff && <Badge light icon={diff < 0 ? 'down' : 'up'} label={`${Math.abs(diff)}% vs last month`} />}
        </Row>
      </Hero>

      <Row between>
        <QA icon="send" label="Send" onPress={() => router.push('/send')} />
        <QA icon="receipt" label="Pay bills" onPress={() => router.push('/pay')} />
        <QA icon="exchange" label="Convert" onPress={() => toast('Currency converter is on the web app for now.')} />
        <QA icon="grid" label="More" onPress={() => router.push('/more')} />
      </Row>

      {tip && (
        <Card flat pad={14} style={{ backgroundColor: c.red50, borderColor: 'transparent' }}
          onPress={() => router.push({ pathname: '/ask', params: { q: `How can I spend less on ${tip.title.split(' is ')[0]}?` } })}>
          <Row gap={12}>
            <Ic name="sparkles" tone="red" size={40} r={12} iconSize={19} bg={c.bg} />
            <View style={{ flex: 1, gap: 4 }}>
              <T v="s" w={600}>{tip.title}</T>
              <T v="xs" tone="t2">{tip.body}</T>
            </View>
            <Icon name="chevr" size={18} color={c.red} />
          </Row>
        </Card>
      )}

      <Card style={{ gap: 12 }}>
        <Row between>
          <Col gap={4}>
            <T v="xs" tone="mu">{period === 'week' ? 'Spent this week' : 'Spent this month'}</T>
            <T v="h2" num>{(period === 'week' ? week : month) ? money((period === 'week' ? week : month)!.out) : '—'}</T>
          </Col>
          <Seg value={period} onChange={setPeriod} options={[['week', 'Week'], ['month', 'Month']]} style={{ width: 150 }} />
        </Row>
        {chartVals.length ? <Bars values={chartVals} labels={chartLabels} hi={hi} h={80} /> : <Skeleton h={100} />}
      </Card>

      <SectionTitle title="Accounts" link={t('seeAll')} onLink={() => router.push('/accounts')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }} style={{ marginHorizontal: -20, paddingLeft: 20, flexGrow: 0 }}>
        {acct.data ? acct.data.accounts.map((a) => (
          <Card key={a.id} pad={14} style={{ width: 168, gap: 10 }} onPress={() => router.push('/accounts')}>
            <Row gap={10}>
              <BankTile bank={a.bank} size={32} />
              <Col style={{ flex: 1 }}><T v="xs" w={600} lines={1}>{a.name}</T><T v="xs" tone="mu">{a.number}</T></Col>
            </Row>
            <T v="h4" num>{hidden ? '••••••' : money(a.balance)}</T>
          </Card>
        )) : [0, 1].map((i) => <Skeleton key={i} h={96} style={{ width: 168 }} />)}
        <View style={{ width: 8 }} />
      </ScrollView>

      {bills.length > 0 && <>
        <SectionTitle title="Upcoming bills" link="Planner" onLink={() => router.push('/planner')} />
        <Card pad={14} style={{ gap: 12 }}>
          {bills.map((b, i) => (
            <View key={b.id} style={{ gap: 12 }}>
              {i > 0 && <View style={{ height: 1, backgroundColor: c.border }} />}
              <Row gap={12}>
                <Ic name={b.kind === 'loan' ? 'landmark' : b.kind === 'transfer' ? 'send' : /dstv|tv/i.test(b.title) ? 'tv' : /rent/i.test(b.title) ? 'building' : 'receipt'} tone={i === 0 ? 'amber' : 'gray'} size={40} r={12} iconSize={19} />
                <Col gap={4} style={{ flex: 1 }}><T v="s" w={600}>{b.title}</T><T v="xs" tone="mu">{new Date(b.due_at).toDateString().slice(4, 10)}</T></Col>
                <Col gap={4} style={{ alignItems: 'flex-end' }}>
                  <T v="s" w={600} num>{money(b.amount)}</T>
                  <Badge label={dueLabel(b.due_at)} tone={i === 0 ? 'amber' : 'gray'} />
                </Col>
              </Row>
            </View>
          ))}
        </Card>
      </>}

      <SectionTitle title="Recent" link={t('seeAll')} onLink={() => router.push('/history')} />
      <Col gap={14}>
        {tx ? tx.map((r) => (
          <TxRow key={r.id} icon={r.direction === 'credit' ? 'down' : catIcon(r.category)} tone={r.direction === 'credit' ? 'green' : catTone(r.category)}
            name={r.merchant} sub={`${r.category} · ${when(r.at)}`} amount={money(r.amount)} credit={r.direction === 'credit'} />
        )) : <Skeleton h={160} />}
      </Col>
    </Screen>
  )
}

function QA({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ width: 70, alignItems: 'center', gap: 6 }}>
      <Ic name={icon} tone="red" size={52} r={16} iconSize={22} />
      <T v="xs" w={500}>{label}</T>
    </Pressable>
  )
}

// p05 "12 Home (no account linked)"
function EmptyHome({ onLinked, name }: { onLinked: () => void; name: string }) {
  const { c } = useTheme()
  const { toast, t } = useApp()
  const [busy, setBusy] = useState(false)
  async function demo() {
    setBusy(true)
    try { await api('/accounts/demo', { body: {} }); toast('Demo bank linked'); onLinked() } catch (e) { toast((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <Screen tab gap={18} top={<Row style={{ height: 56, paddingHorizontal: 20 }}><Col><T v="xs" tone="mu">{t(greeting())}</T><T v="h4">{name}</T></Col></Row>}>
      <Hero style={{ minHeight: 170 }}>
        <T v="s" color="rgba(255,255,255,0.85)">{t('totalBalance')}</T>
        <T color="#FFFFFF" w={800} style={{ fontSize: 34, lineHeight: 42 }}>₦0.00</T>
        <T v="xs" color="rgba(255,255,255,0.8)">Link an account to see your real numbers</T>
      </Hero>
      <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 28, paddingHorizontal: 20 }}>
        <Ic name="link" tone="red" size={64} r={20} iconSize={30} />
        <T v="h3" center>{t('connectFirst')}</T>
        <T v="s" tone="t2" center>NURU needs your transaction history to find insights. Read-only and secured by Mono.</T>
        <Button label={t('tryDemoBank')} onPress={demo} loading={busy} style={{ alignSelf: 'stretch' }} />
        <T v="s" w={600} tone="rd" onPress={() => toast('Linking a real bank needs Mono Connect, which runs on the web app for now.')}>{t('linkBank')}</T>
      </Card>
      <Col gap={10}>
        {([['chart', 'See spending by category'], ['bell', 'Get bill and anomaly alerts'], ['message', 'Ask questions in your language']] as [IconName, string][]).map(([i, l]) => (
          <Row key={l} gap={10}><Icon name={i} size={18} color={c.red} /><T v="s" tone="t2">{l}</T></Row>
        ))}
      </Col>
    </Screen>
  )
}
