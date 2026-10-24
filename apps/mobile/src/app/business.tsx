import { router } from 'expo-router'
import { Pressable, View } from 'react-native'
import type { Business } from '@/lib/api'
import { dueLabel } from '@/lib/format'
import { useApp, useMoney } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { useLoad } from '@/lib/useLoad'
import { Grouped } from '@/ui/charts'
import { type IconName } from '@/ui/Icon'
import { Avatar, Badge, Button, Card, ErrorNote, Ic, Note, Row, Screen, SectionTitle, Skeleton, T, TopBar } from '@/ui/kit'

// p10 "02 Business dashboard" with payroll (03) and advertising (08) summaries.
export default function BusinessScreen() {
  const { c } = useTheme()
  const { toast } = useApp()
  const money = useMoney()
  const { data: b, error, reload } = useLoad<Business>('/business')
  const months = b?.monthly || []
  const lastFull = months[months.length - 2]
  const now = months[months.length - 1]
  const growth = lastFull && months[months.length - 3] ? Math.round(((lastFull.profit - months[months.length - 3].profit) / Math.max(1, months[months.length - 3].profit)) * 100) : 0
  const soon = () => toast('This business tool is on the web app for now.')

  return (
    <Screen top={<TopBar title="Business" />} gap={14}>
      {error ? <ErrorNote text={error} onRetry={reload} /> : null}
      {!b ? <Skeleton h={300} /> : <>
        <Row gap={10}>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.blue, alignItems: 'center', justifyContent: 'center' }}><T color="#FFFFFF" w={800}>{b.name[0]}</T></View>
          <View><T v="h4">{b.name}</T><T v="xs" tone="mu">Business · {b.account}</T></View>
        </Row>
        <Card style={{ gap: 10 }}>
          <Row between style={{ alignItems: 'flex-start' }}>
            <View style={{ gap: 4 }}><T v="xs" tone="mu">Profit in {lastFull?.month || ''}</T><T v="h1" num>{lastFull ? money(lastFull.profit) : '—'}</T></View>
            {!!growth && <Badge tone={growth > 0 ? 'green' : 'red'} icon={growth > 0 ? 'up' : 'down'} label={`${Math.abs(growth)}% vs prior`} />}
          </Row>
          <Grouped series={[months.map((m) => m.sales), months.map((m) => m.costs)]} labels={months.map((m) => m.month)} colors={['#15803D', '#E30613']} h={100} />
          <Row gap={16}>{([['Sales', '#15803D'], ['Costs', '#E30613']] as const).map(([l, col]) => <Row key={l} gap={6}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: col }} /><T v="xs" tone="t2">{l}</T></Row>)}</Row>
        </Card>
        <Row gap={12}>
          <Card pad={14} style={{ flex: 1, gap: 4 }}><T v="xs" tone="mu">Cash in bank</T><T v="h4" num>{money(b.cash)}</T><T v="xs" w={600} tone="gr">{b.runway_days} days of runway</T></Card>
          <Card pad={14} style={{ flex: 1, gap: 4 }}><T v="xs" tone="mu">Unpaid invoices</T><T v="h4" num>{money(b.overdue)}</T><T v="xs" w={600} tone="rd">{b.overdue_count} overdue</T></Card>
        </Row>
        <Row between>
          {([['users', 'Payroll'], ['package', 'Vendors'], ['file', 'Invoices'], ['receipt', 'Expenses']] as [IconName, string][]).map(([i, l]) => (
            <Pressable key={l} onPress={soon} style={{ width: 76, alignItems: 'center', gap: 8 }}>
              <Ic name={i} tone="blue" size={52} r={16} iconSize={22} />
              <T v="xs" w={500}>{l}</T>
            </Pressable>
          ))}
        </Row>
        {now && <Note icon="sparkles">{`${now.month} so far: ${money(now.sales)} in sales and ${money(now.costs)} in costs.`}</Note>}

        <SectionTitle title="Payroll" />
        {b.payroll_due && (
          <Card flat pad={14} style={{ backgroundColor: c.surface, borderColor: 'transparent' }}>
            <Row between>
              <View style={{ gap: 4 }}><T v="xs" tone="mu">This month · {b.staff.length} staff</T><T v="h3" num>{money(b.payroll_due.amount)}</T></View>
              <Badge tone={b.payroll_due.paid_at ? 'green' : 'amber'} label={b.payroll_due.paid_at ? 'Paid' : `Due ${dueLabel(b.payroll_due.due_at)}`} />
            </Row>
          </Card>
        )}
        {b.staff.map((s) => (
          <Row key={s.id} gap={12} style={{ paddingVertical: 4 }}>
            <Avatar name={s.name} size={36} />
            <View style={{ flex: 1, gap: 4 }}><T v="s" w={600}>{s.name}</T><T v="xs" tone="mu">{s.role || 'Staff'} · net {money(s.net)}</T></View>
            <T v="s" w={600} num>{money(s.gross)}</T>
          </Row>
        ))}
        <Button label="Review and run payroll" onPress={soon} />

        {b.advertising.length > 0 && <>
          <SectionTitle title="Advertising" />
          {b.advertising.map((a) => (
            <Row key={a.channel} gap={12}>
              <Ic name="megaphone" tone="red" size={36} r={11} iconSize={17} />
              <T v="s" w={600} style={{ flex: 1 }}>{a.channel}</T>
              <T v="s" w={600} num>{money(a.spend)}</T>
            </Row>
          ))}
        </>}
        <Button label="Ask NURU about my business" variant="sec" icon="sparkles" onPress={() => router.push({ pathname: '/ask', params: { q: 'How is my business doing?' } })} />
      </>}
    </Screen>
  )
}
