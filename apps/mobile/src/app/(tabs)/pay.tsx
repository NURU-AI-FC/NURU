import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import type { Account, Payee, Reminder } from '@/lib/api'
import { shortDate } from '@/lib/format'
import { useApp, useMoney } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { useLoad } from '@/lib/useLoad'
import { Icon, type IconName } from '@/ui/Icon'
import { Avatar, Card, Chip, Divider, Ic, IconBtn, ListRow, Row, Screen, SectionTitle, Skeleton, Soft, T, TopBar } from '@/ui/kit'
import { MenuButton } from '@/components/Drawer'

// p08 "01 Pay hub" with the saved beneficiaries list (13) below.
export default function Pay() {
  const { c } = useTheme()
  const { toast, tabs } = useApp()
  const money = useMoney()
  const accts = useLoad<{ accounts: Account[] }>('/accounts').data?.accounts.filter((a) => a.kind !== 'business')
  const payees = useLoad<Payee[]>('/payees').data
  const rem = useLoad<Reminder[]>('/reminders').data
  const [i, setI] = useState(0)
  useEffect(() => { setI(0) }, [accts?.length])
  const a = accts?.[i % (accts?.length || 1)]
  const scheduled = (rem || []).filter((r) => !r.done && r.amount > 0 && (r.kind === 'transfer' || r.kind === 'bill')).slice(0, 3)
  const soon = () => toast('This payment type is on the web app for now.')

  return (
    <Screen tab gap={18} top={<TopBar title={tabs.pay} left={<MenuButton />} right={<IconBtn name="qr" label="Scan to pay" onPress={soon} />} />}>
      <Soft style={{ paddingHorizontal: 16 }}>
        <Row between>
          <View style={{ gap: 4 }}>
            <T v="xs" tone="mu">{a ? `${a.bank.replace(' Bank', '')} ${a.number}` : ' '}</T>
            <T v="h3" num>{a ? money(a.balance) : '—'}</T>
          </View>
          <Chip label="Change" icon={undefined} onPress={() => setI((x) => x + 1)} />
        </Row>
      </Soft>
      <Row between>
        {([['send', 'Send money', () => router.push('/send')], ['zap', 'Pay bills', soon], ['phone', 'Airtime', soon], ['qr', 'Scan to pay', soon]] as [IconName, string, () => void][]).map(([ic, l, fn]) => (
          <Pressable key={l} onPress={fn} accessibilityRole="button" style={{ width: 76, alignItems: 'center', gap: 8 }}>
            <Ic name={ic} tone="red" size={56} r={18} iconSize={24} />
            <T v="xs" w={500} center>{l}</T>
          </Pressable>
        ))}
      </Row>
      <SectionTitle title="Recent people" />
      <Row between>
        {payees ? payees.slice(0, 4).map((p) => (
          <Pressable key={p.id} onPress={() => router.push({ pathname: '/send', params: { payee: p.id } })} style={{ width: 72, alignItems: 'center', gap: 6 }}>
            <Avatar name={p.name} />
            <T v="xs" center lines={1}>{p.name.split(/[\s,]+/)[0]}</T>
          </Pressable>
        )) : <Skeleton h={60} style={{ flex: 1 }} />}
      </Row>
      {scheduled.length > 0 && <>
        <SectionTitle title="Scheduled" link="Manage" onLink={() => router.push('/planner')} />
        <Card pad={14} style={{ gap: 0 }}>
          {scheduled.map((r, k) => (
            <View key={r.id}>
              {k > 0 && <Divider />}
              <ListRow icon={/rent/i.test(r.title) ? 'building' : /mama|family/i.test(r.title) ? 'heart' : 'receipt'} title={r.title} sub={`Next ${shortDate(r.due_at)}`} right={<T v="s" w={600} num>{money(r.amount)}</T>} />
            </View>
          ))}
        </Card>
      </>}
      <SectionTitle title="Beneficiaries" />
      {payees?.map((p) => (
        <Pressable key={p.id} onPress={() => router.push({ pathname: '/send', params: { payee: p.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
          <Avatar name={p.name} />
          <View style={{ flex: 1, gap: 4 }}><T v="s" w={600}>{p.name}</T><T v="xs" tone="mu">{p.bank} {p.account}{p.tag ? ` · ${p.tag}` : ''}</T></View>
          <Icon name={p.starred ? 'star' : 'chevr'} size={18} color={p.starred ? c.amber : c.muted} />
        </Pressable>
      ))}
    </Screen>
  )
}
