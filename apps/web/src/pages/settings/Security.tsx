import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { FaceCam } from '../../Guard'
import { Shell } from '../../Shell'
import { useApp } from '../../store'
import { Icon, Modal, PinInput, useLoad } from '../../ui'
import { ago, createPasskey, hasPasskey, Item, Toggle, Top } from './kit'

type Overview = { has_pin: boolean; face_enrolled: boolean; kyc_verified: boolean; pin_changed_at: string | null; password_changed_at: string; active_sessions: number; login_alerts: boolean; frozen_until?: string }

function Ring({ value }: { value: number }) {
  const r = 26, c = 2 * Math.PI * r
  const color = value >= 80 ? 'var(--green)' : value >= 55 ? 'var(--amber)' : 'var(--red)'
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={'Security score ' + value}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--surface2)" strokeWidth="7" />
      <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} transform="rotate(-90 32 32)" />
      <text x="32" y="37" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--text)">{value}</text>
    </svg>
  )
}

// Security is the security centre: a score, each protection and its state,
// and a freeze button for when something looks wrong.
export default function Security() {
  const { t, user, refresh, toast } = useApp()
  const nav = useNavigate()
  const { data: o, reload } = useLoad<Overview>('/me/security/overview')
  const [passkey, setPasskey] = useState(hasPasskey)
  const [pinStep, setPinStep] = useState<'' | 'current' | 'new'>('')
  const [current, setCurrent] = useState('')
  const [face, setFace] = useState<'' | 'pin' | 'cam'>('')
  const [facePin, setFacePin] = useState('') // replacing an enrolled face needs the PIN
  const [freeze, setFreeze] = useState(false)
  if (!user) return null

  const parts: [boolean, string][] = o ? [[o.has_pin, 'set a transaction PIN'], [o.face_enrolled, 'turn on face check'], [passkey, 'add a passkey'], [o.kyc_verified, 'verify your BVN or NIN']] : []
  const score = 40 + parts.filter(([ok]) => ok).length * 15
  const missing = parts.find(([ok]) => !ok)

  async function savePin(pin: string) {
    try { await api('/me/pin', { body: { pin, current } }); setPinStep(''); setCurrent(''); toast('PIN saved'); refresh(); reload() } catch (e) { toast((e as Error).message); setPinStep('') }
  }
  async function addPasskey() {
    try { if (await createPasskey(user!)) { setPasskey(true); toast('Passkey added on this device') } } catch { toast('Passkey was not created') }
  }
  async function alerts(v: boolean) {
    await api('/me/prefs', { method: 'PATCH', body: { login_alerts: v } }).catch(() => {})
    reload()
  }
  async function doFreeze() {
    try { await api('/me/freeze', { body: {} }); setFreeze(false); toast('Transfers paused for 24 hours'); reload() } catch (e) { toast((e as Error).message) }
  }

  return (
    <Shell title={t('securityCentre')} sub="How well your account is protected">
      <div className="k-flow">
        <Top back="/settings" />
        <div className="card row g16" style={{ padding: 18 }}>
          {o ? <Ring value={score} /> : <div className="skeleton" style={{ width: 64, height: 64, borderRadius: 99 }} />}
          <span className="col g4 grow">
            <span className="h3">{score >= 100 ? 'Full protection' : score >= 80 ? 'Strong protection' : 'Needs attention'}</span>
            <span className="xs t2">{missing ? 'To reach 100, ' + missing[1] + '.' : 'Every protection NURU offers is on.'}</span>
          </span>
        </div>
        {o?.frozen_until && (
          <div className="soft row g10" style={{ background: 'var(--amber50)' }}><Icon name="lock" color="var(--amber)" /><span className="s">Transfers are paused until {new Date(o.frozen_until).toLocaleString('en-NG', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}.</span></div>
        )}
        <div className="card col" style={{ padding: '6px 20px' }}>
          <Item icon="fingerprint" title={t('passkey')} sub={passkey ? 'On this device' : 'Sign in with your fingerprint or face'} tone={passkey ? 'green' : ''}
            right={passkey ? <span className="chip green">On</span> : <button className="btn sm" onClick={addPasskey}>Add</button>} />
          <Item icon="lock" title="Transaction PIN" sub={o?.has_pin ? (o.pin_changed_at ? 'Changed ' + ago(o.pin_changed_at) : 'Needed for every transfer') : 'Not set yet'} tone={o?.has_pin ? 'green' : ''}
            onClick={() => setPinStep(o?.has_pin ? 'current' : 'new')} right={o?.has_pin ? <span className="chip green">On</span> : <span className="chip amber">Set up</span>} />
          <Item icon="scanface" title="Face check for transfers" sub={o?.face_enrolled ? 'Checked on every transfer' : 'Not set up yet'} tone={o?.face_enrolled ? 'green' : ''}
            onClick={() => { setFacePin(''); setFace(o?.face_enrolled ? 'pin' : 'cam') }} right={o?.face_enrolled ? <span className="chip green">On</span> : <span className="chip amber">Set up</span>} />
          <Item icon="phone" title={t('devices')} sub={o ? o.active_sessions + (o.active_sessions === 1 ? ' active session' : ' active sessions') : ' '} to="/settings/devices" />
          <Item icon="bell" title="Login alerts" sub="Email when a new device signs in" right={o && <Toggle on={o.login_alerts} onChange={alerts} label="Login alerts" />} />
          <Item icon="key" title="Change password" sub={o ? 'Last changed ' + ago(o.password_changed_at) : ' '} to="/forgot" />
          <Item icon="shieldcheck" title={t('verifyId')} sub={user.kyc_verified ? 'Tier 2, only the last 4 digits are stored' : 'Raises your limits to Tier 2'} to="/verify"
            right={user.kyc_verified ? <span className="chip green">{t('verified')}</span> : undefined} />
        </div>
        <button className="btn block" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => setFreeze(true)}><Icon name="alert" color="var(--red)" /> Freeze my account</button>
      </div>

      {face === 'pin' && (
        <Modal onClose={() => setFace('')}>
          <div className="col g16 center" style={{ textAlign: 'center' }}>
            <span className="h3">Enter your transaction PIN</span>
            <span className="s t2">You need your PIN to replace your face check.</span>
            <PinInput key="facepin" onDone={(p) => { setFacePin(p); setFace('cam') }} />
          </div>
        </Modal>
      )}
      {face === 'cam' && (
        <Modal onClose={() => setFace('')}>
          <div className="col g12 center" style={{ textAlign: 'center' }}>
            <span className="h3">Face check</span>
            <FaceCam mode="enrol" onFace={async (d) => { try { await api('/me/face', { body: facePin ? { descriptor: d, pin: facePin } : { descriptor: d } }); toast('Face check saved'); reload() } catch (e) { toast((e as Error).message) } setFace(''); setFacePin('') }} />
          </div>
        </Modal>
      )}
      {pinStep && (
        <Modal onClose={() => setPinStep('')}>
          <div className="col g16 center" style={{ textAlign: 'center' }}>
            <span className="h3">{pinStep === 'current' ? 'Enter your current PIN' : 'Choose a new 4 digit PIN'}</span>
            <PinInput key={pinStep} onDone={(p) => { if (pinStep === 'current') { setCurrent(p); setPinStep('new') } else savePin(p) }} />
          </div>
        </Modal>
      )}
      {freeze && (
        <Modal onClose={() => setFreeze(false)}>
          <div className="col g16">
            <div className="col center g8" style={{ textAlign: 'center' }}>
              <span className="k-ic red lg"><Icon name="alert" size={26} /></span>
              <span className="h3">Freeze your account?</span>
              <span className="s t2">Transfers stop for 24 hours and every other device is signed out. You can still see your balances. Call support to unfreeze sooner.</span>
            </div>
            <button className="btn pri block" onClick={doFreeze}>Freeze now</button>
            <button className="btn block" onClick={() => { setFreeze(false); nav('/help') }}>Talk to support instead</button>
          </div>
        </Modal>
      )}
    </Shell>
  )
}
