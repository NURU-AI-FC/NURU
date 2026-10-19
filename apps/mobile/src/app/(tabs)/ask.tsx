import { useLocalSearchParams, router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native'
import { askLine, DescribeCard, ReminderCard, TransferCard, type Described } from '@/components/ChatCards'
import { suggestions } from '@/i18n'
import { api, type ChatAction, type ChatMsg, type ChatReply, type Pending, type Source, type Thread } from '@/lib/api'
import { greeting, when } from '@/lib/format'
import { useApp, useMoney } from '@/lib/store'
import { font, useTheme } from '@/lib/theme'
import { Bars, Donut, Legend, LineChart } from '@/ui/charts'
import { Icon, type IconName } from '@/ui/Icon'
import { Badge, Button, Card, Chip, Ic, IconBtn, Logo, Mark, Row, T } from '@/ui/kit'
import { KeyAvoid, KeyboardScroll } from '@/ui/KeyboardScroll'
import { Sheet } from '@/ui/Sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const STARTERS: [IconName, string][] = [
  ['pie', 'Where did my money go this week?'],
  ['target', 'Can I afford a ₦450k laptop in March?'],
  ['briefcase', 'How much did I pay staff last month?'],
  ['calendar', 'Remind me before my loan repayment'],
]
const SRC_ICON: Record<string, IconName> = { transactions: 'database', accounts: 'landmark', bills: 'receipt', loans: 'landmark', forecast: 'trendup', business: 'briefcase', payees: 'users', goals: 'target' }

