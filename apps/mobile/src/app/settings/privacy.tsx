import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Share, View } from 'react-native'
import { api, type Account, type Prefs } from '@/lib/api'
import { useApp } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { useLoad } from '@/lib/useLoad'
import { Icon } from '@/ui/Icon'
import { Button, Card, Ic, Label, ListRow, Row, Screen, Skeleton, Soft, T, Toggle, TopBar } from '@/ui/kit'
import { Sheet } from '@/ui/Sheet'

// p12 "06 Privacy and data".
export default function Privacy() {
  const { c } = useTheme()
  const { t, toast } = useApp()
  const [p, setP] = useState<Prefs | null>(null)
  const [del, setDel] = useState(false)
  const accts = useLoad<{ accounts: Account[] }>('/accounts').data?.accounts || []
  const viaMono = accts.filter((a) => a.linked_via.includes('mono')).length
  useEffect(() => { api<Prefs>('/me/prefs').then(setP).catch(() => setP({})) }, [])
  async function set(patch: Prefs) {
    setP({ ...p, ...patch })
    try { setP(await api<Prefs>('/me/prefs', { method: 'PATCH', body: patch })) } catch (e) { toast((e as Error).message) }
  }
  async function download() {
    try { const d = await api('/me/export'); await Share.share({ title: 'NURU data', message: JSON.stringify(d, null, 2).slice(0, 90000) }) } catch (e) { toast((e as Error).message) }
  }
  async function clear() {
    setDel(false)
    try { await api('/chat', { method: 'DELETE' }); toast('Chat history deleted') } catch (e) { toast((e as Error).message) }
  }

  return (
    <Screen gap={12} top={<TopBar title={t('privacy')} />}>
      <Soft tint={c.green50}><Row gap={10}><Icon name="lock" size={18} color={c.green} /><T v="xs" tone="t2" style={{ flex: 1 }}>Your chats with NURU are encrypted and only you can read them. Zenith staff cannot see them.</T></Row></Soft>
      <Label>NURU AI</Label>
      <Card style={{ gap: 12 }}>
        {!p ? <Skeleton h={130} /> : ([
          ['save_chats', 'Save chat history', 'Turning this off deletes saved chats'],
          ['use_insights', 'Use my data for insights', 'Only inside your account'],
          ['improve', 'Help improve NURU', 'Anonymous, never your name or BVN'],
        ] as const).map(([k, title, sub]) => (
          <Row key={k} gap={12}>
            <View style={{ flex: 1, gap: 4 }}><T v="s" w={600}>{title}</T><T v="xs" tone="mu">{sub}</T></View>
            <Toggle on={!!p[k]} onChange={(v) => set({ [k]: v })} label={title} />
          </Row>
        ))}
      </Card>
      <Label>Your data</Label>
      <View>
        <ListRow icon="download" title="Download my data" sub="Transactions, chats and settings as a file" size={36} pad={10} onPress={download} />
        <ListRow icon="link" title="Apps with access" sub={viaMono ? `Mono open banking (sandbox), ${viaMono} account${viaMono === 1 ? '' : 's'}` : 'None'} size={36} pad={10} onPress={() => router.push('/accounts')} />
        <ListRow icon="trash" title="Delete chat history" tone="red" size={36} pad={10} onPress={() => setDel(true)} />
      </View>
      <T v="xs" tone="mu">NURU follows the Nigeria Data Protection Act 2023.</T>

      <Sheet open={del} onClose={() => setDel(false)}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Ic name="trash" tone="red" size={56} r={18} iconSize={24} />
          <T v="h3">Delete chat history?</T>
          <T v="s" tone="t2" center>Every conversation with NURU is removed. This cannot be undone.</T>
        </View>
        <Button label="Delete" onPress={clear} />
        <Button label="Cancel" variant="sec" onPress={() => setDel(false)} />
      </Sheet>
    </Screen>
  )
}
