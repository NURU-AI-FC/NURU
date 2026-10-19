// Voice in and out for Ask NURU, mirroring apps/web/src/voice.ts.
// Speech to text goes through POST /voice/listen (Spitch). Answers are read
// with POST /voice/speak (Azure for English, Spitch for Yorùbá, Igbo and
// Hausa) and fall back to the phone's own voice when the server has no keys.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio'
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

let player: AudioPlayer | null = null
let webUrl = ''

export function stopSpeaking() {
  try { player?.remove() } catch { /* already released */ }
  player = null
  if (webUrl && Platform.OS === 'web') URL.revokeObjectURL(webUrl)
  webUrl = ''
  Speech.stop().catch(() => {})
}

function phoneSpeak(text: string, lang: Lang, onDone?: () => void) {
  Speech.speak(text.replace(/₦/g, 'naira '), { language: phoneLang[lang], onDone, onStopped: onDone, onError: onDone })
}

async function play(res: Response, onDone?: () => void) {
  let uri: string
  if (Platform.OS === 'web') {
    webUrl = URL.createObjectURL(await res.blob())
    uri = webUrl
  } else {
    const { File, Paths } = await import('expo-file-system')
    const f = new File(Paths.cache, `nuru-voice-${Date.now()}.mp3`)
    await f.write(new Uint8Array(await res.arrayBuffer()))
    uri = f.uri
  }
  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {})
  const p = createAudioPlayer({ uri })
  player = p
  const sub = p.addListener('playbackStatusUpdate', (s) => {
    if (s.didJustFinish) { sub.remove(); if (player === p) stopSpeaking(); onDone?.() }
  })
  p.play()
}

/** speak reads text aloud in the user's language, preferring the natural server voice. */
export async function speak(text: string, lang: Lang, onDone?: () => void, opts: { force?: boolean } = {}) {
  stopSpeaking()
  const [s, p] = await Promise.all([voiceStatus(), voicePrefs()])
  if (!opts.force && p.read_aloud === false) { onDone?.(); return }
  if ((lang === 'en' && (s.azure || s.spitch)) || (lang !== 'en' && s.spitch)) {
    try {
      const res = await fetch(BASE + '/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
        body: JSON.stringify({ text, lang, gender: p.voice === 'male' ? 'male' : 'female' }),
      })
      if (res.ok) { await play(res, onDone); return }
    } catch { /* fall back to the phone voice */ }
  }
  phoneSpeak(text, lang, onDone)
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
