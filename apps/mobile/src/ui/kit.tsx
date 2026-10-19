// Shared UI primitives. Each one mirrors a class in design/src/lib.mjs:
// .btn, .card, .soft, .chip, .badge, .input, .ib, .ic, .seg, .toggle, .bar, .hero.
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState, type ReactNode } from 'react'
import {
  ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Tone } from '../lib/format'
import { initials as toInitials, avatarColor } from '../lib/format'
import { font, radius, type, useTheme, type Colors, type TypeVariant, type Weight } from '../lib/theme'
import { Icon, type IconName } from './Icon'
import { focusChanged, KeyAvoid, KeyboardScroll } from './KeyboardScroll'

// ---------- text ----------
type ToneName = 'text' | 't2' | 'mu' | 'rd' | 'gr' | 'am' | 'bl' | 'white'
const toneColor = (c: Colors, t: ToneName) => ({ text: c.text, t2: c.text2, mu: c.muted, rd: c.red, gr: c.green, am: c.amber, bl: c.blue, white: '#FFFFFF' }[t])

export function T({ v = 'b', w, tone = 'text', color, num, center, style, children, lines, onPress }: {
  v?: TypeVariant; w?: Weight; tone?: ToneName; color?: string; num?: boolean; center?: boolean
  style?: StyleProp<TextStyle>; children: ReactNode; lines?: number; onPress?: () => void
}) {
  const { c } = useTheme()
  const s = type[v]
  return (
    <Text
      onPress={onPress}
      numberOfLines={lines}
      style={[{
        fontSize: s.fontSize, lineHeight: s.lineHeight, letterSpacing: num ? -0.3 : s.letterSpacing,
        fontFamily: font[w || s.weight], color: color || toneColor(c, tone),
        textAlign: center ? 'center' : undefined, fontVariant: num ? ['tabular-nums'] : undefined,
      }, style]}
    >{children}</Text>
  )
}

// ---------- layout ----------
export const Row = ({ children, gap = 0, style, between, center }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; between?: boolean; center?: boolean }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap, justifyContent: between ? 'space-between' : center ? 'center' : undefined }, style]}>{children}</View>
)
export const Col = ({ children, gap = 0, style, center }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; center?: boolean }) => (
  <View style={[{ flexDirection: 'column', gap, alignItems: center ? 'center' : undefined }, style]}>{children}</View>
)

export function shadow(c: Colors): ViewStyle {
  return Platform.select<ViewStyle>({
    web: { boxShadow: `0 1px 2px ${c.shadow}, 0 8px 24px ${c.shadow}` } as ViewStyle,
    default: { shadowColor: '#000', shadowOpacity: c.bg === '#FFFFFF' ? 0.06 : 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  })!
}

export function Card({ children, style, onPress, pad = 16, flat }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; pad?: number; flat?: boolean }) {
  const { c } = useTheme()
  const base: ViewStyle = { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: radius.card, padding: pad }
  const body = [base, !flat && shadow(c), style]
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [...body, pressed && { opacity: 0.85 }]}>{children}</Pressable>
  return <View style={body}>{children}</View>
}

export function Soft({ children, style, tint, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; tint?: string; onPress?: () => void }) {
  const { c } = useTheme()
  const s = [{ backgroundColor: tint || c.surface, borderRadius: radius.lg, padding: 14 }, style]
  return onPress ? <Pressable onPress={onPress} style={s}>{children}</Pressable> : <View style={s}>{children}</View>
}

/** Soft note with an icon, as used for NURU tips and info lines. */
export function Note({ icon, iconColor, tint, children, right, onPress }: { icon: IconName; iconColor?: string; tint?: string; children: ReactNode; right?: ReactNode; onPress?: () => void }) {
  const { c } = useTheme()
  return (
    <Soft tint={tint} onPress={onPress}>
      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        <Icon name={icon} size={18} color={iconColor || c.red} />
        <View style={{ flex: 1 }}>{typeof children === 'string' ? <T v="xs" tone="t2">{children}</T> : children}</View>
        {right}
      </Row>
    </Soft>
  )
}

export const Divider = ({ style }: { style?: StyleProp<ViewStyle> }) => {
  const { c } = useTheme()
  return <View style={[{ height: 1, backgroundColor: c.border, alignSelf: 'stretch' }, style]} />
}

