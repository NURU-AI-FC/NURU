// Every transfer passes through TransferGuard (p16 and p08). The first time,
// the customer creates a 4 digit PIN and enrols their face; after that each
// transfer needs a face match and the PIN, checked on the server.
//
// The face step is a placeholder on mobile: it sends the same sandbox face
// template the web app uses when no camera is available. A store build would
// swap it for a native face SDK (or a liveness vendor) without changing the API.
import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Linking, View } from 'react-native'
import { api, ApiError, type Receipt, type Security } from '@/lib/api'
import { useApp, useMoney } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { Icon } from '@/ui/Icon'
import { Button, Card, Chip, Divider, KV, Row, Soft, T } from '@/ui/kit'
import { applyKey, Keypad, PinBoxes } from '@/ui/PinPad'
import { Sheet } from '@/ui/Sheet'

export type Draft = { from: string; payeeId?: string; toName: string; toBank?: string; toAccount?: string; amount: number; note?: string }
type Step = 'load' | 'create' | 'confirm' | 'enrol' | 'verify' | 'pin' | 'sending' | 'locked' | 'error' | 'risk' | 'stopped'
type Risk = { risk: string[]; to: string; bank?: string; amount: number }

export const SUPPORT_TEL = 'tel:+23412787000'
const DEMO_FACE = Array.from({ length: 128 }, (_, i) => Math.round(Math.sin(i * 1.7) * 1000) / 10000)

function Steps({ n }: { n: number }) {
  const { c } = useTheme()
  return (
    <Row gap={6}>
      {['PIN', 'Face', 'Send'].map((t, i) => (
        <View key={t} style={{ flex: 1, gap: 6 }}>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: i < n ? c.red : c.surface2 }} />
          <T v="xs" w={i < n ? 600 : 400} tone={i < n ? 'text' : 'mu'}>{t}</T>
        </View>
      ))}
    </Row>
  )
}

