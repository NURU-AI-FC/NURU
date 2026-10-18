import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { setUnread, type Note } from '../notify'
import { Shell } from '../Shell'
import { useApp, useMoney } from '../store'
import { Bars, Icon, Skeleton, useLoad } from '../ui'
import type { TxFull } from './History'
import './Home.css'

type Filter = '' | 'alert' | 'reminder' | 'insight'

function ago(at: string) {
  const d = new Date(at), mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return Math.max(1, mins) + ' min'
  const today = new Date(new Date().toDateString()).getTime()
  const days = Math.round((today - new Date(d.toDateString()).getTime()) / 864e5)
  if (days === 0) return d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })
  if (days === 1) return 'Yesterday'
  if (days < 7) return days + ' days'
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

function section(at: string) {
  const today = new Date(new Date().toDateString()).getTime()
  const days = Math.round((today - new Date(new Date(at).toDateString()).getTime()) / 864e5)
  return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? 'This week' : 'Earlier'
}

export function NoteRow({ n }: { n: Note }) {
  return (
    <Link to={'/notifications/' + n.id} className="txr start" style={{ padding: '12px 6px' }}>
      <span className={'ic ' + n.tone}><Icon name={n.icon} size={18} /></span>
      <span className="col g4 grow">
        <span className="row between g8"><span className={'s ' + (n.read ? 'w6 t2' : 'w6')}>{n.title}</span><span className="xs mu" style={{ flex: 'none' }}>{ago(n.at)}</span></span>
        <span className="xs t2">{n.body}</span>
      </span>
      {!n.read && <i className="udot" style={{ marginTop: 6 }} aria-label="Unread" />}
    </Link>
  )
}