// ---------- buttons ----------
type BtnVariant = 'pri' | 'sec' | 'out' | 'ghost'
export function Button({ label, onPress, variant = 'pri', sm, icon, disabled, loading, style, grow, color }: {
  label: string; onPress?: () => void; variant?: BtnVariant; sm?: boolean; icon?: IconName; disabled?: boolean
  loading?: boolean; style?: StyleProp<ViewStyle>; grow?: boolean; color?: string
}) {
  const { c } = useTheme()
  const bg = { pri: color || c.red, sec: c.surface2, out: 'transparent', ghost: 'transparent' }[variant]
  const fg = { pri: c.onRed, sec: c.text, out: color || c.text, ghost: color || c.red }[variant]
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [{
        height: sm ? 36 : 52, borderRadius: sm ? 10 : 14, paddingHorizontal: sm ? 14 : 20,
        backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: variant === 'out' ? 1.5 : 0, borderColor: color || c.border,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1, flex: grow ? 1 : undefined,
      }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <>
        {icon && <Icon name={icon} size={sm ? 15 : 18} color={fg} />}
        <Text style={{ color: fg, fontFamily: font[600], fontSize: sm ? 13 : 16 }}>{label}</Text>
      </>}
    </Pressable>
  )
}

export function IconBtn({ name, onPress, size = 40, bg, color, label, badge }: { name: IconName; onPress?: () => void; size?: number; bg?: string; color?: string; label?: string; badge?: boolean }) {
  const { c } = useTheme()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label || name} onPress={onPress} hitSlop={6}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: size >= 48 ? size / 2 : 12, alignItems: 'center', justifyContent: 'center', backgroundColor: bg || c.surface, opacity: pressed ? 0.7 : 1 })}>
      <Icon name={name} size={20} color={color || c.text} />
      {badge && <View style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: c.red, borderWidth: 2, borderColor: c.surface }} />}
    </Pressable>
  )
}

// ---------- icon tiles, badges, chips ----------
export function toneColors(c: Colors, tone: Tone) {
  return {
    red: { bg: c.red50, fg: c.red }, gray: { bg: c.surface2, fg: c.text }, green: { bg: c.green50, fg: c.green },
    amber: { bg: c.amber50, fg: c.amber }, blue: { bg: c.blue50, fg: c.blue },
  }[tone]
}

export function Ic({ name, tone = 'gray', size = 44, r, iconSize, bg }: { name: IconName; tone?: Tone; size?: number; r?: number; iconSize?: number; bg?: string }) {
  const { c } = useTheme()
  const t = toneColors(c, tone)
  return (
    <View style={{ width: size, height: size, borderRadius: r ?? Math.round(size * 0.32), backgroundColor: bg || t.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={iconSize ?? Math.round(size * 0.45)} color={t.fg} />
    </View>
  )
}

export function Badge({ label, tone = 'gray', icon, style, light }: { label: string; tone?: Tone; icon?: IconName; style?: StyleProp<ViewStyle>; light?: boolean }) {
  const { c } = useTheme()
  const t = light ? { bg: 'rgba(255,255,255,0.18)', fg: '#FFFFFF' } : { ...toneColors(c, tone), ...(tone === 'gray' ? { fg: c.text2 } : {}) }
  return (
    <View style={[{ height: 22, paddingHorizontal: 8, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.bg, alignSelf: 'flex-start' }, style]}>
      {icon && <Icon name={icon} size={11} color={t.fg} />}
      <Text style={{ fontSize: 11, fontFamily: font[600], color: t.fg }}>{label}</Text>
    </View>
  )
}

export function Chip({ label, on, onPress, icon, style, big }: { label: string; on?: boolean; onPress?: () => void; icon?: IconName; style?: StyleProp<ViewStyle>; big?: boolean }) {
  const { c } = useTheme()
  const fg = on ? '#FFFFFF' : c.text2
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!on }}
      style={({ pressed }) => [{
        height: big ? 38 : 32, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: on ? c.red : c.surface, borderWidth: 1, borderColor: on ? c.red : c.border, opacity: pressed ? 0.8 : 1,
      }, style]}>
      {icon && <Icon name={icon} size={14} color={on ? '#FFFFFF' : c.red} />}
      <Text style={{ fontSize: big ? 14 : 13, fontFamily: font[500], color: fg }}>{label}</Text>
    </Pressable>
  )
}

export function ChipRow({ items, value, onChange, scroll = true }: { items: string[]; value: string; onChange: (v: string) => void; scroll?: boolean }) {
  const body = items.map((i) => <Chip key={i} label={i} on={i === value} onPress={() => onChange(i)} />)
  if (!scroll) return <Row gap={8} style={{ flexWrap: 'wrap' }}>{body}</Row>
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>{body}</ScrollView>
}

// ---------- form ----------
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <T v="s" w={500} tone="t2">{label}</T>
      {children}
      {typeof hint === 'string' ? <T v="xs" tone="mu">{hint}</T> : hint}
    </View>
  )
}

