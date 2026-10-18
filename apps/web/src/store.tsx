import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setToken, token, type Lang, type User } from './api'
import { translate, type Key } from './i18n'

type Ctx = {
  user: User | null
  ready: boolean
  lang: Lang
  t: (k: Key) => string
  rates: Record<string, number>
  signIn: (tok: string, u: User) => void
  signOut: () => void
  update: (patch: Partial<Pick<User, 'language' | 'theme' | 'currency' | 'name'>>) => Promise<void>
  refresh: () => Promise<void>
  toast: (msg: string) => void
}

const AppCtx = createContext<Ctx>(null as unknown as Ctx)
export const useApp = () => useContext(AppCtx)

export function applyTheme(theme: string) {
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  try { localStorage.setItem('nuru.theme', theme) } catch { /* ignore */ }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [rates, setRates] = useState<Record<string, number>>({ NGN: 1 })
  const [msg, setMsg] = useState('')
  const [guestLang, setGuestLang] = useState<Lang>(() => {
    try { return (localStorage.getItem('nuru.lang') as Lang) || 'en' } catch { return 'en' }
  })

  const refresh = useCallback(async () => {
    if (!token()) { setReady(true); return }
    try { setUser(await api<User>('/me')) } catch { setToken('') } finally { setReady(true) }
  }, [])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { api<{ rates: Record<string, number> }>('/fx').then((r) => setRates(r.rates)).catch(() => {}) }, [])
  useEffect(() => { if (user) applyTheme(user.theme) }, [user])
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => applyTheme(user?.theme || localStorage.getItem('nuru.theme') || 'system')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [user])

  const lang = user?.language || guestLang
  useEffect(() => { document.documentElement.lang = lang }, [lang])

  const toast = useCallback((m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2600) }, [])

  const value = useMemo<Ctx>(() => ({
    user, ready, lang, rates, toast, refresh,
    t: translate(lang),
    signIn: (tok, u) => { setToken(tok); setUser(u) },
    signOut: () => { setToken(''); setUser(null) },
    update: async (patch) => {
      if (patch.theme) applyTheme(patch.theme)
      if (!user) {
        if (patch.language) { setGuestLang(patch.language); try { localStorage.setItem('nuru.lang', patch.language) } catch { /* ignore */ } }
        return
      }
      setUser(await api<User>('/me', { method: 'PATCH', body: patch }))
    },
  }), [user, ready, lang, rates, toast, refresh])

  return <AppCtx.Provider value={value}>{children}{msg && <div className="toast" role="status">{msg}</div>}</AppCtx.Provider>
}

// money formats naira amounts in the user's display currency using live rates.
export function useMoney() {
  const { user, rates } = useApp()
  const cur = user?.currency || 'NGN'
  return useCallback((v: number, opts: { sign?: boolean; compact?: boolean } = {}) => {
    const rate = rates[cur] ?? 1
    const amt = cur === 'NGN' ? v : v * rate
    const sym: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' }
    const abs = Math.abs(amt)
    let s: string
    if (opts.compact && abs >= 1000) s = abs >= 1e6 ? (abs / 1e6).toFixed(abs >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'm' : Math.round(abs / 1000) + 'k'
    else s = abs.toLocaleString('en-NG', { maximumFractionDigits: cur === 'NGN' ? 0 : 2, minimumFractionDigits: cur === 'NGN' ? 0 : 2 })
    const sign = amt < 0 ? '-' : opts.sign ? '+' : ''
    return sign + (sym[cur] || cur + ' ') + s
  }, [cur, rates])
}
