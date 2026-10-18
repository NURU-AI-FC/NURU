import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, type Payee } from '../api'
import { Shell } from '../Shell'
import { useApp, useMoney } from '../store'
import { Icon, Skeleton, useLoad, when } from '../ui'
import { TxRow, type TxPage } from './History'
import './Home.css'

const PAGES: [string, string, string, string][] = [
  ['/', 'home', 'Home', 'dashboard balance overview'],
  ['/accounts', 'wallet', 'Connected accounts', 'banks wallets link net worth'],
  ['/history', 'history', 'History', 'transactions statement export'],
  ['/insights', 'chart', 'Insights', 'analytics spending categories trends'],
  ['/ask', 'sparkles', 'Ask NURU', 'chat question help assistant'],
  ['/pay', 'send', 'Pay and transfer', 'send money transfer payee bills airtime'],
  ['/money', 'landmark', 'Loans and savings', 'loan investment pension savings'],
  ['/planner', 'calendar', 'Planner', 'reminders budget goals calendar'],
  ['/business', 'briefcase', 'Business', 'payroll staff sales'],
  ['/notifications', 'bell', 'Notifications', 'alerts inbox'],
  ['/notifications/settings', 'bell', 'Notification settings', 'alerts quiet hours'],
  ['/profile', 'user', 'Profile', 'name phone account details'],
  ['/settings', 'settings', 'Settings', 'theme language pin security currency'],
]

const KEY = 'nuru.searches'
const loadRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }

export default function Search() {
  const { t } = useApp()
  const money = useMoney()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const term = (params.get('q') || '').trim()
  const [q, setQ] = useState(term)
  const [recent, setRecent] = useState(loadRecent)
  const [res, setRes] = useState<TxPage | null>(null)
  const payees = useLoad<Payee[]>('/payees').data

  useEffect(() => {
    const id = setTimeout(() => { if (q.trim() !== term) setParams(q.trim() ? { q: q.trim() } : {}, { replace: true }) }, 300)
    return () => clearTimeout(id)
  }, [q, term, setParams])

  useEffect(() => {
    if (!term) { setRes(null); return }
    let live = true
    setRes(null)
    api<TxPage>('/transactions?meta=1&limit=8&q=' + encodeURIComponent(term)).then((d) => live && setRes(d)).catch(() => {})
    const id = setTimeout(() => {
      const next = [term, ...loadRecent().filter((r) => r.toLowerCase() !== term.toLowerCase())].slice(0, 6)
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
      setRecent(next)
    }, 1200)
    return () => { live = false; clearTimeout(id) }
  }, [term])

  const lc = term.toLowerCase()
  const pages = term ? PAGES.filter(([, , l, k]) => (l + ' ' + k).toLowerCase().includes(lc)) : []
  const people = term ? (payees || []).filter((p) => (p.name + ' ' + p.bank).toLowerCase().includes(lc)) : []
  const ask = `How much did I spend on ${term}?`

  return (
    <Shell title={t('searchTitle')}>
      <div className="narrow">
        <div className="row g10">
          <form className="search grow" style={{ display: 'flex', width: 'auto', height: 46, background: 'var(--bg)', borderColor: 'var(--red)' }} onSubmit={(e) => { e.preventDefault(); setParams(q.trim() ? { q: q.trim() } : {}) }}>
            <Icon name="search" size={18} color="var(--muted)" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transactions, payees and pages" aria-label={t('searchTitle')} />
            {q && <button type="button" className="ib" style={{ width: 28, height: 28, background: 'transparent' }} onClick={() => setQ('')} aria-label="Clear"><Icon name="x" size={16} /></button>}
          </form>
          <button className="btn ghost sm red" onClick={() => nav(-1)}>Cancel</button>
        </div>

        {term && (
          <Link to={'/ask?q=' + encodeURIComponent(ask)} className="soft row g10" style={{ background: 'var(--red50)' }}>
            <Icon name="sparkles" size={18} color="var(--red)" />
            <span className="col g4 grow"><span className="s w6">Ask NURU: “{ask}”</span><span className="xs t2">Get totals, trends and tips</span></span>
            <Icon name="chevr" size={18} color="var(--red)" />
          </Link>
        )}

        {!term && (
          <div className="col g10">
            {recent.length > 0 && <>
              <div className="row between"><span className="xs mu w6 upper">Recent searches</span><button className="btn ghost sm" style={{ height: 26 }} onClick={() => { try { localStorage.removeItem(KEY) } catch { /* ignore */ } setRecent([]) }}>Clear</button></div>
              <div className="row g8 wrap">{recent.map((r) => <button key={r} className="chip" onClick={() => setQ(r)}><Icon name="history" size={14} />{r}</button>)}</div>
            </>}
            <span className="xs mu w6 upper" style={{ marginTop: 8 }}>Try</span>
            <div className="row g8 wrap">{['Bolt', 'DStv', 'Salary', 'Shoprite', 'Transfer'].map((r) => <button key={r} className="chip" onClick={() => setQ(r)}>{r}</button>)}</div>
          </div>
        )}

        {term && pages.length > 0 && (
          <div className="card col" style={{ padding: '10px 14px' }}>
            <span className="xs mu w6 upper" style={{ padding: '4px 6px' }}>Pages</span>
            {pages.map(([to, ic, l]) => <Link key={to} to={to} className="txr"><span className="ic"><Icon name={ic} size={18} /></span><span className="s w6 grow">{l}</span><Icon name="chevr" color="var(--muted)" /></Link>)}
          </div>
        )}

        {term && people.length > 0 && (
          <div className="card col" style={{ padding: '10px 14px' }}>
            <span className="xs mu w6 upper" style={{ padding: '4px 6px' }}>Payees</span>
            {people.map((p) => (
              <Link key={p.id} to={'/pay?payee=' + p.id} className="txr">
                <span className="av" style={{ width: 40, height: 40 }}>{p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
                <span className="col g4 grow"><span className="s w6">{p.name}</span><span className="xs mu">{p.bank} · {p.account}</span></span>
                <Icon name="send" size={16} color="var(--muted)" />
              </Link>
            ))}
          </div>
        )}

        {term && (
          <div className="card col" style={{ padding: '10px 14px' }}>
            {!res ? <Skeleton h={200} /> : <>
              <div className="row between" style={{ padding: '4px 6px' }}>
                <span className="xs mu w6 upper">{res.count} {res.count === 1 ? 'result' : 'results'}{res.out ? ' · ' + money(res.out) + ' spent' : ''}</span>
                {res.count > 0 && <Link className="xs w6 red" to={'/history?q=' + encodeURIComponent(term)}>{res.more ? 'See all' : 'Filter'}</Link>}
              </div>
              {res.items.length === 0
                ? <p className="s t2" style={{ padding: '4px 6px' }}>No transactions match “{term}”. Ask NURU above for help.</p>
                : res.items.map((x) => <TxRow key={x.id} t={x} sub={`${x.category} · ${when(x.at)}`} />)}
            </>}
          </div>
        )}
      </div>
    </Shell>
  )
}
