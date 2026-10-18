import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, type ChatMsg, type ChatReply } from '../api'
import { langNames, suggestions } from '../i18n'
import { Shell } from '../Shell'
import { useApp } from '../store'
import { ChartView, Icon } from '../ui'

const speechLang = { en: 'en-NG', yo: 'yo-NG', ig: 'ig-NG', ha: 'ha-NG' }

type Rec = { lang: string; interimResults: boolean; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onend: () => void; onerror: () => void; start: () => void; stop: () => void }

export default function Ask() {
  const { t, lang, update, toast } = useApp()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const rec = useRef<Rec | null>(null)
  const asked = useRef('')

  useEffect(() => {
    if (params.get('new')) { setMsgs([]); setParams({}, { replace: true }); return }
    api<ChatMsg[]>('/chat').then(setMsgs).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const q = params.get('q')
    if (q && asked.current !== q) { asked.current = q; setParams({}, { replace: true }); send(q) }
  }, [params]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])

  async function send(q = text) {
    q = q.trim()
    if (!q || busy) return
    setText('')
    setMsgs((m) => [...m, { role: 'user', content: q, lang, at: new Date().toISOString() }])
    setBusy(true)
    try {
      const r = await api<ChatReply>('/chat', { body: { message: q, lang } })
      setMsgs((m) => [...m, { role: 'assistant', content: r.answer, lang, at: new Date().toISOString(), chart: r.chart, actions: r.actions }])
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', content: (e as Error).message, lang, at: new Date().toISOString() }])
    } finally { setBusy(false) }
  }

  function listen() {
    const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
    const R = W.SpeechRecognition || W.webkitSpeechRecognition
    if (!R) { toast('Voice input needs Chrome or Edge'); return }
    if (listening) { rec.current?.stop(); return }
    const r = new R()
    r.lang = speechLang[lang]
    r.interimResults = false
    r.onresult = (e) => { const said = e.results[0][0].transcript; setText(said); send(said) }
    r.onend = () => setListening(false)
    r.onerror = () => { setListening(false); toast('Could not hear that, try again') }
    rec.current = r
    setListening(true)
    r.start()
  }

  function speak(s: string) {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(s)
    u.lang = speechLang[lang]
    const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith(lang)) || speechSynthesis.getVoices().find((x) => x.lang === 'en-NG')
    if (v) u.voice = v
    speechSynthesis.speak(u)
  }

  async function clear() {
    await api('/chat', { method: 'DELETE' })
    setMsgs([])
  }

  return (
    <Shell title={t('ask')} sub={t('privateChat')} right={
      <select className="input" style={{ height: 40, width: 120 }} value={lang} onChange={(e) => update({ language: e.target.value as typeof lang })} aria-label="Language">
        {Object.entries(langNames).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    }>
      <div className="col" style={{ maxWidth: 820, width: '100%', margin: '0 auto', flex: 1, minHeight: 'calc(100vh - 160px)' }}>
        <div className="col g12 grow" style={{ paddingBottom: 16 }}>
          {msgs.length === 0 && !busy && (
            <div className="col center g16" style={{ padding: '48px 0', textAlign: 'center' }}>
              <span className="mark" style={{ width: 56, height: 56, fontSize: 30, borderRadius: 16 }}>N</span>
              <h2 className="h2" style={{ fontSize: 24 }}>Ask NURU about your money</h2>
              <span className="t2" style={{ maxWidth: 460 }}>Answers come from your own accounts. NURU only talks about money and never shares your data.</span>
              <div className="row g8 wrap center" style={{ maxWidth: 640 }}>
                {suggestions[lang].map((s) => <button key={s} className="chip" style={{ border: 0, height: 34, padding: '0 14px' }} onClick={() => send(s)}>{s}</button>)}
              </div>
            </div>
          )}
          {msgs.map((m, i) => m.role === 'user' ? (
            <div key={i} className="bubble me">{m.content}</div>
          ) : (
            <div key={i} className="col g8" style={{ alignSelf: 'flex-start', maxWidth: 680, width: m.chart ? '100%' : undefined }}>
              <div className="row g8 start">
                <span className="mark" style={{ width: 28, height: 28, fontSize: 15, borderRadius: 8 }}>N</span>
                <div className="bubble ai">{m.content}</div>
              </div>
              {m.chart && <div className="card flat col g8" style={{ marginLeft: 36 }}><span className="s w6">{m.chart.title}</span><ChartView chart={m.chart} /></div>}
              <div className="row g6 wrap" style={{ marginLeft: 36 }}>
                {m.actions?.map((a) => (
                  <button key={a.label} className="btn sm" onClick={() => nav(a.kind === 'save' ? `/pay?save=${a.amount}` : a.to || '/')}>{a.label}</button>
                ))}
                <button className="btn sm ghost" onClick={() => speak(m.content)} aria-label="Read aloud"><Icon name="headphones" size={16} /></button>
              </div>
            </div>
          ))}
          {busy && <div className="row g8"><span className="mark" style={{ width: 28, height: 28, fontSize: 15, borderRadius: 8 }}>N</span><div className="bubble ai mu">Thinking…</div></div>}
          <div ref={end} />
        </div>

        <div className="col g8" style={{ position: 'sticky', bottom: 16 }}>
          <form className="composer" onSubmit={(e) => { e.preventDefault(); send() }}>
            <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder={listening ? t('listening') : t('askPlaceholder')} aria-label={t('askPlaceholder')} maxLength={2000}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
            <button type="button" className="ib" onClick={listen} aria-label="Speak" style={listening ? { background: 'var(--red50)', color: 'var(--red)' } : undefined}><Icon name="mic" /></button>
            <button className="ib" style={{ background: 'var(--red)' }} disabled={busy || !text.trim()} aria-label={t('send')}><Icon name="send" color="#fff" /></button>
          </form>
          <div className="row between xs mu"><span className="row g6"><Icon name="lock" size={12} />{t('privateChat')}</span>{msgs.length > 0 && <button className="btn ghost sm xs" onClick={clear}>{t('clear')}</button>}</div>
        </div>
      </div>
    </Shell>
  )
}
