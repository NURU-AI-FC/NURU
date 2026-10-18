import { router } from 'expo-router'
import { View } from 'react-native'
import { LangPill } from '@/components/LangPill'
import { useApp } from '@/lib/store'
import { Badge, Button, Hero, Logo, Row, Screen, T } from '@/ui/kit'

// p03 "06 Welcome"
export default function Welcome() {
  const { toast } = useApp()
  return (
    <Screen scroll={false}>
      <Row between style={{ height: 52, paddingHorizontal: 20 }}>
        <Logo size={30} />
        <LangPill />
      </Row>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 20 }}>
        <Hero style={{ padding: 24, minHeight: 330, gap: 16 }}>
          <Badge light icon="sparkles" label="AI financial copilot" />
          <T color="#FFFFFF" w={800} style={{ fontSize: 30, lineHeight: 36, letterSpacing: -0.8 }}>Don’t just see your money. Understand it.</T>
          <T v="s" color="rgba(255,255,255,0.85)">Insights, forecasts and smart decisions from your own transactions, in English, Yorùbá, Igbo or Hausa.</T>
          <Row gap={8} style={{ marginTop: 'auto' }}>
            {['Insights', 'Voice', 'Secure'].map((t) => <Badge key={t} light label={t} style={{ height: 26 }} />)}
          </Row>
        </Hero>
        <View style={{ marginTop: 'auto', paddingBottom: 28, gap: 12 }}>
          <Button label="Create account" onPress={() => router.push('/signup')} />
          <Button label="Sign in with passkey" variant="out" icon="fingerprint" onPress={() => toast('Passkeys arrive with the store build. Sign in with your password for now.')} />
          <Row center gap={4}>
            <T v="s" tone="t2">Already have an account?</T>
            <T v="s" w={600} tone="rd" onPress={() => router.push('/signin')}>Sign in</T>
          </Row>
          <T v="xs" tone="mu" center>By continuing you agree to our Terms and Privacy Policy. Protected by bank-grade encryption.</T>
        </View>
      </View>
    </Screen>
  )
}
