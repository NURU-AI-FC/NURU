// LinkBank walks through the Mono sandbox link the web app uses
// (apps/web/src/pages/Link.tsx): pick a bank, log in, choose what NURU may
// read, then POST /accounts/link creates the account with its history.
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { BankTile } from '@/components/BankTile'
import { api, ApiError } from '@/lib/api'
import { useApp, useMoney } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { Icon, type IconName } from '@/ui/Icon'
import { Badge, Button, Card, Divider, ErrorNote, Field, Ic, Input, Label, Note, Progress, Row, T, Toggle } from '@/ui/kit'
import { Sheet } from '@/ui/Sheet'

export const LINKABLE = ['Zenith Bank', 'GTBank', 'Access Bank', 'First Bank', 'UBA', 'Kuda', 'OPay', 'Moniepoint']
const DEMO = 'Demo Bank'

type Linked = { id: string; bank: string; name: string; number: string; kind: string; balance: number; imported: number }
type Step = 'bank' | 'login' | 'consent' | 'linking' | 'done'

const SCOPES: [string, IconName, string, string, boolean][] = [
  ['balances', 'wallet', 'Balances', 'Current and available balance', true],
  ['transactions', 'history', 'Transactions', 'Last 6 months, then ongoing', true],
  ['identity', 'user', 'Account identity', 'Name and account number', true],
  ['statements', 'receipt', 'Statements', 'Monthly PDF statements', false],
]