export function Input({ icon, left, right, style, height = 52, round, ...p }: TextInputProps & { icon?: IconName; left?: ReactNode; right?: ReactNode; height?: number; round?: boolean }) {
  const { c, dark } = useTheme()
  const [focus, setFocus] = useState(false)
  return (
    <View style={{ borderRadius: round ? height / 2 + 4 : 18, borderWidth: 4, borderColor: focus ? c.red50 : 'transparent', margin: -4 }}>
      <View style={[{
        height, borderRadius: round ? height / 2 : 14, borderWidth: 1.5, borderColor: focus ? c.red : c.border,
        backgroundColor: dark ? c.surface : c.bg, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14,
      }, style]}>
        {icon && <Icon name={icon} size={18} color={c.muted} />}
        {left}
        <TextInput
          placeholderTextColor={c.muted}
          {...p}
          onFocus={(e) => { setFocus(true); focusChanged(); p.onFocus?.(e) }}
          onBlur={(e) => { setFocus(false); p.onBlur?.(e) }}
          style={[{ flex: 1, height: '100%', fontSize: 15, fontFamily: font[400], color: c.text, paddingVertical: 0 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null]}
        />
        {right}
      </View>
    </View>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange?: (v: boolean) => void; label?: string }) {
  const { c } = useTheme()
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }} onPress={() => onChange?.(!on)}
      style={{ width: 44, height: 26, borderRadius: 999, padding: 3, backgroundColor: on ? c.red : c.surface2, alignItems: on ? 'flex-end' : 'flex-start' }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', ...Platform.select({ web: { boxShadow: '0 1px 2px rgba(0,0,0,.2)' } as ViewStyle, default: { elevation: 1 } }) }} />
    </Pressable>
  )
}

export function Radio({ on }: { on: boolean }) {
  const { c } = useTheme()
  return <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: on ? 7 : 2, borderColor: on ? c.red : c.border }} />
}

export function Seg<K extends string>({ value, options, onChange, style }: { value: K; options: [K, string][]; onChange: (k: K) => void; style?: StyleProp<ViewStyle> }) {
  const { c, dark } = useTheme()
  return (
    <View style={[{ flexDirection: 'row', backgroundColor: c.surface, borderRadius: 12, padding: 4, gap: 4 }, style]}>
      {options.map(([k, l]) => {
        const on = k === value
        return (
          <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={[{ flex: 1, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, on && { backgroundColor: dark ? c.surface2 : c.bg, ...Platform.select({ web: { boxShadow: '0 1px 3px rgba(0,0,0,.1)' } as ViewStyle, default: { elevation: 1 } }) }]}>
            <Text style={{ fontSize: 13, fontFamily: font[on ? 600 : 500], color: on ? c.text : c.text2 }}>{l}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function Progress({ pct, color, h = 6, track }: { pct: number; color?: string; h?: number; track?: string }) {
  const { c } = useTheme()
  return (
    <View style={{ height: h, borderRadius: 999, backgroundColor: track || c.surface2, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', borderRadius: 999, backgroundColor: color || c.red }} />
    </View>
  )
}

export function Avatar({ name, size = 40, bg, text }: { name: string; size?: number; bg?: string; text?: string }) {
  const { c } = useTheme()
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg || avatarColor(name), alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: bg === c.surface2 ? c.text : '#FFFFFF', fontFamily: font[700], fontSize: Math.round(size * 0.36) }}>{text || toInitials(name)}</Text>
    </View>
  )
}

export function Logo({ size = 32, text = true, color }: { size?: number; text?: boolean; color?: string }) {
  const { c } = useTheme()
  return (
    <Row gap={8}>
      <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: c.red, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontFamily: font[800], fontSize: size * 0.56, lineHeight: size * 0.7 }}>N</Text>
      </View>
      {text && <Text style={{ fontFamily: font[800], fontSize: 20, letterSpacing: -0.5, color: color || c.text }}>NURU</Text>}
    </Row>
  )
}

/** The small "N" mark used beside NURU's chat bubbles. */
export const Mark = ({ size = 28 }: { size?: number }) => {
  const { c } = useTheme()
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: c.red, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#FFFFFF', fontFamily: font[800], fontSize: size * 0.54 }}>N</Text>
    </View>
  )
}

export function Hero({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme()
  return (
    <LinearGradient colors={c.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: radius.hero, padding: 20, overflow: 'hidden', gap: 12 }, style]}>
      {children}
    </LinearGradient>
  )
}

// ---------- rows ----------
export function SectionTitle({ title, link, onLink }: { title: string; link?: string; onLink?: () => void }) {
  return (
    <Row between>
      <T v="h4">{title}</T>
      {link && <T v="s" w={600} tone="rd" onPress={onLink}>{link}</T>}
    </Row>
  )
}

export const Label = ({ children, style }: { children: string; style?: StyleProp<TextStyle> }) => (
  <T v="xs" w={600} tone="mu" style={[{ letterSpacing: 0.6, textTransform: 'uppercase' }, style]}>{children}</T>
)

export function ListRow({ icon, title, sub, right, tone = 'gray', onPress, pad = 12, size = 40 }: {
  icon: IconName; title: string; sub?: string; right?: ReactNode; tone?: Tone; onPress?: () => void; pad?: number; size?: number
}) {
  const { c } = useTheme()
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: pad, opacity: pressed ? 0.7 : 1 })}>
      <Ic name={icon} tone={tone} size={size} r={size > 38 ? 12 : 11} iconSize={size > 38 ? 19 : 17} />
      <View style={{ flex: 1, gap: 4 }}>
        {size <= 36 ? <T v="s" w={600}>{title}</T> : <T v="h4" style={{ fontSize: 15 }}>{title}</T>}
        {!!sub && <T v="xs" tone="mu">{sub}</T>}
      </View>
      {right === undefined ? <Icon name="chevr" size={18} color={c.muted} /> : right}
    </Pressable>
  )
}

