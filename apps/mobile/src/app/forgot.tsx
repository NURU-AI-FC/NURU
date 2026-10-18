import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { api } from '@/lib/api'
import { PASSWORD_RULES } from '@/lib/authFlow'
import { useTheme } from '@/lib/theme'
import { Icon } from '@/ui/Icon'
import { Button, ErrorNote, Field, Ic, Input, Note, Row, Screen, Soft, T, TopBar } from '@/ui/kit'

// p03 "14 Forgot password" and "15 New password"
export default function Forgot() {
  const { c } = useTheme()
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [hint, setHint] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function send() {
    setErr(''); setBusy(true)
    try {
      const r = await api<{ demo_code?: string }>('/auth/forgot', { body: { email: email.trim() } })
      setHint(r.demo_code || '')
      if (r.demo_code) setCode(r.demo_code)
      setStep('reset')
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  async function reset() {
    if (pw !== pw2) { setErr('The passwords do not match'); return }
    setErr(''); setBusy(true)
    try { await api('/auth/reset', { body: { email: email.trim(), code, password: pw } }); setStep('done') } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  if (step === 'done') return (
    <Screen top={<TopBar title="Reset password" />} footer={<Button label="Sign in" onPress={() => router.replace('/signin')} />}>
      <View style={{ alignItems: 'center', gap: 16, marginTop: 60 }}>
        <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: c.green50, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: c.green, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={44} color="#FFFFFF" stroke={3} /></View>
        </View>
        <T v="h2" center>Password updated</T>
        <T tone="t2" center>We signed you out on every device. Sign in with your new password.</T>
      </View>
    </Screen>
  )

  if (step === 'reset') {
    const ok = PASSWORD_RULES.every(([, f]) => f(pw))
    const eye = <Pressable onPress={() => setShow(!show)} accessibilityLabel="Show password" hitSlop={8}><Icon name={show ? 'eyeoff' : 'eye'} size={18} color={c.muted} /></Pressable>
    return (
      <Screen top={<TopBar title="Reset password" onBack={() => setStep('email')} />}
        footer={<Button label="Update password" onPress={reset} loading={busy} disabled={!ok || code.length !== 6 || pw !== pw2} />}>
        <View style={{ gap: 6, marginTop: 8 }}>
          <T v="h2">Create a new password</T>
          <T v="s" tone="t2">Enter the code we sent to {email}. It must be different from passwords you used before.</T>
        </View>
        <Field label="Reset code" hint={hint ? `Demo mode: the code is ${hint}. A live deployment sends it by SMS or email.` : undefined}>
          <Input value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" placeholder="6 digits" style={{ letterSpacing: 6 }} />
        </Field>
        <Field label="New password"><Input icon="lock" value={pw} onChangeText={setPw} secureTextEntry={!show} autoComplete="new-password" right={eye} /></Field>
        <Field label="Confirm password">
          <Input icon="lock" value={pw2} onChangeText={setPw2} secureTextEntry={!show} autoComplete="new-password" right={pw2 && pw2 === pw ? <Icon name="check" size={18} color={c.green} /> : null} />
        </Field>
        <Soft style={{ gap: 8 }}>
          {PASSWORD_RULES.map(([t, f]) => (
            <Row key={t} gap={8}><Icon name={f(pw) ? 'check' : 'x'} size={16} color={f(pw) ? c.green : c.muted} /><T v="s">{t}</T></Row>
          ))}
        </Soft>
        {!!err && <ErrorNote text={err} />}
      </Screen>
    )
  }

  return (
    <Screen top={<TopBar title="Reset password" />} footer={<Button label="Send reset code" onPress={send} loading={busy} disabled={!email.includes('@')} />} gap={20}>
      <Ic name="key" tone="red" size={56} r={18} iconSize={26} />
      <View style={{ gap: 6 }}>
        <T v="h2">Forgot your password?</T>
        <T v="s" tone="t2">Enter your email. We’ll send a code to confirm it’s you, then you can set a new password.</T>
      </View>
      <Field label="Email"><Input icon="mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" autoFocus placeholder="you@example.com" /></Field>
      <Note icon="info" iconColor={c.blue}>For your safety, every device is signed out after a password reset.</Note>
      {!!err && <ErrorNote text={err} />}
    </Screen>
  )
}
