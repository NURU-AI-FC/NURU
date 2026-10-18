import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from './api'
import { useApp, useMoney } from './store'
import { Icon, Modal, PinInput } from './ui'

// Every transfer passes through TransferGuard. The first time, the customer
// creates a PIN and enrols their face; after that each transfer needs a face
// match and the PIN. Matching happens on the server against the encrypted
// template, so the browser only ever sends a fresh 128 number descriptor.

export type Draft = { from: string; payeeId?: string; toName: string; toBank?: string; toAccount?: string; amount: number; note?: string }
export type Receipt = { reference: string; amount: number; to: string }
type Sec = { has_pin: boolean; face_enrolled: boolean; tries_left: number; locked_until?: string }
type Step = 'load' | 'create' | 'confirm' | 'enrol' | 'verify' | 'pin' | 'sending' | 'locked' | 'error'

const DEMO_FACE = Array.from({ length: 128 }, (_, i) => Math.round(Math.sin(i * 1.7) * 1000) / 10000)

let models: Promise<typeof import('@vladmandic/face-api')> | null = null
function faceApi() {
  models ??= import('@vladmandic/face-api').then(async (f) => {
    await Promise.all([f.nets.tinyFaceDetector.loadFromUri('/models'), f.nets.faceLandmark68Net.loadFromUri('/models'), f.nets.faceRecognitionNet.loadFromUri('/models')])
    return f
  })
  return models
}

const Steps = ({ n }: { n: number }) => (
  <div className="row g6" style={{ width: '100%' }}>
    {['PIN', 'Face', 'Send'].map((t, i) => (
      <div key={t} className="col g6 grow"><div style={{ height: 4, borderRadius: 2, background: i < n ? 'var(--red)' : 'var(--surface2)' }} /><span className={'xs ' + (i < n ? 'w6' : 'mu')}>{t}</span></div>
    ))}
  </div>
)

export function TransferGuard({ draft, onDone, onClose }: { draft: Draft; onDone: (r: Receipt) => void; onClose: () => void }) {
  const money = useMoney()
  const { refresh } = useApp()
  const [step, setStep] = useState<Step>('load')
  const [first, setFirst] = useState(false)
  const [pin1, setPin1] = useState('')
  const [face, setFace] = useState<number[] | null>(null)
  const [msg, setMsg] = useState('')
  const [sec, setSec] = useState<Sec | null>(null)

  useEffect(() => {
    api<Sec>('/me/security').then((s) => {
      setSec(s)
      if (s.locked_until) return setStep('locked')
      setFirst(!s.has_pin || !s.face_enrolled)
      setStep(!s.has_pin ? 'create' : !s.face_enrolled ? 'enrol' : 'verify')
    }).catch((e) => { setMsg(e.message); setStep('error') })
  }, [])

  async function savePin(p: string) {
    if (p !== pin1) { setMsg('The PINs did not match. Start again.'); setPin1(''); setStep('create'); return }
    if (/^(\d)\1{3}$/.test(p) || p === '1234') { setMsg('Pick something harder to guess than ' + p); setPin1(''); setStep('create'); return }
    try { await api('/me/pin', { body: { pin: p } }); refresh(); setMsg(''); setStep(sec?.face_enrolled ? 'verify' : 'enrol') } catch (e) { setMsg((e as Error).message); setStep('create') }
  }

  async function enrolled(d: number[]) {
    try { await api('/me/face', { body: { descriptor: d } }); setFace(d); setStep('pin') } catch (e) { setMsg((e as Error).message) }
  }

  async function send(pin: string) {
    setStep('sending')
    try {
      const r = await api<Receipt>('/transfers', { body: { ...draft, pin, face } })
      onDone(r)
    } catch (e) {
      const err = e as ApiError
      setMsg(err.message)
      setStep(err.status === 423 || /paused/.test(err.message) ? 'locked' : err.status === 403 ? 'error' : 'error')
    }
  }

  const summary = <span className="t2 s">Sending {money(draft.amount)} to {draft.toName}{draft.toBank ? `, ${draft.toBank}` : ''}</span>

  return (
    <Modal onClose={onClose}>
      <div className="col g16 center" style={{ textAlign: 'center' }}>
        {step === 'load' && <span className="t2">Checking your security settings…</span>}
        {step === 'create' && <>
          <Steps n={1} />
          <span className="h2" style={{ fontSize: 22 }}>Create your transaction PIN</span>
          <span className="s t2">This is your first transfer with NURU. Choose 4 digits you will use every time money leaves your account.</span>
          <PinInput key="c" onDone={(p) => { setPin1(p); setMsg(''); setStep('confirm') }} />
          {msg ? <span className="err">{msg}</span> : <span className="xs mu">Avoid 1234, your birthday or repeated digits</span>}
        </>}
        {step === 'confirm' && <>
          <Steps n={1} />
          <span className="h2" style={{ fontSize: 22 }}>Enter it again</span>
          <span className="s t2">So we know you remember it. It is stored hashed, never as the digits.</span>
          <PinInput key="v" onDone={savePin} />
        </>}
        {step === 'enrol' && <>
          <Steps n={2} />
          <span className="h3">Set up your face check</span>
          <FaceCam mode="enrol" onFace={enrolled} />
          <span className="xs t2">We save a face template, not a photo, encrypted with your own key. It is only used to confirm it is you before money moves.</span>
          {msg && <span className="err">{msg}</span>}
        </>}
        {step === 'verify' && <>
          {first ? <Steps n={2} /> : null}
          <span className="h3">Face check</span>
          {summary}
          <FaceCam mode="verify" onFace={(d) => { setFace(d); setStep('pin') }} />
        </>}
        {step === 'pin' && <>
          {first && <Steps n={3} />}
          <div className="row g10" style={{ alignSelf: 'stretch', textAlign: 'left' }}>
            <span className="tile" style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--green50)', color: 'var(--green)' }}><Icon name="scanface" size={24} /></span>
            <span className="col"><span className="w6">Face captured</span><span className="xs mu">{first ? 'Enrolled just now' : 'It is matched when you send'}</span></span>
          </div>
          <div className="div" style={{ alignSelf: 'stretch' }} />
          <span className="h3">Enter your PIN</span>
          {summary}
          <PinInput key="p" onDone={send} />
        </>}
        {step === 'sending' && <span className="t2">Checking your face and PIN, then sending…</span>}
        {step === 'locked' && <>
          <span className="tile" style={{ width: 64, height: 64, borderRadius: 32, background: 'var(--red50)', color: 'var(--red)' }}><Icon name="shield" size={30} /></span>
          <span className="h2" style={{ fontSize: 22 }}>Transfers paused</span>
          <span className="s t2">{msg || `After 3 failed checks transfers pause for 30 minutes. Try again after ${sec?.locked_until ? new Date(sec.locked_until).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' }) : 'a while'}.`}</span>
          <button className="btn block" onClick={onClose}>Close</button>
        </>}
        {step === 'error' && <>
          <span className="tile" style={{ width: 64, height: 64, borderRadius: 32, background: 'var(--red50)', color: 'var(--red)' }}><Icon name="shield" size={30} /></span>
          <span className="h2" style={{ fontSize: 22 }}>Transfer stopped</span>
          <span className="s t2">{msg}. Nothing was sent.</span>
          <button className="btn pri block" onClick={() => { setMsg(''); setFace(null); setStep('verify') }}>Try again</button>
          <button className="btn block" onClick={onClose}>Cancel</button>
        </>}
      </div>
    </Modal>
  )
}

