// p21 NURU voice assistant for the web app. Opens from a double click or
// double tap on empty page background, Alt+N, the /assistant URL, or the
// "Hey NURU" wake phrase when the user has switched it on. NURU greets the
// user, listens, stops when they pause, answers in text and by voice, then
// listens again so they can ask follow-ups hands-free.
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, type ChatReply, type Lang } from './api'
import { useApp } from './store'
import { Icon } from './ui'
import { Listener, speak, stopSpeaking } from './voice'
import { setWakeOn, wakeOn, wakeSupported, WakeWord } from './wake'
import './Assistant.css'

// Double clicks on these keep their normal meaning (select text, press a button).
const KEEP = 'a,button,input,textarea,select,label,summary,option,video,canvas,iframe,img,svg,[contenteditable],[tabindex]:not([tabindex="-1"]),[aria-modal],' +
  '[role=button],[role=link],[role=switch],[role=tab],[role=menuitem],[role=checkbox],[role=radio],[role=slider],[role=option],[role=dialog],.modal-bg,.va'

// emptySpot says whether a click landed on page background rather than on
// text, a control or an open dialog.
function emptySpot(el: EventTarget | null) {
  if (!(el instanceof Element) || el.closest(KEEP)) return false
  if (document.querySelector('.modal-bg,[aria-modal="true"]')) return false
  for (const n of Array.from(el.childNodes)) if (n.nodeType === Node.TEXT_NODE && n.textContent?.trim()) return false
  return !window.getSelection()?.toString().trim()
}

export function AssistantHost() {
  const { user, ready, toast } = useApp()
  const loc = useLocation()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [wake, setWake] = useState(wakeOn)
  const word = useRef<WakeWord | null>(null)
  const openRef = useRef(false)
  const customer = ready && user?.role === 'customer'
  openRef.current = open

  useEffect(() => { if (customer && loc.pathname === '/assistant') setOpen(true) }, [customer, loc.pathname])

  // Alt+N, double click and double tap on empty background
  useEffect(() => {
    if (!customer) return
    let opened = 0
    const show = () => { if (Date.now() - opened > 1000) { opened = Date.now(); setOpen(true) } }
    const key = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyN') { e.preventDefault(); show() }
    }
    const dbl = (e: MouseEvent) => { if (emptySpot(e.target)) show() }
    let down = { t: 0, x: 0, y: 0 }
    let last = { t: 0, x: 0, y: 0 }
    const pd = (e: PointerEvent) => { if (e.pointerType === 'touch' && e.isPrimary) down = { t: e.timeStamp, x: e.clientX, y: e.clientY } }
    const pu = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || !e.isPrimary) return
      const still = e.timeStamp - down.t < 250 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12
      if (!still || !emptySpot(e.target)) { last.t = 0; return }
      if (e.timeStamp - last.t < 350 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 40) { last.t = 0; show() }
      else last = { t: e.timeStamp, x: e.clientX, y: e.clientY }
    }
    addEventListener('keydown', key)
    addEventListener('dblclick', dbl)
    addEventListener('pointerdown', pd, { passive: true })
    addEventListener('pointerup', pu, { passive: true })
    return () => {
      removeEventListener('keydown', key)
      removeEventListener('dblclick', dbl)
      removeEventListener('pointerdown', pd)
      removeEventListener('pointerup', pu)
    }
  }, [customer])

  // "Hey NURU": only when switched on, and paused while the tab is hidden
  useEffect(() => {
    if (!customer || !wake || !wakeSupported()) return
    const w = new WakeWord(() => setOpen(true), (msg) => { toast(msg); setWake(false); setWakeOn(false) })
    word.current = w
    w.start()
    if (openRef.current) w.pause()
    const vis = () => (document.hidden || openRef.current ? w.pause() : w.resume())
    document.addEventListener('visibilitychange', vis)
    return () => { document.removeEventListener('visibilitychange', vis); w.stop(); word.current = null }
  }, [customer, wake, toast])

  // the assistant needs the microphone to itself
  useEffect(() => { if (open) word.current?.pause(); else if (!document.hidden) word.current?.resume() }, [open])

  function close() {
    setOpen(false)
    if (loc.pathname === '/assistant') nav('/', { replace: true })
  }
  function toggleWake(on: boolean) { setWakeOn(on); setWake(on) }

  if (!customer) return null
  return (
    <>
      {wake && wakeSupported() && !open && (
        <button className="va-wake" onClick={() => setOpen(true)} aria-label='Listening for "Hey NURU". Open NURU voice' title='Listening for "Hey NURU"'>
          <span className="va-dot" /><Icon name="mic" size={14} />Hey NURU
        </button>
      )}
      {open && <AssistantPanel onClose={close} wake={wake} onWake={toggleWake} />}
    </>
  )
}

type Phase = 'greet' | 'listen' | 'hear' | 'think' | 'speak' | 'idle'

function voiceURI() { try { return localStorage.getItem('nuru.voice') || undefined } catch { return undefined } }

