// Keyboard handling shared by every screen and sheet.
//
// Android draws edge to edge, so the window no longer shrinks when the
// keyboard opens. KeyAvoid pads its content by the part of the keyboard that
// overlaps it (on both platforms; if the window did resize, the overlap is
// zero and nothing changes). KeyboardScroll is a ScrollView that, once the
// keyboard is up or another field gets focus, scrolls the focused field into
// the space that is left.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ComponentRef, type ReactNode } from 'react'
import {
  Keyboard, KeyboardAvoidingView, Platform, ScrollView, TextInput,
  type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewProps, type StyleProp, type ViewStyle,
} from 'react-native'

const listeners = new Set<() => void>()
/** focusChanged tells mounted KeyboardScrolls that a field just got focus. kit's Input calls it. */
export function focusChanged() { listeners.forEach((fn) => fn()) }

export function KeyAvoid({ children, style, offset = 0 }: { children: ReactNode; style?: StyleProp<ViewStyle>; offset?: number }) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} keyboardVerticalOffset={offset} style={[{ flex: 1 }, style]}>
      {children}
    </KeyboardAvoidingView>
  )
}

const MARGIN = 24
type SV = ComponentRef<typeof ScrollView>

export const KeyboardScroll = forwardRef<SV, ScrollViewProps>(function KeyboardScroll({ onScroll, onLayout, ...p }, outer) {
  const ref = useRef<SV>(null)
  useImperativeHandle(outer, () => ref.current as SV)
  const y = useRef(0)
  const h = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reveal = useCallback(() => {
    const sv = ref.current
    const input = TextInput.State.currentlyFocusedInput?.()
    const inner = sv?.getInnerViewRef?.()
    if (!sv || !input || !inner || !h.current) return
    try {
      input.measureLayout(inner as never, (_x, top, _w, height) => {
        const bottom = top + height
        if (bottom + MARGIN > y.current + h.current) sv.scrollTo({ y: Math.max(0, bottom + MARGIN - h.current), animated: true })
        else if (top - MARGIN < y.current) sv.scrollTo({ y: Math.max(0, top - MARGIN), animated: true })
      }, () => {})
    } catch { /* the focused field is not inside this scroll view */ }
  }, [])

  const later = useCallback((ms = 80) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(reveal, ms)
  }, [reveal])

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => later(60))
    const onFocus = () => { if (Keyboard.isVisible()) later(120) }
    listeners.add(onFocus)
    return () => { show.remove(); listeners.delete(onFocus); if (timer.current) clearTimeout(timer.current) }
  }, [later])

  return (
    <ScrollView
      ref={ref}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
      scrollEventThrottle={16}
      {...p}
      onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => { y.current = e.nativeEvent.contentOffset.y; onScroll?.(e) }}
      onLayout={(e: LayoutChangeEvent) => {
        const shrank = e.nativeEvent.layout.height < h.current
        h.current = e.nativeEvent.layout.height
        if (shrank && Keyboard.isVisible()) later(30)
        onLayout?.(e)
      }}
    />
  )
})

/** useKeyboardShown is true while the on-screen keyboard is up. */
export function useKeyboardShown() {
  const [shown, setShown] = useState(() => Keyboard.isVisible())
  useEffect(() => {
    const a = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setShown(true))
    const b = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setShown(false))
    return () => { a.remove(); b.remove() }
  }, [])
  return shown
}
