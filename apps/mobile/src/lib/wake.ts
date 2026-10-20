// "Hey NURU" wake phrase for the phone app, mirroring apps/web/src/wake.ts.
// While NURU is open on screen it keeps the phone's own speech recogniser
// running and opens the voice assistant when it hears the phrase. Phones do
// not let apps listen once they are closed or the screen is locked, so it
// stops in the background. It also steps aside whenever NURU itself is using
// the microphone or talking (pauseWake / resumeWake).
import { AppState, Platform } from 'react-native'
import { getItem, setItem } from './storage'

type Mod = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule
type Sub = { remove: () => void }

// The native module is missing in Expo Go and on the web preview; the feature
// then just reports itself as unavailable.
let mod: Mod | null = null
try { mod = Platform.OS === 'web' ? null : require('expo-speech-recognition').ExpoSpeechRecognitionModule } catch { mod = null }

/** wakeSupported says whether this build of the app can listen for "Hey NURU". */
export const wakeSupported = () => {
  try { return !!mod && mod.isRecognitionAvailable() } catch { return false }
}

const KEY = 'nuru.wake'
/** On unless the user turned it off in Language and voice. */
export const wakeOn = async () => (await getItem(KEY)) !== '0'
/** setWakeOn saves the switch; turning it on asks for the microphone first. Returns the new state. */
export async function setWakeOn(on: boolean) {
  if (on && mod) {
    const p = await mod.requestPermissionsAsync().catch(() => null)
    if (!p?.granted) return false
  }
  await setItem(KEY, on ? '1' : '0')
  enabled = on
  sync()
  return on
}

// Recognisers often hear "NURU" as neuro, new room, nooru and so on.
const PHRASE = /\b(hey|hi|hello|okay|ok)[\s,.!]*(nuru|nooru|noru|neuro|nero|nu ru|new ru|new roo|new room|nora|nouru|nuro|neuru|nurul?)\b/i
export const heardWake = (s: string) => PHRASE.test(s)

let onWake: (() => void) | null = null
let onBlocked: ((msg: string) => void) | null = null
let enabled = false
let mounted = false
let active = AppState.currentState === 'active'
const paused = new Set<string>()
let running = false
let retry = 0
let timer: ReturnType<typeof setTimeout> | null = null
let subs: Sub[] = []

/** pauseWake frees the microphone for NURU (recording, the assistant, reading aloud). */
export function pauseWake(why: string) { paused.add(why); sync() }
export function resumeWake(why: string) { if (paused.delete(why)) sync() }

const want = () => enabled && mounted && active && paused.size === 0 && !!mod

function sync() {
  if (timer) { clearTimeout(timer); timer = null }
  if (want()) { if (!running) begin() } else if (running) halt()
}

function begin() {
  if (!mod || running) return
  running = true
  try {
    mod.start({
      lang: 'en-NG', // the phrase is English whatever the app language
      interimResults: true,
      continuous: true, // Android 13+ and iOS; older Android restarts on "end"
      maxAlternatives: 3,
      contextualStrings: ['Hey NURU', 'NURU'],
      // keep NURU's own speech on the loudspeaker while the recogniser runs
      iosCategory: { category: 'playAndRecord', categoryOptions: ['defaultToSpeaker', 'allowBluetooth', 'mixWithOthers'], mode: 'measurement' },
    })
  } catch {
    running = false
    later()
  }
}

function halt() {
  running = false
  try { mod?.abort() } catch { /* already stopped */ }
}

function later() {
  if (timer) clearTimeout(timer)
  // restart quickly after a normal timeout, slower after repeated errors
  timer = setTimeout(() => { timer = null; if (want() && !running) begin() }, Math.min(400 * 2 ** retry, 20000))
}

/**
 * startWakeWord hooks the listener up for the signed-in app. Call the returned
 * function on sign out or unmount.
 */
export function startWakeWord(wake: () => void, blocked: (msg: string) => void) {
  if (!mod) return () => {}
  onWake = wake
  onBlocked = blocked
  mounted = true
  const m = mod
  subs = [
    m.addListener('result', (e) => {
      retry = 0
      const said = e.results.map((r) => r.transcript).join(' ')
      if (heardWake(said)) {
        halt()
        onWake?.()
      }
    }),
    m.addListener('error', (e) => {
      if (e.error === 'not-allowed') {
        enabled = false
        halt()
        onBlocked?.('Allow the microphone and speech recognition so NURU can hear "Hey NURU".')
      } else if (e.error !== 'no-speech' && e.error !== 'speech-timeout' && e.error !== 'aborted') retry++
    }),
    m.addListener('end', () => {
      const was = running
      running = false
      if (was) later()
    }),
    AppState.addEventListener('change', (s) => { active = s === 'active'; sync() }),
  ]
  ;(async () => {
    enabled = await wakeOn()
    if (!enabled || !mounted) return
    const p = await m.requestPermissionsAsync().catch(() => null)
    if (!p?.granted) {
      enabled = false
      if (p && !p.canAskAgain) onBlocked?.('Turn on the microphone and speech recognition for NURU in your phone settings to use "Hey NURU".')
      return
    }
    sync()
  })()
  return () => {
    mounted = false
    halt()
    subs.forEach((s) => s.remove())
    subs = []
    onWake = null
    onBlocked = null
  }
}