export function TransferGuard({ open, draft, onDone, onClose }: { open: boolean; draft: Draft; onDone: (r: Receipt) => void; onClose: () => void }) {
  const { c } = useTheme()
  const money = useMoney()
  const { refresh } = useApp()
  const [step, setStep] = useState<Step>('load')
  const [first, setFirst] = useState(false)
  const [pin, setPin] = useState('')
  const [pin1, setPin1] = useState('')
  const [msg, setMsg] = useState('')
  const [sec, setSec] = useState<Security | null>(null)
  const [risk, setRisk] = useState<Risk | null>(null)
  const [failKind, setFailKind] = useState<'face' | 'pin'>('face')
  // set when the customer confirms the scam warning; they still prove it is them again
  const confirmed = useRef(false)

  useEffect(() => {
    if (!open) return
    setStep('load'); setPin(''); setPin1(''); setMsg(''); confirmed.current = false
    api<Security>('/me/security').then((s) => {
      setSec(s)
      if (s.locked_until && new Date(s.locked_until) > new Date()) return setStep('locked')
      setFirst(!s.has_pin || !s.face_enrolled)
      setStep(!s.has_pin ? 'create' : !s.face_enrolled ? 'enrol' : 'verify')
    }).catch((e) => { setMsg((e as Error).message); setStep('error') })
  }, [open])

  // PIN entry completes on the fourth digit.
  useEffect(() => {
    if (pin.length !== 4) return
    const p = pin
    const id = setTimeout(() => {
      setPin('')
      if (step === 'create') {
        if (/^(\d)\1{3}$/.test(p) || p === '1234') { setMsg('Pick something harder to guess than ' + p); return }
        setPin1(p); setMsg(''); setStep('confirm')
      } else if (step === 'confirm') savePin(p)
      else if (step === 'pin') send(p)
    }, 150)
    return () => clearTimeout(id)
  }, [pin]) // eslint-disable-line react-hooks/exhaustive-deps

  async function savePin(p: string) {
    if (p !== pin1) { setMsg('The PINs did not match. Start again.'); setPin1(''); setStep('create'); return }
    try { await api('/me/pin', { body: { pin: p } }); refresh(); setMsg(''); setStep(sec?.face_enrolled ? 'verify' : 'enrol') } catch (e) { setMsg((e as Error).message); setStep('create') }
  }

  async function enrolled() {
    try { await api('/me/face', { body: { descriptor: DEMO_FACE } }); setStep('pin') } catch (e) { setMsg((e as Error).message); setStep('error') }
  }

  async function send(p: string) {
    const confirmRisk = confirmed.current
    setStep('sending')
    try {
      const r = await api<Receipt>('/transfers', { body: { ...draft, pin: p, face: DEMO_FACE, confirmRisk } })
      onDone(r)
    } catch (e) {
      const err = e as ApiError
      setMsg(err.message)
      if (err.status === 409 && Array.isArray(err.data.risk)) { setRisk(err.data as unknown as Risk); setStep('risk'); return }
      if (err.status === 423 || /paused/.test(err.message)) { setStep('locked'); return }
      if (err.status === 403) {
        setFailKind(/PIN/i.test(err.message) ? 'pin' : 'face')
        api<Security>('/me/security').then(setSec).catch(() => {})
        setStep('stopped')
        return
      }
      setStep('error')
    }
  }

  const confirmAgain = () => { confirmed.current = true; setMsg(''); setStep('verify') }
  const retry = () => { setMsg(''); setStep('verify') }
  const summary = `Sending ${money(draft.amount)} to ${draft.toName}${draft.toBank ? `, ${draft.toBank}` : ''}`
  const pad = <Keypad boxed onKey={(k) => setPin((x) => applyKey(x, k, 4))} />

  return (
    <Sheet open={open} onClose={onClose} scroll>
      {step === 'load' && <T tone="t2" center>Checking your security settings…</T>}

      {step === 'create' && <>
        <Steps n={1} />
        <View style={{ gap: 6 }}>
          <T v="h2">Create your transaction PIN</T>
          <T v="s" tone="t2">This is your first transfer with NURU. Choose 4 digits you will use every time money leaves your account.</T>
        </View>
        <PinBoxes n={pin.length} />
        {msg ? <T v="xs" tone="rd" center>{msg}</T> : <T v="xs" tone="mu" center>Avoid 1234, your birthday or repeated digits</T>}
        {pad}
      </>}

      {step === 'confirm' && <>
        <Steps n={1} />
        <View style={{ gap: 6 }}>
          <T v="h2">Enter it again</T>
          <T v="s" tone="t2">So we know you remember it. It is stored hashed, never as the digits.</T>
        </View>
        <PinBoxes n={pin.length} />
        {pad}
      </>}

      {(step === 'enrol' || step === 'verify') && <>
        {(first || step === 'enrol') && <Steps n={2} />}
        <FaceCheck mode={step} summary={step === 'verify' ? summary : undefined} onDone={step === 'enrol' ? enrolled : () => setStep('pin')} />
        {!!msg && <T v="xs" tone="rd" center>{msg}</T>}
      </>}

      {step === 'pin' && <>
        {first && <Steps n={3} />}
        <Row gap={12}>
          <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: c.green, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="scanface" size={34} color={c.green} />
          </View>
          <View style={{ gap: 4, flex: 1 }}>
            <T v="h3">{first ? 'Face enrolled' : 'Face captured'}</T>
            <T v="xs" tone="mu">{first ? 'Saved as an encrypted template' : 'It is matched on the server when you send'}</T>
          </View>
        </Row>
        <Divider />
        <View style={{ gap: 6 }}>
          <T v="h3">Enter your PIN</T>
          <T v="s" tone="t2">{summary}</T>
        </View>
        <PinBoxes n={pin.length} />
        {pad}
      </>}

      {step === 'sending' && <View style={{ paddingVertical: 32, gap: 12, alignItems: 'center' }}><Icon name="shieldcheck" size={40} color={c.red} /><T tone="t2" center>Checking your face and PIN, then sending…</T></View>}

      {(step === 'locked' || step === 'error' || step === 'stopped') && <>
        <View style={{ alignItems: 'center', gap: 12, paddingTop: 8 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.red50, alignItems: 'center', justifyContent: 'center' }}><Icon name="shield" size={34} color={c.red} /></View>
          <T v="h2" center>{step === 'locked' ? 'Transfers paused' : 'Transfer stopped'}</T>
          <T v="s" tone="t2" center>
            {step === 'locked' ? (msg || `After 3 failed checks transfers pause for 30 minutes.`)
              : step === 'stopped' ? `${failKind === 'face' ? 'The face did not match your enrolment.' : 'That PIN was not correct.'} Nothing was sent. After 3 tries transfers pause for 30 minutes and we alert you by SMS.`
              : `${msg}. Nothing was sent.`}
          </T>
        </View>
        {step === 'stopped' && (
          <Soft style={{ gap: 6 }}>
            <KV k="Tries left" v={<T v="s" w={700}>{sec ? `${sec.tries_left} of 3` : '…'}</T>} />
            <KV k="Logged as" v={<T v="s" w={700}>Security event</T>} />
          </Soft>
        )}
        {step === 'locked' ? <Button label="Close" variant="sec" onPress={onClose} /> : <>
          <Button label="Try again" onPress={retry} />
          {step === 'stopped' ? <Button label="Call Zenith support" variant="sec" icon="phone" onPress={() => Linking.openURL(SUPPORT_TEL)} /> : <Button label="Cancel" variant="sec" onPress={onClose} />}
        </>}
      </>}

      {step === 'risk' && risk && <>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: c.red50, alignItems: 'center', justifyContent: 'center' }}><Icon name="shield" size={34} color={c.red} /></View>
          <T v="h2" center>We paused this transfer</T>
          <T v="s" tone="t2" center>This looks like a scam pattern we see often. Your money has not left your account.</T>
        </View>
        <Card flat style={{ gap: 10 }}>
          <KV k="To" v={`${risk.to}${risk.bank ? ' · ' + risk.bank : ''}`} />
          <KV k="Amount" v={<T v="s" w={700} num>{money(risk.amount)}</T>} />
          <Divider />
          {risk.risk.map((r) => <Row key={r} gap={8}><Icon name="alert" size={16} color={c.red} /><T v="s" style={{ flex: 1 }}>{r}</T></Row>)}
        </Card>
        <Soft><Row gap={10}><Icon name="info" size={18} color={c.muted} /><T v="xs" tone="t2" style={{ flex: 1 }}>Zenith staff will never ask you to move money to a &quot;safe account&quot;.</T></Row></Soft>
        <Button label="Cancel transfer" onPress={onClose} />
        <Button label="I know this person. Confirm with my face and PIN" variant="ghost" onPress={confirmAgain} />
      </>}
    </Sheet>
  )
}

