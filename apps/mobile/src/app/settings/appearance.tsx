import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { useApp } from '@/lib/store'
import type { ThemePref } from '@/lib/api'
import { useTheme } from '@/lib/theme'
import { Divider, Radio, Row, Screen, T, Toggle, TopBar } from '@/ui/kit'

function Pane({ bg, fg, sub }: { bg: string; fg: string; sub: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingVertical: 10, paddingHorizontal: 8, gap: 4 }}>
      <View style={{ width: 30, height: 5, borderRadius: 3, backgroundColor: fg }} />
      <View style={{ height: 22, borderRadius: 6, backgroundColor: '#E30613', marginTop: 4 }} />
      <View style={{ height: 8, borderRadius: 3, backgroundColor: sub, marginTop: 4 }} />
      <View style={{ height: 8, borderRadius: 3, backgroundColor: sub }} />
    </View>
  )
}

// p12 "02 Appearance": three preview tiles; System follows the phone.
export default function Appearance() {
  const { c, pref, setPref } = useTheme()
  const { t, update, user } = useApp()
  const [extra, setExtra] = useState({ hide: false, large: false, motion: false })
  const light = <Pane bg="#FFFFFF" fg="#141416" sub="#EFEFF2" />
  const dark = <Pane bg="#0D0D0F" fg="#F5F5F7" sub="#26262B" />
  const pick = (p: ThemePref) => { setPref(p); if (user) update({ theme: p }).catch(() => {}) }

  return (
    <Screen top={<TopBar title={t('appearance')} />}>
      <T v="s" tone="t2">Choose how NURU looks. System follows your phone setting.</T>
      <Row gap={12}>
        {([['light', t('light'), light], ['dark', t('dark'), dark], ['system', t('system'), <>{light}{dark}</>]] as [ThemePref, string, React.ReactNode][]).map(([k, l, p]) => (
          <Pressable key={k} onPress={() => pick(k)} accessibilityRole="radio" accessibilityState={{ selected: pref === k }} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', width: '100%', height: 96, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: pref === k ? c.red : c.border }}>{p}</View>
            <T v="s" w={pref === k ? 600 : 400} tone={pref === k ? 'text' : 't2'}>{l}</T>
            <Radio on={pref === k} />
          </Pressable>
        ))}
      </Row>
      <Divider />
      {([['hide', 'Hide balances on open', 'Tap the eye to show them'], ['large', 'Larger text', 'Easier reading for long answers'], ['motion', 'Reduce motion', 'Fewer chart animations']] as ['hide' | 'large' | 'motion', string, string][]).map(([k, title, sub]) => (
        <Row key={k} gap={12}>
          <View style={{ flex: 1, gap: 4 }}><T v="s" w={600}>{title}</T><T v="xs" tone="mu">{sub}</T></View>
          <Toggle on={extra[k]} onChange={(v) => setExtra({ ...extra, [k]: v })} label={title} />
        </Row>
      ))}
    </Screen>
  )
}
