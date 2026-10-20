import { useLocalSearchParams, router } from 'expo-router'
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Easing, Platform, Pressable, ScrollView, TextInput, View } from 'react-native'
import { MenuButton } from '@/components/Drawer'
import { askLine, DescribeCard, ReminderCard, TransferCard, type Described } from '@/components/ChatCards'
import { suggestions } from '@/i18n'
import { api, type ChatAction, type ChatMsg, type ChatReply, type Lang, type Pending, type Source, type Thread } from '@/lib/api'
import { greeting, when } from '@/lib/format'
import { useApp, useMoney } from '@/lib/store'
import { font, useTheme } from '@/lib/theme'
import { Bars, Donut, Legend, LineChart } from '@/ui/charts'
import { Icon, type IconName } from '@/ui/Icon'
import { Badge, Button, Card, Chip, Ic, IconBtn, Logo, Mark, Row, T } from '@/ui/kit'
import { KeyAvoid, KeyboardScroll } from '@/ui/KeyboardScroll'
import { Sheet } from '@/ui/Sheet'
import { readAloudOn, setReadAloud, speak, stopSpeaking, transcribe } from '@/lib/voice'
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
  const params = useLocalSearchParams<{ q?: string; thread?: string; new?: string }>()
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
  // voice: tap the mic to record, tap again to stop and send
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const [rec, setRec] = useState<'idle' | 'starting' | 'recording' | 'hearing'>('idle')
  const [secs, setSecs] = useState(0)
  // which message is being read aloud (its time stamp), so a second tap on it stops it
  const [speaking, setSpeaking] = useState<string | null>(null)
  // speaker switch: when on, NURU speaks every answer in the language it answered in
  const [talk, setTalk] = useState(true)
  useEffect(() => { readAloudOn().then(setTalk).catch(() => {}) }, [])
  const tick = useRef<ReturnType<typeof setInterval> | null>(null)
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (rec !== 'recording') { pulse.stopAnimation(); pulse.setValue(0); return }
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }))
    loop.start()
    return () => loop.stop()
  }, [rec, pulse])
  useEffect(() => () => { if (tick.current) clearInterval(tick.current); stopSpeaking() }, [])
  // stop on its own after a minute so a forgotten recording does not run on
  useEffect(() => { if (rec === 'recording' && secs >= 60) stopRecording() }, [secs, rec]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { api<Pending>('/transactions/undescribed').then(setPending).catch(() => {}) }, [])
  useEffect(() => {
    if (params.q && asked.current !== params.q) { asked.current = params.q; router.setParams({ q: undefined }); send(params.q) }
  }, [params.q]) // eslint-disable-line react-hooks/exhaustive-deps
  // the side menu opens a recent chat or starts a new one
  useEffect(() => {
    if (params.thread) { const id = params.thread; router.setParams({ thread: undefined }); openThread(id) }
  }, [params.thread]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (params.new) { router.setParams({ new: undefined }); setMsgs([]); setThread('') }
  }, [params.new])
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
      // the API answers in the language the question was written or spoken in
      const l = r.lang || lang
      const at = now()
      setMsgs((m) => [...m, { role: 'assistant', content: r.answer, lang: l, at, chart: r.chart, actions: r.actions, blocked: r.blocked, sources: r.sources }])
      if (talk && r.answer) readAloud(r.answer, l, at)
    } catch (e) {
      say((e as Error).message)
    } finally { setBusy(false) }
  }

  function readAloud(s: string, l: Lang, key: string) {
    setSpeaking(key)
    const done = () => setSpeaking((k) => (k === key ? null : k))
    speak(s, l, done, { force: true }).catch(done)
  }
  function quiet() { stopSpeaking(); setSpeaking(null) }
  function toggleTalk() {
    const on = !talk
    setTalk(on)
    if (!on) quiet()
    setReadAloud(on)
    toast(on ? 'NURU will speak its answers' : 'NURU will answer in text only')
  }

  async function startRecording() {
    if (rec !== 'idle' || busy) return
    quiet()
    setRec('starting')
    try {
      const perm = await requestRecordingPermissionsAsync()
      if (!perm.granted) {
        setRec('idle')
        toast(perm.canAskAgain === false ? 'Turn on the microphone for NURU in your phone settings.' : 'NURU needs the microphone to hear you.')
        return
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      await recorder.prepareToRecordAsync()
      recorder.record()
      setSecs(0)
      tick.current = setInterval(() => setSecs((n) => n + 1), 1000)
      setRec('recording')
    } catch {
      setRec('idle')
      toast('Could not start the microphone. Try again.')
    }
  }

  async function stopRecording(cancel = false) {
    if (rec !== 'recording') return
    if (tick.current) { clearInterval(tick.current); tick.current = null }
    setRec(cancel ? 'idle' : 'hearing')
    try {
      await recorder.stop()
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {})
      if (cancel) return
      const uri = recorder.uri
      if (!uri || secs < 1) { toast('Hold on a little longer, then tap stop.'); return }
      const heard = await transcribe(uri, lang)
      setText(heard)
      setRec('idle')
      await send(heard)
    } catch (e) {
      toast((e as Error).message || 'Could not hear that, try again')
    } finally { setRec('idle') }
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
        <MenuButton />
        <View style={{ alignItems: 'center', gap: 2, flex: 1 }}>
          <T v="h4">{t('ask')}</T>
          <T v="xs" tone="mu">Only answers about your money</T>
        </View>
        <Row gap={8}>
          <IconBtn name={talk ? 'volume' : 'volumeoff'} label={talk ? 'Turn off spoken answers' : 'Turn on spoken answers'} onPress={toggleTalk} />
          <IconBtn name="history" label="Chat history" onPress={openHistory} />
          <IconBtn name="edit" label="New chat" onPress={() => { setMsgs([]); setThread('') }} />
        </Row>
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
                <Row gap={6} style={{ marginLeft: 36 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={speaking === m.at ? "Stop reading" : "Read aloud"} hitSlop={8} onPress={() => (speaking === m.at ? quiet() : readAloud(m.content, m.lang, m.at))}>
                    <Icon name={speaking === m.at ? 'stop' : 'volume'} size={16} color={speaking === m.at ? c.red : c.muted} />
                  </Pressable>
                  <Pressable onPress={() => setSources(m.sources!)} style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <Icon name="copy" size={16} color={c.muted} /><Icon name="thumbup" size={16} color={c.muted} />
                    <T v="xs" tone="mu" lines={1} style={{ flex: 1, marginLeft: 4 }}>Source: {m.sources.map((s) => s.detail).join(', ')}</T>
                  </Pressable>
                </Row>
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

        {!!speaking && (
          <Row center style={{ paddingBottom: 8 }}>
            <Chip icon="volume" label="Reading aloud · Stop" onPress={quiet} />
          </Row>
        )}
        {followUps.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 8 }}>
            {followUps.map((f) => <Chip key={f} label={f} onPress={() => send(f)} />)}
          </ScrollView>
        )}
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg }}>
          <Row gap={8}>
            {rec === 'recording' || rec === 'hearing' ? (
              <View style={{ flex: 1, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: c.red, backgroundColor: c.red50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 }}>
                {rec === 'recording' ? (
                  <>
                    <View style={{ width: 12, height: 12, alignItems: 'center', justifyContent: 'center' }}>
                      <Animated.View style={{ position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: c.red, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }] }} />
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.red }} />
                    </View>
                    <T v="s" w={600} tone="rd" style={{ flex: 1 }}>Listening · {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</T>
                    <Pressable accessibilityRole="button" accessibilityLabel="Cancel recording" hitSlop={8} onPress={() => stopRecording(true)}>
                      <Icon name="x" size={18} color={c.text2} />
                    </Pressable>
                  </>
                ) : (
                  <>
                    <ActivityIndicator size="small" color={c.red} />
                    <T v="s" w={600} tone="rd" style={{ flex: 1 }}>Getting your words…</T>
                  </>
                )}
              </View>
            ) : (
              <View style={{ flex: 1, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: c.border, backgroundColor: dark ? c.surface : c.bg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 }}>
                <TextInput value={text} onChangeText={setText} onSubmitEditing={() => send()} returnKeyType="send" placeholder={t('askPlaceholder')} placeholderTextColor={c.muted}
                  style={[{ flex: 1, height: '100%', fontSize: 15, fontFamily: font[400], color: c.text }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]} />
                <Badge label={lang.toUpperCase()} />
              </View>
            )}
            <View>
              {rec === 'recording' && (
                <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: 48, height: 48, borderRadius: 24, backgroundColor: c.red, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }] }} />
              )}
              <IconBtn size={48} color="#FFFFFF" bg={c.red}
                name={rec === 'recording' ? 'stop' : text.trim() && rec === 'idle' ? 'send' : 'mic'}
                label={rec === 'recording' ? 'Stop recording and send' : text.trim() ? 'Send' : 'Ask by voice'}
                onPress={() => (rec === 'recording' ? stopRecording() : rec !== 'idle' ? undefined : text.trim() ? send() : startRecording())} />
            </View>
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
