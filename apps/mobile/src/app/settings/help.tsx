import { router } from 'expo-router'
import { useState } from 'react'
import { Linking, Pressable, View } from 'react-native'
import { SUPPORT_TEL } from '@/components/TransferGuard'
import { useApp } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { Icon } from '@/ui/Icon'
import { Card, Ic, Input, Label, ListRow, Row, Screen, T, TopBar } from '@/ui/kit'

const FAQ: [string, string][] = [
  ['A transfer failed but I was debited', 'Most failed transfers reverse within 24 hours. If it has not, tap Chat with us and share the reference on your receipt.'],
  ['How do I reset my transaction PIN?', 'Go to More, then Security, then Change PIN. You will need your current PIN. If you forgot it, call 0201 278 7000.'],
  ['Why was my transfer held for a face check?', 'Every transfer needs your PIN and a face match against the face you set up. After three failed tries transfers pause for 30 minutes to protect you. Check you are in good light and try again.'],
  ['How does NURU keep my chats private?', 'Chats are stored encrypted under your account. You can turn off chat history or delete it in Privacy and data.'],
  ['How do I link another bank account?', 'Open Connected accounts from More. On the sandbox you can link the demo bank in one tap.'],
]

// p12 "09 Help and support".
export default function Help() {
  const { c } = useTheme()
  const { t } = useApp()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(-1)
  const list = FAQ.filter(([k, v]) => !q.trim() || (k + v).toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <Screen gap={12} top={<TopBar title={t('help')} />}>
      <Input icon="search" value={q} onChangeText={setQ} placeholder="Search help" round height={46} />
      <Row gap={12}>
        {([['message', 'Chat with us', 'Replies in minutes', () => router.push({ pathname: '/ask', params: { q: 'I need help from customer service' } })], ['phone', 'Call Zenith', '24 hours', () => Linking.openURL(SUPPORT_TEL)]] as const).map(([ic, title, sub, fn]) => (
          <Card key={title} pad={14} onPress={fn} style={{ flex: 1, gap: 8 }}>
            <Ic name={ic} tone="red" size={36} r={11} iconSize={17} />
            <T v="s" w={600}>{title}</T><T v="xs" tone="mu">{sub}</T>
          </Card>
        ))}
      </Row>
      <Label>Popular questions</Label>
      <View>
        {list.map(([k, v], i) => (
          <Pressable key={k} onPress={() => setOpen(open === i ? -1 : i)} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border, gap: 8 }}>
            <Row gap={12}><T v="s" style={{ flex: 1 }}>{k}</T><Icon name={open === i ? 'chevd' : 'chevr'} size={18} color={c.muted} /></Row>
            {open === i && <T v="s" tone="t2">{v}</T>}
          </Pressable>
        ))}
      </View>
      <Label>Report</Label>
      <ListRow icon="alert" title="Report fraud" sub="Freeze transfers in one tap" tone="red" size={36} pad={10} onPress={() => router.push('/settings/security')} />
    </Screen>
  )
}
