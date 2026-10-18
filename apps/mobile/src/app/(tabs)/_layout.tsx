import { Redirect } from 'expo-router'
import Tabs from 'expo-router/js-tabs'
import { useApp } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { TabBar } from '@/ui/TabBar'

export default function TabsLayout() {
  const { user, ready } = useApp()
  const { c } = useTheme()
  if (ready && !user) return <Redirect href="/welcome" />
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="ask" />
      <Tabs.Screen name="pay" />
      <Tabs.Screen name="more" />
    </Tabs>
  )
}