/** Placeholder face check: an oval frame with a scanning line (p08 "06 Face step-up", p16 "04 Enrol face"). */
function FaceCheck({ mode, summary, onDone }: { mode: 'enrol' | 'verify'; summary?: string; onDone: () => void }) {
  const { c } = useTheme()
  const y = useRef(new Animated.Value(0)).current
  const [stage, setStage] = useState(0)
  const [done, setDone] = useState(false)
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(y, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.timing(y, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]))
    loop.start()
    const steps = mode === 'enrol' ? 3 : 1
    const timers = Array.from({ length: steps }, (_, i) => setTimeout(() => setStage(i + 1), 900 * (i + 1)))
    const end = setTimeout(() => { setDone(true); loop.stop() }, 900 * steps + 300)
    const fire = setTimeout(onDone, 900 * steps + 900)
    return () => { loop.stop(); timers.forEach(clearTimeout); clearTimeout(end); clearTimeout(fire) }
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps
  const top = y.interpolate({ inputRange: [0, 1], outputRange: [40, 200] })
  return (
    <View style={{ alignItems: 'center', gap: 14 }}>
      <T v="h3" center>{mode === 'enrol' ? 'Hold still and look at the camera' : 'Look at the camera'}</T>
      {summary ? <T v="s" tone="t2" center>{summary}</T> : null}
      <View style={{ width: 200, height: 250, borderRadius: 100, borderWidth: 4, borderColor: done ? c.green : c.red, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Icon name="scanface" size={80} color={done ? c.green : c.muted} stroke={1.4} />
        {!done && <Animated.View style={{ position: 'absolute', left: 18, right: 18, top, height: 3, borderRadius: 2, backgroundColor: c.red }} />}
      </View>
      {mode === 'enrol' ? (
        <Row gap={8}>{['Look ahead', 'Turn left', 'Blink'].map((t, i) => <Chip key={t} label={t} on={stage > i} icon={stage > i ? 'check' : undefined} />)}</Row>
      ) : (
        <Row gap={8}><Chip label={done ? 'Face captured' : 'Checking face…'} on={done} icon={done ? 'check' : undefined} /></Row>
      )}
      <T v="xs" tone="t2" center>We save a face template, not a photo, encrypted on Zenith servers. It is only used to confirm it is you before money moves.</T>
      <Row gap={6}><Icon name="info" size={12} color={c.muted} /><T v="xs" tone="mu">Sandbox face check: a native face SDK replaces this in the store build.</T></Row>
    </View>
  )
}
