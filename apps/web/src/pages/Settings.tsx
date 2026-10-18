import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, type Lang } from '../api'
import { langNames } from '../i18n'
import { Shell } from '../Shell'
import { useApp } from '../store'
import { FaceCam } from '../Guard'
import { Icon, Modal, PinInput, Seg, useLoad } from '../ui'

export default function Settings() {
  const { t, user, update, refresh, toast } = useApp()
  const [params] = useSearchParams()
  const [pinStep, setPinStep] = useState<'' | 'current' | 'new'>('')
  const [current, setCurrent] = useState('')
  const [bvn, setBvn] = useState('')
  const [err, setErr] = useState('')
  const [passkey, setPasskey] = useState(() => { try { return !!localStorage.getItem('nuru.passkey') } catch { return false } })
  const { data: sec, reload: reSec } = useLoad<{ face_enrolled: boolean }>('/me/security')
  const [faceOpen, setFaceOpen] = useState(false)
  if (!user) return null

  async function savePin(pin: string) {
    try {
      await api('/me/pin', { body: { pin, current } })
      setPinStep(''); setCurrent(''); toast('PIN saved'); refresh()
    } catch (e) { toast((e as Error).message); setPinStep('') }
  }
  async function kyc() {
    setErr('')
    try { await api('/me/kyc', { body: bvn.length === 11 ? { bvn } : {} }); toast('Verified in sandbox'); refresh() } catch (e) { setErr((e as Error).message) }
  }
  // Registers a platform passkey on this device. The sandbox keeps only a
  // flag; production would send the public key to the API to verify later.
  async function addPasskey() {
    try {
      const cred = await navigator.credentials.create({ publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'NURU' },
        user: { id: new TextEncoder().encode(user!.id), name: user!.email, displayName: user!.name },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { userVerification: 'required', residentKey: 'preferred' }, timeout: 60000,
      } })
      if (cred) { localStorage.setItem('nuru.passkey', (cred as PublicKeyCredential).id); setPasskey(true); toast('Passkey added on this device') }
    } catch { toast('Passkey was not created') }
  }

  return (
    <Shell title={t('settings')} sub={user.email}>
      {params.get('welcome') && (
        <div className="card row g12" style={{ background: 'var(--red50)', borderColor: 'var(--red100)' }}>
          <Icon name="sparkles" color="var(--red)" />
          <span className="s">Welcome to NURU. We added sandbox accounts with a year of history so you can explore. Set a PIN below to send money.</span>
        </div>
      )}
      <div className="grid g-2">
        <div className="card col g16">
          <span className="h3">{t('appearance')}</span>
          <Seg value={user.theme} onChange={(v) => update({ theme: v })} options={[['light', t('light')], ['dark', t('dark')], ['system', t('system')]]} />
          <div className="field"><label htmlFor="lang">{t('language')}</label>
            <select id="lang" className="input" value={user.language} onChange={(e) => update({ language: e.target.value as Lang })}>{(Object.keys(langNames) as Lang[]).map((l) => <option key={l} value={l}>{langNames[l]}</option>)}</select>
          </div>
          <div className="field"><label htmlFor="cur">{t('currency')}</label>
            <select id="cur" className="input" value={user.currency} onChange={(e) => update({ currency: e.target.value })}>{['NGN', 'USD', 'GBP', 'EUR'].map((c) => <option key={c}>{c}</option>)}</select>
            <span className="xs mu">Amounts convert with live rates. Transfers are always in naira.</span>
          </div>
        </div>

        <div className="card col g12">
          <span className="h3">{t('security')}</span>
          <Row icon="lock" title={user.has_pin ? t('changePin') : t('setPin')} sub="4 digits, needed for every transfer">
            <button className="btn sm" onClick={() => setPinStep(user.has_pin ? 'current' : 'new')}>{user.has_pin ? t('changePin') : t('setPin')}</button>
          </Row>
          <Row icon="fingerprint" title={t('passkey')} sub="Sign in with your fingerprint or face on this device">
            {passkey ? <span className="chip green">On</span> : <button className="btn sm" onClick={addPasskey}>Add</button>}
          </Row>
          <Row icon="scanface" title={t('face')} sub={sec?.face_enrolled ? 'Checked on every transfer' : 'Set up on your first transfer'}>{sec?.face_enrolled ? <button className="btn sm" onClick={() => setFaceOpen(true)}>Redo</button> : <button className="btn sm" onClick={() => setFaceOpen(true)}>Set up</button>}</Row>
          <Row icon="mail" title="One time code" sub="Sent each time you sign in"><span className="chip green">On</span></Row>
          <Row icon="shieldcheck" title={t('verifyId')} sub={user.kyc_verified ? 'Tier 2, only the last 4 digits are stored' : 'Raises your limits to Tier 2'}>
            {user.kyc_verified && <span className="chip green">{t('verified')}</span>}
          </Row>
          {!user.kyc_verified && (
            <div className="row g8">
              <input className="input num" placeholder="11 digit BVN or NIN" inputMode="numeric" maxLength={11} value={bvn} onChange={(e) => setBvn(e.target.value.replace(/\D/g, ''))} />
              <button className="btn pri sm" style={{ height: 46 }} onClick={kyc} disabled={bvn.length !== 11}>{t('verify')}</button>
            </div>
          )}
          {err && <span className="err">{err}</span>}
        </div>

        <div className="card col g10 flat">
          <span className="h3">Privacy</span>
          <span className="s t2">Chats are encrypted with a key unique to you. Account numbers are masked before the assistant sees them, and NURU never sends your data to advertisers.</span>
          <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={async () => { await api('/chat', { method: 'DELETE' }); toast('Chat history deleted') }}>Delete chat history</button>
        </div>
      </div>

      {faceOpen && (
        <Modal onClose={() => setFaceOpen(false)}>
          <div className="col g12 center" style={{ textAlign: 'center' }}>
            <span className="h3">Face check</span>
            <FaceCam mode="enrol" onFace={async (d) => { try { await api('/me/face', { body: { descriptor: d } }); toast('Face check saved'); reSec() } catch (e) { toast((e as Error).message) } setFaceOpen(false) }} />
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
    </Shell>
  )
}

function Row({ icon, title, sub, children }: { icon: string; title: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="row g12" style={{ padding: '6px 0' }}>
      <span className="tile"><Icon name={icon} size={16} /></span>
      <span className="col grow"><span className="s w6">{title}</span><span className="xs mu">{sub}</span></span>
      {children}
    </div>
  )
}
