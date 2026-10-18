import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { api } from '@/lib/api'
import { setFlow } from '@/lib/authFlow'
import { font, useTheme } from '@/lib/theme'
import { Icon } from '@/ui/Icon'
import { Button, ErrorNote, Field, Input, Progress, Row, Screen, T, Toggle, TopBar } from '@/ui/kit'

function strength(p: string) {
  return [p.length >= 8, p.length >= 12, /\d/.test(p) && /[^A-Za-z0-9]/.test(p), /[a-z]/.test(p) && /[A-Z]/.test(p)].filter(Boolean).length
}

// p03 "07 Sign up"
export default function SignUp() {
  const { c } = useTheme()
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [agree, setAgree] = useState(false)
  const [business, setBusiness] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const s = strength(password)
  const ok = first.trim() && email.includes('@') && password.length >= 8 && agree

  async function submit() {
    setErr(''); setBusy(true)
    const form = { name: `${first.trim()} ${last.trim()}`.trim(), email: email.trim(), phone: phone ? '+234' + phone.replace(/\D/g, '').replace(/^0/, '') : '', password, business }
    try {
      const r = await api<{ demo_code?: string }>('/auth/signup', { body: form })
      setFlow({ mode: 'signup', form, hint: r.demo_code || '' })
      router.push('/otp')
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Screen
      top={<>
        <TopBar title="Create account" right={<T v="xs" tone="mu" style={{ width: 40, textAlign: 'right' }}>1 of 2</T>} />
        <View style={{ paddingHorizontal: 20 }}><Progress pct={50} h={8} /></View>
      </>}
      footer={<Button label="Send verification code" onPress={submit} loading={busy} disabled={!ok} />}
    >
      <View style={{ gap: 6, marginTop: 12 }}>
        <T v="h2">Let’s get you started</T>
        <T v="s" tone="t2">Use the same phone number as your bank account.</T>
      </View>
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}><Field label="First name"><Input value={first} onChangeText={setFirst} autoComplete="given-name" placeholder="Adaeze" /></Field></View>
        <View style={{ flex: 1 }}><Field label="Last name"><Input value={last} onChangeText={setLast} autoComplete="family-name" placeholder="Okafor" /></Field></View>
      </Row>
      <Field label="Phone number">
        <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="803 456 7890"
          left={<Row gap={10}><Row gap={6}><Text style={{ fontSize: 15, fontFamily: font[600], color: c.text }}>🇳🇬 +234</Text><Icon name="chevd" size={14} color={c.text} /></Row><View style={{ width: 1, height: 24, backgroundColor: c.border }} /></Row>} />
      </Field>
      <Field label="Email address">
        <Input icon="mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="adaeze.okafor@gmail.com" />
      </Field>
      <Field label="Password" hint={
        <View style={{ gap: 6 }}>
          <Row gap={4}>{[0, 1, 2, 3].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < s ? (s >= 3 ? c.green : c.amber) : c.border }} />)}</Row>
          <Row between>
            <T v="xs" w={600} tone={s >= 3 ? 'gr' : 'am'}>{password ? (s >= 3 ? 'Strong password' : 'Could be stronger') : ' '}</T>
            <T v="xs" tone="mu">12+ chars · number · symbol</T>
          </Row>
        </View>
      }>
        <Input icon="lock" value={password} onChangeText={setPassword} secureTextEntry={!show} autoComplete="new-password" textContentType="newPassword" placeholder="Create a password"
          right={<Pressable onPress={() => setShow(!show)} accessibilityLabel="Show password" hitSlop={8}><Icon name={show ? 'eye' : 'eyeoff'} size={18} color={c.muted} /></Pressable>} />
      </Field>
      <Row gap={12}><Toggle on={business} onChange={setBusiness} label="I also run a business" /><T v="s">I also run a business</T></Row>
      <Pressable onPress={() => setAgree(!agree)} accessibilityRole="checkbox" accessibilityState={{ checked: agree }} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: agree ? c.red : 'transparent', borderWidth: agree ? 0 : 1.5, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
          {agree && <Icon name="check" size={14} color="#FFFFFF" stroke={3} />}
        </View>
        <Text style={{ flex: 1, fontSize: 13, lineHeight: 18, fontFamily: font[400], color: c.text2 }}>I agree to the Terms, Privacy Policy and allow NURU to analyse my authorised transactions.</Text>
      </Pressable>
      {!!err && <ErrorNote text={err} />}
      <Row center gap={4}><T v="s" tone="t2">Already have an account?</T><T v="s" w={600} tone="rd" onPress={() => router.replace('/signin')}>Sign in</T></Row>
    </Screen>
  )
}
