import { useState } from 'react'
import { View } from 'react-native'
import { useApp } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { Avatar, Badge, Button, Card, Field, Input, KV, Note, Screen, T, TopBar } from '@/ui/kit'

// Profile: name, contact details and verification state.
export default function Profile() {
  const { c } = useTheme()
  const { user, update, toast } = useApp()
  const [name, setName] = useState(user?.name || '')
  const [busy, setBusy] = useState(false)
  if (!user) return null
  async function save() {
    setBusy(true)
    try { await update({ name: name.trim() }); toast('Profile saved') } catch (e) { toast((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <Screen top={<TopBar title="Profile" />} footer={<Button label="Save" disabled={name.trim().length < 2 || name.trim() === user.name} loading={busy} onPress={save} />}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Avatar name={user.name} size={72} bg={c.red} />
        <T v="h3">{user.name}</T>
        <Badge tone={user.kyc_verified ? 'green' : 'amber'} icon={user.kyc_verified ? 'shieldcheck' : 'alert'} label={user.kyc_verified ? 'Tier 2 verified' : 'Not verified yet'} />
      </View>
      <Field label="Full name"><Input value={name} onChangeText={setName} autoCapitalize="words" /></Field>
      <Card style={{ gap: 12 }}>
        <KV k="Email" v={user.email} />
        <KV k="Phone" v={user.phone || '—'} />
        <KV k="Account type" v={user.business_name ? 'Personal and business' : 'Personal'} />
        {!!user.business_name && <KV k="Business" v={user.business_name} />}
      </Card>
      {!user.kyc_verified && <Note icon="shield">Verify your BVN or NIN on the web app to raise your transfer limits.</Note>}
    </Screen>
  )
}
