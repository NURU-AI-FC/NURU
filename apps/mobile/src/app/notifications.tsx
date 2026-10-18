import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { api, type Note } from '@/lib/api'
import { clock, when } from '@/lib/format'
import { useApp } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { useLoad } from '@/lib/useLoad'
import type { IconName } from '@/ui/Icon'
import { Card, Chip, Ic, IconBtn, Row, Screen, Skeleton, T, TopBar } from '@/ui/kit'

type Filter = '' | 'alert' | 'reminder' | 'insight'
const TONE: Record<string, 'red' | 'green' | 'amber' | 'blue' | 'gray'> = { red: 'red', green: 'green', amber: 'amber', blue: 'blue' }

function section(at: string) {
  const d = new Date(at)
  const today = new Date(new Date().toDateString()).getTime()
  const diff = Math.round((today - new Date(d.toDateString()).getTime()) / 864e5)
  return diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : diff < 7 ? 'This week' : 'Earlier'
}

// p05 "08 Notifications" / p11 "01 Notification centre".
export default function Notifications() {
  const { c } = useTheme()
  const { t, toast } = useApp()
  const [filter, setFilter] = useState<Filter>('')
  const { data, reload } = useLoad<{ items: Note[]; unread: number }>('/notifications?limit=100' + (filter ? '&kind=' + filter : ''))
  const groups: { label: string; items: Note[] }[] = []
  for (const n of data?.items || []) {
    const l = section(n.at); const g = groups[groups.length - 1]
    if (g && g.label === l) g.items.push(n); else groups.push({ label: l, items: [n] })
  }
  async function readAll() {
    try { await api('/notifications/all', { method: 'PATCH', body: { read: true } }); reload() } catch (e) { toast((e as Error).message) }
  }
  async function open(n: Note) {
    if (!n.read) await api('/notifications/' + n.id, { method: 'PATCH', body: { read: true } }).catch(() => {})
    if (n.kind === 'reminder') router.push('/planner')
    else if (n.kind === 'insight') router.push('/insights')
    else reload()
  }

  return (
    <Screen gap={12} top={<TopBar title={t('notificationsTitle')} right={data?.unread ? <IconBtn name="check" label={t('markAllRead')} onPress={readAll} /> : undefined} />}>
      <Row gap={8}>{([['', 'All'], ['alert', 'Alerts'], ['reminder', 'Reminders'], ['insight', 'Insights']] as [Filter, string][]).map(([k, l]) => <Chip key={l} label={l} on={filter === k} onPress={() => setFilter(k)} />)}</Row>
      {!data ? <Skeleton h={320} /> : data.items.length === 0 ? (
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 40 }}>
          <Ic name="bell" /><T v="h3">Nothing here yet</T>
          <T v="s" tone="t2" center>Alerts about big payments, bills and insights will show up here.</T>
        </View>
      ) : groups.map((g) => (
        <View key={g.label} style={{ gap: 8 }}>
          <T v="xs" w={600} tone="mu" style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>{g.label}</T>
          <Card pad={4} style={{ paddingHorizontal: 14 }}>
            {g.items.map((n, i) => (
              <Pressable key={n.id} onPress={() => open(n)} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
                <Ic name={(n.icon || 'bell') as IconName} tone={TONE[n.tone] || 'gray'} size={40} r={12} iconSize={18} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Row between gap={8}><T v="s" w={600} style={{ flex: 1 }} lines={1}>{n.title}</T><T v="xs" tone="mu">{g.label === 'Today' ? clock(new Date(n.at)) : when(n.at)}</T></Row>
                  <T v="xs" tone="t2" lines={2}>{n.body}</T>
                </View>
                {!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.red, marginTop: 6 }} />}
              </Pressable>
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  )
}
