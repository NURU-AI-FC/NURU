// p21 NURU voice assistant. Opens full screen from a double tap on the main
// tabs, a two-finger double tap (VoiceOver's magic tap), or the deep link
// nuru://assistant (Back Tap or a home-screen shortcut). NURU greets the user,
// listens, stops when they pause, answers in text and by voice, then listens
// again so they can ask follow-ups hands-free.
import { Redirect, router, Stack } from 'expo-router'
import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Easing, Platform, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api, type ChatReply, type Lang } from '@/lib/api'
import { useApp } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { ASK_RECORDING, speak, stopSpeaking, transcribe, watchSilence } from '@/lib/voice'
import { Icon } from '@/ui/Icon'
import { Button, IconBtn, Mark, Row, T } from '@/ui/kit'

type Phase = 'greet' | 'listen' | 'hear' | 'think' | 'speak' | 'idle'

export default function AssistantRoute() {
  const { user, ready } = useApp()
  if (!ready) return null
  if (!user) return <Redirect href="/welcome" />
  return (
    <>
      <Stack.Screen options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <Assistant />
    </>
  )
}

function Assistant() {
  const { c, dark } = useTheme()
  const { lang, t } = useApp()
  const insets = useSafeAreaInsets()
  const recorder = useAudioRecorder(ASK_RECORDING)
  const [phase, setPhaseState] = useState<Phase>('greet')
  const [asked, setAsked] = useState('')
  const [answer, setAnswer] = useState('')
  const [note, setNote] = useState('')
  const [more, setMore] = useState(false) // the answer needs the full chat (a transfer, a reminder)
  const phase$ = useRef<Phase>('greet')
  const alive = useRef(true)
  const recording = useRef(false)
  const unwatch = useRef<(() => void) | null>(null)
  const cap = useRef<ReturnType<typeof setTimeout> | null>(null)
  const thread = useRef('')
  const pulse = useRef(new Animated.Value(0)).current

  const setPhase = (p: Phase) => { phase$.current = p; setPhaseState(p) }

  useEffect(() => {
    if (phase !== 'listen' && phase !== 'speak') { pulse.stopAnimation(); pulse.setValue(0); return }
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: phase === 'listen' ? 1200 : 900, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }))
    loop.start()
    return () => loop.stop()
  }, [phase, pulse])

  // greet by voice, then start listening straight away
  useEffect(() => {
    alive.current = true
    speak(`${t('assistantTitle')}. ${t('assistantAsk')}`, lang, () => { if (phase$.current === 'greet') listen() }, { force: true }).catch(() => listen())
    // if the voice never reports back, do not leave the user waiting
    const fallback = setTimeout(() => { if (phase$.current === 'greet') listen() }, 12000)
    return () => { clearTimeout(fallback); alive.current = false; shutDown() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function shutDown() {
    stopSpeaking()
    unwatch.current?.(); unwatch.current = null
    if (cap.current) { clearTimeout(cap.current); cap.current = null }
    if (recording.current) {
      recording.current = false
      recorder.stop().catch(() => {})
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {})
    }
  }

  async function listen() {
    if (!alive.current || recording.current) return
    stopSpeaking()
    setNote('')
    setPhase('listen')
    try {
      const perm = await requestRecordingPermissionsAsync()
      if (!alive.current) return
      if (!perm.granted) {
        setPhase('idle')
        setNote(perm.canAskAgain === false ? 'Turn on the microphone for NURU in your phone settings.' : 'NURU needs the microphone to hear you.')
        return
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      await recorder.prepareToRecordAsync()
      if (!alive.current) return
      recorder.record()
      recording.current = true
      // send about 1.2 s after they stop talking; pause if nobody speaks for 8 s
      unwatch.current = watchSilence(recorder, () => finish(), { giveUpMs: 8000, onNothing: () => finish(true) })
      cap.current = setTimeout(() => finish(), 60000)
    } catch {
      setPhase('idle')
      setNote('Could not start the microphone. Try again.')
    }
  }

  async function finish(nothing = false) {
    if (!recording.current) return
    recording.current = false
    unwatch.current?.(); unwatch.current = null
    if (cap.current) { clearTimeout(cap.current); cap.current = null }
    setPhase(nothing ? 'idle' : 'hear')
    try {
      await recorder.stop()
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {})
      if (!alive.current) return
      if (nothing) { setNote(t('assistantPaused')); return }
      const uri = recorder.uri
      if (!uri) throw new Error('Could not hear that, try again')
      const heard = await transcribe(uri, lang)
      if (!alive.current) return
      setAsked(heard)
      await ask(heard)
    } catch (e) {
      if (!alive.current) return
      setPhase('idle')
      setNote((e as Error).message || 'Could not hear that, try again')
    }
  }

  async function ask(q: string) {
    setPhase('think')
    setAnswer('')
    setMore(false)
    try {
      const r = await api<ChatReply>('/chat', { body: { message: q, lang, thread: thread.current } })
      if (!alive.current) return
      if (r.thread) thread.current = r.thread
      setAnswer(r.answer)
      setMore(!!r.actions?.some((a) => a.kind === 'transfer' || a.kind === 'reminder' || a.kind === 'offer'))
      setPhase('speak')
      const l: Lang = r.lang || lang
      // when the answer has been read, listen for a follow-up
      speak(r.answer, l, () => { if (alive.current && phase$.current === 'speak') listen() }, { force: true }).catch(() => listen())
    } catch (e) {
      if (!alive.current) return
      setPhase('idle')
      setNote((e as Error).message)
    }
  }

  // the big circle: stop and send while listening, skip while speaking, ask again when paused
  function tapOrb() {
    const p = phase$.current
    if (p === 'listen') finish()
    else if (p === 'speak' || p === 'greet' || p === 'idle') { stopSpeaking(); listen() }
  }

  function close() {
    alive.current = false
    shutDown()
    if (router.canGoBack()) router.back()
    else router.replace('/home')
  }

  function openChat() {
    alive.current = false
    shutDown()
    router.replace({ pathname: '/ask', params: thread.current ? { thread: thread.current } : {} })
  }

  const label = { greet: t('assistantSpeaking'), listen: t('listening'), hear: 'Getting your words…', think: t('assistantThinking'), speak: t('assistantSpeaking'), idle: note || t('assistantPaused') }[phase]
  const orbLabel = phase === 'listen' ? 'Stop listening and send' : phase === 'speak' || phase === 'greet' ? 'Stop speaking and ask' : 'Ask NURU'
  const ring = (to: number) => ({
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, to] }) }],
  })

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <Row between style={{ paddingHorizontal: 20, paddingVertical: 10 }}>
        <Row gap={8}><Mark /><T v="s" w={600} style={{ fontSize: 15 }}>NURU voice</T></Row>
        <IconBtn name="x" label="Close NURU voice" onPress={close} />
      </Row>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16, flexGrow: 1 }}>
        <View style={{ alignItems: 'center', gap: 8, marginTop: 20 }}>
          <T v="h1" center style={{ fontSize: 26, lineHeight: 32 }}>{t('assistantTitle')}</T>
          <T v="s" tone="mu" center style={{ maxWidth: 310 }}>{asked ? 'Ask a follow-up, I listen again after I finish.' : t('assistantAsk')}</T>
        </View>

        <View style={{ alignItems: 'center', justifyContent: 'center', height: 220 }}>
          <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: c.red, opacity: 0.08 }} />
          <View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: c.red, opacity: 0.14 }} />
          {(phase === 'listen' || phase === 'speak') && (
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: 104, height: 104, borderRadius: 52, backgroundColor: c.red }, ring(1.9)]} />
          )}
          <Pressable accessibilityRole="button" accessibilityLabel={orbLabel} onPress={tapOrb} hitSlop={20}
            style={({ pressed }) => ({ width: 104, height: 104, borderRadius: 52, backgroundColor: c.red, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
            {phase === 'hear' || phase === 'think'
              ? <ActivityIndicator color="#FFFFFF" />
              : <Icon name={phase === 'speak' || phase === 'greet' ? 'volume' : 'mic'} size={36} color="#FFFFFF" />}
          </Pressable>
        </View>

        <View style={{ alignItems: 'center', gap: 6 }}>
          <View accessibilityLiveRegion="polite" style={{ backgroundColor: c.red50, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 6, maxWidth: 320 }}>
            <T v="s" w={600} tone="rd" center>{label}</T>
          </View>
          {phase === 'listen' && <T v="xs" tone="mu">{t('assistantHint')}</T>}
        </View>

        {!!asked && (
          <View style={{ alignSelf: 'flex-end', maxWidth: 290, backgroundColor: c.red, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, borderBottomRightRadius: 6 }}>
            <T v="s" color="#FFFFFF" style={{ fontSize: 14, lineHeight: 20 }}>{asked}</T>
          </View>
        )}
        {!!answer && (
          <View style={{ alignSelf: 'flex-start', maxWidth: 320, backgroundColor: dark ? c.surface2 : c.surface, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, borderBottomLeftRadius: 6 }}>
            <T v="s" style={{ fontSize: 14, lineHeight: 20 }}>{answer}</T>
          </View>
        )}
        {more && <Button sm variant="sec" icon="message" label="Finish this in Ask NURU" onPress={openChat} style={{ alignSelf: 'flex-start' }} />}
      </ScrollView>

      <Row gap={12} style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 14, borderTopWidth: 1, borderTopColor: c.border }}>
        {phase === 'listen'
          ? <Button grow variant="sec" label="Stop listening" onPress={() => finish()} />
          : phase === 'speak' || phase === 'greet'
            ? <Button grow variant="sec" label="Stop speaking" onPress={() => { stopSpeaking(); setPhase('idle'); setNote('') }} />
            : <Button grow variant="sec" icon="mic" label="Ask again" disabled={phase !== 'idle'} onPress={listen} />}
        <Button grow label="Close" onPress={close} />
      </Row>
    </View>
  )
}
