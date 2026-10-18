import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { langNames } from '../i18n'
import { Shell } from '../Shell'
import { useApp } from '../store'
import { Icon, Modal, Skeleton, useLoad } from '../ui'
import './Home.css'

type Prof = { member_since: string; tier: number; accounts: number; transactions_90d: number; saved_pct: number }

const maskPhone = (p: string) => p.length > 7 ? p.slice(0, p.length - 7) + ' *** ' + p.slice(-4) : p

function Row({ to, icon, title, sub, tone }: { to: string; icon: string; title: string; sub: string; tone?: string }) {
  return (
    <Link to={to} className="txr" style={{ padding: '12px 6px' }}>
      <span className={'ic ' + (tone || '')}><Icon name={icon} size={18} /></span>
      <span className="col g4 grow"><span className="s w6">{title}</span><span className="xs mu">{sub}</span></span>
      <Icon name="chevr" color="var(--muted)" />
    </Link>
  )
}

export default function Profile() {
  const { t, user, refresh, toast } = useApp()
  const { data } = useLoad<Prof>('/me/profile')
  const [edit, setEdit] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  if (!user) return null
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  function open() { setName(user!.name); setPhone(user!.phone); setErr(''); setEdit(true) }
  async function save() {
    if (!name.trim()) { setErr('Enter your name'); return }
    setBusy(true); setErr('')
    try {
      await api('/me', { method: 'PATCH', body: { name: name.trim(), phone: phone.trim() } })
      await refresh(); setEdit(false); toast('Profile saved')
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const since = data ? new Date(data.member_since).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' }) : ''
  return (
    <Shell title={t('profileTitle')} right={<button className="ib" onClick={open} aria-label={t('editProfile')}><Icon name="edit" /></button>}>
      <div className="narrow" style={{ maxWidth: 620 }}>
        <div className="col center g8" style={{ textAlign: 'center' }}>
          <span className="av" style={{ width: 80, height: 80, fontSize: 29 }}>{initials}</span>
          <span className="h2">{user.name}</span>
          <span className="s t2" style={{ overflowWrap: 'anywhere' }}>{user.email}{user.phone ? ' · ' + maskPhone(user.phone) : ''}</span>
          <div className="row g8 wrap center">
            {data ? <span className={'chip ' + (data.tier > 1 ? 'green' : 'amber')}><Icon name={data.tier > 1 ? 'shieldcheck' : 'shield'} size={12} />Tier {data.tier}{data.tier > 1 ? ' verified' : ''}</span> : null}
            <span className="chip">{user.business_name ? 'Personal and business' : 'Personal'}</span>
          </div>
          {since && <span className="xs mu">{t('memberSince')} {since}</span>}
        </div>

        {!data ? <Skeleton h={76} /> : (
          <div className="card row" style={{ padding: 14, justifyContent: 'space-around' }}>
            {([[String(data.accounts), 'Accounts'], [data.saved_pct + '%', 'Saved'], [String(data.transactions_90d), 'Payments in 90 days']] as [string, string][]).map(([v, l], i) => (
              <span key={l} className="col center g4" style={{ flex: 1, borderLeft: i ? '1px solid var(--border)' : 0 }}><span className="h3 num">{v}</span><span className="xs mu" style={{ textAlign: 'center' }}>{l}</span></span>
            ))}
          </div>
        )}

        <div className="card col" style={{ padding: '6px 14px' }}>
          <button className="txr" style={{ border: 0, background: 'transparent', textAlign: 'left', padding: '12px 6px' }} onClick={open}>
            <span className="ic"><Icon name="user" size={18} /></span>
            <span className="col g4 grow"><span className="s w6">Personal details</span><span className="xs mu">Name and phone number</span></span>
            <Icon name="chevr" color="var(--muted)" />
          </button>
          {data && data.tier < 2 && <Row to="/settings" icon="shieldcheck" title="Upgrade to Tier 2" sub="Verify your BVN or NIN for higher limits" tone="green" />}
          {user.business_name && <Row to="/business" icon="briefcase" title="Business mode" sub="Payroll, vendors, investor tools" tone="red" />}
          <Row to="/accounts" icon="wallet" title={t('connectedAccounts')} sub="Banks and wallets linked to NURU" />
          <Row to="/settings" icon="globe" title="Language and appearance" sub={langNames[user.language] + ' · ' + user.theme[0].toUpperCase() + user.theme.slice(1) + ' theme'} />
          <Row to="/notifications/settings" icon="bell" title={t('notifySettingsTitle')} sub="Alerts, insights and quiet hours" />
          <Row to="/history" icon="file" title="Statements" sub="Search and download your history" />
        </div>
      </div>

      {edit && (
        <Modal onClose={() => setEdit(false)}>
          <form className="col g16" onSubmit={(e) => { e.preventDefault(); save() }}>
            <span className="h2">{t('editProfile')}</span>
            <div className="field"><label htmlFor="pname">{t('fullName')}</label><input id="pname" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} /></div>
            <div className="field"><label htmlFor="pphone">{t('phone')}</label><input id="pphone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" placeholder="+234 803 000 0000" maxLength={20} /></div>
            <div className="field"><label>{t('email')}</label><input className="input" value={user.email} disabled /></div>
            {err && <span className="err">{err}</span>}
            <div className="row g10"><button type="button" className="btn grow" onClick={() => setEdit(false)}>Cancel</button><button className="btn pri grow" disabled={busy}>{busy ? 'Saving…' : t('save')}</button></div>
          </form>
        </Modal>
      )}
    </Shell>
  )
}
