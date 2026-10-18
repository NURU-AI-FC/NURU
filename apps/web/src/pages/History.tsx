import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, type Tx } from '../api'
import { DescribeCard } from '../Describe'
import { Shell } from '../Shell'
import { useApp, useMoney } from '../store'
import { catIcon, Icon, Modal, Skeleton, useLoad } from '../ui'
import './Home.css'

export type TxFull = Tx & { account_id: string; bank: string; number: string; reference: string }
export type TxPage = { items: TxFull[]; count: number; in: number; out: number; more: boolean }

export const CATEGORIES = ['Food', 'Transport', 'Data and power', 'Bills', 'Shopping', 'Family', 'Entertainment', 'Health', 'Rent', 'Education', 'Savings', 'Transfer', 'Salary', 'Side income']

const tone = (t: Tx) => t.direction === 'credit' ? 'green' : ({ Food: 'red', Shopping: 'amber', Bills: 'blue', 'Data and power': 'blue', Rent: 'amber' } as Record<string, string>)[t.category] || ''

const time = (at: string) => new Date(at).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })

export function TxRow({ t, sub }: { t: Tx; sub?: string }) {
  const money = useMoney()
  return (
    <Link to={'/history/' + t.id} className="txr">
      <span className={'ic ' + tone(t)}><Icon name={catIcon(t.category)} size={18} /></span>
      <span className="col g4 grow"><span className="s w6 nm">{t.merchant}</span><span className="xs mu nm">{sub ?? `${t.category} · ${time(t.at)}`}</span></span>
      <span className={'s w6 num ' + (t.direction === 'credit' ? 'pos' : '')}>{money(t.direction === 'credit' ? t.amount : -t.amount, { sign: t.direction === 'credit' })}</span>
    </Link>
  )
}

function dayLabel(d: Date) {
  const today = new Date(new Date().toDateString()).getTime()
  const diff = Math.round((today - new Date(d.toDateString()).getTime()) / 864e5)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
}

// TxGroups lists transactions under a heading for each day with its net.
export function TxGroups({ rows }: { rows: Tx[] }) {
  const money = useMoney()
  const groups: { label: string; net: number; rows: Tx[] }[] = []
  for (const t of rows) {
    const label = dayLabel(new Date(t.at))
    let g = groups[groups.length - 1]
    if (!g || g.label !== label) groups.push(g = { label, net: 0, rows: [] })
    g.rows.push(t)
    g.net += t.direction === 'credit' ? t.amount : -t.amount
  }
  return (
    <div className="col">
      {groups.map((g) => (
        <div key={g.label} className="col">
          <div className="daybar"><span>{g.label}</span><span className={g.net > 0 ? 'pos' : ''}>{money(g.net, { sign: g.net > 0 })}</span></div>
          {g.rows.map((t) => <TxRow key={t.id} t={t} />)}
        </div>
      ))}
    </div>
  )
}

const PAGE = 30

