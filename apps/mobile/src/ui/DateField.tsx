// A date or time field that opens the platform picker: the Material dialog on
// Android, an inline picker on iOS and the browser's own input on the web.
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { createElement, useState } from 'react'
import { Keyboard, Platform, Pressable, View } from 'react-native'
import { clock, dayName, monthName } from '../lib/format'
import { font, useTheme } from '../lib/theme'
import { Icon } from './Icon'
import { T } from './kit'

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const longDate = (d: Date) => `${dayName(d)} ${d.getDate()} ${monthName(d)} ${d.getFullYear()}`

export function DateField({ value, onChange, mode = 'date', minimumDate, placeholder, onClear }: {
  value: Date | null; onChange: (d: Date) => void; mode?: 'date' | 'time'; minimumDate?: Date; placeholder?: string; onClear?: () => void
}) {
  const { c, dark } = useTheme()
  const [ios, setIos] = useState(false)
  const shown = value || new Date()
  const label = value ? (mode === 'date' ? longDate(value) : clock(value)) : placeholder || (mode === 'date' ? 'Pick a date' : 'Add a time')
  const box = { height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: ios ? c.red : c.border, backgroundColor: dark ? c.surface : c.bg, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, paddingHorizontal: 14 }

  // merge the picked part into the current value so a date keeps its time and the other way round
  const merge = (d: Date) => {
    const out = new Date(shown)
    if (mode === 'date') out.setFullYear(d.getFullYear(), d.getMonth(), d.getDate())
    else out.setHours(d.getHours(), d.getMinutes(), 0, 0)
    return out
  }

  if (Platform.OS === 'web') {
    return (
      <View style={box}>
        <Icon name={mode === 'date' ? 'calendar' : 'clock'} size={18} color={c.muted} />
        {createElement('input', {
          type: mode,
          value: value ? (mode === 'date' ? ymd(value) : `${pad(value.getHours())}:${pad(value.getMinutes())}`) : '',
          min: mode === 'date' && minimumDate ? ymd(minimumDate) : undefined,
          'aria-label': mode === 'date' ? 'Date' : 'Time',
          onChange: (e: { target: { value: string } }) => {
            const v = e.target.value
            if (!v) return
            if (mode === 'date') { const [y, m, d] = v.split('-').map(Number); onChange(merge(new Date(y, m - 1, d))) }
            else { const [h, mi] = v.split(':').map(Number); const t = new Date(); t.setHours(h, mi); onChange(merge(t)) }
          },
          style: { flex: 1, border: 0, outline: 'none', background: 'transparent', color: c.text, fontFamily: font[400], fontSize: 15, colorScheme: dark ? 'dark' : 'light' },
        })}
        {onClear && value && <Pressable onPress={onClear} hitSlop={8} accessibilityLabel="Clear"><Icon name="x" size={16} color={c.muted} /></Pressable>}
      </View>
    )
  }

  function open() {
    Keyboard.dismiss()
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: shown, mode, minimumDate, is24Hour: false,
        onValueChange: (_e, d) => onChange(merge(d)),
      })
    } else setIos((v) => !v)
  }

  return (
    <View style={{ gap: 8 }}>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={mode === 'date' ? `Date, ${label}` : `Time, ${label}`} style={box}>
        <Icon name={mode === 'date' ? 'calendar' : 'clock'} size={18} color={value ? c.text : c.muted} />
        <T v="b" tone={value ? 'text' : 'mu'} style={{ flex: 1 }}>{label}</T>
        {onClear && value
          ? <Pressable onPress={() => { setIos(false); onClear() }} hitSlop={8} accessibilityLabel="Clear"><Icon name="x" size={16} color={c.muted} /></Pressable>
          : <Icon name="chevd" size={18} color={c.muted} />}
      </Pressable>
      {Platform.OS === 'ios' && ios && (
        <DateTimePicker value={shown} mode={mode} display={mode === 'date' ? 'inline' : 'spinner'} minimumDate={minimumDate} accentColor={c.red}
          themeVariant={dark ? 'dark' : 'light'} onValueChange={(_e, d) => { onChange(merge(d)); if (mode === 'date') setIos(false) }} />
      )}
    </View>
  )
}