export function TxRow({ icon, name, sub, amount, credit, tone = 'gray', badge, onPress }: {
  icon: IconName; name: string; sub: string; amount: string; credit?: boolean; tone?: Tone; badge?: ReactNode; onPress?: () => void
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Ic name={icon} tone={tone} />
      <View style={{ flex: 1, gap: 4 }}>
        <T v="h4" style={{ fontSize: 14 }} lines={1}>{name}</T>
        <T v="xs" tone="mu" lines={1}>{sub}</T>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <T v="h4" num tone={credit ? 'gr' : 'text'} style={{ fontSize: 14 }}>{(credit ? '+' : '−') + amount}</T>
        {badge}
      </View>
    </Pressable>
  )
}

export const KV = ({ k, v, strong }: { k: string; v: ReactNode; strong?: boolean }) => (
  <Row between gap={12}>
    <T v="s" tone="t2">{k}</T>
    {typeof v === 'string' ? <T v="s" w={strong ? 600 : 400} style={{ flexShrink: 1, textAlign: 'right' }}>{v}</T> : v}
  </Row>
)

// ---------- screens ----------
export function TopBar({ title, back = true, right, left, onBack }: { title?: string; back?: boolean; right?: ReactNode; left?: ReactNode; onBack?: () => void }) {
  return (
    <Row between style={{ height: 52, paddingHorizontal: 20 }}>
      {left || (back ? <IconBtn name="chevl" label="Back" onPress={onBack || (() => (router.canGoBack() ? router.back() : router.replace('/')))} /> : <View style={{ width: 40 }} />)}
      <T v="h4" lines={1} style={{ flex: 1, textAlign: 'center', marginHorizontal: 8 }}>{title || ''}</T>
      {right || <View style={{ width: 40 }} />}
    </Row>
  )
}

/** Screen sets the background, safe area and an optional scroll body with the design's 20pt gutters. */
export function Screen({ children, scroll = true, top, footer, gap = 16, tab, pad = 20, style, bg }: {
  children: ReactNode; scroll?: boolean; top?: ReactNode; footer?: ReactNode; gap?: number; tab?: boolean; pad?: number; style?: StyleProp<ViewStyle>; bg?: string
}) {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  const bottom = tab ? 100 : footer ? 16 : insets.bottom + 24
  return (
    <View style={{ flex: 1, backgroundColor: bg || c.bg, paddingTop: insets.top }}>
      {top}
      <KeyAvoid>
        {scroll ? (
          <KeyboardScroll showsVerticalScrollIndicator={false}
            contentContainerStyle={[{ paddingHorizontal: pad, paddingTop: 8, paddingBottom: bottom, gap }, style]}>
            {children}
          </KeyboardScroll>
        ) : <View style={[{ flex: 1 }, style]}>{children}</View>}
        {footer && <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 16, gap: 10, backgroundColor: bg || c.bg }}>{footer}</View>}
      </KeyAvoid>
    </View>
  )
}

export function Skeleton({ h = 120, style }: { h?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme()
  return <View style={[{ height: h, borderRadius: 20, backgroundColor: c.surface }, style]} />
}

export function ErrorNote({ text, onRetry }: { text: string; onRetry?: () => void }) {
  const { c } = useTheme()
  return (
    <Soft tint={c.red50}>
      <Row gap={10}>
        <Icon name="alert" size={18} color={c.red} />
        <T v="xs" tone="t2" style={{ flex: 1 }}>{text}</T>
        {onRetry && <T v="s" w={600} tone="rd" onPress={onRetry}>Retry</T>}
      </Row>
    </Soft>
  )
}

export const styles = StyleSheet.create({ grow: { flex: 1 } })
