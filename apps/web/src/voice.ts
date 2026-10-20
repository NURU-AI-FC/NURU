// Voice in and out. Server voices (Azure Speech for English, Spitch for Yorùbá,
// Igbo and Hausa) are used when the API has keys; otherwise the browser's own
// speech is the fallback, so voice always works in the demo.
import { api, token, type Lang } from './api'

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api'
const speechLang: Record<Lang, string> = { en: 'en-NG', yo: 'yo-NG', ig: 'ig-NG', ha: 'ha-NG' }

let status: Promise<{ azure: boolean; spitch: boolean }> | null = null
const ready = () => (status ??= api<{ azure: boolean; spitch: boolean }>('/voice/status').catch(() => ({ azure: false, spitch: false })))

let playing: HTMLAudioElement | null = null
// Every speak() takes a number from this counter. stopSpeaking() and each new
// speak() move it on, so an older call still waiting on the network sees it is
// out of date and stays quiet instead of playing over the new one.
let gen = 0

export function stopSpeaking() {
  gen++
  playing?.pause()
  playing = null
  if ('speechSynthesis' in window) speechSynthesis.cancel()
}

// gender follows the voice picked in Ask NURU settings, so a male phone voice
// gets a male server voice too.
function gender(): 'male' | 'female' {
  let v = ''
  try { v = (localStorage.getItem('nuru.voice') || '').toLowerCase() } catch { /* private mode */ }
  return /\b(male|abeo|segun|obinna|aliyu|john|david|mark|guy|daniel)\b/.test(v) && !/female/.test(v) ? 'male' : 'female'
}

function browserSpeak(text: string, lang: Lang, voiceURI: string | undefined, done: () => void) {
  if (!('speechSynthesis' in window)) return false
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.onend = done
  u.onerror = done
  u.lang = speechLang[lang]
  const all = speechSynthesis.getVoices()
  const v = all.find((x) => x.voiceURI === voiceURI && x.lang.toLowerCase().startsWith(lang)) || all.find((x) => x.lang.toLowerCase().startsWith(lang)) || all.find((x) => x.lang === 'en-NG')
  if (v) u.voice = v
  speechSynthesis.speak(u)
  return true
}

// speak reads text aloud, preferring the natural server voice. It resolves
// false when nothing can speak. onDone runs once the voice finishes, but not
// when it was stopped or replaced by a newer speak().
export async function speak(text: string, lang: Lang, voiceURI?: string, onDone?: () => void): Promise<boolean> {
  stopSpeaking()
  const mine = gen
  const live = () => mine === gen
  const done = () => { if (live()) { playing = null; onDone?.() } }
  const s = await ready()
  if (!live()) return true
  if ((lang === 'en' && (s.azure || s.spitch)) || (lang !== 'en' && s.spitch)) {
    try {
      const res = await fetch(BASE + '/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
        body: JSON.stringify({ text, lang, gender: gender() }),
      })
      if (!live()) return true
      if (res.ok) {
        const blob = await res.blob()
        if (!live()) return true
        const url = URL.createObjectURL(blob)
        const a = new Audio(url)
        a.onended = () => { URL.revokeObjectURL(url); done() }
        playing = a
        await a.play()
        return true
      }
    } catch { /* fall back */ }
  }
  if (!live()) return true
  return browserSpeak(text, lang, voiceURI, done)
}

type Rec = { lang: string; interimResults: boolean; start: () => void; stop: () => void; onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void; onend: () => void; onerror: () => void }

type ListenOpts = { silenceMs?: number; giveUpMs?: number }

/**
 * watchLevel follows the microphone level with a Web Audio analyser and calls
 * onSilence once the speaker has said something and then stayed quiet for
 * silenceMs (about 1.2 s). With giveUpMs, onNothing runs when nobody speaks at
 * all. Returns a function that stops watching.
 */
