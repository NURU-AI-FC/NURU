import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { api, type ChatMsg } from './api'
import type { Key } from './i18n'
import { useApp } from './store'
import { ThemePicker } from './ThemePicker'
import { useUnread } from './notify'
import { Icon, Logo } from './ui'

const NAV: [string, string, Key][] = [
  ['/', 'home', 'home'], ['/insights', 'chart', 'insights'], ['/ask', 'sparkles', 'ask'], ['/pay', 'send', 'pay'],
  ['/money', 'landmark', 'money'], ['/business', 'briefcase', 'business'], ['/planner', 'calendar', 'planner'], ['/branches', 'pin', 'branches'],
]

export function Shell({ title, sub, children, right }: { title: string; sub?: string; children: ReactNode; right?: ReactNode }) {
  const { t, user, update, signOut } = useApp()
  const nav = useNavigate()
  const [mini, setMini] = useState(() => { try { return localStorage.getItem('nuru.side') === 'mini' } catch { return false } })
  const [recent, setRecent] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const unread = useUnread()

  useEffect(() => { try { localStorage.setItem('nuru.side', mini ? 'mini' : 'full') } catch { /* ignore */ } }, [mini])
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [open])
  useEffect(() => {
    api<ChatMsg[]>('/chat').then((m) => setRecent([...new Set(m.filter((x) => x.role === 'user').map((x) => x.content).reverse())].slice(0, 5))).catch(() => {})
  }, [])

  const initials = (user?.name || '').split(' ').map((p) => p[0]).slice(0, 2).join('')
  const dark = document.documentElement.dataset.theme === 'dark'
  const small = mini && !open
  const items = user?.role === 'staff' ? [['/console', 'shield', 'console'] as [string, string, Key]] : NAV

  return (
    <div className="app">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={'side' + (small ? ' mini' : '') + (open ? ' open' : '')} aria-label="Main">
        {small ? (
          <div className="col center g8">
            <span className="mark">N</span>
            <button className="ib" style={{ background: 'transparent', marginTop: 6 }} onClick={() => setMini(false)} aria-label="Expand sidebar"><Icon name="panel" size={20} color="var(--text2)" /></button>
            {user?.role !== 'staff' && <Link className="ib" style={{ background: 'var(--red)' }} to="/ask?new=1" aria-label={t('newChat')}><Icon name="plus" size={20} color="#fff" /></Link>}
            <div className="div" style={{ width: 40, margin: '6px 0' }} />
          </div>
        ) : (
          <>
            <div className="row between" style={{ padding: '0 6px' }}>
              <Logo />
              <button className="ib" style={{ width: 34, height: 34, background: 'transparent' }} onClick={() => open ? setOpen(false) : setMini(true)} aria-label="Collapse sidebar"><Icon name="panel" size={20} color="var(--text2)" /></button>
            </div>
            {user?.role !== 'staff' && <Link to="/ask?new=1" className="btn pri sm" style={{ marginTop: 18, height: 42, justifyContent: 'flex-start', fontSize: 14 }}><Icon name="plus" color="#fff" />{t('newChat')}</Link>}
          </>
        )}
        <nav className="col" style={{ marginTop: small ? 0 : 14, gap: 2 }}>
          {items.map(([to, ic, k]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => 'nav' + (isActive ? ' on' : '')} title={t(k)}><Icon name={ic} /><span>{t(k)}</span></NavLink>
          ))}
        </nav>
        {!small && recent.length > 0 && (
          <>
            <span className="xs mu w6 upper" style={{ margin: '18px 10px 6px' }}>{t('recent')}</span>
            <div className="col" style={{ gap: 2 }}>{recent.map((r) => <Link key={r} className="recent" to={'/ask?q=' + encodeURIComponent(r)}>{r}</Link>)}</div>
          </>
        )}
        <div className="grow" />
        {small ? (
          <div className="col center g8">
            <NavLink to="/settings" className="nav" title={t('settings')}><Icon name="settings" /></NavLink>
            <span className="av">{initials}</span>
          </div>
        ) : (
          <Link to="/settings" className="row g10" style={{ padding: 10, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}>
            <span className="av" style={{ width: 34, height: 34, fontSize: 12 }}>{initials}</span>
            <span className="col grow"><span className="s w6">{user?.name}</span><span className="xs mu">{user?.role === 'staff' ? 'Zenith staff' : user?.business_name ? 'Personal and business' : 'Personal'}{user?.kyc_verified ? ' · Tier 2' : ''}</span></span>
            <Icon name="settings" color="var(--muted)" />
          </Link>
        )}
      </aside>

      <div className="main">
        <header className="top">
          <button className="ib menu" onClick={() => setOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <div className="col g4 grow" style={{ minWidth: 0 }}>
            <h1 className="h2" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
            {sub && <span className="xs mu">{sub}</span>}
          </div>
          <div className="row g12">
            {user?.role !== 'staff' && (
              <form className="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav('/search?q=' + encodeURIComponent(q.trim())); setQ('') }}>
                <Icon name="search" size={16} color="var(--muted)" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} />
              </form>
            )}
            {right && <div className="top-right">{right}</div>}
            <Link className="ib bell" to="/notifications" aria-label={unread ? `${t('reminders')}, ${unread} unread` : t('reminders')}><Icon name="bell" />{unread > 0 && <span className="dot">{unread > 9 ? '9+' : unread}</span>}</Link>
            <ThemePicker />
            <button className="ib theme" onClick={() => update({ theme: dark ? 'light' : 'dark' })} aria-label="Toggle theme"><Icon name={dark ? 'moon' : 'sun'} /></button>
            <button className="ib" onClick={() => { signOut(); nav('/login') }} aria-label={t('logout')} title={t('logout')}><Icon name="logout" /></button>
          </div>
        </header>
        {right && <div className="top-sub">{right}</div>}
        <main className="page">{children}</main>
      </div>

      <nav className="tabbar" aria-label="Main">
        {(user?.role === 'staff' ? items : [NAV[0], NAV[1], NAV[2], NAV[3], ['/settings', 'settings', 'settings'] as [string, string, Key]]).map(([to, ic, k]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'on' : '')}><Icon name={ic} size={22} /><span>{t(k).split(' ')[0]}</span></NavLink>
        ))}
      </nav>
    </div>
  )
}
