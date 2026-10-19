import { Redirect } from 'expo-router'
import Tabs from 'expo-router/js-tabs'
import { DrawerProvider } from '@/components/Drawer'
import { useApp } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { TabBar } from '@/ui/TabBar'

export default function TabsLayout() {
  const { user, ready } = useApp()
  const { c } = useTheme()
  if (ready && !user) return <Redirect href="/welcome" />
  // The side menu replaces the old More tab and sits over the tabs and tab bar.
  return (
    <DrawerProvider>
      <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
        <Tabs.Screen name="home" />
        <Tabs.Screen name="insights" />
        <Tabs.Screen name="ask" />
        <Tabs.Screen name="pay" />
      </Tabs>
    </DrawerProvider>
  )
}
