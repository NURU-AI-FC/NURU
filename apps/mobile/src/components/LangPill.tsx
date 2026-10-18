import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { langNames } from '@/i18n'
import type { Lang } from '@/lib/api'
import { useApp } from '@/lib/store'
import { font, useTheme } from '@/lib/theme'
import { Icon } from '@/ui/Icon'
import { Radio, Row, T } from '@/ui/kit'
import { Sheet } from '@/ui/Sheet'

const GREETINGS: Record<Lang, string> = {
  en: 'Hello! Let’s understand your money.',
  yo: 'Ẹ káàbọ̀! Ẹ jẹ́ ká mọ owó yín.',
  ig: 'Nnọọ! Ka anyị ghọta ego gị.',
  ha: 'Sannu! Mu fahimci kuɗin ka.',
}

/** Language pill from the welcome and sign in screens; opens a picker sheet. */
export function LangPill() {
  const { c } = useTheme()
  const { lang, update } = useApp()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Change language"
        style={{ height: 34, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
        <Icon name="globe" size={15} color={c.text2} />
        <Text style={{ fontSize: 13, fontFamily: font[500], color: c.text2 }}>{langNames[lang]}</Text>
        <Icon name="chevd" size={14} color={c.text2} />
      </Pressable>
      <LanguageSheet open={open} onClose={() => setOpen(false)} value={lang} onPick={(l) => { update({ language: l }); setOpen(false) }} />
    </>
  )
}

export function LanguageSheet({ open, onClose, value, onPick }: { open: boolean; onClose: () => void; value: Lang; onPick: (l: Lang) => void }) {
  const { c } = useTheme()
  return (
    <Sheet open={open} onClose={onClose}>
      <T v="h3">Choose your language</T>
      <T v="s" tone="t2" style={{ marginTop: -8 }}>NURU will speak, write and explain your money in this language.</T>
      {(Object.keys(langNames) as Lang[]).map((l) => {
        const on = l === value
        return (
          <Pressable key={l} onPress={() => onPick(l)}
            style={{ padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: on ? c.red : c.border, backgroundColor: on ? c.red50 : 'transparent' }}>
            <Row gap={12}>
              <View style={{ flex: 1, gap: 4 }}><T v="s" w={600}>{langNames[l]}</T><T v="xs" tone="mu">{GREETINGS[l]}</T></View>
              <Radio on={on} />
            </Row>
          </Pressable>
        )
      })}
    </Sheet>
  )
}
