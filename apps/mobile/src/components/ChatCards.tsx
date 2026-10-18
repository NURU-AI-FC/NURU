// Action cards that appear in Ask NURU: the drafted transfer (p16, p18 "04"),
// the describe-a-payment card (p18) and a reminder card (p07 "11").
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { api, type Account, type ChatAction, type Payee, type Pending, type PendingTx } from '@/lib/api'
import { when } from '@/lib/format'
import { useApp, useMoney } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { useLoad } from '@/lib/useLoad'
import { Icon } from '@/ui/Icon'
import { Avatar, Badge, Button, Card, Chip, Ic, Input, KV, Label, Row, T } from '@/ui/kit'
import { BANKS } from './pay'
import { TransferGuard, type Draft } from './TransferGuard'

export const IN_LABELS = ['Salary', 'Business sale', 'Family support', 'Refund', 'Loan', 'Other']
export const OUT_LABELS = ['Food', 'Transport', 'Shopping', 'Bills', 'Family', 'Other']
export type Described = Pending & { label: string; purpose: string; category: string }

export const askLine = (p: PendingTx, money: (n: number) => string) => p.direction === 'credit'
  ? `You received ${money(p.amount)} from ${p.merchant} ${when(p.at).startsWith('Today') ? 'today' : 'on ' + when(p.at)}, but it came with no description. What was it for? I will remember it when I plan your month.`
  : `${money(p.amount)} left your ${p.account} account at ${p.merchant} ${when(p.at).startsWith('Today') ? 'today' : 'on ' + when(p.at)} with no description. What was it for?`

const indent = { marginLeft: 36 }

