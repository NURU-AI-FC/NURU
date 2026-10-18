import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { langNames } from '@/i18n'
import type { Account } from '@/lib/api'
import { useApp } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { useLoad } from '@/lib/useLoad'
import { Icon, type IconName } from '@/ui/Icon'
import { Avatar, Button, Card, Ic, Label, ListRow, Row, Screen, T, Toggle, TopBar } from '@/ui/kit'
import { Sheet } from '@/ui/Sheet'

// p12 "01 Settings" as the More tab, with the money tools listed first.
export default function More() {
  const { c, pref } = useTheme()
  const { user, t, tabs, lang, signOut } = useApp()
  const accts = useLoad<{ accounts: Account[] }>('/accounts').data?.accounts
  const unread = useLoad<{ unread: number }>('/notifications?count=1').data?.unread || 0
  const [logout, setLogout] = useState(false)
  const [all, setAll] = useState(false)
  const val = (s: string) => <Row gap={6}><T v="xs" tone="t2">{s}</T><Icon name="chevr" size={18} color={c.muted} /></Row>
  const go = (p: string) => () => router.push(p as never)
  const item = (icon: IconName, title: string, path: string, right?: React.ReactNode, tone: 'gray' | 'red' = 'gray') =>
    <ListRow key={title} icon={icon} title={title} tone={tone} size={36} pad={6} onPress={go(path)} right={right} />

  return (
    <Screen tab gap={8} top={<TopBar title={tabs.more} back={false} />}>
      <Card pad={14} onPress={go('/settings/profile')}>
        <Row gap={12}>
          <Avatar name={user?.name || 'NURU'} size={48} bg={c.red} />
          <View style={{ flex: 1, gap: 4 }}>
            <T v="h4">{user?.name}</T>
            <T v="xs" tone="mu">{user?.kyc_verified ? 'Tier 2 verified' : 'Not verified yet'} · {user?.business_name ? 'Personal and business' : 'Personal'}</T>
          </View>
          <Icon name="chevr" size={18} color={c.muted} />
        </Row>
      </Card>

      <Label style={{ marginTop: 8 }}>Your money</Label>
      {item('wallet', t('connectedAccounts'), '/accounts', val(String(accts?.length ?? '')))}
      {item('briefcase', t('business'), '/business', val(user?.business_name ? 'On' : 'Set up'), 'red')}
      {item('calendar', t('planner'), '/planner')}
      {item('bell', t('notificationsTitle'), '/notifications', unread ? <Row gap={6}><View style={{ minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: c.red, alignItems: 'center', justifyContent: 'center' }}><T v="xs" w={700} color="#FFFFFF">{unread}</T></View><Icon name="chevr" size={18} color={c.muted} /></Row> : undefined)}
      {item('history', t('historyTitle'), '/history')}
      {item('pin', t('branches'), '/branches')}

      <Label style={{ marginTop: 8 }}>Preferences</Label>
      {item('sun', t('appearance'), '/settings/appearance', val(pref === 'system' ? 'System' : pref === 'dark' ? 'Dark' : 'Light'))}
      {item('globe', t('languageVoice'), '/settings/language', val(langNames[lang]))}
      {item('exchange', t('currency'), '/settings/currency', val(user?.currency || 'NGN'))}

      <Label style={{ marginTop: 8 }}>Security and privacy</Label>
      {item('shield', t('security'), '/settings/security')}
      {item('eye', t('privacy'), '/settings/privacy')}

      <Row gap={12} style={{ marginTop: 6 }}>
        {([['book', 'Learn', () => router.push('/settings/help')], ['help', 'Help', () => router.push('/settings/help')], ['logout', 'Log out', () => setLogout(true)]] as [IconName, string, () => void][]).map(([ic, l, fn], i) => (
          <Pressable key={l} onPress={fn} style={{ flex: 1 }}>
            <Card pad={12} style={{ alignItems: 'center', gap: 6 }}>
              <Ic name={ic} tone={i === 2 ? 'red' : 'gray'} size={36} r={11} iconSize={17} />
              <T v="xs" w={600}>{l}</T>
            </Card>
          </Pressable>
        ))}
      </Row>

      <Sheet open={logout} onClose={() => setLogout(false)}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Ic name="logout" tone="red" size={56} r={18} iconSize={24} />
          <T v="h3">{t('logoutAsk')}</T>
          <T v="s" tone="t2" center>You will need your password to sign in again. Your chats stay saved.</T>
        </View>
        <Row gap={12}>
          <View style={{ flex: 1, gap: 4 }}><T v="s" w={600}>Log out on all devices</T><T v="xs" tone="mu">Also signs out the web app</T></View>
          <Toggle on={all} onChange={setAll} label="Log out on all devices" />
        </Row>
        <Button label="Log out" onPress={async () => { setLogout(false); await signOut(all); router.replace('/welcome') }} />
        <Button label="Cancel" variant="sec" onPress={() => setLogout(false)} />
      </Sheet>
    </Screen>
  )
}
