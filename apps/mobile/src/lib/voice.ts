// Voice in and out for Ask NURU, mirroring apps/web/src/voice.ts.
// Speech to text goes through POST /voice/listen (Spitch). Answers are read
// with POST /voice/speak (Azure for English, Spitch for Yorùbá, Igbo and
// Hausa) and fall back to the phone's own voice when the server has no keys.
import { createAudioPlayer, RecordingPresets, setAudioModeAsync, type AudioPlayer, type AudioRecorder, type RecordingOptions } from 'expo-audio'
import * as Speech from 'expo-speech'
import { Platform } from 'react-native'
import { api, BASE, token, type Lang } from './api'

type Status = { azure: boolean; spitch: boolean }
let status: Promise<Status> | null = null
/** voiceStatus reports which server voices are configured. Cached per session. */
export const voiceStatus = () => (status ??= api<Status>('/voice/status').catch(() => ({ azure: false, spitch: false })))

const phoneLang: Record<Lang, string> = { en: 'en-NG', yo: 'yo-NG', ig: 'ig-NG', ha: 'ha-NG' }

type VoicePrefs = { voice?: string; read_aloud?: boolean }
let prefs: Promise<VoicePrefs> | null = null
const voicePrefs = () => (prefs ??= api<VoicePrefs>('/me/prefs').catch((): VoicePrefs => ({})))
/** Forget cached prefs after the user changes them in settings. */
export const resetVoicePrefs = () => { prefs = null }
/** readAloudOn says whether NURU speaks every answer. On unless the user turned it off. */
export const readAloudOn = async () => (await voicePrefs()).read_aloud !== false
/** setReadAloud saves the speaker switch in Ask NURU to the user's prefs. */
export async function setReadAloud(on: boolean) {
  const p = await voicePrefs()
  prefs = Promise.resolve({ ...p, read_aloud: on })
  await api('/me/prefs', { method: 'PATCH', body: { read_aloud: on } }).catch(() => {})
}

let player: AudioPlayer | null = null
let webUrl = ''
// Every speak() takes a number from this counter. stopSpeaking() and each new
// speak() move it on, so an older call still waiting on the network sees it is
// out of date and stays quiet instead of playing over the new one.
let gen = 0

export function stopSpeaking() {
  gen++
  try { player?.remove() } catch { /* already released */ }
  player = null
  if (webUrl && Platform.OS === 'web') URL.revokeObjectURL(webUrl)
  webUrl = ''
  Speech.stop().catch(() => {})
}

function phoneSpeak(text: string, lang: Lang, live: () => boolean, onDone?: () => void) {
  // a stopped or replaced utterance does not report back, so its caller's
  // "done" never lands on top of the newer one
  const done = () => { if (live()) onDone?.() }
  Speech.speak(text.replace(/₦/g, 'naira '), { language: phoneLang[lang], onDone: done, onStopped: done, onError: done })
}

async function play(res: Response, live: () => boolean, onDone?: () => void) {
  let uri: string
  if (Platform.OS === 'web') {
    const blob = await res.blob()
    if (!live()) return
    webUrl = URL.createObjectURL(blob)
    uri = webUrl
  } else {
    const { File, Paths } = await import('expo-file-system')
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (!live()) return
    const f = new File(Paths.cache, `nuru-voice-${Date.now()}.mp3`)
    await f.write(bytes)
    uri = f.uri
  }
  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {})
  if (!live()) return
  const p = createAudioPlayer({ uri })
  player = p
  const sub = p.addListener('playbackStatusUpdate', (s) => {
    if (s.didJustFinish) { sub.remove(); if (player === p) stopSpeaking(); onDone?.() }
  })
  p.play()
}

/** speak reads text aloud in the user's language, preferring the natural server voice.
 * Calling it again, or calling stopSpeaking(), cancels the one before. */
