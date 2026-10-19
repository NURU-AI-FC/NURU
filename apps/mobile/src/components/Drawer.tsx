// Side menu from the Figma frame "10 Menu (sidebar)", the phone version of
// the web app's sidebar (apps/web/src/Shell.tsx). It slides over the tab
// screens from a menu button or a swipe from the left edge.
import { router, usePathname } from 'expo-router'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Animated, BackHandler, PanResponder, Platform, Pressable, ScrollView, useWindowDimensions, View, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api, type Thread } from '@/lib/api'
import { useApp } from '@/lib/store'
import { font, useTheme } from '@/lib/theme'
import { Icon, type IconName } from '@/ui/Icon'
import { Avatar, Button, Ic, IconBtn, Row, T, Toggle } from '@/ui/kit'
import { Sheet } from '@/ui/Sheet'

type Ctx = { open: () => void; close: () => void }
const DrawerCtx = createContext<Ctx>({ open: () => {}, close: () => {} })
export const useDrawer = () => useContext(DrawerCtx)

/** MenuButton opens the side menu. It sits top left on the main tab screens. */
export function MenuButton() {
  const { open } = useDrawer()
  return <IconBtn name="menu" label="Open menu" onPress={open} />
}

const EDGE = 18

export function DrawerProvider({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions()
  const W = Math.min(300, Math.round(width * 0.84))
  const x = useRef(new Animated.Value(-W)).current
  const [shown, setShown] = useState(false)
  const at = useRef(-W)
  useEffect(() => { const id = x.addListener(({ value }) => { at.current = value }); return () => x.removeListener(id) }, [x])

  const animate = useCallback((to: 'open' | 'closed', v = 0) => {
    if (to === 'open') setShown(true)
    Animated.spring(x, { toValue: to === 'open' ? 0 : -W, velocity: v, overshootClamping: true, stiffness: 260, damping: 30, mass: 1, useNativeDriver: false })
      .start(({ finished }) => { if (finished && to === 'closed') setShown(false) })
  }, [x, W])
  const open = useCallback(() => animate('open'), [animate])
  const close = useCallback(() => animate('closed'), [animate])

  useEffect(() => {
    if (!shown) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true })
    return () => sub.remove()
  }, [shown, close])

  const settle = (dx: number, vx: number, from: number) => {
    const pos = from + dx
    if (vx > 0.4 || (vx > -0.4 && pos > -W / 2)) animate('open', vx)
    else animate('closed', vx)
  }
  // swipe in from the left edge
  const edge = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_e, g) => g.dx > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderGrant: () => { setShown(true); x.stopAnimation() },
    onPanResponderMove: (_e, g) => x.setValue(Math.min(0, -W + Math.max(0, g.dx))),
    onPanResponderRelease: (_e, g) => settle(g.dx, g.vx, -W),
    onPanResponderTerminate: (_e, g) => settle(g.dx, g.vx, -W),
  }), [W, x]) // eslint-disable-line react-hooks/exhaustive-deps
  // drag the open menu back to the left
  const back = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => g.dx < -8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderGrant: () => x.stopAnimation(),
    onPanResponderMove: (_e, g) => x.setValue(Math.max(-W, Math.min(0, g.dx))),
    onPanResponderRelease: (_e, g) => settle(g.dx, g.vx, 0),
    onPanResponderTerminate: (_e, g) => settle(g.dx, g.vx, 0),
  }), [W, x]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => ({ open, close }), [open, close])
  const scrim = x.interpolate({ inputRange: [-W, 0], outputRange: [0, 1], extrapolate: 'clamp' })

  return (
    <DrawerCtx.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        {!shown && <View {...edge.panHandlers} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: EDGE }} />}
        {shown && (
          <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} {...back.panHandlers}>
            <Animated.View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', opacity: scrim }}>
              <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close menu" />
            </Animated.View>
            <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, width: W, transform: [{ translateX: x }] }, panelShadow]}>
              <Menu onClose={close} />
            </Animated.View>
          </View>
        )}
      </View>
    </DrawerCtx.Provider>
  )
}

const panelShadow = Platform.select<ViewStyle>({
  web: { boxShadow: '10px 0 40px rgba(0,0,0,.15)' } as ViewStyle,
  default: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 10, height: 0 }, elevation: 16 },
})!

type Item = { icon: IconName; label: string; path: string; tab?: boolean; count?: number }