export function DescribeCard({ item, onSaved }: { item: PendingTx; onSaved: (r: Described) => void }) {
  const { c } = useTheme()
  const money = useMoney()
  const { toast } = useApp()
  const credit = item.direction === 'credit'
  const [label, setLabel] = useState('')
  const [purpose, setPurpose] = useState('')
  const [busy, setBusy] = useState(false)
  const ok = !!label || purpose.trim().length >= 2
  async function save() {
    setBusy(true)
    try { onSaved(await api<Described>(`/transactions/${item.id}/describe`, { body: { label, purpose: purpose.trim() } })) } catch (e) { toast((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <Card pad={14} style={[indent, { gap: 12 }]}>
      <Row between><Label>Needs a description</Label><Badge tone={credit ? 'green' : 'red'} label={credit ? 'Money in' : 'Money out'} /></Row>
      <Row gap={12}>
        <Ic name={credit ? 'down' : 'up'} tone={credit ? 'green' : 'red'} size={40} r={12} iconSize={18} />
        <View style={{ flex: 1, gap: 4 }}><T v="s" w={600}>{item.merchant}</T><T v="xs" tone="mu">{when(item.at)} · no narration</T></View>
        <T v="s" w={600} num tone={credit ? 'gr' : 'text'}>{(credit ? '+' : '−') + money(item.amount)}</T>
      </Row>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {(credit ? IN_LABELS : OUT_LABELS).map((l) => <Chip key={l} label={l} on={label === l} onPress={() => setLabel(label === l ? '' : l)} />)}
      </Row>
      <Input height={44} value={purpose} onChangeText={setPurpose} maxLength={200} placeholder="Describe it in your own words" />
      <Button sm label="Save description" onPress={save} loading={busy} disabled={!ok} />
      <Row gap={6}><Icon name="lock" size={12} color={c.muted} /><T v="xs" tone="mu">Encrypted. Only you and NURU can read it.</T></Row>
    </Card>
  )
}

export function TransferCard({ action, onSent }: { action: ChatAction; onSent: (text: string) => void }) {
  const { c } = useTheme()
  const money = useMoney()
  const payees = useLoad<Payee[]>('/payees').data
  const accts = useLoad<{ accounts: Account[] }>('/accounts').data?.accounts.filter((a) => a.kind !== 'business')
  const [from, setFrom] = useState('')
  const [guard, setGuard] = useState(false)
  const [ref, setRef] = useState('')
  const [pick, setPick] = useState(action.new ? 'new' : '')
  const [bank, setBank] = useState(BANKS[2])
  const [account, setAccount] = useState('')
  const [name, setName] = useState('')
  const [note, setNote] = useState(action.note || '')
  const [amt, setAmt] = useState(action.amount ? String(action.amount) : '')
  const [save, setSave] = useState(true)
  const payee = pick === 'new' ? undefined : payees?.find((p) => (pick ? p.id === pick : p.name === action.payee))
  const acct = accts?.find((a) => a.id === from) || accts?.[0]
  if (!payees || !acct) return null
  const fresh = !payee
  const amount = Number(amt) || 0
  const ready = amount > 0 && note.trim().length >= 2 && acct.balance >= amount && (!fresh || (account.length === 10 && name.trim().length >= 2))
  const draft: Draft = payee
    ? { from: acct.id, payeeId: payee.id, toName: payee.name, toBank: payee.bank, amount, note: note.trim() }
    : { from: acct.id, toName: name.trim(), toBank: bank, toAccount: account, amount, note: note.trim() }
  const lock = !!ref
  const cycleAcct = () => { const i = accts!.indexOf(acct); setFrom(accts![(i + 1) % accts!.length].id) }
  return (
    <Card pad={14} style={[indent, { gap: 12 }]}>
      <Row between><Label>{fresh ? 'New recipient' : 'Transfer draft'}</Label><Badge tone="amber" label="Sandbox" /></Row>
      {(action.new || !payee) && !lock && (
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          <Chip label="Someone new" on={pick === 'new' || (!pick && !payee)} onPress={() => setPick('new')} />
          {payees.slice(0, 4).map((p) => <Chip key={p.id} label={p.name.split(/[\s,]+/)[0]} on={payee?.id === p.id} onPress={() => setPick(p.id)} />)}
        </Row>
      )}
      {fresh ? <>
        <View style={{ gap: 6 }}>
          <T v="xs" w={600} tone="t2">Bank</T>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>{BANKS.slice(0, 6).map((b) => <Chip key={b} label={b} on={bank === b} onPress={() => !lock && setBank(b)} />)}</Row>
        </View>
        <View style={{ gap: 6 }}><T v="xs" w={600} tone="t2">Account number</T><Input height={44} value={account} editable={!lock} onChangeText={(v) => setAccount(v.replace(/\D/g, '').slice(0, 10))} keyboardType="number-pad" placeholder="10 digits" /></View>
        <View style={{ gap: 6 }}><T v="xs" w={600} tone="t2">Account name</T><Input height={44} value={name} editable={!lock} onChangeText={setName} maxLength={60} placeholder="As the bank shows it" /></View>
      </> : (
        <Row gap={12}>
          <Avatar name={payee.name} bg={c.blue} />
          <View style={{ flex: 1, gap: 4 }}><T v="s" w={600}>{payee.name}</T><T v="xs" tone="mu">{payee.bank} {payee.account} · {payee.times ? `paid ${payee.times} times` : 'name checked'}</T></View>
        </Row>
      )}
      <View style={{ gap: 6 }}><T v="xs" w={600} tone="t2">What is it for?</T><Input height={44} value={note} editable={!lock} onChangeText={setNote} maxLength={60} placeholder="For example, December rent" /></View>
      {action.amount ? <KV k="Amount" v={<T v="h3" num>{money(amount)}</T>} />
        : <View style={{ gap: 6 }}><T v="xs" w={600} tone="t2">Amount (₦)</T><Input height={44} value={amt} editable={!lock} onChangeText={(v) => setAmt(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" /></View>}
      <KV k="From" v={<Pressable onPress={() => !lock && cycleAcct()}><T v="s" w={600}>{acct.name} {acct.number}{accts!.length > 1 && !lock ? ' ⌄' : ''}</T></Pressable>} />
      <KV k="Balance after" v={<T v="s" w={600} num tone={acct.balance < amount ? 'rd' : 'text'}>{money(acct.balance - amount)}</T>} />
      {fresh && !lock && <Row><Chip label="Save as payee" icon={save ? 'check' : undefined} on={save} onPress={() => setSave(!save)} /></Row>}
      {ref ? (
        <Row gap={8} style={{ padding: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.green50 }}>
          <Icon name="check" size={18} color={c.green} /><T v="s" w={600} tone="gr" style={{ flex: 1 }}>Sent · Ref {ref}</T>
        </Row>
      ) : <Row gap={8}>
        <Button sm grow label={fresh ? 'Review transfer' : 'Confirm and send'} icon={fresh ? 'shieldcheck' : undefined} disabled={!ready} onPress={() => setGuard(true)} />
      </Row>}
      <TransferGuard open={guard} draft={draft} onClose={() => setGuard(false)} onDone={(r) => { setGuard(false); setRef(r.reference); onSent(`Done. ${money(r.amount)} for ${note.trim()} is on its way to ${r.to}. Reference ${r.reference}.`) }} />
    </Card>
  )
}

export function ReminderCard({ action, onSet }: { action: ChatAction; onSet: (text: string) => void }) {
  const money = useMoney()
  const { toast } = useApp()
  const [done, setDone] = useState(false)
  const due = action.due ? new Date(action.due) : new Date(Date.now() + 3 * 864e5)
  async function set() {
    try {
      await api('/reminders', { body: { title: action.title || 'Payment reminder', kind: 'bill', amount: Number(action.amount || 0), due_at: due.toISOString() } })
      setDone(true); onSet(`Done. I will remind you on ${due.toDateString().slice(4, 10)}.`)
    } catch (e) { toast((e as Error).message) }
  }
  return (
    <Card pad={14} style={[indent, { gap: 12 }]}>
      <Row gap={12}>
        <Ic name="bell" tone="amber" size={40} r={12} iconSize={18} />
        <View style={{ flex: 1, gap: 4 }}><T v="s" w={600}>{action.title || 'Payment reminder'}</T><T v="xs" tone="mu">{action.amount ? money(action.amount) + ' · ' : ''}due {due.toDateString().slice(4, 10)}</T></View>
        <Badge tone="amber" label={due.toDateString().slice(4, 10)} />
      </Row>
      {!done && <Button sm label="Set reminder" onPress={set} />}
    </Card>
  )
}
