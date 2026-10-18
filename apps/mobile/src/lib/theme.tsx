// Design tokens from design/src/lib.mjs (light and dark), plus the theme
// provider. The theme follows the phone setting unless the user overrides it.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import type { ThemePref } from './api'
import { getItem, setItem } from './storage'

export const tokens = {
  light: {
    bg: '#FFFFFF', surface: '#F7F7F8', surface2: '#EFEFF2', border: '#E6E6EA',
    text: '#141416', text2: '#55555F', muted: '#8C8C97',
    red: '#E30613', red600: '#B8000F', red50: '#FFF1F2', red100: '#FFE1E3',
    green: '#15803D', green50: '#ECFDF3', amber: '#B45309', amber50: '#FFF7E6',
    blue: '#1D4ED8', blue50: '#EEF4FF', ink: '#141416', onRed: '#FFFFFF',
    card: '#FFFFFF', tabbar: '#FFFFFF', shadow: 'rgba(20,20,22,0.08)',
    hero: ['#E30613', '#A3000D'] as [string, string],
  },
  dark: {
    bg: '#0D0D0F', surface: '#17171A', surface2: '#202024', border: '#2B2B31',
    text: '#F5F5F7', text2: '#B3B3BD', muted: '#7B7B87',
    red: '#FF2E3E', red600: '#E30613', red50: '#2A1013', red100: '#3D1418',
    green: '#4ADE80', green50: '#0F2A1A', amber: '#FBBF24', amber50: '#2B220C',
    blue: '#7AA2FF', blue50: '#121C33', ink: '#F5F5F7', onRed: '#FFFFFF',
    card: '#17171A', tabbar: '#17171A', shadow: 'rgba(0,0,0,0.4)',
    hero: ['#C2000F', '#5C0008'] as [string, string],
  },
}
export type Colors = typeof tokens.light

// Category palette for charts: red-led with neutral companions.
export const cat = ['#E30613', '#3F3F46', '#FB7185', '#F59E0B', '#94A3B8', '#14B8A6', '#7C3AED']

export const radius = { sm: 10, md: 14, lg: 16, card: 20, hero: 24, sheet: 28, pill: 999 }

// Inter in the weights the design uses. Custom fonts do not synthesise weight
// on Android, so each weight maps to its own family.
export const font = {
  400: 'Inter_400Regular',
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
  800: 'Inter_800ExtraBold',
} as const
export type Weight = keyof typeof font

// Type scale from the design CSS (.h1 .. .xs).
export const type = {
  h1: { fontSize: 28, lineHeight: 34, weight: 700 as Weight, letterSpacing: -0.5 },
  h2: { fontSize: 22, lineHeight: 28, weight: 700 as Weight, letterSpacing: -0.3 },
  h3: { fontSize: 17, lineHeight: 22, weight: 600 as Weight, letterSpacing: 0 },
  h4: { fontSize: 15, lineHeight: 20, weight: 600 as Weight, letterSpacing: 0 },
  b: { fontSize: 15, lineHeight: 22, weight: 400 as Weight, letterSpacing: 0 },
  s: { fontSize: 13, lineHeight: 18, weight: 400 as Weight, letterSpacing: 0 },
  xs: { fontSize: 11, lineHeight: 14, weight: 400 as Weight, letterSpacing: 0 },
}
export type TypeVariant = keyof typeof type

type ThemeCtx = { c: Colors; dark: boolean; pref: ThemePref; setPref: (p: ThemePref) => void }
const Ctx = createContext<ThemeCtx>({ c: tokens.light, dark: false, pref: 'system', setPref: () => {} })
export const useTheme = () => useContext(Ctx)

const KEY = 'nuru.theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme()
  const [pref, setPrefState] = useState<ThemePref>('system')
  useEffect(() => { getItem(KEY).then((v) => { if (v === 'light' || v === 'dark' || v === 'system') setPrefState(v) }) }, [])
  const setPref = useCallback((p: ThemePref) => { setPrefState(p); setItem(KEY, p) }, [])
  const dark = pref === 'dark' || (pref === 'system' && scheme === 'dark')
  const value = useMemo(() => ({ c: dark ? tokens.dark : tokens.light, dark, pref, setPref }), [dark, pref, setPref])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