function Menu({ onClose }: { onClose: () => void }) {
  const { c } = useTheme()
  const { user, t, signOut } = useApp()
  const insets = useSafeAreaInsets()
  const path = usePathname()
  const [recent, setRecent] = useState<Thread[]>([])
  const [unread, setUnread] = useState(0)
  const [logout, setLogout] = useState(false)
  const [all, setAll] = useState(false)

  useEffect(() => {
    api<Thread[]>('/chat/threads').then((r) => setRecent(r.slice(0, 4))).catch(() => {})
    api<{ unread: number }>('/notifications?count=1').then((r) => setUnread(r.unread || 0)).catch(() => {})
  }, [])

  const go = (p: string, tab?: boolean) => {
    onClose()
    if (tab) router.navigate(p as never)
    else router.push(p as never)
  }

  const items: Item[] = [
    { icon: 'home', label: t('home'), path: '/home', tab: true },
    { icon: 'wallet', label: t('connectedAccounts'), path: '/accounts' },
    { icon: 'history', label: t('historyTitle'), path: '/history' },
    { icon: 'chart', label: t('insights'), path: '/insights', tab: true },
    { icon: 'send', label: t('pay'), path: '/pay', tab: true },
    { icon: 'briefcase', label: user?.business_name ? `${t('business')} and payroll` : t('business'), path: '/business' },
    { icon: 'calendar', label: t('planner'), path: '/planner' },
    { icon: 'bell', label: t('notificationsTitle'), path: '/notifications', count: unread },
    { icon: 'pin', label: t('branches'), path: '/branches' },
  ]

  const row = (it: Item) => {
    const on = path === it.path || (it.path === '/home' && path === '/')
    return (
      <Pressable key={it.path} onPress={() => go(it.path, it.tab)} accessibilityRole="button" accessibilityState={{ selected: on }}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, height: 44, paddingHorizontal: 12, borderRadius: 10, backgroundColor: on ? c.red50 : pressed ? c.surface2 : 'transparent' })}>
        <Icon name={it.icon} size={20} color={on ? c.red : c.text2} />
        <T v="s" w={on ? 600 : 500} color={on ? c.red : c.text2} style={{ flex: 1, fontSize: 14 }} lines={1}>{it.label}</T>
        {!!it.count && (
          <View style={{ minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: c.red, alignItems: 'center', justifyContent: 'center' }}>
            <T v="xs" w={700} color="#FFFFFF">{it.count > 9 ? '9+' : String(it.count)}</T>
          </View>
        )}
      </Pressable>
    )
  }
  const foot = (icon: IconName, label: string, fn: () => void, red?: boolean) => (
    <Pressable key={label} onPress={fn} accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, height: 44, paddingHorizontal: 12, borderRadius: 10, backgroundColor: pressed ? c.surface2 : 'transparent' })}>
      <Icon name={icon} size={20} color={red ? c.red : c.text2} />
      <T v="s" w={500} color={red ? c.red : c.text2} style={{ fontSize: 14 }}>{label}</T>
    </Pressable>
  )

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12, paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: c.border }}>
      <Pressable onPress={() => go('/settings/profile')} accessibilityRole="button" accessibilityLabel="Profile"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingBottom: 16 }}>
        <Avatar name={user?.name || 'NURU'} size={40} bg={c.red} />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="h4" lines={1}>{user?.name || ''}</T>
          <T v="xs" tone="mu" lines={1}>{user?.business_name ? 'Personal and business' : 'Personal'}{user?.kyc_verified ? ' · Tier 2' : ''}</T>
        </View>
        <Icon name="chevr" size={16} color={c.muted} />
      </Pressable>
      <Pressable onPress={() => { onClose(); router.navigate({ pathname: '/ask', params: { new: '1' } }) }} accessibilityRole="button"
        style={({ pressed }) => ({ height: 42, marginHorizontal: 4, marginBottom: 12, borderRadius: 10, backgroundColor: c.red, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, opacity: pressed ? 0.85 : 1 })}>
        <Icon name="sparkles" size={16} color="#FFFFFF" />
        <T v="s" w={600} color="#FFFFFF" style={{ fontSize: 14 }}>{t('newChat')}</T>
      </Pressable>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 2 }} showsVerticalScrollIndicator={false}>
        {items.map(row)}
        {recent.length > 0 && (
          <>
            <View style={{ height: 1, backgroundColor: c.border, marginVertical: 10 }} />
            <T v="xs" w={600} tone="mu" style={{ paddingHorizontal: 12, paddingBottom: 6, letterSpacing: 0.6, textTransform: 'uppercase' }}>{t('recent')}</T>
            {recent.map((r) => (
              <Pressable key={r.id} onPress={() => { onClose(); router.navigate({ pathname: '/ask', params: { thread: r.id } }) }}
                style={({ pressed }) => ({ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: pressed ? c.surface2 : 'transparent' })}>
                <T v="s" tone="t2" lines={1} style={{ fontFamily: font[400] }}>{r.title}</T>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>

      <View style={{ height: 1, backgroundColor: c.border, marginVertical: 8 }} />
      {foot('settings', t('settings'), () => go('/settings'))}
      {foot('help', t('help'), () => go('/settings/help'))}
      {foot('logout', t('logout'), () => setLogout(true), true)}

      <Sheet open={logout} onClose={() => setLogout(false)}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Ic name="logout" tone="red" size={56} r={18} iconSize={24} />
          <T v="h3">{t('logoutAsk')}</T>
          <T v="s" tone="t2" center>You will need your password to sign in again. Your chats stay saved.</T>
        </View>
        <Row gap={12}>
          <View style={{ flex: 1, gap: 4 }}><T v="s" w={600}>Log out on all devices</T><T v="xs" tone="mu">Also signs out the web app</T></View>
          <Toggle on={all} onChange={setAll} label="Log out on all devices" />
        </Row>
        <Button label="Log out" onPress={async () => { setLogout(false); onClose(); await signOut(all); router.replace('/welcome') }} />
        <Button label="Cancel" variant="sec" onPress={() => setLogout(false)} />
      </Sheet>
    </View>
  )
}