function AssistantPanel({ onClose, wake, onWake }: { onClose: () => void; wake: boolean; onWake: (on: boolean) => void }) {
  const { lang, t } = useApp()
  const nav = useNavigate()
  const [phase, setPhaseState] = useState<Phase>('greet')
  const [asked, setAsked] = useState('')
  const [answer, setAnswer] = useState('')
  const [note, setNote] = useState('')
  const [more, setMore] = useState(false)
  const phase$ = useRef<Phase>('greet')
  const alive = useRef(true)
  const rec = useRef<Listener | null>(null)
  const thread = useRef('')
  const orb = useRef<HTMLButtonElement>(null)
  const setPhase = (p: Phase) => { phase$.current = p; setPhaseState(p) }

  useEffect(() => {
    alive.current = true
    orb.current?.focus()
    speak(`${t('assistantTitle')}. ${t('assistantAsk')}`, lang, voiceURI(), () => { if (phase$.current === 'greet') listen() })
      .then((ok) => { if (!ok && phase$.current === 'greet') listen() })
    const fallback = setTimeout(() => { if (phase$.current === 'greet') listen() }, 12000)
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    addEventListener('keydown', esc)
    return () => { clearTimeout(fallback); removeEventListener('keydown', esc); alive.current = false; rec.current?.stop(true); rec.current = null; stopSpeaking() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function listen() {
    if (!alive.current || rec.current) return
    stopSpeaking()
    setNote('')
    setPhase('listen')
    const l = new Listener()
    rec.current = l
    let got = false
    l.start(lang, (said) => { got = true; rec.current = null; if (alive.current) { setAsked(said); ask(said) } }, (err) => {
      if (rec.current === l) rec.current = null
      if (!alive.current || got) return
      setPhase('idle')
      setNote(err || t('assistantPaused'))
    }, { giveUpMs: 8000, onStopped: () => { if (alive.current) setPhase('hear') } })
  }

  async function ask(q: string) {
    setPhase('think')
    setAnswer('')
    setMore(false)
    try {
      const r = await api<ChatReply>('/chat', { body: { message: q, lang, thread: thread.current } })
      if (!alive.current) return
      if (r.thread) thread.current = r.thread
      setAnswer(r.answer)
      setMore(!!r.actions?.some((a) => a.kind === 'transfer' || a.kind === 'reminder' || a.kind === 'offer'))
      setPhase('speak')
      const l: Lang = r.lang || lang
      // when the answer has been read, listen for a follow-up
      const ok = await speak(r.answer, l, voiceURI(), () => { if (alive.current && phase$.current === 'speak') listen() })
      if (!ok && alive.current) listen()
    } catch (e) {
      if (!alive.current) return
      setPhase('idle')
      setNote((e as Error).message)
    }
  }

  function tapOrb() {
    const p = phase$.current
    if (p === 'listen') rec.current?.stop()
    else if (p === 'speak' || p === 'greet' || p === 'idle') { stopSpeaking(); listen() }
  }
  function quiet() { stopSpeaking(); setPhase('idle'); setNote('') }

  function close() {
    alive.current = false
    rec.current?.stop(true)
    rec.current = null
    stopSpeaking()
    onClose()
  }

  function openChat() {
    close()
    nav(thread.current ? `/ask?thread=${thread.current}` : '/ask')
  }

  const label = { greet: t('assistantSpeaking'), listen: t('listening'), hear: 'Getting your words…', think: t('assistantThinking'), speak: t('assistantSpeaking'), idle: note || t('assistantPaused') }[phase]
  const orbLabel = phase === 'listen' ? 'Stop listening and send' : phase === 'speak' || phase === 'greet' ? 'Stop speaking and ask' : 'Ask NURU'
  const busy = phase === 'hear' || phase === 'think'

  return (
    <div className="va" role="dialog" aria-modal="true" aria-labelledby="va-title" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
      <div className="va-panel">
        <div className="va-top">
          <span className="row g8"><span className="va-mark">N</span><b>NURU voice</b></span>
          <button className="ib" onClick={close} aria-label="Close NURU voice"><Icon name="x" /></button>
        </div>
        <div className="va-body">
          <h1 id="va-title">{t('assistantTitle')}</h1>
          <p className="mu">{asked ? 'Ask a follow-up, I listen again after I finish.' : t('assistantAsk')} <span className="va-keys">Alt+N opens me any time.</span></p>
          <div className={`va-orb ${phase}`}>
            <button ref={orb} onClick={tapOrb} aria-label={orbLabel} disabled={busy}>
              {busy ? <span className="va-spin" /> : <Icon name={phase === 'speak' || phase === 'greet' ? 'volume' : 'mic'} size={36} color="#fff" />}
            </button>
          </div>
          <div className="va-state" aria-live="polite">{label}</div>
          {phase === 'listen' && <div className="xs mu">{t('assistantHint')}</div>}
          {asked && <div className="va-you">{asked}</div>}
          {answer && <div className="va-nuru">{answer}</div>}
          {more && <button className="btn sm" onClick={openChat}><Icon name="message" size={14} />Finish this in Ask NURU</button>}
        </div>
        {wakeSupported() ? (
          <div className="va-wakerow">
            <span><span className="s w6">Listen for "Hey NURU" while this tab is open</span><br /><span className="xs mu">Off by default. Your browser's speech service hears the phrase.</span></span>
            <button className="va-switch" role="switch" aria-checked={wake} aria-label='Listen for "Hey NURU"' onClick={() => onWake(!wake)} />
          </div>
        ) : <div className="xs mu va-center">"Hey NURU" needs Chrome, Edge or Safari.</div>}
        <div className="va-actions">
          {phase === 'listen' ? <button className="btn" onClick={() => rec.current?.stop()}>Stop listening</button>
            : phase === 'speak' || phase === 'greet' ? <button className="btn" onClick={quiet}>Stop speaking</button>
              : <button className="btn" onClick={listen} disabled={phase !== 'idle'}><Icon name="mic" size={16} />Ask again</button>}
          <button className="btn pri" onClick={close}>Close</button>
        </div>
      </div>
    </div>
  )
}
