import { useState } from 'react'
import { View } from 'react-native'
import { BankTile } from '@/components/BankTile'
import { LinkBank } from '@/components/LinkBank'
import { api, type Account } from '@/lib/api'
import { useApp, useMoney } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { useLoad } from '@/lib/useLoad'
import { Badge, Button, Card, ErrorNote, IconBtn, Note, Row, Screen, Skeleton, T, TopBar } from '@/ui/kit'

// p05 "04 Accounts" with the disconnect actions from p12 "07 Linked accounts".
export default function Accounts() {
  const { c } = useTheme()
  const { t, toast } = useApp()
  const money = useMoney()
  const { data, error, reload } = useLoad<{ accounts: Account[]; total: number }>('/accounts')
  const [linking, setLinking] = useState(false)
  const net = data?.accounts.reduce((s, a) => s + a.balance, 0) || 0
  const have = (data?.accounts || []).filter((a) => a.kind !== 'business').map((a) => a.bank)
  async function drop(a: Account) {
    try { await api('/accounts/' + a.id, { method: 'DELETE' }); toast(`${a.name} disconnected`); reload() } catch (e) { toast((e as Error).message) }
  }

  return (
    <Screen top={<TopBar title={t('connectedAccounts')} right={<IconBtn name="plus" label="Link account" onPress={() => setLinking(true)} />} />}
      footer={<Button label={t('linkAnother')} variant="out" icon="link" onPress={() => setLinking(true)} />}>
      {error ? <ErrorNote text={error} onRetry={reload} /> : null}
      <Card style={{ gap: 6 }}>
        <T v="xs" tone="mu">{t('netWorth')}</T>
        <T v="h1" num>{data ? money(net) : '—'}</T>
        <T v="xs" w={600} tone="gr">{data ? `${data.accounts.length} accounts linked, read only` : ' '}</T>
      </Card>
      {data ? data.accounts.map((a) => (
        <Card key={a.id} pad={14} style={{ gap: 12 }}>
          <Row gap={12}>
            <BankTile bank={a.bank} />
            <View style={{ flex: 1, gap: 4 }}><T v="s" w={600}>{a.name}</T><T v="xs" tone="mu">{a.bank} · {a.number}</T></View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <T v="s" w={600} num>{money(a.balance)}</T>
              <Badge label={a.kind === 'business' ? 'Business' : a.linked_via.includes('mono') ? 'Read only' : 'Main'} tone={a.kind === 'business' ? 'blue' : a.linked_via.includes('mono') ? 'gray' : 'green'} />
            </View>
          </Row>
          <Row between>
            <T v="xs" tone="t2">Synced just now · {a.linked_via}</T>
            <T v="xs" w={600} tone="rd" onPress={() => drop(a)}>Disconnect</T>
          </Row>
        </Card>
      )) : <Skeleton h={240} />}
      <Note icon="info" iconColor={c.blue}>Links run through the Mono sandbox: pick any bank, use test login details, and six months of sample history arrives.</Note>
      <LinkBank open={linking} have={have} onClose={() => setLinking(false)} onLinked={reload} />
    </Screen>
  )
}
