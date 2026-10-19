import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { api, type Reminder } from '@/lib/api'
import { clock, dayName, monthName, shortDate } from '@/lib/format'
import { useApp, useMoney } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { useLoad } from '@/lib/useLoad'
import { DateField, longDate } from '@/ui/DateField'
import { Icon, type IconName } from '@/ui/Icon'
import { Badge, Button, Chip, Field, Ic, IconBtn, Input, Row, Screen, Seg, Skeleton, T, TopBar } from '@/ui/kit'
import { Sheet } from '@/ui/Sheet'

const KIND_ICON: Record<string, [IconName, 'red' | 'blue' | 'green' | 'gray' | 'amber']> = {
  bill: ['receipt', 'red'], loan: ['landmark', 'blue'], meeting: ['calendar', 'amber'], transfer: ['send', 'green'], salary: ['users', 'green'],
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const blank = (day: Date) => ({ title: '', amount: '', kind: 'bill', date: day, time: null as Date | null })

// p11 "05 Money calendar" and "03 Reminders", with "04 New reminder" as a sheet.
// Tap a day to see what is due then and add a reminder for it.
export default function Planner() {
  const { c } = useTheme()
  const { toast, t } = useApp()
  const money = useMoney()
  const { data, reload } = useLoad<Reminder[]>('/reminders')
  const today = startOfDay(new Date())
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [picked, setPicked] = useState<Date | null>(null)
  const [tab, setTab] = useState<'up' | 'done'>('up')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState(() => blank(today))

  const lead = (month.getDay() + 6) % 7
  const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const marks: Record<number, string> = {}
  data?.forEach((r) => {
    const d = new Date(r.due_at)
    if (d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth() && !r.done) marks[d.getDate()] = r.kind === 'meeting' ? c.blue : r.kind === 'loan' ? c.red : c.amber
  })
  const cells = Array.from({ length: Math.ceil((lead + daysIn) / 7) * 7 }, (_, i) => i - lead + 1)
  const list = picked
    ? (data || []).filter((r) => sameDay(new Date(r.due_at), picked)).sort((a, b) => a.due_at.localeCompare(b.due_at))
    : (data || []).filter((r) => (tab === 'done' ? r.done : !r.done)).sort((a, b) => a.due_at.localeCompare(b.due_at))

  const shift = (n: number) => { setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1)); setPicked(null) }
  const tapDay = (n: number) => {
    const d = new Date(month.getFullYear(), month.getMonth(), n)
    setPicked(picked && sameDay(picked, d) ? null : d)
  }
  const newReminder = (day?: Date) => { setF(blank(day && day >= today ? day : today)); setOpen(true) }

  async function toggle(r: Reminder) {
    try { await api('/reminders/' + r.id, { method: 'PATCH', body: {} }); reload() } catch (e) { toast((e as Error).message) }
  }
  async function add() {
    // the API takes one timestamp; without a time the reminder lands at 9 am, as on the web
    const due = new Date(f.date)
    if (f.time) due.setHours(f.time.getHours(), f.time.getMinutes(), 0, 0)
    else due.setHours(9, 0, 0, 0)
    setSaving(true)
    try {
      await api('/reminders', { body: { title: f.title.trim(), kind: f.kind, amount: Number(f.amount || 0), due_at: due.toISOString() } })
      setOpen(false)
      toast('Reminder saved')
      setMonth(new Date(due.getFullYear(), due.getMonth(), 1))
      setPicked(startOfDay(due))
      reload()
    } catch (e) { toast((e as Error).message) } finally { setSaving(false) }
  }

  return (
    <Screen top={<TopBar title={t('planner')} right={<IconBtn name="plus" label={t('addReminder')} onPress={() => newReminder(picked || undefined)} />} />} gap={12}>
      <Row between>
        <IconBtn name="chevl" label="Previous month" onPress={() => shift(-1)} />
        <T v="h4" center>{monthName(month)} {month.getFullYear()}</T>
        <IconBtn name="chevr" label="Next month" onPress={() => shift(1)} />
      </Row>
      <Row between>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <T key={i} v="xs" w={600} tone="mu" style={{ width: 44, textAlign: 'center' }}>{d}</T>)}</Row>
      {Array.from({ length: cells.length / 7 }, (_, w) => (
        <Row between key={w}>
          {cells.slice(w * 7, w * 7 + 7).map((d, i) => {
            const n = d >= 1 && d <= daysIn ? d : 0
            if (!n) return <View key={i} style={{ width: 44, height: 44 }} />
            const day = new Date(month.getFullYear(), month.getMonth(), n)
            const isToday = sameDay(day, today)
            const on = !!picked && sameDay(day, picked)
            const fg = on ? '#FFFFFF' : isToday ? c.red : undefined
            return (
              <Pressable key={i} onPress={() => tapDay(n)} accessibilityRole="button" accessibilityState={{ selected: on }}
                accessibilityLabel={`${longDate(day)}${marks[n] ? ', has reminders' : ''}`}
                style={({ pressed }) => ({
                  width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 3,
                  backgroundColor: on ? c.red : isToday ? c.red50 : pressed ? c.surface : 'transparent',
                })}>
                <T v="s" w={on || isToday ? 600 : 400} color={fg}>{String(n)}</T>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: marks[n] ? (on ? '#FFFFFF' : marks[n]) : 'transparent' }} />
              </Pressable>
            )
          })}
        </Row>
      ))}
      <View style={{ height: 1, backgroundColor: c.border }} />

      {picked ? (
        <>
          <Row between>
            <View style={{ gap: 2 }}>
              <T v="h4">{sameDay(picked, today) ? 'Today' : `${dayName(picked)} ${shortDate(picked)}`}</T>
              <T v="xs" tone="mu">{list.length ? `${list.length} ${list.length === 1 ? 'reminder' : 'reminders'}` : 'Nothing due this day'}</T>
            </View>
            <Chip label="All reminders" onPress={() => setPicked(null)} />
          </Row>
        </>
      ) : (
        <>
          <T v="h4">{t('reminders')}</T>
          <Seg value={tab} onChange={setTab} options={[['up', 'Upcoming'], ['done', 'Done']]} />
        </>
      )}

      {data ? list.map((r) => {
        const [ic, tone] = KIND_ICON[r.kind] || ['bell', 'gray']
        const at = new Date(r.due_at)
        return (
          <Pressable key={r.id} onLongPress={() => toggle(r)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
            <Ic name={ic} tone={tone} size={40} r={12} iconSize={18} />
            <View style={{ flex: 1, gap: 4 }}>
              <T v="s" w={600} style={r.done ? { textDecorationLine: 'line-through' } : undefined}>{r.title}</T>
              <T v="xs" tone="mu">{dayName(at)} {shortDate(at)} · {clock(at)}</T>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <T v="s" w={600} num>{r.amount ? money(r.amount) : '—'}</T>
              <Pressable onPress={() => toggle(r)} hitSlop={6} accessibilityRole="button" accessibilityLabel={r.done ? 'Mark not done' : 'Mark done'}>
                <Badge tone={r.done ? 'green' : 'gray'} icon={r.done ? 'check' : undefined} label={r.done ? 'Done' : 'Mark done'} />
              </Pressable>
            </View>
          </Pressable>
        )
      }) : <Skeleton h={200} />}
      {data && list.length === 0 && !picked && <T v="s" tone="t2" center>Nothing here.</T>}
      {picked && (
        <Button icon="plus" variant="out" label={picked < today ? 'This day has passed' : `Add a reminder for ${shortDate(picked)}`} disabled={picked < today} onPress={() => newReminder(picked)} />
      )}
      <Row gap={6}><Icon name="info" size={12} color={c.muted} /><T v="xs" tone="mu">Tap a day to see what is due. Tap Mark done when it is paid.</T></Row>

      <Sheet open={open} onClose={() => setOpen(false)} scroll>
        <T v="h3">New reminder</T>
        <Field label="What is it for?"><Input value={f.title} onChangeText={(v) => setF({ ...f, title: v })} placeholder="School fees for Tolu" /></Field>
        <Field label="Amount (₦), optional"><Input value={f.amount} onChangeText={(v) => setF({ ...f, amount: v.replace(/\D/g, '') })} keyboardType="number-pad" placeholder="0" /></Field>
        <Field label="Date"><DateField value={f.date} minimumDate={today} onChange={(d) => setF({ ...f, date: startOfDay(d) })} /></Field>
        <Field label="Time, optional" hint={f.time ? undefined : 'Without a time, NURU reminds you at 9 am.'}>
          <DateField mode="time" value={f.time} placeholder="Add a time" onChange={(d) => setF({ ...f, time: d })} onClear={() => setF({ ...f, time: null })} />
        </Field>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>{[['bill', 'Bill'], ['loan', 'Loan'], ['transfer', 'Transfer'], ['meeting', 'Meeting']].map(([k, l]) => <Chip key={k} label={l} on={f.kind === k} onPress={() => setF({ ...f, kind: k })} />)}</Row>
        <Button label="Save reminder" loading={saving} disabled={f.title.trim().length < 2} onPress={add} />
      </Sheet>
    </Screen>
  )
}
