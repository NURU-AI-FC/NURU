import { Pressable, View } from 'react-native'
import { useApp } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { Icon } from '@/ui/Icon'
import { Radio, Row, Screen, Soft, T, TopBar } from '@/ui/kit'

const CUR: [string, string, string][] = [['₦', 'NGN', 'Nigerian naira'], ['$', 'USD', 'US dollar'], ['£', 'GBP', 'British pound'], ['€', 'EUR', 'Euro'], ['C$', 'CAD', 'Canadian dollar'], ['₵', 'GHS', 'Ghana cedi']]

// p12 "04 Display currency" with live rates from /fx.
export default function Currency() {
  const { c } = useTheme()
  const { t, user, rates, update, toast } = useApp()
  const cur = user?.currency || 'NGN'
  const naira = (code: string) => {
    const r = rates[code]
    return r ? '₦' + (1 / r).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
  }
  return (
    <Screen gap={10} top={<TopBar title={t('currency')} />}>
      <T v="s" tone="t2">Balances and charts show in this currency. Transfers still go in naira.</T>
      <Soft><Row gap={8}><Icon name="refresh" size={16} color={c.green} /><T v="xs" tone="t2">Live rates, refreshed when the app opens</T></Row></Soft>
      {CUR.filter(([, code]) => code === 'NGN' || rates[code]).map(([sym, code, name]) => (
        <Pressable key={code} onPress={() => update({ currency: code }).catch((e) => toast((e as Error).message))} accessibilityRole="radio" accessibilityState={{ selected: cur === code }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}><T w={700} style={{ fontSize: 15 }}>{sym}</T></View>
          <View style={{ flex: 1, gap: 4 }}><T v="s" w={600}>{code}</T><T v="xs" tone="mu">{name}</T></View>
          <T v="xs" tone="t2" num>{naira(code)}</T>
          <Radio on={cur === code} />
        </Pressable>
      ))}
    </Screen>
  )
}
