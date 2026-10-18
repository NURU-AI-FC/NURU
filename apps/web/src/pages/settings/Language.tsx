import { useEffect, useState } from 'react'
import { api } from '../../api'
import { Shell } from '../../Shell'
import { useApp } from '../../store'
import { Icon, Seg } from '../../ui'
import { LANGS, say } from '../Welcome'
import { Radio, Toggle, Top, type Prefs } from './kit'

const NATIVE: Record<string, string> = { en: 'English', yo: 'Èdè Yorùbá', ig: 'Asụsụ Igbo', ha: 'Harshen Hausa' }
const SAMPLE: Record<string, string> = {
  en: 'Good morning. You spent less this week than last week.',
  yo: 'Ẹ kú àárọ̀. Owó tí o ná lọ́sẹ̀ yìí dín sí ti ọ̀sẹ̀ tó kọjá.',
  ig: 'Ụtụtụ ọma. Ego ị mefuru n’izu a dị obere karịa izu gara aga.',
  ha: 'Barka da safiya. Kuɗin da ka kashe a wannan mako ya ragu da na makon jiya.',
}
const RATE = { slow: 0.8, normal: 1, fast: 1.25 }

// Voice preferences live on the server; a copy in localStorage lets the
// chat read them without another request.
export default function Language() {
  const { t, user, update } = useApp()
  const [p, setP] = useState<Prefs | null>(null)
  useEffect(() => { api<Prefs>('/me/prefs').then(setP).catch(() => {}) }, [])
  if (!user) return null

  async function set(patch: Partial<Prefs>) {
    if (p) setP({ ...p, ...patch })
    try {
      const next = await api<Prefs>('/me/prefs', { method: 'PATCH', body: patch })
      setP(next)
      try { localStorage.setItem('nuru.voice', JSON.stringify({ voice: next.voice, speed: next.speed, read_aloud: next.read_aloud, hold_to_talk: next.hold_to_talk })) } catch { /* ignore */ }
    } catch { /* keep the optimistic value */ }
  }
  const voiceLang = LANGS.find((l) => l[0] === user.language)?.[3] || 'en-NG'
  const first = user.name.split(' ')[0]

  return (
    <Shell title={t('languageVoice')} sub="How NURU writes and speaks to you">
      <div className="k-flow">
        <Top back="/settings" />
        <span className="k-label">App and NURU language</span>
        <div className="col g10" role="radiogroup">
          {LANGS.map(([code, name]) => (
            <button key={code} className={'k-opt' + (user.language === code ? ' on' : '')} role="radio" aria-checked={user.language === code} onClick={() => update({ language: code })}>
              <span className="col g4 grow"><span className="s w6">{name}</span><span className="xs mu">{NATIVE[code]}</span></span><Radio on={user.language === code} />
            </button>
          ))}
        </div>
        <span className="k-label">Voice</span>
        <div className="card col g16">
          {!p ? <div className="skeleton" style={{ height: 140 }} /> : <>
            <div className="row g12 wrap" style={{ rowGap: 8 }}><span className="s grow">Voice</span><Seg value={p.voice} onChange={(v) => set({ voice: v })} options={[['female', 'Female'], ['male', 'Male']]} /></div>
            <div className="row g12 wrap" style={{ rowGap: 8 }}><span className="s grow">Speaking speed</span><Seg value={p.speed} onChange={(v) => set({ speed: v })} options={[['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']]} /></div>
            <div className="row g12"><span className="col g4 grow"><span className="s">Read answers aloud</span><span className="xs mu">NURU speaks each reply in the chat</span></span><Toggle on={p.read_aloud} onChange={(v) => set({ read_aloud: v })} label="Read answers aloud" /></div>
            <div className="row g12"><span className="col g4 grow"><span className="s">Hold to talk</span><span className="xs mu">Hold the mic button instead of tapping</span></span><Toggle on={p.hold_to_talk} onChange={(v) => set({ hold_to_talk: v })} label="Hold to talk" /></div>
          </>}
        </div>
        <div className="soft row g10">
          <Icon name="volume" color="var(--red)" />
          <span className="xs t2 grow">{SAMPLE[user.language].replace(/^([^.]+)\./, `$1 ${first}.`)}</span>
          <button className="btn ghost sm red" onClick={() => say(SAMPLE[user.language], voiceLang, RATE[p?.speed || 'normal'])}>Play</button>
        </div>
        <span className="xs mu">Voices come from your device. If your phone has no voice for a language, NURU still writes in it and reads aloud in English.</span>
      </div>
    </Shell>
  )
}
