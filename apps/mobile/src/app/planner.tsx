import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { api, type Reminder } from '@/lib/api'
import { dayName, shortDate } from '@/lib/format'
import { useApp, useMoney } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { useLoad } from '@/lib/useLoad'
import { Icon, type IconName } from '@/ui/Icon'
import { Badge, Button, Chip, Field, Ic, IconBtn, Input, Row, Screen, Seg, Skeleton, T, TopBar } from '@/ui/kit'
import { Sheet } from '@/ui/Sheet'

const KIND_ICON: Record<string, [IconName, 'red' | 'blue' | 'green' | 'gray' | 'amber']> = {
  bill: ['receipt', 'red'], loan: ['landmark', 'blue'], meeting: ['calendar', 'amber'], transfer: ['send', 'green'], salary: ['users', 'green'],
}

// p11 "05 Money calendar" and "03 Reminders", with "04 New reminder" as a sheet.
export default function Planner() {
  const { c } = useTheme()
  const { toast, t } = useApp()
  const money = useMoney()
  const { data, reload } = useLoad<Reminder[]>('/reminders')
  const [tab, setTab] = useState<'up' | 'done'>('up')
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ title: '', amount: '', days: '7', kind: 'bill' })
  const today = new Date()
  const first = new Date(today.getFullYear(), today.getMonth(), 1)
  const lead = (first.getDay() + 6) % 7
  const daysIn = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const marks: Record<number, string> = {}
  data?.forEach((r) => { const d = new Date(r.due_at); if (d.getMonth() === today.getMonth() && !r.done) marks[d.getDate()] = r.kind === 'meeting' ? c.blue : r.kind === 'loan' ? c.red : c.amber })
  const cells = Array.from({ length: Math.ceil((lead + daysIn) / 7) * 7 }, (_, i) => i - lead + 1)
  const list = (data || []).filter((r) => (tab === 'done' ? r.done : !r.done)).sort((a, b) => a.due_at.localeCompare(b.due_at))

  async function toggle(r: Reminder) {
    try { await api('/reminders/' + r.id, { method: 'PATCH', body: {} }); reload() } catch (e) { toast((e as Error).message) }
  }
  async function add() {
    try {
      const due = new Date(Date.now() + Number(f.days || 0) * 864e5)
      await api('/reminders', { body: { title: f.title.trim(), kind: f.kind, amount: Number(f.amount || 0), due_at: due.toISOString() } })
      setOpen(false); setF({ title: '', amount: '', days: '7', kind: 'bill' }); toast('Reminder saved'); reload()
    } catch (e) { toast((e as Error).message) }
  }

  return (
    <Screen top={<TopBar title={t('planner')} right={<IconBtn name="plus" label={t('addReminder')} onPress={() => setOpen(true)} />} />} gap={12}>
      <T v="h4" center>{today.toLocaleString('en', { month: 'long' })} {today.getFullYear()}</T>
      <Row between>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <T key={i} v="xs" w={600} tone="mu" style={{ width: 44, textAlign: 'center' }}>{d}</T>)}</Row>
      {Array.from({ length: cells.length / 7 }, (_, w) => (
        <Row between key={w}>
          {cells.slice(w * 7, w * 7 + 7).map((d, i) => {
            const n = d >= 1 && d <= daysIn ? d : 0
            const isToday = n === today.getDate()
            return (
              <View key={i} style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: isToday ? c.red : 'transparent' }}>
                <T v="s" w={isToday ? 600 : 400} color={isToday ? '#FFFFFF' : undefined}>{n ? String(n) : ''}</T>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: n && marks[n] ? (isToday ? '#FFFFFF' : marks[n]) : 'transparent' }} />
              </View>
            )
          })}
        </Row>
      ))}
      <View style={{ height: 1, backgroundColor: c.border }} />
      <T v="h4">{t('reminders')}</T>
      <Seg value={tab} onChange={setTab} options={[['up', 'Upcoming'], ['done', 'Done']]} />
      {data ? list.map((r) => {
        const [ic, tone] = KIND_ICON[r.kind] || ['bell', 'gray']
        return (
          <Pressable key={r.id} onLongPress={() => toggle(r)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
            <Ic name={ic} tone={tone} size={40} r={12} iconSize={18} />
            <View style={{ flex: 1, gap: 4 }}><T v="s" w={600}>{r.title}</T><T v="xs" tone="mu">{dayName(r.due_at)} {shortDate(r.due_at)}</T></View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <T v="s" w={600} num>{r.amount ? money(r.amount) : '—'}</T>
              <Pressable onPress={() => toggle(r)} hitSlop={6}><Badge tone={r.done ? 'green' : 'gray'} icon={r.done ? 'check' : undefined} label={r.done ? 'Done' : shortDate(r.due_at)} /></Pressable>
            </View>
          </Pressable>
        )
      }) : <Skeleton h={200} />}
      {data && list.length === 0 && <T v="s" tone="t2" center>Nothing here.</T>}
      <Row gap={6}><Icon name="info" size={12} color={c.muted} /><T v="xs" tone="mu">Tap the date badge to mark a reminder done.</T></Row>

      <Sheet open={open} onClose={() => setOpen(false)} scroll>
        <T v="h3">New reminder</T>
        <Field label="What is it for?"><Input value={f.title} onChangeText={(v) => setF({ ...f, title: v })} placeholder="School fees for Tolu" /></Field>
        <Row gap={12}>
          <View style={{ flex: 1 }}><Field label="Amount (₦)"><Input value={f.amount} onChangeText={(v) => setF({ ...f, amount: v.replace(/\D/g, '') })} keyboardType="number-pad" /></Field></View>
          <View style={{ flex: 1 }}><Field label="In how many days"><Input value={f.days} onChangeText={(v) => setF({ ...f, days: v.replace(/\D/g, '') })} keyboardType="number-pad" /></Field></View>
        </Row>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>{[['bill', 'Bill'], ['loan', 'Loan'], ['transfer', 'Transfer'], ['meeting', 'Meeting']].map(([k, l]) => <Chip key={k} label={l} on={f.kind === k} onPress={() => setF({ ...f, kind: k })} />)}</Row>
        <Button label="Save reminder" disabled={f.title.trim().length < 2} onPress={add} />
      </Sheet>
    </Screen>
  )
}
