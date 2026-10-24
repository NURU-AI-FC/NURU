import { Share, View } from 'react-native'
import type { Account, Receipt } from '@/lib/api'
import { BANK } from '@/lib/bank'
import { clock, shortDate } from '@/lib/format'
import { useMoney } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { Icon } from '@/ui/Icon'
import { Badge, Button, Card, Chip, KV, Row, T } from '@/ui/kit'

export const BANKS = [BANK.name, 'GTBank', 'Access Bank', 'First Bank', 'UBA', 'OPay', 'Kuda', 'Moniepoint', 'PalmPay', 'Wema Bank']

export function AccountPicker({ accts, value, onChange }: { accts: Account[]; value: string; onChange: (id: string) => void }) {
  const money = useMoney()
  return (
    <Row gap={8} style={{ flexWrap: 'wrap' }}>
      {accts.filter((a) => a.kind !== 'business').map((a) => (
        <Chip key={a.id} label={`${a.name} · ${money(a.balance, { compact: true })}`} on={a.id === value} onPress={() => onChange(a.id)} />
      ))}
    </Row>
  )
}

/** p08 "07 Transfer receipt" */
export function ReceiptView({ r, detail, onDone }: { r: Receipt; detail?: string; onDone: () => void }) {
  const { c } = useTheme()
  const money = useMoney()
  const at = r.at ? new Date(r.at) : new Date()
  const text = ['NURU receipt (sandbox)', `Sent: ${money(r.amount)} to ${r.to}`, `Reference: ${r.reference}`, r.session_id ? `Session ID: ${r.session_id}` : '', `Date: ${shortDate(at)} ${at.getFullYear()}, ${clock(at)}`, `Fee: ${money(r.fee || 0)}`, 'Status: Successful'].filter(Boolean).join('\n')
  return (
    <View style={{ gap: 16 }}>
      <View style={{ alignItems: 'center', gap: 10, marginTop: 24 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: c.green50, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={40} color={c.green} stroke={2.6} /></View>
        <T v="h2" style={{ marginTop: 6 }}>Sent</T>
        <T num w={700} style={{ fontSize: 36, lineHeight: 44, letterSpacing: -0.8 }}>{money(r.amount)}</T>
        <T v="s" tone="t2">to {r.to}{detail ? ` · ${detail}` : ''}</T>
      </View>
      <Card style={{ gap: 12, marginTop: 6 }}>
        <KV k="Reference" v={r.reference} />
        {!!r.session_id && <KV k="Session ID" v={r.session_id} />}
        <KV k="Date" v={`${shortDate(at)} ${at.getFullYear()}, ${clock(at)}`} />
        <KV k="Fee" v={money(r.fee || 0)} />
        <KV k="Status" v={<Badge tone="green" label="Successful" />} />
      </Card>
      <Row gap={10}>
        <Button label="Receipt" variant="sec" icon="download" grow onPress={() => Share.share({ message: text, title: 'NURU receipt' })} />
        <Button label="Share" variant="sec" icon="send" grow onPress={() => Share.share({ message: text, title: 'NURU receipt' })} />
      </Row>
      <Button label="Done" onPress={onDone} />
    </View>
  )
}
