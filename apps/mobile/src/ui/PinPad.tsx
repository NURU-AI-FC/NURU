// Number keypad and PIN indicators from the design (.key, .dot, .pinbox).
import * as Haptics from 'expo-haptics'
import { Platform, Pressable, Text, View } from 'react-native'
import { font, useTheme } from '../lib/theme'
import { Icon, type IconName } from './Icon'

const tap = () => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}) }

/** Keypad in the p03/p08 style: plain keys, 58pt tall. `boxed` gives the p16 sheet style with filled keys. */
export function Keypad({ onKey, extra, extraIcon, boxed }: { onKey: (k: string) => void; extra?: string; extraIcon?: IconName; boxed?: boolean }) {
  const { c } = useTheme()
  const rows = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['x', '0', 'del']]
  return (
    <View style={{ gap: 8 }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: boxed ? 8 : 0 }}>
          {r.map((k) => {
            const isExtra = k === 'x'
            const label = isExtra ? extra : k
            const empty = isExtra && !extra && !extraIcon
            return (
              <Pressable key={k} disabled={empty} accessibilityRole="button" accessibilityLabel={k === 'del' ? 'Delete' : label || k}
                onPress={() => { tap(); onKey(isExtra ? (extra || 'bio') : k) }}
                style={({ pressed }) => ({
                  flex: 1, height: boxed ? 48 : 58, borderRadius: boxed ? 12 : 16, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: boxed && !empty ? c.surface : pressed ? c.surface : 'transparent',
                })}>
                {k === 'del' ? <Icon name={boxed ? 'delete' : 'chevl'} size={boxed ? 22 : 24} color={c.text} />
                  : isExtra && extraIcon ? <Icon name={extraIcon} size={26} color={c.red} />
                  : <Text style={{ fontSize: boxed ? 20 : 26, fontFamily: font[boxed ? 600 : 500], color: c.text }}>{label}</Text>}
              </Pressable>
            )
          })}
        </View>
      ))}
    </View>
  )
}

export function PinDots({ n, total = 4 }: { n: number; total?: number }) {
  const { c } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center' }}>
      {Array.from({ length: total }, (_, i) => <View key={i} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: i < n ? c.red : c.surface2 }} />)}
    </View>
  )
}

/** Boxes used in the first transfer sheet (p16): the next box is outlined in red. */
export function PinBoxes({ n, total = 4, digits }: { n: number; total?: number; digits?: string }) {
  const { c } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: total > 4 ? 8 : 12, justifyContent: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{
          width: total > 4 ? 50 : 56, height: total > 4 ? 60 : 62, borderRadius: 14, borderWidth: 1.5,
          borderColor: i === n ? c.red : c.border, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center',
        }}>
          {digits ? <Text style={{ fontSize: 24, fontFamily: font[700], color: c.text }}>{digits[i] || ''}</Text>
            : i < n ? <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c.text }} /> : null}
        </View>
      ))}
    </View>
  )
}

/** Applies a keypad key to a numeric string with a max length. */
export function applyKey(cur: string, k: string, max: number) {
  if (k === 'del') return cur.slice(0, -1)
  if (/^\d$/.test(k)) return cur.length < max ? cur + k : cur
  return cur
}
