// Tab bar: Home, Insights, a raised Ask NURU button and Pay. Everything that
// used to sit under More is in the side menu (components/Drawer.tsx).
import type { BottomTabBarProps } from 'expo-router/js-tabs'
import { Platform, Pressable, Text, View, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useApp } from '../lib/store'
import { font, useTheme } from '../lib/theme'
import { Icon, type IconName } from './Icon'

const TABS: { name: string; key: 'home' | 'insights' | 'ask' | 'pay'; icon: IconName }[] = [
  { name: 'home', key: 'home', icon: 'home' },
  { name: 'insights', key: 'insights', icon: 'chart' },
  { name: 'ask', key: 'ask', icon: 'sparkles' },
  { name: 'pay', key: 'pay', icon: 'send' },
]

export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { c } = useTheme()
  const { tabs } = useApp()
  const insets = useSafeAreaInsets()
  const active = state.routes[state.index]?.name
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10, paddingHorizontal: 8,
      paddingBottom: Math.max(insets.bottom, 12), minHeight: 64, backgroundColor: c.tabbar, borderTopWidth: 1, borderTopColor: c.border,
    }}>
      {TABS.map((t) => {
        const route = state.routes.find((r) => r.name === t.name)
        const on = active === t.name
        const go = () => route && navigateToTab(route.key)
        if (t.key === 'ask') {
          return (
            <Pressable key={t.key} onPress={go} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tabs.ask}
              style={{ flex: 1, maxWidth: 96, alignItems: 'center', gap: 4 }}>
              <View style={[{ width: 56, height: 56, borderRadius: 18, backgroundColor: c.red, alignItems: 'center', justifyContent: 'center', marginTop: -22 }, fab]}>
                <Icon name="sparkles" size={26} color="#FFFFFF" />
              </View>
              <Text numberOfLines={1} style={{ fontSize: 10, fontFamily: font[600], color: c.red }}>{tabs.ask}</Text>
            </Pressable>
          )
        }
        return (
          <Pressable key={t.key} onPress={go} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tabs[t.key]}
            style={{ flex: 1, maxWidth: 96, alignItems: 'center', gap: 4 }}>
            <Icon name={t.icon} size={22} color={on ? c.red : c.muted} />
            <Text numberOfLines={1} style={{ fontSize: 10, fontFamily: font[500], color: on ? c.red : c.muted }}>{tabs[t.key]}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const fab = Platform.select<ViewStyle>({
  web: { boxShadow: '0 8px 20px rgba(227,6,19,.35)' } as ViewStyle,
  default: { shadowColor: '#E30613', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
})!
