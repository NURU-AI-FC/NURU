import { Redirect } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Text, View } from 'react-native'
import { useApp } from '@/lib/store'
import { font } from '@/lib/theme'

// Splash (p03 "01 Splash") while the stored session is checked, then route.
export default function Index() {
  const { ready, user } = useApp()
  if (ready) return <Redirect href={user ? '/home' : '/welcome'} />
  return <Splash />
}

export function Splash() {
  return (
    <LinearGradient colors={['#E30613', '#A3000D', '#6B0008']} locations={[0, 0.7, 1]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <View style={{ width: 96, height: 96, borderRadius: 30, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: font[800], fontSize: 54, color: '#E30613' }}>N</Text>
      </View>
      <Text style={{ fontFamily: font[800], fontSize: 40, letterSpacing: -1, color: '#FFFFFF' }}>NURU</Text>
      <Text style={{ fontFamily: font[400], fontSize: 15, color: 'rgba(255,255,255,0.85)' }}>Understand your money. In your language.</Text>
      <View style={{ position: 'absolute', bottom: 56, alignItems: 'center', gap: 8 }}>
        <Text style={{ fontFamily: font[400], fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>In partnership with</Text>
        <Text style={{ fontFamily: font[600], fontSize: 15, color: '#FFFFFF', letterSpacing: 2 }}>ZENITH BANK · ZECATHON 6.0</Text>
      </View>
    </LinearGradient>
  )
}