export default function History() {
  const { t } = useApp()
  const money = useMoney()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [rows, setRows] = useState<TxFull[] | null>(null)
  const [meta, setMeta] = useState<TxPage | null>(null)
  const [busy, setBusy] = useState(false)
  const [more, setMore] = useState(false)
  const category = params.get('category') || '', direction = params.get('direction') || ''
  const from = params.get('from') || '', to = params.get('to') || ''

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v); else p.delete(k)
    setParams(p, { replace: true })
  }
  useEffect(() => {
    const id = setTimeout(() => { if (q !== (params.get('q') || '')) set('q', q.trim()) }, 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const query = (offset: number) => {
    const p = new URLSearchParams({ limit: String(PAGE), offset: String(offset), meta: '1' })
    for (const k of ['q', 'category', 'direction', 'from', 'to', 'account']) { const v = params.get(k); if (v) p.set(k, v) }
    return '/transactions?' + p
  }
  useEffect(() => {
    let live = true
    setRows(null)
    api<TxPage>(query(0)).then((d) => { if (live) { setRows(d.items); setMeta(d); setMore(d.more) } }).catch(() => live && setRows([]))
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  async function loadMore() {
    if (!rows) return
    setBusy(true)
    try {
      const d = await api<TxPage>(query(rows.length))
      setRows([...rows, ...d.items]); setMore(d.more)
    } finally { setBusy(false) }
  }

  function exportCsv() {
    if (!rows?.length) return
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
    const csv = ['Date,Merchant,Category,Account,Direction,Amount,Reference', ...rows.map((r) => [r.at, esc(r.merchant), esc(r.category), esc(r.account), r.direction, r.amount, r.reference].join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'nuru-history.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const chips: [string, string, string][] = [['All', '', ''], ['In', 'credit', ''], ['Out', 'debit', ''], ['Bills', '', 'Bills'], ['Food', '', 'Food'], ['Transport', '', 'Transport']]
  const on = (d: string, c: string) => direction === d && category === c
  const filtered = !!(q || category || direction || from || to || params.get('account'))

  return (
    <Shell title={t('historyTitle')} sub={meta ? `${meta.count.toLocaleString()} transactions${filtered ? ' match' : ''}` : undefined}
      right={<button className="ib" onClick={exportCsv} aria-label="Download as CSV" title="Download as CSV"><Icon name="download" /></button>}>
      <div className="narrow">
        <div className="card col g12">
          <label className="search" style={{ width: '100%', display: 'flex', height: 44 }}>
            <Icon name="search" size={18} color="var(--muted)" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchTx')} aria-label={t('searchTx')} />
            {q && <button className="ib" style={{ width: 28, height: 28, background: 'transparent' }} onClick={() => setQ('')} aria-label="Clear search"><Icon name="x" size={16} /></button>}
          </label>
          <div className="fchips">
            {chips.map(([l, d, c]) => (
              <button key={l} className={'chip' + (on(d, c) ? ' on' : '')} onClick={() => { const p = new URLSearchParams(params); d ? p.set('direction', d) : p.delete('direction'); c ? p.set('category', c) : p.delete('category'); setParams(p, { replace: true }) }}>{l}</button>
            ))}
          </div>
          <div className="row g8 wrap">
            <select className="input grow" style={{ height: 40, minWidth: 140 }} value={category} onChange={(e) => set('category', e.target.value)} aria-label={t('category')}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input type="date" className="input grow" style={{ height: 40, minWidth: 130 }} value={from} max={to || undefined} onChange={(e) => set('from', e.target.value)} aria-label="From date" />
            <input type="date" className="input grow" style={{ height: 40, minWidth: 130 }} value={to} min={from || undefined} onChange={(e) => set('to', e.target.value)} aria-label="To date" />
          </div>
          {filtered && meta && (
            <div className="row between xs">
              <span className="mu w6 upper">{meta.count} results{meta.out ? ' · ' + money(-meta.out) : ''}{meta.in ? ' · ' + money(meta.in, { sign: true }) : ''}</span>
              <button className="btn ghost sm red" style={{ height: 28, padding: 0 }} onClick={() => { setQ(''); setParams({}, { replace: true }) }}>Clear filters</button>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '6px 14px 14px' }}>
          {!rows ? <div style={{ padding: 8 }}><Skeleton h={300} /></div>
            : rows.length === 0 ? (
              <div className="col center g8" style={{ padding: '36px 12px', textAlign: 'center' }}>
                <span className="ic"><Icon name="search" /></span>
                <span className="h3">{t('noMatches')}</span>
                <span className="s t2">Try another word or date range.</span>
                {q && <Link className="btn sm" to={'/ask?q=' + encodeURIComponent(`How much did I spend on ${q}?`)}><Icon name="sparkles" size={16} color="var(--red)" />Ask NURU about “{q}”</Link>}
              </div>
            ) : <TxGroups rows={rows} />}
          {more && <button className="btn block" style={{ marginTop: 12 }} disabled={busy} onClick={loadMore}>{busy ? 'Loading…' : t('loadMore')}</button>}
        </div>
      </div>
    </Shell>
  )
}

type Detail = { tx: TxFull; label: string; purpose: string; category_avg: number; category_count: number; merchant_month: number }

const REASONS = ['I did not make this payment', 'Wrong amount', 'Charged twice', 'Goods or service not received', 'Something else']

export function TxDetail() {
  const { id } = useParams()
  const { t, toast } = useApp()
  const money = useMoney()
  const nav = useNavigate()
  const { data, error } = useLoad<Detail>('/transactions/' + id)
  const [params] = useSearchParams()
  const [report, setReport] = useState(() => params.get('report') === '1')
  const [editing, setEditing] = useState(false)
  const [mine, setMine] = useState<{ label: string; purpose: string; category: string } | null>(null)
  const [reason, setReason] = useState(REASONS[0])
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)

  if (error) return <Shell title={t('txTitle')}><div className="card col center g12" style={{ padding: 32 }}><span className="h3">We could not find that transaction</span><Link to="/history" className="btn sm">Back to history</Link></div></Shell>
  const tx = data?.tx
  const d = tx ? new Date(tx.at) : null
  const date = d ? d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + time(tx!.at) : ''
  const credit = tx?.direction === 'credit'
  const diff = data && data.category_avg ? Math.round(((tx!.amount - data.category_avg) / data.category_avg) * 100) : 0
  const ask = tx ? `Tell me about my ${money(tx.amount)} ${credit ? 'payment from' : 'payment to'} ${tx.merchant} on ${d!.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}. Is it normal for me?` : ''

  async function send() {
    setSending(true)
    try {
      const r = await api<{ reference: string }>(`/transactions/${id}/report`, { body: { reason, note } })
      setReport(false); setNote('')
      toast(`Report sent for ${r.reference}. We will update you in Notifications.`)
    } catch (e) { toast((e as Error).message) } finally { setSending(false) }
  }

  return (
    <Shell title={t('txTitle')} right={<button className="ib" onClick={() => nav(-1)} aria-label="Back"><Icon name="chevl" /></button>}>
      <div className="narrow" style={{ maxWidth: 560 }}>
        {!tx || !data ? <Skeleton h={420} /> : <>
          <div className="col center g8" style={{ textAlign: 'center', paddingTop: 4 }}>
            <span className={'ic ' + (tone(tx) || 'red')} style={{ width: 60, height: 60, borderRadius: 20 }}><Icon name={catIcon(tx.category)} size={28} /></span>
            <span className="h3">{tx.merchant}</span>
            <span className={'num ' + (credit ? 'pos' : '')} style={{ fontSize: 32, fontWeight: 800 }}>{money(credit ? tx.amount : -tx.amount, { sign: credit })}</span>
            <span className="chip green"><Icon name="check" size={12} />Successful</span>
          </div>
          <div className="card" style={{ padding: '4px 18px' }}>
            <div className="kv"><span className="t2">Date</span><span>{date}</span></div>
            <div className="kv"><span className="t2">{t('account')}</span><Link to={'/accounts/' + tx.account_id}>{tx.account} {tx.number}</Link></div>
            <div className="kv"><span className="t2">{t('category')}</span><span>{mine?.category || tx.category}</span></div>
            <div className="kv"><span className="t2">Narration</span><span>{tx.narration || (credit ? 'Credit from ' : 'Payment to ') + tx.merchant}</span></div>
            <div className="kv"><span className="t2">Reference</span><span className="row g6">{tx.reference}<button className="ib" style={{ width: 26, height: 26 }} aria-label="Copy reference" onClick={() => { navigator.clipboard?.writeText(tx.reference); toast('Reference copied') }}><Icon name="copy" size={14} /></button></span></div>
          </div>
          {(() => {
            const purpose = mine?.purpose ?? data.purpose
            const label = mine?.label ?? data.label
            const item = { id: tx.id, direction: tx.direction, amount: tx.amount, merchant: tx.merchant, account: tx.account, at: tx.at }
            if (editing || !purpose) return (
              <div className="col g8">
                {!purpose && <span className="s t2">This payment came with no description. Tell NURU what it was for so your advice stays accurate.</span>}
                <DescribeCard item={item} initial={{ label, purpose }} onSaved={(r) => { setMine(r); setEditing(false); toast('Description saved') }} />
              </div>
            )
            return (
              <div className="card col g8" style={{ padding: 16 }}>
                <div className="row between"><span className="s w6">Your description</span>
                  <button className="row g4 xs w6 red askbtn" onClick={() => setEditing(true)}><Icon name="edit" size={14} color="var(--red)" />Edit</button></div>
                <span className="s">{label && label !== 'Other' && label !== purpose ? `${label}: ` : ''}{purpose}</span>
                <span className="row g6 xs mu"><Icon name="lock" size={12} />Encrypted · NURU uses it for advice</span>
              </div>
            )
          })()}
          {!credit && data.category_count > 2 && (
            <div className="soft row g10 start" style={{ background: 'var(--red50)' }}>
              <Icon name="sparkles" size={18} color="var(--red)" />
              <span className="xs t2">
                {Math.abs(diff) < 10 ? `About what you usually spend on ${tx.category.toLowerCase()} (${money(data.category_avg)} on average).`
                  : `${Math.abs(diff)}% ${diff > 0 ? 'more' : 'less'} than your usual ${tx.category.toLowerCase()} payment of ${money(data.category_avg)}.`}
                {data.merchant_month > 1 ? ` Your ${ordinal(data.merchant_month)} payment to ${tx.merchant} this month.` : ''}
              </span>
            </div>
          )}
          <div className="row g10 wrap">
            <Link className="btn pri grow" to={'/ask?q=' + encodeURIComponent(ask)}><Icon name="sparkles" size={18} color="#fff" />{t('askAboutThis')}</Link>
            <button className="btn grow" onClick={() => setReport(true)}><Icon name="flag" size={18} />{t('reportProblem')}</button>
          </div>
        </>}
      </div>
      {report && tx && (
        <Modal onClose={() => setReport(false)}>
          <div className="col g16">
            <div className="col g4"><span className="h2">{t('reportProblem')}</span><span className="s t2">{money(tx.amount)} · {tx.merchant} · {tx.reference}</span></div>
            <div className="col g8" role="radiogroup" aria-label="What went wrong">
              {REASONS.map((r) => (
                <label key={r} className="row g10 s" style={{ cursor: 'pointer' }}><input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} style={{ accentColor: 'var(--red)' }} />{r}</label>
              ))}
            </div>
            <div className="field"><label htmlFor="rnote">Anything else we should know?</label>
              <textarea id="rnote" className="input" style={{ height: 84, padding: 12, resize: 'none' }} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="row g10"><button className="btn grow" onClick={() => setReport(false)}>Cancel</button><button className="btn pri grow" disabled={sending} onClick={send}>{sending ? 'Sending…' : 'Send report'}</button></div>
          </div>
        </Modal>
      )}
    </Shell>
  )
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
