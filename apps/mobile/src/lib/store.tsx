// App state: the signed in user, language, display currency and a toast.
// Mirrors apps/web/src/store.tsx, with the token kept in expo-secure-store.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Animated, StyleSheet, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { translate, type Key } from '../i18n'
import { tabLabels } from '../i18n/tabs'
import { api, ApiError, loadToken, onSessionExpired, setToken, type Lang, type ThemePref, type User } from './api'
import { money as fmt } from './format'
import { getItem, setItem } from './storage'
import { font, useTheme } from './theme'

type Ctx = {
  user: User | null
  ready: boolean
  lang: Lang
  t: (k: Key) => string
  tabs: (typeof tabLabels)['en']
  rates: Record<string, number>
  signIn: (tok: string, u: User) => Promise<void>
  signOut: (all?: boolean) => Promise<void>
  update: (patch: Partial<Pick<User, 'language' | 'theme' | 'currency' | 'name'>>) => Promise<void>
  refresh: () => Promise<void>
  toast: (msg: string) => void
}

const AppCtx = createContext<Ctx>(null as unknown as Ctx)
const USER_KEY = 'nuru.user'
export const useApp = () => useContext(AppCtx)

export function AppProvider({ children }: { children: ReactNode }) {
  const { setPref } = useTheme()
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [rates, setRates] = useState<Record<string, number>>({ NGN: 1 })
  const [guestLang, setGuestLang] = useState<Lang>('en')
  const [msg, setMsg] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The last /me reply is kept on the device, so a returning customer goes
  // straight to Home while it is checked again in the background. A 401 still
  // signs them out (api() clears the token and onSessionExpired fires).
  const refresh = useCallback(async () => {
    const tok = await loadToken()
    if (!tok) { setReady(true); return }
    let saved: User | null = null
    try { saved = JSON.parse((await getItem(USER_KEY)) || 'null') } catch { /* ignore */ }
    if (saved?.id) { setUser(saved); setReady(true) }
    try {
      setUser(await api<User>('/me'))
    } catch (e) {
      // Offline with a saved profile: keep showing it. Otherwise sign out as before.
      if (!saved?.id || (e instanceof ApiError && e.status !== 0)) { await setToken(''); setUser(null) }
    } finally { setReady(true) }
  }, [])

  useEffect(() => {
    getItem('nuru.lang').then((l) => { if (l === 'en' || l === 'yo' || l === 'ig' || l === 'ha') setGuestLang(l) })
    onSessionExpired(() => setUser(null))
    refresh()
    api<{ rates: Record<string, number> }>('/fx').then((r) => setRates(r.rates)).catch(() => {})
  }, [refresh])

  // Keep the saved profile in step with the signed in user, and drop it on sign out.
  useEffect(() => { if (ready) setItem(USER_KEY, user ? JSON.stringify(user) : null) }, [user, ready])

  // The server keeps the user's theme. A local override wins until it changes.
  useEffect(() => { if (user?.theme) setPref(user.theme) }, [user?.theme, setPref])

  const toast = useCallback((m: string) => {
    setMsg(m)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(''), 2600)
  }, [])

  const lang = user?.language || guestLang

  const value = useMemo<Ctx>(() => ({
    user, ready, lang, rates, toast, refresh,
    t: translate(lang),
    tabs: tabLabels[lang],
    signIn: async (tok, u) => { await setToken(tok); setUser(u) },
    signOut: async (all = false) => {
      try { await api('/me/logout', { body: { all } }) } catch { /* already gone */ }
      await setToken('')
      setUser(null)
    },
    update: async (patch) => {
      if (patch.theme) setPref(patch.theme as ThemePref)
      if (patch.language && !user) { setGuestLang(patch.language); setItem('nuru.lang', patch.language) }
      if (!user) return
      setUser({ ...user, ...patch })
      try { setUser(await api<User>('/me', { method: 'PATCH', body: patch })) } catch (e) { toast((e as Error).message) }
    },
  }), [user, ready, lang, rates, toast, refresh, setPref])

  return (
    <AppCtx.Provider value={value}>
      {children}
      {!!msg && <Toast text={msg} />}
    </AppCtx.Provider>
  )
}

function Toast({ text }: { text: string }) {
  const insets = useSafeAreaInsets()
  const { c } = useTheme()
  const op = useRef(new Animated.Value(0)).current
  useEffect(() => { Animated.timing(op, { toValue: 1, duration: 180, useNativeDriver: true }).start() }, [op])
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { top: insets.top + 8, opacity: op, backgroundColor: c.ink }]}>
      <Text style={{ color: c.bg, fontFamily: font[600], fontSize: 13 }}>{text}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: 20, right: 20, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', zIndex: 100 },
})

/** useMoney formats naira in the user's display currency using live rates. */
export function useMoney() {
  const { user, rates } = useApp()
  const cur = user?.currency || 'NGN'
  return useCallback((v: number, opts: { sign?: boolean; compact?: boolean } = {}) => fmt(v, { ...opts, cur, rate: rates[cur] ?? 1 }), [cur, rates])
}
