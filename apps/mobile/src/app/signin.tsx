import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { LangPill } from '@/components/LangPill'
import { api } from '@/lib/api'
import { DEMO, setFlow } from '@/lib/authFlow'
import { useApp } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { Icon } from '@/ui/Icon'
import { Button, Divider, ErrorNote, Field, IconBtn, Input, Logo, Row, Screen, Soft, T, Toggle } from '@/ui/kit'

// p03 "12 Sign in"
export default function SignIn() {
  const { c } = useTheme()
  const { toast } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setErr(''); setBusy(true)
    try {
      const r = await api<{ demo_code?: string }>('/auth/login', { body: { email: email.trim(), password } })
      setFlow({ mode: 'login', form: { name: '', email: email.trim(), phone: '', password, business: false }, hint: r.demo_code || '' })
      router.push('/otp')
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const bio = () => toast('Face ID and passkeys arrive with the store build. Use your password for now.')

  return (
    <Screen
      top={<Row between style={{ height: 52, paddingHorizontal: 20 }}><IconBtn name="chevl" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))} /><LangPill /></Row>}
      footer={<Row center gap={4}><T v="s" tone="t2">New to NURU?</T><T v="s" w={600} tone="rd" onPress={() => router.replace('/signup')}>Create account</T></Row>}
      gap={20}
    >
      <View style={{ marginTop: 4 }}><Logo size={44} text={false} /></View>
      <View style={{ gap: 6 }}>
        <T v="h1">Welcome back</T>
        <T tone="t2">Sign in to see what your money did today.</T>
      </View>
      <Pressable onPress={() => { setEmail(DEMO.email); setPassword(DEMO.password) }} accessibilityRole="button">
        <Soft style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: c.red }}>
          <Row gap={10}>
            <Icon name="sparkles" size={18} color={c.red} />
            <View style={{ flex: 1 }}>
              <T v="s" w={600}>Judges: use the demo account</T>
              <T v="xs" tone="t2">{DEMO.email} · {DEMO.password} · code {DEMO.code}</T>
            </View>
          </Row>
        </Soft>
      </Pressable>
      <Field label="Email or phone">
        <Input icon="user" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@example.com" textContentType="username" />
      </Field>
      <Field label="Password">
        <Input icon="lock" value={password} onChangeText={setPassword} secureTextEntry={!show} autoComplete="current-password" textContentType="password" placeholder="Your password"
          onSubmitEditing={submit}
          right={<Pressable onPress={() => setShow(!show)} accessibilityLabel={show ? 'Hide password' : 'Show password'} hitSlop={8}><Icon name={show ? 'eyeoff' : 'eye'} size={18} color={c.muted} /></Pressable>} />
      </Field>
      <Row between>
        <Row gap={8}><Toggle on={remember} onChange={setRemember} label="Remember this device" /><T v="s">Remember this device</T></Row>
        <T v="s" w={600} tone="rd" onPress={() => router.push('/forgot')}>Forgot password?</T>
      </Row>
      {!!err && <ErrorNote text={err} />}
      <Button label="Sign in" onPress={submit} loading={busy} disabled={!email || password.length < 8} />
      <Row gap={12}><Divider style={{ flex: 1, alignSelf: 'center' }} /><T v="xs" tone="mu">or</T><Divider style={{ flex: 1, alignSelf: 'center' }} /></Row>
      <Row gap={12}>
        <Button label="Face ID" variant="out" icon="scanface" grow onPress={bio} />
        <Button label="Passkey" variant="out" icon="fingerprint" grow onPress={bio} />
      </Row>
    </Screen>
  )
}
