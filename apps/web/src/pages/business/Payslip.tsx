import { Link, useParams } from 'react-router-dom'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Icon, Skeleton, useLoad } from '../../ui'
import { Back, Row } from '../money/kit'
import { AV, initials, type Slip } from './data'

export default function Payslip() {
  const { id } = useParams()
  const { toast } = useApp()
  const money = useMoney()
  const { data: d, error } = useLoad<{ slip: Slip; business: string; month: string; ids: string[] }>('/business/payslip/' + id)
  const s = d?.slip
  const i = d ? d.ids.indexOf(d.slip.id) : 0
  const next = d && d.ids.length > 1 ? d.ids[(i + 1) % d.ids.length] : ''

  return (
    <Shell title="Payslip" sub={d?.business} right={<button className="ib" onClick={() => print()} aria-label="Download PDF"><Icon name="download" /></button>}>
      <Back to="/business/payroll" label="Payroll" />
      <div className="col g16 kit-narrow">
        {error && <div className="card flat t2">{error}</div>}
        {s ? (
          <div className="card col g12">
            <div className="row g12"><span className="av" style={{ background: AV[i % AV.length] }}>{initials(s.name)}</span><span className="col g4 grow"><span className="s w6">{s.name}</span><span className="xs mu">{s.role} · {d?.month}</span></span></div>
            <div className="div" />
            <span className="xs mu w6 upper">Earnings</span>
            <Row l="Basic" r={money(s.basic)} />
            <Row l="Housing" r={money(s.housing)} />
            <Row l="Transport" r={money(s.transport)} />
            <span className="xs mu w6 upper" style={{ marginTop: 4 }}>Deductions</span>
            <Row l="PAYE" r={'-' + money(s.paye)} />
            <Row l="Pension 8%" r={'-' + money(s.pension)} />
            <Row l="NHF 2.5%" r={'-' + money(s.nhf)} />
            <div className="div" />
            <div className="row between"><span className="s w6">Net pay</span><span className="h2 num">{money(s.net)}</span></div>
            <span className="xs mu">Employer also pays {money(s.employer_pension)} pension (10%).</span>
          </div>
        ) : !error && <Skeleton h={400} />}
        <div className="kit-actions no-print">
          <button className="btn" disabled={!s} onClick={() => toast(`Payslip sent to ${s?.name} by SMS (sandbox)`)}><Icon name="send" size={16} />Send</button>
          <button className="btn" disabled={!s} onClick={() => print()}><Icon name="download" size={16} />PDF</button>
        </div>
        {next && <Link className="btn ghost no-print" to={`/business/payslip/${next}`}>Next staff member<Icon name="chevr" size={16} /></Link>}
      </div>
    </Shell>
  )
}