export function LinkBank({ open, have, onClose, onLinked }: { open: boolean; have: string[]; onClose: () => void; onLinked: () => void }) {
  const { c } = useTheme()
  const { user, toast } = useApp()
  const money = useMoney()
  const [step, setStep] = useState<Step>('bank')
  const [bank, setBank] = useState('')
  const [creds, setCreds] = useState({ id: '', pw: '' })
  const [show, setShow] = useState(false)
  const [scope, setScope] = useState<Record<string, boolean>>(() => Object.fromEntries(SCOPES.map(([k, , , , on]) => [k, on])))
  const [err, setErr] = useState('')
  const [acct, setAcct] = useState<Linked | null>(null)
  const [shown, setShown] = useState(0)

  useEffect(() => { if (open) { setStep('bank'); setErr(''); setAcct(null) } }, [open])
  useEffect(() => {
    if (step !== 'done' || !acct) return
    setShown(0)
    const id = setInterval(() => setShown((n) => { const next = Math.min(acct.imported, n + Math.ceil(acct.imported / 12)); if (next >= acct.imported) clearInterval(id); return next }), 120)
    return () => clearInterval(id)
  }, [step, acct])

  function pick(b: string) {
    if (have.includes(b)) { setErr(`${b} is already linked. Pick another bank, or disconnect it first.`); return }
    setBank(b); setErr('')
    setCreds(b === DEMO ? { id: 'demo.judge', pw: 'sandbox' } : { id: '', pw: '' })
    setStep('login')
  }

  async function allow() {
    setErr(''); setStep('linking')
    try {
      const a = await api<Linked>('/accounts/link', { body: { bank, scope: Object.keys(scope).filter((k) => scope[k]) } })
      setAcct(a); setStep('done'); onLinked()
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0
      setErr((e as Error).message)
      setStep(status === 409 ? 'bank' : 'consent')
    }
  }

  const tile = (b: string, size = 40) => <BankTile bank={b === DEMO ? 'Zenith Bank' : b} size={size} />
  const back = (to: Step) => (
    <Pressable onPress={() => { setErr(''); setStep(to) }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}>
      <Icon name="chevl" size={18} color={c.text2} /><T v="s" tone="t2">Back</T>
    </Pressable>
  )

  let body
  if (step === 'bank') {
    body = (
      <>
        <View style={{ gap: 6 }}>
          <T v="h3">Link an account</T>
          <T v="s" tone="t2">Read only and secured by Mono. NURU can never move money without your PIN and face check.</T>
        </View>
        {err ? <ErrorNote text={err} /> : null}
        <Pressable onPress={() => pick(DEMO)} disabled={have.includes(DEMO)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.red, backgroundColor: c.red50, opacity: have.includes(DEMO) ? 0.5 : 1 }}>
          <Ic name="sparkles" tone="red" size={40} r={12} bg={c.bg} />
          <View style={{ flex: 1, gap: 2 }}><T v="s" w={600}>Use the demo bank</T><T v="xs" tone="t2">{have.includes(DEMO) ? 'Already linked' : 'Six months of sample transactions, no real login'}</T></View>
          <Icon name="chevr" size={18} color={c.red} />
        </Pressable>
        <Label>Banks and wallets</Label>
        <View style={{ gap: 2 }}>
          {LINKABLE.map((b) => {
            const linked = have.includes(b)
            return (
              <Pressable key={b} onPress={() => pick(b)} accessibilityRole="button" accessibilityLabel={linked ? `${b}, already linked` : `Link ${b}`}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, opacity: pressed ? 0.7 : 1 })}>
                {tile(b, 38)}
                <T v="s" w={600} style={{ flex: 1 }}>{b}</T>
                {linked ? <Badge tone="green" icon="check" label="Linked" style={{ alignSelf: 'center' }} /> : <Icon name="chevr" size={18} color={c.muted} />}
              </Pressable>
            )
          })}
        </View>
        <Row center gap={6}><Icon name="lock" size={12} color={c.muted} /><T v="xs" tone="mu">Secured by Mono open banking · read only · sandbox</T></Row>
      </>
    )
  } else if (step === 'login') {
    body = (
      <>
        {back('bank')}
        <Row gap={12}>{tile(bank)}<View style={{ gap: 2 }}><T v="h3">{bank}</T><T v="xs" tone="mu">Internet banking login</T></View></Row>
        <Field label="User ID"><Input value={creds.id} onChangeText={(v) => setCreds({ ...creds, id: v })} autoCapitalize="none" autoCorrect={false} placeholder="Your bank user ID" /></Field>
        <Field label="Password">
          <Input value={creds.pw} onChangeText={(v) => setCreds({ ...creds, pw: v })} secureTextEntry={!show} autoCapitalize="none" placeholder="Your bank password"
            right={<Pressable onPress={() => setShow(!show)} hitSlop={8} accessibilityLabel="Show password"><Icon name={show ? 'eyeoff' : 'eye'} size={18} color={c.muted} /></Pressable>} />
        </Field>
        <Note icon="shieldcheck" iconColor={c.green}>Your login goes straight to the bank through Mono. NURU never sees or stores your bank password.</Note>
        <Button label="Log in securely" disabled={!creds.id.trim() || !creds.pw} onPress={() => setStep('consent')} />
        <Row center gap={6}><Icon name="lock" size={12} color={c.muted} /><T v="xs" tone="mu">Sandbox mode · test credentials accepted</T></Row>
      </>
    )
  } else if (step === 'consent' || step === 'linking') {
    body = (
      <>
        {back('bank')}
        <View style={{ gap: 6 }}><T v="h3">Allow NURU to read</T><T v="s" tone="t2">Choose what NURU can see from {bank}. You can change this any time.</T></View>
        <Card flat pad={14} style={{ gap: 12 }}>
          {SCOPES.map(([k, ic, title, sub], n) => (
            <View key={k} style={{ gap: 12 }}>
              {n > 0 && <Divider />}
              <Row gap={12}>
                <Ic name={ic} size={36} r={11} iconSize={17} />
                <View style={{ flex: 1, gap: 2 }}><T v="s" w={600}>{title}</T><T v="xs" tone="mu">{sub}</T></View>
                <Toggle on={scope[k]} label={title} onChange={(v) => setScope({ ...scope, [k]: k === 'transactions' || k === 'balances' ? true : v })} />
              </Row>
            </View>
          ))}
        </Card>
        <T v="xs" tone="mu">Balances and transactions are needed for insights.</T>
        <Note icon="alert" iconColor={c.amber}>NURU cannot make payments from this link. Transfers always need your PIN and face check.</Note>
        {err ? <ErrorNote text={err} /> : null}
        <Button label={step === 'linking' ? 'Linking…' : 'Allow and continue'} loading={step === 'linking'} onPress={allow} />
      </>
    )
  } else if (acct) {
    const pct = acct.imported ? Math.round((shown / acct.imported) * 100) : 100
    body = (
      <>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Ic name="check" tone="green" size={56} r={18} iconSize={26} />
          <T v="h3">{acct.bank} linked</T>
          <T v="s" tone="t2" center>{pct < 100 ? 'NURU is reading your history. Your first insights will be ready in a moment.' : 'Your history is in. Insights and charts now include this account.'}</T>
        </View>
        <Card flat pad={14} style={{ gap: 12 }}>
          <Row gap={12}>
            {tile(acct.bank, 36)}
            <View style={{ flex: 1, gap: 2 }}><T v="s" w={600}>{acct.name} {acct.number}</T><T v="xs" tone="mu">{user?.name}</T></View>
            <T v="h4" num>{money(acct.balance)}</T>
          </Row>
          <Divider />
          <Row between><T v="xs" tone="t2">Importing transactions</T><T v="xs" w={600} num>{shown.toLocaleString()} of {acct.imported.toLocaleString()}</T></Row>
          <Progress pct={pct} />
        </Card>
        <Button label="Done" onPress={() => { toast(`${acct.bank} linked`); onClose() }} />
        <Button label="Link another account" variant="ghost" onPress={() => { setAcct(null); setStep('bank') }} />
      </>
    )
  }

  return <Sheet open={open} onClose={onClose} scroll>{body}</Sheet>
}
