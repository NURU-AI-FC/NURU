import { Icon, Skeleton, useLoad } from '../../ui'
import { Err, Meter } from '../console/Layout'
import { Empty, HKpi, HQShell, RangePicker, n, useRange } from './Layout'

type Emails = {
  days: number; sent: number; open_rate: number; click_rate: number; came_back: number; ever: number; templates: number; provider: string
  emails: { template: string; name: string; sent: number; open_rate: number; click_rate: number }[]
}

// Emails shows how each email NURU sends performs, from the email log.
export default function Emails() {
  const range = useRange()
  const { data: e, error } = useLoad<Emails>('/hq/emails?days=' + range.days)
  const none = e && e.ever === 0

  return (
    <HQShell area="emails" title="Emails and nudges" sub="How each email keeps customers coming back" right={<RangePicker range={range} />}>
      <Err msg={error} />
      <div className="cgrid-4">
        {e ? <>
          <HKpi icon="mail" label="Emails sent" value={n(e.sent)} note={none ? 'Sending is not switched on yet' : `${range.label}, ${n(e.templates)} templates`} tone="mu" />
          <HKpi icon="eye" label="Opened" value={e.sent ? e.open_rate + '%' : '—'} note={e.sent ? 'Of emails sent ' + range.label : 'Nothing sent ' + range.label} tone={e.sent ? 'pos' : 'mu'} />
          <HKpi icon="zap" label="Clicked" value={e.sent ? e.click_rate + '%' : '—'} note={e.sent ? 'Of emails sent ' + range.label : 'Nothing sent ' + range.label} tone={e.sent ? 'pos' : 'mu'} />
          <HKpi icon="refresh" label="Came back after a nudge" value={n(e.came_back)} note="Signed in or asked within 7 days of “We miss you”" tone="mu" />
        </> : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} h={128} />)}
      </div>
      <div className="card col" style={{ padding: 0 }}>
        <div className="row between" style={{ padding: '16px 18px 6px' }}><span className="h3">By email</span><span className="xs mu">{e?.provider ? 'Sent with ' + e.provider : 'No email provider connected'}</span></div>
        {e ? e.emails.length ? (
          <div className="cscroll">
            <table className="tx">
              <thead><tr><th>Email</th><th>Sent</th><th>Opened</th><th>Clicked</th><th className="hide-sm">Open rate</th></tr></thead>
              <tbody>
                {e.emails.map((m) => (
                  <tr key={m.template}>
                    <td className="w6 s">{m.name}</td><td className="num s">{n(m.sent)}</td><td className="num s">{m.open_rate}%</td><td className="num s">{m.click_rate}%</td>
                    <td className="hide-sm"><div style={{ width: 160 }}><Meter p={m.open_rate} color={m.open_rate < 45 ? 'var(--amber)' : 'var(--green)'} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="mail" title={none ? 'No emails have been sent yet' : 'No emails ' + range.label}
            body={none ? 'Every email NURU sends is logged here with when it was opened and clicked. Logging starts once sending is wired to Resend; until then this stays empty rather than showing made up numbers.' : 'Pick a longer range to see earlier emails.'} />
        ) : <Skeleton h={220} />}
      </div>
      {none && <div className="soft row g10"><Icon name="info" size={18} color="var(--blue)" /><span className="s t2 grow">The welcome, transfer, weekly recap and win back emails are designed. Rows go into the email log as each one is sent, and opens and clicks arrive from the provider’s webhooks.</span></div>}
    </HQShell>
  )
}