export default function Notifications() {
  const { t } = useApp()
  const [filter, setFilter] = useState<Filter>('')
  const { data, reload } = useLoad<{ items: Note[]; unread: number }>('/notifications?limit=100' + (filter ? '&kind=' + filter : ''))
  useEffect(() => { if (data) setUnread(data.unread) }, [data])

  async function readAll() {
    const r = await api<{ unread: number }>('/notifications/all', { method: 'PATCH', body: { read: true } })
    setUnread(r.unread); reload()
  }

  const groups: { label: string; items: Note[] }[] = []
  for (const n of data?.items || []) {
    const l = section(n.at)
    const g = groups[groups.length - 1]
    if (g && g.label === l) g.items.push(n); else groups.push({ label: l, items: [n] })
  }
  const tabs: [Filter, string][] = [['', 'All'], ['alert', 'Alerts'], ['reminder', 'Reminders'], ['insight', 'Insights']]

  return (
    <Shell title={t('notificationsTitle')} sub={data ? (data.unread ? `${data.unread} unread` : 'All caught up') : undefined}
      right={<Link className="ib" to="/notifications/settings" aria-label={t('notifySettingsTitle')}><Icon name="settings" /></Link>}>
      <div className="narrow">
        <div className="row between g12 wrap">
          <div className="fchips">{tabs.map(([k, l]) => <button key={l} className={'chip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>{l}</button>)}</div>
          {!!data?.unread && <button className="btn ghost sm red" onClick={readAll}>{t('markAllRead')}</button>}
        </div>
        <div className="card" style={{ padding: '6px 14px' }}>
          {!data ? <div style={{ padding: 8 }}><Skeleton h={320} /></div>
            : data.items.length === 0 ? (
              <div className="col center g8" style={{ padding: '36px 12px', textAlign: 'center' }}>
                <span className="ic"><Icon name="bell" /></span><span className="h3">Nothing here yet</span>
                <span className="s t2">Alerts about big payments, bills and insights will show up here.</span>
              </div>
            ) : groups.map((g) => (
              <div key={g.label} className="col">
                <div className="daybar"><span>{g.label}</span></div>
                {g.items.map((n) => <NoteRow key={n.id} n={n} />)}
              </div>
            ))}
        </div>
      </div>
    </Shell>
  )
}

type AlertData = { note: Note; tx?: TxFull; usual?: number; weeks?: { labels: string[]; values: number[] } }

export function AlertDetail() {
  const { id } = useParams()
  const { t, toast } = useApp()
  const money = useMoney()
  const nav = useNavigate()
  const { data, error } = useLoad<AlertData>('/notifications/' + id)
  useEffect(() => { if (data) api<{ unread: number }>('/notifications?count=1').then((r) => setUnread(r.unread)).catch(() => {}) }, [data])

  if (error) return <Shell title={t('alertTitle')}><div className="card col center g12" style={{ padding: 32 }}><span className="h3">This alert is no longer available</span><Link to="/notifications" className="btn sm">All notifications</Link></div></Shell>
  const n = data?.note, tx = data?.tx
  const over = tx && data?.usual ? tx.amount - data.usual : 0
  const at = n ? new Date(n.at) : null
  const when = at ? at.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + at.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' }) : ''
  const isAlert = n?.kind === 'alert' && tx && tx.direction === 'debit'

  return (
    <Shell title={t('alertTitle')} right={<button className="ib" onClick={() => nav('/notifications')} aria-label="Back"><Icon name="chevl" /></button>}>
      <div className="narrow" style={{ maxWidth: 560 }}>
        {!n ? <Skeleton h={420} /> : <>
          <div className="col center g8" style={{ textAlign: 'center' }}>
            <span className={'ic ' + n.tone} style={{ width: 56, height: 56, borderRadius: 18 }}><Icon name={n.icon} size={26} /></span>
            <span className="h3">{n.title}</span><span className="xs mu">{when}</span>
          </div>
          {tx ? (
            <div className="card" style={{ padding: '4px 18px' }}>
              <div className="kv"><span className="t2">Merchant</span><span>{tx.merchant}</span></div>
              <div className="kv"><span className="t2">{t('amount')}</span><span className="num">{money(tx.amount)}</span></div>
              {!!data?.usual && <div className="kv"><span className="t2">Your usual</span><span className="num">{money(data.usual)}</span></div>}
              <div className="kv"><span className="t2">{t('account')}</span><span>{tx.account} {tx.number}</span></div>
            </div>
          ) : <div className="card s t2">{n.body}</div>}
          {tx && data?.weeks && tx.direction === 'debit' && (
            <div className="card col g8">
              <div className="col g4"><span className="s w6">{tx.category} in the last 6 weeks</span><span className="xs mu">The last bar is the week of this payment</span></div>
              <Bars labels={data.weeks.labels} series={[{ name: tx.category, values: data.weeks.values }]} height={160} />
            </div>
          )}
          {isAlert && over > 0 && (
            <div className="soft row g10 start"><Icon name="sparkles" size={18} color="var(--red)" />
              <span className="xs t2">This is {money(over)} more than a typical {tx!.category.toLowerCase()} payment for you. If you did not make it, freeze your card and report it.</span>
            </div>
          )}
          {isAlert ? (
            <div className="row g10 wrap">
              <button className="btn grow" onClick={() => { toast('Thanks. We will keep watching for anything unusual.'); nav('/notifications') }}>It was me</button>
              <Link className="btn pri grow" to={'/history/' + tx!.id}><Icon name="shield" size={18} color="#fff" />Not me, review it</Link>
            </div>
          ) : (
            <div className="row g10 wrap">
              {n.link && <Link className="btn pri grow" to={n.link}>Open</Link>}
              <Link className="btn grow" to={'/ask?q=' + encodeURIComponent(n.title + '. ' + n.body + ' What should I do?')}><Icon name="sparkles" size={18} color="var(--red)" />{t('ask')}</Link>
            </div>
          )}
        </>}
      </div>
    </Shell>
  )
}

type Prefs = {
  every_txn: boolean; unusual: boolean; low_balance: boolean; new_device: boolean; weekly_recap: boolean; monthly_plan: boolean
  bill_prices: boolean; reminders: boolean; quiet: boolean; quiet_from: string; quiet_to: string; large_over: number; low_balance_at: number
}

function Toggle({ label, on, set, sub }: { label: string; on: boolean; set: (v: boolean) => void; sub?: string }) {
  return (
    <div className="row g12">
      <span className="col g4 grow"><span className="s">{label}</span>{sub && <span className="xs mu">{sub}</span>}</span>
      <button className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)} />
    </div>
  )
}

const fmt12 = (hm: string) => { const [h, m] = hm.split(':').map(Number); return `${(h % 12) || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}` }

export function NotifySettings() {
  const { t, toast } = useApp()
  const money = useMoney()
  const { data } = useLoad<Prefs>('/me/notification-settings')
  const [p, setP] = useState<Prefs | null>(null)
  const [hours, setHours] = useState(false)
  useEffect(() => { if (data) setP(data) }, [data])

  async function save(patch: Partial<Prefs>) {
    if (!p) return
    const next = { ...p, ...patch }
    setP(next)
    try { setP(await api<Prefs>('/me/notification-settings', { method: 'PUT', body: next })) } catch (e) { toast((e as Error).message); setP(p) }
  }
  const tg = (k: keyof Prefs, label: string, sub?: string) => <Toggle key={k} label={label} sub={sub} on={!!p?.[k]} set={(v) => save({ [k]: v })} />

  return (
    <Shell title={t('notifySettingsTitle')} right={<Link className="ib" to="/notifications" aria-label="Back"><Icon name="chevl" /></Link>}>
      <div className="narrow" style={{ maxWidth: 560 }}>
        {!p ? <Skeleton h={420} /> : <>
          <span className="xs mu w6 upper">Alerts</span>
          <div className="card col g16">
            {tg('every_txn', 'Every debit and credit', 'Salary, transfers and money received')}
            {tg('unusual', 'Unusual spending', `Payments of ${money(p.large_over)} or more and anything far above your normal`)}
            {tg('low_balance', `Low balance under ${money(p.low_balance_at)}`)}
            {tg('new_device', 'New device sign-in')}
            {tg('reminders', 'Bills and reminders due soon')}
          </div>
          <span className="xs mu w6 upper">Insights</span>
          <div className="card col g16">
            {tg('weekly_recap', 'Weekly recap on Sunday')}
            {tg('monthly_plan', 'Monthly plan suggestions')}
            {tg('bill_prices', 'Price changes on my bills')}
          </div>
          <span className="xs mu w6 upper">Quiet hours</span>
          <div className="card col g12">
            {tg('quiet', 'Do not disturb')}
            <div className="row between"><span className="s t2">From {fmt12(p.quiet_from)} to {fmt12(p.quiet_to)}</span><button className="btn ghost sm red" onClick={() => setHours(!hours)}>{hours ? 'Done' : 'Change'}</button></div>
            {hours && (
              <div className="row g8">
                <input type="time" className="input grow" value={p.quiet_from} onChange={(e) => e.target.value && save({ quiet_from: e.target.value })} aria-label="Quiet hours start" />
                <input type="time" className="input grow" value={p.quiet_to} onChange={(e) => e.target.value && save({ quiet_to: e.target.value })} aria-label="Quiet hours end" />
              </div>
            )}
            <span className="xs mu">Security alerts still come through.</span>
          </div>
        </>}
      </div>
    </Shell>
  )
}