// p07 Ask NURU, with the transfer (p16) and describe-a-payment (p18) cards.
export default function Ask() {
  const { c, dark } = useTheme()
  const { user, lang, t, toast } = useApp()
  const money = useMoney()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ q?: string }>()
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [thread, setThread] = useState('')
  const [pending, setPending] = useState<Pending | null>(null)
  const [focus, setFocus] = useState(false)
  const [declined, setDeclined] = useState<string[]>([])
  const [sources, setSources] = useState<Source[] | null>(null)
  const [history, setHistory] = useState<Thread[] | null>(null)
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null)
  const asked = useRef('')

  useEffect(() => { api<Pending>('/transactions/undescribed').then(setPending).catch(() => {}) }, [])
  useEffect(() => {
    if (params.q && asked.current !== params.q) { asked.current = params.q; router.setParams({ q: undefined }); send(params.q) }
  }, [params.q]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80) }, [msgs, busy])

  const now = () => new Date().toISOString()
  const say = (content: string, actions: ChatAction[] = []) => setMsgs((m) => [...m, { role: 'assistant', content, lang, at: now(), actions }])

  async function send(q = text) {
    q = q.trim()
    if (!q || busy) return
    setText('')
    setMsgs((m) => [...m, { role: 'user', content: q, lang, at: now() }])
    setBusy(true)
    try {
      const r = await api<ChatReply>('/chat', { body: { message: q, lang, thread } })
      if (r.thread) setThread(r.thread)
      setMsgs((m) => [...m, { role: 'assistant', content: r.answer, lang, at: now(), chart: r.chart, actions: r.actions, blocked: r.blocked, sources: r.sources }])
    } catch (e) {
      say((e as Error).message)
    } finally { setBusy(false) }
  }

  function offer(a: ChatAction) {
    setMsgs((m) => [...m,
      { role: 'user', content: 'Yes, send it for me', lang, at: now() },
      { role: 'assistant', content: 'Sure. Who should I send it to? Pick a saved payee or give me their bank and account number, and tell me what the payment is for.', lang, at: now(), actions: [{ kind: 'transfer', label: 'Send', amount: a.amount || undefined, new: true }] }])
  }

  function described(r: Described, id: string) {
    const left = r.count
    setPending({ items: r.items.filter((x) => x.id !== id), count: left })
    setFocus(false)
    const what = r.label && r.label !== 'Other' ? r.label.toLowerCase() : `"${r.purpose}"`
    say(`Saved. I will count it as ${what} from now on.` + (left ? ` ${left} more ${left === 1 ? 'payment needs' : 'payments need'} a description.` : ' Every recent payment is explained now.'), left ? [{ kind: 'describe', label: 'Describe the next one' }] : [])
  }

  async function openHistory() {
    try { setHistory(await api<Thread[]>('/chat/threads')) } catch (e) { toast((e as Error).message) }
  }
  async function openThread(id: string) {
    setHistory(null); setThread(id)
    try { setMsgs(await api<ChatMsg[]>('/chat?thread=' + id)) } catch (e) { toast((e as Error).message) }
  }

  const p = pending?.items[0]
  const showDescribe = !busy && p && (focus || msgs.length === 0)
  const last = msgs[msgs.length - 1]
  const followUps = last?.role === 'assistant' && !busy ? (last.chart ? ['Set a budget', 'Compare with last month', 'Show merchants'] : []) : []

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <Row between style={{ height: 56, paddingHorizontal: 20 }}>
        <IconBtn name="menu" label="Chat history" onPress={openHistory} />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <T v="h4">{t('ask')}</T>
          <T v="xs" tone="mu">Only answers about your money</T>
        </View>
        <IconBtn name="edit" label="New chat" onPress={() => { setMsgs([]); setThread('') }} />
      </Row>
      <KeyAvoid>
        <KeyboardScroll ref={scroll} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 12 }}>
          {msgs.length === 0 && !showDescribe && (
            <>
              <View style={{ alignItems: 'center', gap: 12, paddingTop: 20, paddingHorizontal: 8 }}>
                <Logo size={56} text={false} />
                <T v="h2" center>{t(greeting())}, {user?.name.split(' ')[0]}</T>
                <T v="s" tone="t2" center>Ask anything about your accounts, spending, loans or business. I only see data you have linked.</T>
              </View>
              <View style={{ gap: 10, marginTop: 12 }}>
                {(lang === 'en' ? STARTERS : suggestions[lang].slice(0, 4).map((s, i) => [STARTERS[i]?.[0] || 'message', s] as [IconName, string])).map(([ic, q]) => (
                  <Card key={q} pad={14} onPress={() => send(q)}>
                    <Row gap={12}>
                      <Ic name={ic} tone="red" size={36} r={11} iconSize={17} />
                      <T v="s" w={500} style={{ flex: 1 }}>{q}</T>
                      <Icon name="chevr" size={16} color={c.muted} />
                    </Row>
                  </Card>
                ))}
              </View>
              <Row center gap={6} style={{ marginTop: 8 }}><Icon name="lock" size={12} color={c.muted} /><T v="xs" tone="mu">Chats are encrypted and private to you</T></Row>
            </>
          )}

          {msgs.map((m, i) => m.role === 'user' ? (
            <View key={i} style={{ alignSelf: 'flex-end', maxWidth: 290, backgroundColor: c.red, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, borderBottomRightRadius: 6 }}>
              <T v="s" color="#FFFFFF" style={{ fontSize: 14, lineHeight: 20 }}>{m.content}</T>
            </View>
          ) : (
            <View key={i} style={{ gap: 8 }}>
              <AiBubble>{m.content}</AiBubble>
              {m.blocked === 'off_topic' && <View style={{ marginLeft: 36 }}><Badge icon="shield" label="Finance only" /></View>}
              {m.blocked && m.blocked !== 'off_topic' && <View style={{ marginLeft: 36 }}><Badge tone="red" icon="shieldcheck" label="Request blocked" /></View>}
              {m.chart && <ChartCard chart={m.chart} />}
              {m.actions?.filter((a) => a.kind === 'transfer').map((a, j) => <TransferCard key={j} action={a} onSent={(s) => say(s)} />)}
              {m.actions?.filter((a) => a.kind === 'reminder').map((a, j) => <ReminderCard key={j} action={a} onSet={(s) => say(s)} />)}
              {!!m.sources?.length && (
                <Pressable onPress={() => setSources(m.sources!)} style={{ marginLeft: 36, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Icon name="volume" size={16} color={c.muted} /><Icon name="copy" size={16} color={c.muted} /><Icon name="thumbup" size={16} color={c.muted} />
                  <T v="xs" tone="mu" lines={1} style={{ flex: 1, marginLeft: 4 }}>Source: {m.sources.map((s) => s.detail).join(', ')}</T>
                </Pressable>
              )}
              <Row gap={6} style={{ marginLeft: 36, flexWrap: 'wrap' }}>
                {m.actions?.filter((a) => a.kind === 'offer' && !declined.includes(m.at)).map((a) => (
                  <Row key="offer" gap={6}>
                    <Chip on label={`${a.label}${a.amount ? ` (${money(a.amount)})` : ''}`} onPress={() => { setDeclined((d) => [...d, m.at]); offer(a) }} />
                    <Chip label="Not now" onPress={() => setDeclined((d) => [...d, m.at])} />
                  </Row>
                ))}
                {m.actions?.filter((a) => !['transfer', 'reminder', 'offer'].includes(a.kind)).map((a) => (
                  <Chip key={a.label} label={a.label} onPress={() => a.kind === 'describe' ? setFocus(true) : a.kind === 'save' ? router.push({ pathname: '/send', params: { amount: String(a.amount || '') } }) : toast('Open this on the web app for now.')} />
                ))}
              </Row>
            </View>
          ))}

          {showDescribe && p && (
            <View style={{ gap: 12 }}>
              <AiBubble>{askLine(p, money)}</AiBubble>
              <DescribeCard key={p.id} item={p} onSaved={(r) => described(r, p.id)} />
              {msgs.length === 0 && <Row style={{ marginLeft: 36 }}><Chip label="Later" onPress={() => setPending(null)} /></Row>}
            </View>
          )}

          {busy && <AiBubble>…</AiBubble>}
          {msgs.length > 0 && <Row gap={6} style={{ marginLeft: 36 }}><Icon name="shieldcheck" size={14} color={c.muted} /><T v="xs" tone="mu">NURU never sends money without your PIN and face check</T></Row>}
        </KeyboardScroll>

        {followUps.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 8 }}>
            {followUps.map((f) => <Chip key={f} label={f} onPress={() => send(f)} />)}
          </ScrollView>
        )}
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg }}>
          <Row gap={8}>
            <View style={{ flex: 1, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: c.border, backgroundColor: dark ? c.surface : c.bg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 }}>
              <TextInput value={text} onChangeText={setText} onSubmitEditing={() => send()} returnKeyType="send" placeholder={t('askPlaceholder')} placeholderTextColor={c.muted}
                style={[{ flex: 1, height: '100%', fontSize: 15, fontFamily: font[400], color: c.text }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]} />
              <Badge label={lang.toUpperCase()} />
            </View>
            <IconBtn size={48} name={text.trim() ? 'send' : 'mic'} color="#FFFFFF" bg={c.red} label={text.trim() ? 'Send' : 'Voice'}
              onPress={() => (text.trim() ? send() : toast('Voice input arrives with the store build. Type your question for now.'))} />
          </Row>
        </View>
      </KeyAvoid>

      <Sheet open={!!sources} onClose={() => setSources(null)}>
        <T v="h3">How NURU got this answer</T>
        {sources?.map((s) => (
          <Row key={s.type + s.detail} gap={12}>
            <Ic name={SRC_ICON[s.type] || 'database'} size={36} r={11} iconSize={17} />
            <View style={{ flex: 1, gap: 4 }}><T v="s" w={600}>{s.label}</T><T v="xs" tone="mu">{s.detail}</T></View>
          </Row>
        ))}
        <Card flat style={{ backgroundColor: c.surface, borderColor: 'transparent' }} pad={14}>
          <Row gap={10}><Icon name="info" size={18} color={c.muted} /><T v="xs" tone="t2" style={{ flex: 1 }}>NURU reads only data you linked. It does not use your chats to train AI models.</T></Row>
        </Card>
        <Button label="Close" variant="sec" onPress={() => setSources(null)} />
      </Sheet>

      <Sheet open={!!history} onClose={() => setHistory(null)} scroll>
        <T v="h3">Chats</T>
        <Row gap={8}><Icon name="lock" size={12} color={c.muted} /><T v="xs" tone="mu">Encrypted. Only you can read these.</T></Row>
        {history?.length === 0 && <T v="s" tone="t2">No saved chats yet.</T>}
        {history?.map((h) => (
          <Pressable key={h.id} onPress={() => openThread(h.id)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 4 }}>
            <Ic name="message" size={36} r={11} iconSize={17} />
            <View style={{ flex: 1, gap: 4 }}><T v="s" w={600} lines={1}>{h.title}</T><T v="xs" tone="mu">{when(h.at)} · {h.messages} messages</T></View>
          </Pressable>
        ))}
      </Sheet>
    </View>
  )
}