export async function speak(text: string, lang: Lang, onDone?: () => void, opts: { force?: boolean } = {}) {
  stopSpeaking()
  const mine = gen
  const live = () => mine === gen
  const [s, p] = await Promise.all([voiceStatus(), voicePrefs()])
  if (!live()) return
  if (!opts.force && p.read_aloud === false) { onDone?.(); return }
  if ((lang === 'en' && (s.azure || s.spitch)) || (lang !== 'en' && s.spitch)) {
    try {
      const res = await fetch(BASE + '/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
        body: JSON.stringify({ text, lang, gender: p.voice === 'male' ? 'male' : 'female' }),
      })
      if (!live()) return
      if (res.ok) { await play(res, live, onDone); return }
    } catch { /* fall back to the phone voice */ }
  }
  if (!live()) return
  phoneSpeak(text, lang, live, onDone)
}

/** Recording options for asking NURU by voice. Metering gives the input level
 * so the recording can stop by itself when the speaker goes quiet. */
export const ASK_RECORDING: RecordingOptions = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true }

/**
 * watchSilence follows the recorder's input level (metering, in dB) and calls
 * onSilence once the speaker has said something and then stayed quiet for
 * silenceMs (about 1.2 s). With giveUpMs, onNothing runs if nobody speaks at
 * all in that time. Phones that report no level never stop on their own, so
 * the manual stop and the one minute cap still apply. Returns a stop function.
 */
export function watchSilence(recorder: AudioRecorder, onSilence: () => void, opts: { silenceMs?: number; giveUpMs?: number; onNothing?: () => void } = {}) {
  const silenceMs = opts.silenceMs ?? 1200
  const started = Date.now()
  let last = started
  let floor = -60 // quietest recent level: the room's background noise
  let voiced = 0 // milliseconds that sounded like speech
  let lastVoice = 0
  let metered = false
  let done = false
  const finish = (fn?: () => void) => { if (done) return; done = true; clearInterval(id); fn?.() }
  const id = setInterval(() => {
    const now = Date.now()
    const dt = now - last
    last = now
    let db: number | undefined
    try { db = recorder.getStatus().metering } catch { return }
    if (typeof db !== 'number' || !Number.isFinite(db) || db < -100) return // not metering yet, or warming up
    metered = true
    // the floor follows the quietest level and creeps up slowly, so a steady
    // fan or road noise stops counting as speech after a while
    floor = Math.min(floor + dt / 1000, db)
    if (db > Math.max(floor + 12, -50)) { voiced += dt; lastVoice = now }
    const heard = voiced >= 300
    if (heard && now - lastVoice >= silenceMs) finish(onSilence)
    else if (!heard && metered && opts.giveUpMs && now - started >= opts.giveUpMs) finish(opts.onNothing)
  }, 100)
  return () => finish()
}

export class VoiceError extends Error {}

/** transcribe uploads a recording to /voice/listen and returns the text. */
export async function transcribe(uri: string, lang: Lang): Promise<string> {
  const s = await voiceStatus()
  if (!s.spitch) throw new VoiceError('Voice typing is not switched on for NURU yet. Type your question for now.')
  const fd = new FormData()
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob()
    const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
    fd.append('audio', blob, 'speech.' + ext)
  } else {
    const ext = (uri.split('.').pop() || 'm4a').toLowerCase()
    const type = ext === 'm4a' || ext === 'mp4' ? 'audio/mp4' : ext === '3gp' ? 'audio/3gpp' : ext === 'caf' ? 'audio/x-caf' : 'audio/' + ext
    // React Native's FormData uploads a local file from { uri, name, type }.
    fd.append('audio', { uri, name: 'speech.' + ext, type } as unknown as Blob)
  }
  fd.append('lang', lang)
  let res: Response
  try {
    res = await fetch(BASE + '/voice/listen', { method: 'POST', headers: { Authorization: 'Bearer ' + token() }, body: fd })
  } catch {
    throw new VoiceError('Could not reach NURU. Check your connection and try again.')
  }
  const j = (await res.json().catch(() => ({}))) as { text?: string; error?: string }
  if (res.status === 503) throw new VoiceError('Voice typing is not switched on for NURU yet. Type your question for now.')
  if (!res.ok) throw new VoiceError(j.error || 'Could not hear that, try again')
  if (!j.text?.trim()) throw new VoiceError('I did not catch that. Try again a little closer to the mic.')
  return j.text.trim()
}