// FaceCam opens the front camera, finds one face and returns its descriptor.
// Enrolment averages three captures so later matches are steadier.
export function FaceCam({ mode, onFace }: { mode: 'enrol' | 'verify'; onFace: (d: number[]) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<'start' | 'loading' | 'looking' | 'ok' | 'nocam'>('start')
  const [hint, setHint] = useState('')
  const done = useRef(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let live = true
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 480 } })
        if (!live) return
        if (video.current) { video.current.srcObject = stream; await video.current.play().catch(() => {}) }
        setState('loading')
        const f = await faceApi()
        setState('looking')
        const caps: Float32Array[] = []
        while (live && !done.current) {
          const r = video.current && await f.detectSingleFace(video.current, new f.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })).withFaceLandmarks().withFaceDescriptor()
          if (r) {
            caps.push(r.descriptor)
            setHint(mode === 'enrol' ? `Hold still… ${caps.length} of 3` : 'Got it')
            if (caps.length >= (mode === 'enrol' ? 3 : 1)) {
              done.current = true
              const avg = Array.from({ length: 128 }, (_, i) => caps.reduce((s, c) => s + c[i], 0) / caps.length)
              setState('ok')
              setTimeout(() => onFace(avg), 500)
            }
          } else setHint('Centre your face in the circle, in good light')
          await new Promise((res) => setTimeout(res, 250))
        }
      } catch { if (live) setState('nocam') }
    })()
    return () => { live = false; stream?.getTracks().forEach((t) => t.stop()) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="col center g12">
      <div style={{ width: 220, height: 260, borderRadius: '110px / 130px', overflow: 'hidden', background: 'var(--surface)', border: `4px solid ${state === 'ok' ? 'var(--green)' : 'var(--red)'}`, position: 'relative' }} className="col center">
        {state === 'nocam' ? <Icon name="scanface" size={64} color="var(--muted)" /> : <video ref={video} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />}
      </div>
      <span className="s t2">{state === 'start' ? 'Allow the camera to continue' : state === 'loading' ? 'Starting face check…' : state === 'ok' ? 'Face captured' : state === 'nocam' ? 'No camera found or permission was denied.' : hint || 'Look at the camera'}</span>
      {state === 'nocam' && import.meta.env.VITE_DEMO !== 'false' && (
        <button className="btn sm" onClick={() => onFace(DEMO_FACE)}>Use the sandbox face (demo only)</button>
      )}
    </div>
  )
}