function AiBubble({ children }: { children: string }) {
  const { c, dark } = useTheme()
  return (
    <Row gap={8} style={{ alignItems: 'flex-end' }}>
      <Mark />
      <View style={{ maxWidth: 290, flexShrink: 1, backgroundColor: dark ? c.surface2 : c.surface, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, borderBottomLeftRadius: 6 }}>
        <T v="s" style={{ fontSize: 14, lineHeight: 20 }}>{children}</T>
      </View>
    </Row>
  )
}

function ChartCard({ chart }: { chart: NonNullable<ChatMsg['chart']> }) {
  const money = useMoney()
  const vals = chart.series[0]?.values || []
  return (
    <Card flat pad={12} style={{ marginLeft: 36, gap: 8 }}>
      <T v="xs" tone="mu">{chart.title}</T>
      {chart.type === 'donut' ? (
        <Row gap={12}>
          <Donut values={vals} size={96} sw={14} />
          <View style={{ flex: 1 }}><Legend items={chart.labels.slice(0, 5).map((l, i) => [l, money(vals[i] || 0, { compact: true })])} /></View>
        </Row>
      ) : chart.type === 'line' ? <LineChart values={vals} labels={[chart.labels[0], chart.labels[chart.labels.length - 1]]} h={80} />
        : <>
          <Bars values={vals} labels={chart.labels.map((l) => l.length > 6 ? l.slice(0, 5) + '…' : l)} hi={vals.indexOf(Math.max(...vals))} h={80} rx={4} />
          <View style={{ gap: 6 }}>{chart.labels.slice(0, 3).map((l, i) => <Row key={l} between><T v="s">{l}</T><T v="s" w={700} num>{money(vals[i] || 0)}</T></Row>)}</View>
        </>}
    </Card>
  )
}
