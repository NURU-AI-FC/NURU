import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { langNames } from '@/i18n'
import type { Lang } from '@/lib/api'
import { useApp } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { Icon } from '@/ui/Icon'
import { Card, Label, Radio, Row, Screen, Soft, T, Toggle, TopBar } from '@/ui/kit'

const NATIVE: Record<Lang, string> = { en: 'English', yo: 'Èdè Yorùbá', ig: 'Asụsụ Igbo', ha: 'Harshen Hausa' }
const SAMPLE: Record<Lang, string> = {
  en: 'Good morning. You spent less this week than last week.',
  yo: 'Ẹ kú àárọ̀. Owó tí o ná lọ́sẹ̀ yìí dín sí ti ọ̀sẹ̀ tó kọjá.',
  ig: 'Ụtụtụ ọma. I mefuru obere ego n’izu a karịa izu gara aga.',
  ha: 'Barka da safiya. Kun kashe ƙasa a wannan makon fiye da makon jiya.',
}

// p12 "03 Language and voice". Voice playback is not wired on mobile yet.
export default function Language() {
  const { c } = useTheme()
  const { t, lang, update, user, toast } = useApp()
  const [aloud, setAloud] = useState(true)
  const [hold, setHold] = useState(true)
  const pick = async (l: Lang) => { try { if (user) await update({ language: l }) } catch (e) { toast((e as Error).message) } }

  return (
    <Screen gap={10} top={<TopBar title={t('languageVoice')} />}>
      <Label>App and NURU language</Label>
      {(Object.keys(langNames) as Lang[]).map((l) => (
        <Pressable key={l} onPress={() => pick(l)} accessibilityRole="radio" accessibilityState={{ selected: lang === l }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: lang === l ? c.red : c.border }}>
          <View style={{ flex: 1, gap: 4 }}><T v="s" w={600}>{langNames[l]}</T><T v="xs" tone="mu">{NATIVE[l]}</T></View>
          <Radio on={lang === l} />
        </Pressable>
      ))}
      <Label style={{ marginTop: 4 }}>Voice</Label>
      <Card style={{ gap: 12 }}>
        <Row gap={12}><T v="s" style={{ flex: 1 }}>Voice</T><T v="xs" tone="t2">Female · Ayọ̀</T><Icon name="chevr" size={18} color={c.muted} /></Row>
        <Row gap={12}><T v="s" style={{ flex: 1 }}>Speaking speed</T><T v="xs" tone="t2">Normal</T><Icon name="chevr" size={18} color={c.muted} /></Row>
        <Row gap={12}><T v="s" style={{ flex: 1 }}>Read answers aloud</T><Toggle on={aloud} onChange={setAloud} label="Read answers aloud" /></Row>
        <Row gap={12}><T v="s" style={{ flex: 1 }}>Hold to talk</T><Toggle on={hold} onChange={setHold} label="Hold to talk" /></Row>
      </Card>
      <Soft>
        <Row gap={10}>
          <Icon name="volume" size={18} color={c.red} />
          <T v="xs" tone="t2" style={{ flex: 1 }}>{SAMPLE[lang]}</T>
          <T v="xs" w={600} tone="rd" onPress={() => toast('Voice playback is coming to the mobile app.')}>Play</T>
        </Row>
      </Soft>
    </Screen>
  )
}
