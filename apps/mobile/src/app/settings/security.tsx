import { useState } from 'react'
import { View } from 'react-native'
import { FaceCam } from '@/components/FaceCam'
import { api } from '@/lib/api'
import { when } from '@/lib/format'
import { useApp } from '@/lib/store'
import { BANK } from '@/lib/bank'
import { useLoad } from '@/lib/useLoad'
import { Icon } from '@/ui/Icon'
import { Badge, Button, Ic, Label, ListRow, Row, Screen, T, Toggle, TopBar } from '@/ui/kit'
import { applyKey, Keypad, PinBoxes } from '@/ui/PinPad'
import { Sheet } from '@/ui/Sheet'
import { useTheme } from '@/lib/theme'

type Overview = { has_pin: boolean; face_enrolled: boolean; kyc_verified: boolean; pin_changed_at: string | null; password_changed_at: string; active_sessions: number; login_alerts: boolean; frozen_until?: string }
type Session = { id: string; device: string; ip: string; created_at: string; last_seen_at: string; revoked_at: string | null; current: boolean }

// p12 "05 Security": sign in, transfers (PIN, face check), devices, freeze.
export default function Security() {
  const { c } = useTheme()
  const { t, toast, user, refresh } = useApp()
  const { data: o, reload } = useLoad<Overview>('/me/security/overview')
  const { data: sessions, reload: reloadSessions } = useLoad<Session[]>('/me/sessions')
  const [pinStep, setPinStep] = useState<'' | 'current' | 'new' | 'face'>('')
  const [cur, setCur] = useState('')
  const [pin, setPin] = useState('')
  const [devices, setDevices] = useState(false)
  const [freeze, setFreeze] = useState(false)
  const [faceOpen, setFaceOpen] = useState(false)
  const [facePin, setFacePin] = useState('') // replacing an enrolled face needs the PIN
  const live = (sessions || []).filter((s) => !s.revoked_at)

  function key(k: string) {
    const next = applyKey(pin, k, 4)
    setPin(next)
    if (next.length < 4) return
    if (pinStep === 'current') { setCur(next); setPin(''); setPinStep('new'); return }
    if (pinStep === 'face') { setFacePin(next); setPin(''); setPinStep(''); setFaceOpen(true); return }
    api('/me/pin', { body: o?.has_pin ? { pin: next, current: cur } : { pin: next } })
      .then(() => { toast('PIN saved'); refresh(); reload() })
      .catch((e) => toast((e as Error).message))
      .finally(() => { setPinStep(''); setPin(''); setCur('') })
  }
  function face(on: boolean) {
    if (!on) { toast('Every transfer needs your face check, so it stays on. Tap the row to set it up again.'); return }
    redoFace()
  }
  // a new face replaces the old one only after the PIN
  function redoFace() {
    setFacePin('')
    if (o?.face_enrolled) setPinStep('face')
    else setFaceOpen(true)
  }
  async function enrol(d: number[]) {
    try { await api('/me/face', { body: facePin ? { descriptor: d, pin: facePin } : { descriptor: d } }); toast('Face check saved'); reload() } catch (e) { toast((e as Error).message) }
    setFaceOpen(false); setFacePin('')
  }
  async function alerts(v: boolean) { await api('/me/prefs', { method: 'PATCH', body: { login_alerts: v } }).catch(() => {}); reload() }
  async function drop(id: string) { try { await api('/me/sessions/' + id, { method: 'DELETE' }); toast('Device signed out'); reloadSessions(); reload() } catch (e) { toast((e as Error).message) } }
  async function doFreeze() { try { await api('/me/freeze', { body: {} }); setFreeze(false); toast('Transfers paused for 24 hours'); reload() } catch (e) { toast((e as Error).message) } }

  return (
    <Screen gap={4} top={<TopBar title={t('security')} />}>
      <Label>Sign in</Label>
      <ListRow icon="fingerprint" title="Passkeys" sub="Set up on the web app for now" size={36} pad={10} right={<Badge label="Web" />} />
      <ListRow icon="key" title="Password" sub={o ? 'Changed ' + when(o.password_changed_at).toLowerCase() : ' '} size={36} pad={10} right={null} />
      <ListRow icon="message" title="One-time codes" sub={user?.email ? 'Email to ' + user.email : ' '} size={36} pad={10} right={null} />
      <Row gap={12} style={{ paddingVertical: 10 }}>
        <Ic name="bell" size={36} r={11} iconSize={17} />
        <View style={{ flex: 1, gap: 4 }}><T v="s" w={600}>Login alerts</T><T v="xs" tone="mu">Tell me when a new device signs in</T></View>
        <Toggle on={!!o?.login_alerts} onChange={alerts} label="Login alerts" />
      </Row>

      <Label style={{ marginTop: 8 }}>Transfers</Label>
      <ListRow icon="lock" title={t('setPin').replace('Set', o?.has_pin ? 'Change' : 'Set')} sub={o?.has_pin ? 'Change your 4-digit PIN' : 'Needed before your first transfer'} size={36} pad={10} tone={o?.has_pin ? 'green' : 'gray'} onPress={() => setPinStep(o?.has_pin ? 'current' : 'new')} />
      <Row gap={12} style={{ paddingVertical: 10 }}>
        <Ic name="scanface" tone={o?.face_enrolled ? 'green' : 'gray'} size={36} r={11} iconSize={17} />
        <View style={{ flex: 1, gap: 4 }}><T v="s" w={600}>Face check</T><T v="xs" tone="mu" onPress={redoFace}>{o?.face_enrolled ? 'Checked on every transfer. Tap to set it up again' : 'Needed before your first transfer'}</T></View>
        <Toggle on={!!o?.face_enrolled} onChange={face} label="Face check" />
      </Row>

      <Label style={{ marginTop: 8 }}>Devices</Label>
      <ListRow icon="phone" title={t('devices')} sub={`${live.length || o?.active_sessions || 0} active sessions`} size={36} pad={10} onPress={() => setDevices(true)} />
      {o?.frozen_until && new Date(o.frozen_until) > new Date()
        ? <Badge tone="red" icon="lock" label={'Transfers paused until ' + new Date(o.frozen_until).toLocaleString('en-NG', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
        : <Button label="Freeze my account" variant="out" icon="alert" color={c.red} style={{ marginTop: 8 }} onPress={() => setFreeze(true)} />}

      <Sheet open={!!pinStep} onClose={() => { setPinStep(''); setPin('') }}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Ic name="lock" tone="red" size={52} r={16} iconSize={22} />
          <T v="h3">{pinStep === 'current' || pinStep === 'face' ? 'Enter your current PIN' : 'Choose a new 4-digit PIN'}</T>
          <T v="s" tone="t2" center>{pinStep === 'face' ? 'You need your PIN to replace your face check.' : 'Avoid birthdays and repeated numbers.'}</T>
        </View>
        <PinBoxes n={pin.length} />
        <Keypad onKey={key} />
      </Sheet>

      <Sheet open={devices} onClose={() => setDevices(false)} scroll>
        <T v="h3">{t('devices')}</T>
        {live.map((s) => (
          <Row key={s.id} gap={12} style={{ paddingVertical: 6 }}>
            <Ic name={/mobile|android|iphone|expo/i.test(s.device) ? 'phone' : 'laptop'} size={40} r={12} iconSize={18} />
            <View style={{ flex: 1, gap: 4 }}><T v="s" w={600} lines={1}>{s.device || 'Unknown device'}</T><T v="xs" tone="mu">{s.current ? 'This device' : 'Last active ' + when(s.last_seen_at).toLowerCase()}</T></View>
            {s.current ? <Badge tone="green" label="Current" /> : <T v="xs" w={600} tone="rd" onPress={() => drop(s.id)}>Sign out</T>}
          </Row>
        ))}
        {!live.length && <T v="s" tone="t2">No devices.</T>}
      </Sheet>

      <Sheet open={faceOpen} onClose={() => setFaceOpen(false)} scroll>
        <T v="h3" center>{o?.face_enrolled ? 'Update your face check' : 'Set up your face check'}</T>
        {faceOpen && <FaceCam mode="enrol" onFace={enrol} />}
        <T v="xs" tone="t2" center>We save a face template, not a photo, encrypted on secure servers. It is only used to confirm it is you before money moves.</T>
      </Sheet>

      <Sheet open={freeze} onClose={() => setFreeze(false)}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Ic name="alert" tone="red" size={56} r={18} iconSize={24} />
          <T v="h3">Freeze transfers?</T>
          <T v="s" tone="t2" center>No money can leave your accounts for 24 hours. You can still see balances and talk to NURU.</T>
        </View>
        <Button label="Freeze for 24 hours" onPress={doFreeze} />
        <Button label="Cancel" variant="sec" onPress={() => setFreeze(false)} />
        {BANK.phone ? <Row gap={6} center><Icon name="phone" size={14} color={c.muted} /><T v="xs" tone="mu">Or call your bank on {BANK.phone}</T></Row> : null}
      </Sheet>
    </Screen>
  )
}
