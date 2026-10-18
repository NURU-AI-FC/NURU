import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type Account } from '../api'
import { langNames } from '../i18n'
import { Shell } from '../Shell'
import { useApp } from '../store'
import { Icon, Modal, Seg, useLoad } from '../ui'
import { Ic, Item, Toggle } from './settings/kit'

export default function Settings() {
  const { t, user, update } = useApp()
  const [out, setOut] = useState(false)
  const staff = user?.role === 'staff'
  const { data: accts } = useLoad<{ accounts: Account[] }>(staff ? null : '/accounts')
  if (!user) return null
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('')
  const tier = staff ? 'Zenith staff' : (user.kyc_verified ? 'Tier 2 verified' : 'Not verified yet') + ' · ' + (user.business_name ? 'Personal and business' : 'Personal')

  return (
    <Shell title={t('settings')} sub={user.email}>
      <div className="k-flow wide">
        <Link to={staff || user.kyc_verified ? '/settings/security' : '/verify'} className="card row g12" style={{ padding: 16 }}>
          <span className="av" style={{ width: 48, height: 48, fontSize: 17 }}>{initials}</span>
          <span className="col g4 grow"><span className="h3">{user.name}</span><span className="xs mu">{tier}</span></span>
          {!staff && !user.kyc_verified && <span className="chip amber">Verify</span>}
          <Icon name="chevr" color="var(--muted)" />
        </Link>

        <div className="grid g-2" style={{ gap: 16 }}>
          <div className="card col g8">
            <span className="k-label">Preferences</span>
            <div className="k-item wrap" style={{ rowGap: 8 }}><Ic name="sun" size={17} /><span className="s w6 grow">{t('appearance')}</span>
              <Seg value={user.theme} onChange={(v) => update({ theme: v })} options={[['light', t('light')], ['dark', t('dark')], ['system', t('system')]]} />
            </div>
            <Item icon="globe" title={t('languageVoice')} to="/settings/language" right={<span className="xs t2">{langNames[user.language]}</span>} />
            <div className="k-item"><Ic name="exchange" size={17} /><span className="col g4 grow"><span className="s w6">{t('currency')}</span><span className="xs mu">Transfers are always in naira</span></span>
              <select className="input" style={{ width: 100, height: 38 }} aria-label={t('currency')} value={user.currency} onChange={(e) => update({ currency: e.target.value })}>{['NGN', 'USD', 'GBP', 'EUR'].map((c) => <option key={c}>{c}</option>)}</select>
            </div>
          </div>

          <div className="card col g8">
            <span className="k-label">Security and privacy</span>
            <Item icon="shield" title={t('security')} sub="PIN, face check, passkey, password" to="/settings/security" />
            <Item icon="phone" title={t('devices')} sub="See and remove signed in devices" to="/settings/devices" />
            {!staff && <Item icon="eye" title={t('privacy')} sub="Consent, download your data" to="/settings/privacy" />}
            {!staff && <Item icon="link" title={t('linkedAccounts')} to="/settings/accounts" right={<span className="xs t2">{accts?.accounts.length ?? ''}</span>} />}
            {!staff && <Item icon="shieldcheck" title={t('verifyId')} to="/verify" right={user.kyc_verified ? <span className="chip green">{t('verified')}</span> : <span className="chip amber">Tier 1</span>} />}
          </div>
        </div>

        <div className="row g12">
          {!staff && <Tile to="/learn" icon="book" label={t('learn')} />}
          <Tile to="/help" icon="help" label="Help" />
          <button className="card col center g6 grow" style={{ padding: 14 }} onClick={() => setOut(true)}><Ic name="logout" tone="red" size={17} /><span className="xs w6">Log out</span></button>
        </div>
      </div>
      {out && <LogoutSheet onClose={() => setOut(false)} />}
    </Shell>
  )
}

const Tile = ({ to, icon, label }: { to: string; icon: string; label: string }) => (
  <Link to={to} className="card col center g6 grow" style={{ padding: 14 }}><Ic name={icon} size={17} /><span className="xs w6">{label}</span></Link>
)

export function LogoutSheet({ onClose }: { onClose: () => void }) {
  const { t, signOut } = useApp()
  const nav = useNavigate()
  const [all, setAll] = useState(false)
  const { data: sessions } = useLoad<{ current: boolean; revoked_at: string | null; device: string }[]>('/me/sessions')
  const others = (sessions || []).filter((s) => !s.current && !s.revoked_at)
  async function go() {
    await api('/me/logout', { body: { all } }).catch(() => {})
    signOut()
    nav('/login')
  }
  return (
    <Modal onClose={onClose}>
      <div className="col g16">
        <div className="col center g8" style={{ textAlign: 'center' }}>
          <Ic name="logout" tone="red" lg />
          <span className="h3">{t('logoutAsk')}</span>
          <span className="s t2">You will need your password and a one time code to sign in again. Your chats stay saved.</span>
        </div>
        <div className="row g12">
          <span className="col g4 grow"><span className="s w6">Log out on all devices</span><span className="xs mu">{others.length ? 'Also signs out ' + others.map((s) => s.device).slice(0, 2).join(', ') : 'No other devices are signed in'}</span></span>
          <Toggle on={all} onChange={setAll} label="Log out on all devices" />
        </div>
        <button className="btn pri block" onClick={go}>Log out</button>
        <button className="btn block" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}
