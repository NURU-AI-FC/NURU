import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Account, Payee } from '../../api'
import { BANK } from '../../bank'
import { TransferGuard, type Receipt } from '../../Guard'
import { useApp, useMoney } from '../../store'
import { Icon, Skeleton, useLoad } from '../../ui'
import { AccountSelect, Avatar, BANKS, Line, ReceiptView, Sub } from './common'

type Step = 'recipient' | 'amount' | 'review' | 'done'
const QUICK = [5000, 10000, 20000, 50000]

export default function Send() {
  const { t, rates } = useApp()
  const money = useMoney()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const save = params.get('save')
  const { data: accData, reload } = useLoad<{ accounts: Account[] }>('/accounts')
  const accts = accData?.accounts
  const payees = useLoad<Payee[]>('/payees').data
  const [step, setStep] = useState<Step>(save ? 'amount' : 'recipient')
  const [payee, setPayee] = useState<Payee | null>(null)
  const [f, setF] = useState({ from: '', toName: save ? 'NURU Japa fund' : '', toBank: save ? BANK.name : 'GTBank', toAccount: save ? '1012345678' : '', amount: save || '', note: save ? 'Savings' : '' })
  const [err, setErr] = useState('')
  const [guard, setGuard] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)

  useEffect(() => { if (accts && !f.from) setF((x) => ({ ...x, from: accts[0]?.id || '' })) }, [accts]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = params.get('payee')
    const p = id && payees?.find((x) => x.id === id)
    if (p) { choose(p); setStep('amount') }
  }, [payees]) // eslint-disable-line react-hooks/exhaustive-deps

  function choose(p: Payee) {
    setPayee(p)
    setF((x) => ({ ...x, toName: p.name, toBank: p.bank, toAccount: '' }))
    setErr('')
  }

  function next() {
    setErr('')
    if (!payee && !/^\d{10}$/.test(f.toAccount)) { setErr('Account numbers are 10 digits'); return }
    if (!f.toName.trim()) { setErr('Add the name on the account'); return }
    setStep('amount')
  }

  const from = accts?.find((a) => a.id === f.from)
  const amount = Number(f.amount || 0)
  const name = f.toName || 'recipient'
  const acctLabel = payee ? `${payee.bank} ${payee.account}` : `${f.toBank} •••• ${f.toAccount.slice(-4)}`
  const fxLine = rates.USD && amount ? `≈ $${(amount * rates.USD).toLocaleString('en', { maximumFractionDigits: 2 })}${rates.GBP ? ` · £${(amount * rates.GBP).toLocaleString('en', { maximumFractionDigits: 2 })}` : ''} · live rate ₦${Math.round(1 / rates.USD).toLocaleString('en')}/$` : ''
  const draft = payee
    ? { from: f.from, payeeId: payee.id, toName: payee.name, toBank: payee.bank, amount, note: f.note }
    : { from: f.from, toName: f.toName.trim(), toBank: f.toBank, toAccount: f.toAccount, amount, note: f.note }

  if (step === 'done' && receipt) return (
    <Sub title="Transfer receipt"><ReceiptView r={receipt} detail={draft.toBank} onDone={() => nav('/pay')} /></Sub>
  )

  return (
    <Sub title={step === 'recipient' ? 'Send money' : step === 'amount' ? `Send to ${name.split(/[\s,]+/)[0]}` : 'Review'} sub="Sandbox transfer"
      onBack={step === 'review' ? () => setStep('amount') : step === 'amount' && !save ? () => setStep('recipient') : undefined}>
      {step === 'recipient' && (
        <div className="grid g-2" style={{ alignItems: 'start' }}>
          <div className="card col g16">
            <div className="field"><label htmlFor="acct">{t('accountNo')}</label>
              <input id="acct" className="input num" inputMode="numeric" maxLength={10} value={payee ? payee.account : f.toAccount} placeholder="0123456789"
                onChange={(e) => { setPayee(null); setF({ ...f, toAccount: e.target.value.replace(/\D/g, '') }) }} /></div>
            <div className="field"><label htmlFor="bank">{t('bank')}</label>
              <select id="bank" className="input" value={f.toBank} disabled={!!payee} onChange={(e) => setF({ ...f, toBank: e.target.value })}>{(BANKS.includes(f.toBank) ? BANKS : [f.toBank, ...BANKS]).map((b) => <option key={b}>{b}</option>)}</select></div>
            {payee ? (
              <div className="soft row g10" style={{ background: 'var(--green50)' }}><Icon name="shieldcheck" size={18} color="var(--green)" />
                <span className="col"><span className="s w6 upper">{payee.name}</span><span className="xs t2">Saved beneficiary{payee.times ? ` · paid ${payee.times} ${payee.times === 1 ? 'time' : 'times'}` : ''}</span></span>
                <button className="btn sm ghost" style={{ marginLeft: 'auto' }} onClick={() => { setPayee(null); setF({ ...f, toName: '' }) }}>Change</button>
              </div>
            ) : (
              <div className="field"><label htmlFor="to">{t('to')}</label><input id="to" className="input" value={f.toName} onChange={(e) => setF({ ...f, toName: e.target.value })} maxLength={60} />
                <span className="xs mu">Sandbox: type the name exactly as the bank shows it. Real name lookup needs NIBSS.</span></div>
            )}
            {err && <span className="err" role="alert">{err}</span>}
            <button className="btn pri" onClick={next}>{t('continue')}</button>
          </div>
          <div className="card col g8">
            <span className="h3">Saved beneficiaries</span>
            {payees ? payees.map((p) => (
              <button key={p.id} className="payrow" onClick={() => { choose(p); setStep('amount') }}>
                <Avatar name={p.name} />
                <span className="col grow"><span className="s w6">{p.name}</span><span className="xs mu">{p.bank} {p.account}</span></span>
                <Icon name="star" size={18} color={p.starred ? 'var(--amber)' : 'var(--muted)'} />
              </button>
            )) : <Skeleton h={200} />}
          </div>
        </div>
      )}

      {step === 'amount' && (
        <div className="card col g16 center" style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}>
          <Avatar name={name} size={56} />
          <span className="s t2">{acctLabel}</span>
          <input className="input num paybig" inputMode="decimal" autoFocus value={f.amount} placeholder="₦0" aria-label={t('amount')}
            onChange={(e) => setF({ ...f, amount: e.target.value.replace(/[^\d.]/g, '') })} />
          <span className="xs mu" style={{ minHeight: 16 }}>{fxLine}</span>
          <div className="row g8 wrap center">{QUICK.map((q) => <button key={q} className="chip" style={{ border: 0, cursor: 'pointer' }} onClick={() => setF({ ...f, amount: String(q) })}>₦{q / 1000}k</button>)}</div>
          <div className="field" style={{ alignSelf: 'stretch' }}><label htmlFor="note">{t('note')}</label><input id="note" className="input" placeholder="Add a note (optional)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} maxLength={60} /></div>
          <div className="field" style={{ alignSelf: 'stretch' }}><label htmlFor="from">{t('from')}</label><AccountSelect accts={accts} value={f.from} onChange={(from) => setF({ ...f, from })} /></div>
          {from && amount > from.balance && <span className="err">That is more than the {money(from.balance)} in this account.</span>}
          <button className="btn pri block" disabled={!amount || !from || amount > from.balance} onClick={() => setStep('review')}>Review</button>
        </div>
      )}

      {step === 'review' && (
        <div className="col g16" style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}>
          <div className="card col g12">
            <div className="row g12"><Avatar name={name} /><span className="col"><span className="s w6">{name}</span><span className="xs mu">{acctLabel}</span></span></div>
            <div className="div" />
            <Line l={t('amount')} r={<span className="h3 num">{money(amount)}</span>} />
            <Line l="Fee" r={money(0)} />
            {f.note && <Line l={t('note')} r={f.note} />}
            <Line l={t('from')} r={from ? `${from.name} ${from.number}` : ''} />
            <Line l="Arrives" r="Instantly" />
            <div className="div" />
            <Line l="Total" r={<span className="h3 num">{money(amount)}</span>} />
          </div>
          {payee?.times ? (
            <div className="soft row g10"><Icon name="sparkles" size={18} color="var(--red)" /><span className="xs t2 grow">You have paid {payee.name.split(/[\s,]+/)[0]} {payee.times} {payee.times === 1 ? 'time' : 'times'} before.</span></div>
          ) : !payee && (
            <div className="soft row g10"><Icon name="info" size={18} color="var(--muted)" /><span className="xs t2 grow">First payment to this account. Check the name and number carefully.</span></div>
          )}
          <div className="soft row g10"><Icon name="shield" size={18} color="var(--muted)" /><span className="xs t2 grow">You will confirm with a quick face check, then your PIN.</span></div>
          <button className="btn pri block" onClick={() => setGuard(true)}><Icon name="lock" size={18} color="#fff" />Confirm and send</button>
        </div>
      )}

      {guard && <TransferGuard draft={draft} onClose={() => setGuard(false)} onDone={(r) => { setGuard(false); setReceipt(r); setStep('done'); reload() }} />}
    </Sub>
  )
}
