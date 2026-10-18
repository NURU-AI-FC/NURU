import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Icon, Modal, PinInput, Skeleton, useLoad } from '../../ui'
import { Back, Badge, Row, Sandbox, Tip, date } from '../money/kit'
import { AV, initials, type Slip } from './data'

type Pay = {
  month: string; staff: Slip[]; cash: number; account: string; after: number; due_at: string; paid_at: string | null
  totals: { gross: number; net: number; paye: number; pension_employee: number; pension_employer: number; nhf: number; total: number }
  runs: { month: string; staff: number; total: number; at: string }[]
}

export default function Payroll() {
  const { toast } = useApp()
  const money = useMoney()
  const { data: p, reload } = useLoad<Pay>('/business/payroll')
  const [pin, setPin] = useState(false)
  const [err, setErr] = useState('')
  const [key, setKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const t = p?.totals

  const approve = async (code: string) => {
    setBusy(true)
    setErr('')
    try {
      const r = await api<{ reference: string }>('/business/payroll', { body: { pin: code } })
      toast(`Payroll paid · ${r.reference}`)
      setPin(false)
      reload()
    } catch (e) {
      setErr(e instanceof ApiError && e.status === 428 ? 'Create a transaction PIN in Settings first.' : (e as Error).message)
      setKey((k) => k + 1)
    } finally { setBusy(false) }
  }

  return (
    <Shell title="Run payroll" sub={p ? `${p.month} · ${p.staff.length} staff` : undefined}>
      <Back to="/business" label="Business" />
      <div className="grid g-2">
        <div className="col g16">
          {t ? (
            <div className="card col g10">
              <Row l="Net salaries" r={money(t.net)} />
              <Row l="PAYE (state tax)" r={money(t.paye)} />
              <Row l="Employee pension 8%" r={money(t.pension_employee)} />
              <Row l="Employer pension 10%" r={money(t.pension_employer)} />
              <Row l="NHF 2.5%" r={money(t.nhf)} />
              <div className="div" />
              <Row strong l={`Total from Zenith ${p.account}`} r={money(t.total)} />
            </div>
          ) : <Skeleton h={260} />}
          {p && !p.paid_at && (p.after >= 0
            ? <Tip icon="check" tone="green">You have {money(p.cash)}. After payroll, {money(p.after)} stays in the account.</Tip>
            : <Tip icon="alert" tone="amber">You have {money(p.cash)}, {money(-p.after)} short of this payroll. Collect unpaid invoices first.</Tip>)}
          {p && (p.paid_at
            ? <Tip icon="check" tone="green">{p.month} payroll was paid on {date(p.paid_at)}. Staff got an SMS payslip.</Tip>
            : <div className="soft row g10"><Icon name="calendar" size={18} color="var(--muted)" /><span className="col g4 grow"><span className="s w6">Pay on {date(p.due_at)}, 9:00 am or now</span><span className="xs mu">Staff get an SMS payslip</span></span></div>)}
          <button className="btn pri block" disabled={!t || !!p?.paid_at || busy} onClick={() => { setErr(''); setPin(true) }}>
            <Icon name="lock" size={16} color="#fff" />{p?.paid_at ? 'Paid this month' : `Approve ${t ? money(t.total) : ''}`}
          </button>
          <Sandbox>Sandbox payroll. One debit is recorded on your business account; no money leaves Zenith.</Sandbox>
        </div>
        <div className="card col g10">
          <span className="h3">Staff</span>
          {p?.staff.map((s, i) => (
            <Link key={s.id} to={`/business/payslip/${s.id}`} className="row g12" style={{ padding: '4px 0' }}>
              <span className="av" style={{ background: AV[i % AV.length] }}>{initials(s.name)}</span>
              <span className="col g4 grow"><span className="s w6">{s.name}</span><span className="xs mu">{s.role} · net {money(s.net)}</span></span>
              <span className="s w6 num">{money(s.gross)}</span>
              <Icon name="chevr" size={16} color="var(--muted)" />
            </Link>
          ))}
          {p?.runs.length ? <>
            <div className="div" />
            <span className="s w6">Past runs in NURU</span>
            {p.runs.map((r) => <div key={r.month} className="row between s"><span className="t2">{r.month} · {r.staff} staff</span><span className="row g8"><span className="num w6">{money(r.total)}</span><Badge tone="green">Paid</Badge></span></div>)}
          </> : null}
        </div>
      </div>

      {pin && t && (
        <Modal onClose={() => setPin(false)}>
          <div className="col g16 center" style={{ textAlign: 'center' }}>
            <Icon name="lock" size={28} color="var(--red)" />
            <span className="h2">Approve {money(t.total)}</span>
            <span className="s t2">Enter your transaction PIN to pay {p?.staff.length} staff.</span>
            <PinInput key={key} onDone={approve} />
            {err && <span className="err">{err}</span>}
            {err.includes('Settings') && <Link to="/settings" className="btn sm">Go to Settings</Link>}
          </div>
        </Modal>
      )}
    </Shell>
  )
}
