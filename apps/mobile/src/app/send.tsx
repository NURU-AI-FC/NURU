import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { AccountPicker, BANKS, ReceiptView } from '@/components/pay'
import { TransferGuard, type Draft } from '@/components/TransferGuard'
import type { Account, Payee, Receipt } from '@/lib/api'
import { useApp, useMoney } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { useLoad } from '@/lib/useLoad'
import { Icon } from '@/ui/Icon'
import { Avatar, Button, Card, Chip, Divider, ErrorNote, Field, Input, KV, Note, Row, Screen, Skeleton, Soft, T, TopBar } from '@/ui/kit'
import { KeyboardScroll, useKeyboardShown } from '@/ui/KeyboardScroll'
import { applyKey, Keypad } from '@/ui/PinPad'
import { Sheet } from '@/ui/Sheet'

type Step = 'recipient' | 'amount' | 'review' | 'done'
const QUICK = [5000, 10000, 20000, 50000]

// p08: choose recipient (02), amount with FX (03), review (04), PIN and face (05, 06, p16), receipt (07).
export default function Send() {
  const { c } = useTheme()
  const { rates, t } = useApp()
  const money = useMoney()
  const params = useLocalSearchParams<{ payee?: string; amount?: string }>()
  const acct = useLoad<{ accounts: Account[] }>('/accounts')
  const accts = acct.data?.accounts
  const payees = useLoad<Payee[]>('/payees').data
  const [step, setStep] = useState<Step>('recipient')
  const [payee, setPayee] = useState<Payee | null>(null)
  const [from, setFrom] = useState('')
  const [toAccount, setToAccount] = useState('')
  const [toBank, setToBank] = useState('GTBank')
  const [toName, setToName] = useState('')
  const [amount, setAmount] = useState(params.amount || '')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [bankOpen, setBankOpen] = useState(false)
  const [guard, setGuard] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const typing = useKeyboardShown()

  useEffect(() => { if (accts && !from) setFrom(accts.find((a) => a.kind !== 'business')?.id || '') }, [accts]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const p = params.payee && payees?.find((x) => x.id === params.payee)
    if (p) { choose(p); setStep('amount') }
  }, [payees]) // eslint-disable-line react-hooks/exhaustive-deps

  function choose(p: Payee) { setPayee(p); setToName(p.name); setToBank(p.bank); setErr('') }
  function next() {
    setErr('')
    if (!payee && !/^\d{10}$/.test(toAccount)) { setErr('Account numbers are 10 digits'); return }
    if (!toName.trim()) { setErr('Add the name on the account'); return }
    setStep('amount')
  }

  const fromAcct = accts?.find((a) => a.id === from)
  const amt = Number(amount || 0)
  const name = toName || 'recipient'
  const acctLabel = payee ? `${payee.bank} ${payee.account}` : `${toBank} •••• ${toAccount.slice(-4)}`
  const fx = rates.USD && amt ? `≈ $${(amt * rates.USD).toFixed(2)}${rates.GBP ? ` · £${(amt * rates.GBP).toFixed(2)}` : ''} · live rate ₦${Math.round(1 / rates.USD).toLocaleString('en')}/$` : ' '
  const draft: Draft = payee
    ? { from, payeeId: payee.id, toName: payee.name, toBank: payee.bank, amount: amt, note }
    : { from, toName: toName.trim(), toBank, toAccount, amount: amt, note }
  const back = () => step === 'review' ? setStep('amount') : step === 'amount' ? setStep('recipient') : router.back()

  if (step === 'done' && receipt) return (
    <Screen><ReceiptView r={receipt} detail={draft.toBank} onDone={() => router.replace('/pay')} /></Screen>
  )

  if (step === 'recipient') return (
    <Screen top={<TopBar title="Send money" onBack={back} />} footer={<Button label={t('continue')} onPress={next} />} gap={14}>
      <Field label="Account number">
        <Input value={payee ? payee.account : toAccount} onChangeText={(v) => { setPayee(null); setToAccount(v.replace(/\D/g, '').slice(0, 10)) }} keyboardType="number-pad" placeholder="0123456789" />
      </Field>
      <Field label="Bank">
        <Pressable onPress={() => !payee && setBankOpen(true)} accessibilityRole="button">
          <View pointerEvents="none"><Input value={toBank} editable={false} right={<Icon name="chevd" size={18} color={c.muted} />} /></View>
        </Pressable>
      </Field>
      {payee ? (
        <Soft tint={c.green50}>
          <Row gap={10}>
            <Icon name="shieldcheck" size={18} color={c.green} />
            <View style={{ flex: 1, gap: 4 }}>
              <T v="s" w={600}>{payee.name.toUpperCase()}</T>
              <T v="xs" tone="t2">Saved beneficiary{payee.times ? ` · paid ${payee.times} ${payee.times === 1 ? 'time' : 'times'}` : ''}</T>
            </View>
            <T v="s" w={600} tone="rd" onPress={() => { setPayee(null); setToName('') }}>Change</T>
          </Row>
        </Soft>
      ) : (
        <Field label="Account name" hint="Sandbox: type the name exactly as the bank shows it. Real name lookup needs NIBSS.">
          <Input value={toName} onChangeText={setToName} maxLength={60} placeholder="As the bank shows it" />
        </Field>
      )}
      {!!err && <ErrorNote text={err} />}
      <T v="h4" style={{ marginTop: 6 }}>Saved beneficiaries</T>
      {payees ? payees.map((p) => (
        <Pressable key={p.id} onPress={() => { choose(p); setStep('amount') }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={p.name} />
          <View style={{ flex: 1, gap: 4 }}><T v="s" w={600}>{p.name}</T><T v="xs" tone="mu">{p.bank} {p.account}</T></View>
          <Icon name="star" size={18} color={p.starred ? c.amber : c.muted} />
        </Pressable>
      )) : <Skeleton h={180} />}
      <Sheet open={bankOpen} onClose={() => setBankOpen(false)} scroll>
        <T v="h3">Choose bank</T>
        {BANKS.map((b) => (
          <Pressable key={b} onPress={() => { setToBank(b); setBankOpen(false) }} style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
            <T>{b}</T>{b === toBank && <Icon name="check" size={18} color={c.red} />}
          </Pressable>
        ))}
      </Sheet>
    </Screen>
  )

  if (step === 'amount') return (
    <Screen scroll={false} top={<TopBar title={`Send to ${name.split(/[\s,]+/)[0]}`} onBack={back} />}>
      <KeyboardScroll contentContainerStyle={{ alignItems: 'center', gap: 8, paddingTop: 14, paddingHorizontal: 20, paddingBottom: 12 }}>
        <Avatar name={name} />
        <T v="s" tone="t2">{acctLabel}</T>
        <T num w={700} style={{ fontSize: 44, lineHeight: 54, letterSpacing: -1, marginTop: 6 }}>{amt ? money(amt) : '₦0'}</T>
        <T v="xs" tone="mu">{fx}</T>
        <Row gap={8} style={{ marginTop: 6 }}>{QUICK.map((q) => <Chip key={q} label={`₦${q / 1000}k`} onPress={() => setAmount(String(q))} />)}</Row>
        <View style={{ alignSelf: 'stretch', marginTop: 10, gap: 12 }}>
          <Input icon="edit" value={note} onChangeText={setNote} placeholder="Add a note (optional)" maxLength={60} />
          {accts && <AccountPicker accts={accts} value={from} onChange={setFrom} />}
          {fromAcct && amt > fromAcct.balance && <T v="xs" tone="rd">That is more than the {money(fromAcct.balance)} in this account.</T>}
        </View>
      </KeyboardScroll>
      {!typing && <View style={{ paddingHorizontal: 24 }}><Keypad extra="." onKey={(k) => setAmount((x) => k === '.' ? (x.includes('.') ? x : x + '.') : applyKey(x, k, 9))} /></View>}
      <View style={{ padding: 20, paddingTop: 10 }}>
        <Button label="Review" disabled={!amt || !fromAcct || amt > fromAcct.balance} onPress={() => setStep('review')} />
      </View>
    </Screen>
  )

  return (
    <Screen top={<TopBar title="Review" onBack={back} />} footer={<Button label="Confirm and send" icon="lock" onPress={() => setGuard(true)} />}>
      <Card style={{ gap: 12 }}>
        <Row gap={12}><Avatar name={name} /><View style={{ gap: 4 }}><T v="s" w={600}>{name}</T><T v="xs" tone="mu">{acctLabel}</T></View></Row>
        <Divider />
        <KV k="Amount" v={<T v="h3" num>{money(amt)}</T>} />
        <KV k="Fee" v={money(0)} />
        {!!note && <KV k="Note" v={note} />}
        <KV k="From" v={fromAcct ? `${fromAcct.name} ${fromAcct.number}` : ''} />
        <KV k="Arrives" v="Instantly" />
        <Divider />
        <KV k="Total" strong v={<T v="h4" num>{money(amt)}</T>} />
      </Card>
      {payee?.times ? <Note icon="sparkles">{`You have paid ${payee.name.split(/[\s,]+/)[0]} ${payee.times} ${payee.times === 1 ? 'time' : 'times'}. This amount is normal for them.`}</Note>
        : !payee ? <Note icon="info" iconColor={c.muted}>First payment to this account. Check the name and number carefully.</Note> : null}
      <Note icon="shield" iconColor={c.muted}>You will confirm with a quick face check, then your PIN.</Note>
      <TransferGuard open={guard} draft={draft} onClose={() => setGuard(false)} onDone={(r) => { setGuard(false); setReceipt(r); setStep('done'); acct.reload() }} />
    </Screen>
  )
}