function watchLevel(stream: MediaStream, onSilence: () => void, onNothing: () => void, opts: ListenOpts) {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return () => {}
  const silenceMs = opts.silenceMs ?? 1200
  let ctx: AudioContext
  try { ctx = new AC() } catch { return () => {} }
  const an = ctx.createAnalyser()
  an.fftSize = 2048
  ctx.createMediaStreamSource(stream).connect(an)
  const buf = new Float32Array(an.fftSize)
  const started = performance.now()
  let last = started
  let floor = 0.01 // quietest recent level: the room's background noise
  let voiced = 0
  let lastVoice = 0
  let done = false
  const finish = (fn?: () => void) => {
    if (done) return
    done = true
    clearInterval(id)
    ctx.close().catch(() => {})
    fn?.()
  }
  const id = window.setInterval(() => {
    const now = performance.now()
    const dt = now - last
    last = now
    an.getFloatTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
    const rms = Math.sqrt(sum / buf.length)
    // the floor follows the quietest level and creeps up slowly, so a steady
    // fan stops counting as speech after a while
    floor = Math.min(floor * (1 + dt / 4000), Math.max(rms, 0.002))
    if (rms > Math.max(floor * 3, 0.012)) { voiced += dt; lastVoice = now }
    const heard = voiced >= 300
    if (heard && now - lastVoice >= silenceMs) finish(onSilence)
    else if (!heard && opts.giveUpMs && now - started >= opts.giveUpMs) finish(onNothing)
  }, 100)
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return () => finish()
}

// Listener records with the microphone and transcribes on the server, or
// uses the browser's speech recognition when the server has no voice key.
// It stops by itself about 1.2 s after the speaker finishes, at the latest
// after a minute, or when stop() is called.
export class Listener {
  private media: MediaRecorder | null = null
  private rec: Rec | null = null
  private chunks: Blob[] = []
  private timer = 0
  private unwatch: (() => void) | null = null
  private cancelled = false

  /** onEnd gets an error message, or '' when nothing was said (giveUpMs) or the recording was cancelled. */
  async start(lang: Lang, onText: (t: string) => void, onEnd: (err?: string) => void, opts: ListenOpts = {}) {
    this.cancelled = false
    const s = await ready()
    if (s.spitch && navigator.mediaDevices?.getUserMedia && 'MediaRecorder' in window) {
      let stream: MediaStream
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) } catch { onEnd('Allow the microphone to talk to NURU'); return }
      const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported(t)) || ''
      const m = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
      this.chunks = []
      m.ondataavailable = (e) => e.data.size && this.chunks.push(e.data)
      m.onstop = async () => {
        clearTimeout(this.timer)
        this.unwatch?.()
        this.unwatch = null
        stream.getTracks().forEach((t) => t.stop())
        if (this.cancelled) { onEnd(''); return }
        const blob = new Blob(this.chunks, { type: m.mimeType || 'audio/webm' })
        if (blob.size < 1200) { onEnd('Hold the mic a little longer'); return }
        const fd = new FormData()
        fd.append('audio', blob, 'speech.' + (m.mimeType.includes('mp4') ? 'm4a' : m.mimeType.includes('ogg') ? 'ogg' : 'webm'))
        fd.append('lang', lang)
        try {
          const res = await fetch(BASE + '/voice/listen', { method: 'POST', headers: { Authorization: 'Bearer ' + token() }, body: fd })
          const j = await res.json().catch(() => ({}))
          if (res.ok && j.text) { onText(j.text); onEnd() } else onEnd(j.error || 'Could not hear that, try again')
        } catch { onEnd('Could not hear that, try again') }
      }
      this.media = m
      m.start()
      this.unwatch = watchLevel(stream, () => this.stop(), () => this.stop(true), opts)
      this.timer = window.setTimeout(() => this.stop(), 60000)
      return
    }
    const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
    const R = W.SpeechRecognition || W.webkitSpeechRecognition
    if (!R) { onEnd('Voice input needs Chrome or Edge'); return }
    const r = new R()
    r.lang = speechLang[lang]
    r.interimResults = false
    r.onresult = (e) => { if (!this.cancelled) onText(e.results[0][0].transcript) }
    r.onend = () => onEnd()
    r.onerror = () => onEnd('Could not hear that, try again')
    this.rec = r
    r.start()
  }

  /** stop ends the recording and sends it, or throws it away when cancel is true. */
  stop(cancel = false) {
    if (cancel) this.cancelled = true
    if (this.media?.state === 'recording') this.media.stop()
    this.media = null
    this.rec?.stop()
    this.rec = null
  }
}
