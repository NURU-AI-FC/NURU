// "Hey NURU" wake phrase for the web app. Uses the browser's own speech
// recognition (Chrome, Edge, Safari), listening continuously only while the
// tab is open and only after the user turns it on. NURU's servers get nothing
// from it; the browser's speech service hears the phrase (in Chrome that
// service runs on Google's servers) and the assistant opens.

type Result = { isFinal: boolean; 0: { transcript: string } }
type Rec = {
  lang: string; continuous: boolean; interimResults: boolean
  start: () => void; stop: () => void; abort: () => void
  onresult: ((e: { resultIndex: number; results: ArrayLike<Result> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}
type RecCtor = new () => Rec

const ctor = (): RecCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor }
  return w.SpeechRecognition || w.webkitSpeechRecognition
}

/** wakeSupported says whether this browser can listen for "Hey NURU". */
export const wakeSupported = () => typeof window !== 'undefined' && !!ctor()

const KEY = 'nuru.wake'
export const wakeOn = () => { try { return localStorage.getItem(KEY) === '1' } catch { return false } }
export const setWakeOn = (on: boolean) => { try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* private mode */ } }

// Recognisers often hear "NURU" as neuro, new room, nooru and so on.
const PHRASE = /\b(hey|hi|hello|okay|ok)[\s,.!]*(nuru|nooru|noru|neuro|nero|nu ru|new ru|new roo|new room|nora|nouru)\b/i

/**
 * WakeWord keeps one recogniser running and calls onWake when it hears the
 * phrase. Browsers end continuous recognition now and then, so it restarts
 * itself, backing off after errors. pause() frees the microphone while the
 * assistant itself is listening.
 */
export class WakeWord {
  private rec: Rec | null = null
  private running = false
  private paused = false
  private retry = 0
  private timer = 0

  private onWake: () => void
  private onBlocked: (msg: string) => void

  constructor(onWake: () => void, onBlocked: (msg: string) => void) {
    this.onWake = onWake
    this.onBlocked = onBlocked
  }

  start() {
    if (this.running || !wakeSupported()) return
    this.running = true
    this.paused = false
    this.spawn()
  }

  stop() {
    this.running = false
    clearTimeout(this.timer)
    this.kill()
  }

  pause() { this.paused = true; clearTimeout(this.timer); this.kill() }
  resume() { if (!this.running || !this.paused) return; this.paused = false; this.spawn() }

  private kill() {
    const r = this.rec
    this.rec = null
    if (r) { r.onend = null; r.onresult = null; r.onerror = null; try { r.abort() } catch { /* already stopped */ } }
  }

  private spawn() {
    const R = ctor()
    if (!R || !this.running || this.paused || this.rec) return
    const r = new R()
    r.lang = 'en-NG' // the phrase is English whatever the app language
    r.continuous = true
    r.interimResults = true
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (PHRASE.test(e.results[i][0].transcript)) { this.retry = 0; this.onWake(); return }
      }
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.stop()
        this.onBlocked('Allow the microphone so NURU can hear "Hey NURU"')
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') this.retry++
    }
    r.onend = () => {
      this.rec = null
      if (!this.running || this.paused) return
      // restart quickly after a normal timeout, slower after repeated errors
      this.timer = window.setTimeout(() => this.spawn(), Math.min(250 * 2 ** this.retry, 15000))
    }
    this.rec = r
    try { r.start() } catch { this.rec = null; this.retry++ }
  }
}
