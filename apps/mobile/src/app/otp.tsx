import { Redirect, router } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { api, type User } from '@/lib/api'
import { clearFlow, getFlow, setFlow } from '@/lib/authFlow'
import { useApp } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { ErrorNote, Ic, Note, Progress, Row, Screen, T, TopBar } from '@/ui/kit'
import { applyKey, Keypad, PinBoxes } from '@/ui/PinPad'

// p03 "08 Verify OTP": six boxes and an on-screen keypad. Submits on the sixth digit.
export default function Otp() {
  const { c } = useTheme()
  const { signIn } = useApp()
  const flow = getFlow()
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(42)

  useEffect(() => {
    const id = setInterval(() => setWait((w) => (w > 0 ? w - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (code.length !== 6 || busy || !flow) return
    setBusy(true); setErr('')
    api<{ token: string; user: User }>('/auth/verify', { body: { email: flow.form.email, code } })
      .then(async (r) => { await signIn(r.token, r.user); clearFlow(); router.replace('/home') })
      .catch((e) => { setErr((e as Error).message); setCode('') })
      .finally(() => setBusy(false))
  }, [code]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!flow) return <Redirect href="/signin" />

  async function resend() {
    if (wait > 0 || !flow) return
    try {
      const r = await api<{ demo_code?: string }>('/auth/' + flow.mode, { body: flow.form })
      setFlow({ ...flow, hint: r.demo_code || '' })
      setWait(42)
    } catch (e) { setErr((e as Error).message) }
  }

  const masked = flow.form.email.replace(/^(.{2}).*(@.*)$/, '$1•••$2')

  return (
    <Screen scroll={false}
      top={<>
        <TopBar title="Verify it's you" right={<T v="xs" tone="mu" style={{ width: 40, textAlign: 'right' }}>2 of 2</T>} />
        <View style={{ paddingHorizontal: 20 }}><Progress pct={100} h={8} /></View>
      </>}
    >
      <View style={{ paddingHorizontal: 20, marginTop: 24, gap: 20 }}>
        <Ic name="mail" tone="red" size={56} r={18} iconSize={26} />
        <View style={{ gap: 6 }}>
          <T v="h2">Enter the 6-digit code</T>
          <T v="s" tone="t2">We sent it to <T v="s" w={600}>{masked}</T>{flow.form.phone ? ' and by SMS.' : '.'}</T>
        </View>
        <PinBoxes n={code.length} total={6} digits={code} />
        <Row between>
          <T v="s" tone="t2">Didn’t get it? {wait > 0 ? <T v="s" tone="mu">Resend in 0:{String(wait).padStart(2, '0')}</T> : <T v="s" w={600} tone="rd" onPress={resend}>Resend</T>}</T>
          {busy ? <T v="s" tone="mu">Checking…</T> : null}
        </Row>
        {!!flow.hint && <T v="xs" tone="mu">Demo mode: the code is {flow.hint}. A live deployment sends it by SMS or email.</T>}
        {!!err && <ErrorNote text={err} />}
        <Note icon="shield" iconColor={c.red}>NURU will never ask for this code by phone, SMS or chat. Codes expire after 5 minutes.</Note>
      </View>
      <View style={{ marginTop: 'auto', paddingHorizontal: 24, paddingBottom: 16 }}>
        <Keypad onKey={(k) => setCode((x) => applyKey(x, k, 6))} />
      </View>
    </Screen>
  )
}
