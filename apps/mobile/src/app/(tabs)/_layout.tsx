import { Redirect, router } from 'expo-router'
import Tabs from 'expo-router/js-tabs'
import { useRef } from 'react'
import { View, type GestureResponderEvent } from 'react-native'
import { DrawerProvider } from '@/components/Drawer'
import { useApp } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { TabBar } from '@/ui/TabBar'

const openAssistant = () => router.push('/assistant')

export default function TabsLayout() {
  const { user, ready } = useApp()
  const { c } = useTheme()
  const dbl = useDoubleTap(openAssistant)
  if (ready && !user) return <Redirect href="/welcome" />
  // The side menu replaces the old More tab and sits over the tabs and tab bar.
  // A double tap on empty space opens the NURU voice assistant; so does
  // VoiceOver's two-finger double tap (magic tap).
  return (
    <View style={{ flex: 1 }} {...dbl} accessibilityActions={[{ name: 'magicTap', label: 'Open NURU voice' }]} onMagicTap={openAssistant}>
      <DrawerProvider>
        <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
          <Tabs.Screen name="home" />
          <Tabs.Screen name="insights" />
          <Tabs.Screen name="ask" />
          <Tabs.Screen name="pay" />
        </Tabs>
      </DrawerProvider>
    </View>
  )
}

// useDoubleTap returns props for a wrapper view that only watches touches and
// never takes them. React Native asks the deepest view first whether it wants
// a touch, so this view is only asked when no button, link, text field or
// scroll view claimed it (empty background); it notes that and declines, so
// scrolling, swipes and normal taps behave exactly as before. Two quick, still
// taps on free space close together count as a double tap.
function useDoubleTap(onDouble: () => void) {
  const free = useRef(-1) // start time of the last touch nothing else claimed
  const down = useRef({ t: 0, x: 0, y: 0 })
  const last = useRef({ t: 0, x: 0, y: 0 })
  return {
    onStartShouldSetResponder: (e: GestureResponderEvent) => { free.current = e.nativeEvent.timestamp; return false },
    onTouchStart: (e: GestureResponderEvent) => {
      down.current = { t: e.nativeEvent.timestamp, x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }
    },
    onTouchCancel: () => { last.current.t = 0 },
    onTouchEnd: (e: GestureResponderEvent) => {
      const { timestamp: now, pageX: x, pageY: y, touches } = e.nativeEvent
      const d = down.current
      const tap = touches.length === 0 && free.current === d.t && now - d.t <= 250 && Math.hypot(x - d.x, y - d.y) <= 12
      if (!tap) { last.current.t = 0; return } // a button, a hold, a drag or two fingers
      const p = last.current
      if (now - p.t < 350 && Math.hypot(x - p.x, y - p.y) < 40) {
        last.current.t = 0
        onDouble()
      } else last.current = { t: now, x, y }
    },
  }
}
