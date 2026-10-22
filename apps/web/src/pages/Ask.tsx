import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, chat, type Account, type ChatAction, type ChatMsg, type Lang, type Payee, type Pending, type Source, type Thread } from '../api'
import { TransferGuard, type Draft } from '../Guard'
import { langNames, suggestions } from '../i18n'
import { Shell } from '../Shell'
import { useApp, useMoney } from '../store'
import { ChartView, Icon, Modal, useGreeting, useLoad } from '../ui'
import { askLine, DescribeCard, type Described } from '../Describe'
import { Listener, speak as speakAloud, stopSpeaking } from '../voice'
import { BANKS } from './pay/common'
import './Ask.css'

const voiceName: Record<Lang, string> = { en: 'Nigerian English voice', yo: 'Ohùn Yorùbá', ig: 'Olu Igbo', ha: 'Muryar Hausa' }
const starterIcons = ['pie', 'target', 'briefcase', 'calendar', 'wallet', 'trendup']
const srcIcon: Record<string, string> = { transactions: 'database', accounts: 'landmark', bills: 'receipt', loans: 'landmark', forecast: 'trendup', business: 'briefcase', payees: 'users', goals: 'target' }


const store = {
  get: (k: string) => { try { return localStorage.getItem(k) || '' } catch { return '' } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } },
}

// injectionTags names what a blocked message tried to do, for the badges.
function injectionTags(text: string) {
  const tags: string[] = []
  if (/ignore|disregard|forget|instruction|you are now|admin|developer mode|system prompt|pretend|act as|jailbreak/i.test(text)) tags.push('Instruction override')
  if (/\b(pin|otp|password|face)\b/i.test(text)) tags.push('Skip PIN')
  if (/other (users?|customers?|people)|all (users?|customers?)/i.test(text)) tags.push('Other customers')
  if (/\b(send|transfer|move)\b|₦/i.test(text)) tags.push('Move money')
  return tags.length ? tags : ['Instruction override']
}

function group(at: string) {
  const d = new Date(at), now = new Date()
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 864e5)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) return 'This month'
  return 'Earlier'
}

export default function Ask() {
  const { t, lang, update, toast, user } = useApp()
  const greet = useGreeting()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [thread, setThread] = useState('')
  const [view, setView] = useState<'chat' | 'history'>('chat')
  const [threads, setThreads] = useState<Thread[] | null>(null)
  const [find, setFind] = useState('')
  const [sheet, setSheet] = useState(false)
  const [sources, setSources] = useState<Source[] | null>(null)
  const [voice, setVoice] = useState(() => store.get('nuru.voice'))
  const [auto, setAuto] = useState(() => store.get('nuru.voice.auto') === '1')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [wide] = useState(() => matchMedia('(min-width: 641px)').matches)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  // what is being read aloud, so a second tap on the same speaker stops it
  const [speaking, setSpeaking] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)
  const rec = useRef<Listener | null>(null)
  const asked = useRef('')
  const money = useMoney()
  const [pending, setPending] = useState<Pending | null>(null)
  const [later, setLater] = useState(false)
  const [focus, setFocus] = useState(() => !!params.get('describe'))
  const [declined, setDeclined] = useState<string[]>([])

  useEffect(() => {
    const id = params.get('thread')
    if (params.get('new')) { newChat(); setParams({}, { replace: true }); return }
    if (id) { open(id); setParams({}, { replace: true }); return }
    if (params.get('q')) return
    api<Thread[]>('/chat/threads').then((ts) => { setThreads(ts); if (ts[0] && Date.now() - new Date(ts[0].at).getTime() < 864e5) open(ts[0].id) }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const q = params.get('q')
    if (q && asked.current !== q) { asked.current = q; setParams({}, { replace: true }); send(q) }
  }, [params]) // eslint-disable-line react-hooks/exhaustive-deps

  // payments that came with no description: NURU asks about the newest one
  useEffect(() => {
    const focus = params.get('describe')
    api<Pending>('/transactions/undescribed').then((p) => {
      if (focus) { p.items.sort((a, b) => (a.id === focus ? -1 : b.id === focus ? 1 : 0)); setLater(false) }
      setPending(p)
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function described(r: Described, item: string) {
    const left = r.count
    setPending({ items: r.items.filter((x) => x.id !== item), count: left })
    const what = r.label && r.label !== 'Other' ? r.label.toLowerCase() : `"${r.purpose}"`
    setFocus(false)
    const text = `Saved. I will count it as ${what} from now on.` + (left ? ` ${left} more ${left === 1 ? 'payment needs' : 'payments need'} a description.` : ' Every recent payment is explained now.')
    setMsgs((x) => [...x, { role: 'assistant', content: text, lang, at: new Date().toISOString(), actions: left ? [{ kind: 'describe', label: 'Describe the next one' }] : [] }])
  }

  // After advice, NURU offers to send the money. It collects the recipient in
  // the chat; nothing moves before the PIN and face check.
  function offer(a: ChatAction) {
    setMsgs((m) => [...m,
      { role: 'user', content: 'Yes, send it for me', lang, at: new Date().toISOString() },
      { role: 'assistant', content: 'Sure. Who should I send it to? Pick a saved payee or give me their bank and account number, and tell me what the payment is for.', lang, at: new Date().toISOString(),
        actions: [{ kind: 'transfer', label: 'Send', amount: a.amount || undefined, new: true }] }])
  }

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const load = () => setVoices(speechSynthesis.getVoices())
    load()
    speechSynthesis.addEventListener('voiceschanged', load)
    return () => speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  async function open(id: string) {
    setView('chat')
    setThread(id)
    try { setMsgs(await api<ChatMsg[]>('/chat?thread=' + id)) } catch (e) { toast((e as Error).message) }
  }

  function newChat() { setView('chat'); setThread(''); setMsgs([]) }

  async function showHistory() {
    setView('history')
    try { setThreads(await api<Thread[]>('/chat/threads')) } catch { /* keep old */ }
  }

  async function send(q = text) {
    q = q.trim()
    if (!q || busy) return
    setText('')
    setView('chat')
    setMsgs((m) => [...m, { role: 'user', content: q, lang, at: new Date().toISOString() }])
    setBusy(true)
    try {
      const at = new Date().toISOString()
      let shown = false
      // the answer appears as NURU writes it, then the full reply replaces it
      const put = (m: ChatMsg) => { const swap = shown; shown = true; setMsgs((ms) => (swap ? [...ms.slice(0, -1), m] : [...ms, m])) }
      const r = await chat({ message: q, lang, thread }, (soFar) => put({ role: 'assistant', content: soFar, lang, at }))
      if (r.thread) setThread(r.thread)
      put({ role: 'assistant', content: r.answer, lang, at, chart: r.chart, actions: r.actions, blocked: r.blocked, sources: r.sources })
      if (auto) speak(r.answer, lang, at)
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', content: (e as Error).message, lang, at: new Date().toISOString() }])
    } finally { setBusy(false) }
  }

  function listen() {
    if (listening) { rec.current?.stop(); return }
    const l = new Listener()
    rec.current = l
    setListening(true)
    l.start(lang, (said) => { setText(said); send(said) }, (err) => { setListening(false); rec.current = null; if (err) toast(err) })
  }

  // speak reads s aloud; tapping the same speaker again while it talks stops it
  function speak(s: string, l: Lang = lang, key = s) {
    if (speaking === key) { stopSpeaking(); setSpeaking(null); return }
    setSpeaking(key)
    const done = () => setSpeaking((k) => (k === key ? null : k))
    speakAloud(s, l, voice, done).then((ok) => { if (!ok) { done(); toast('Reading aloud is not supported in this browser') } })
  }
  useEffect(() => () => stopSpeaking(), [])

  async function copy(s: string) { try { await navigator.clipboard.writeText(s); toast('Copied') } catch { toast('Could not copy') } }

  async function remove(id: string) {
    await api('/chat?thread=' + id, { method: 'DELETE' })
    setThreads((ts) => ts?.filter((x) => x.id !== id) || null)
    if (id === thread) newChat()
  }

  const say = (text: string) => setMsgs((x) => [...x, { role: 'assistant', content: text, lang, at: new Date().toISOString() }])
  const shown = threads?.filter((x) => !find || x.title.toLowerCase().includes(find.toLowerCase()))
  const groups = ['Today', 'Yesterday', 'This month', 'Earlier'].map((g) => [g, shown?.filter((x) => group(x.at) === g) || []] as const).filter(([, l]) => l.length)
  const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(lang)).concat(lang === 'en' ? [] : voices.filter((v) => v.lang.toLowerCase().startsWith('en')))

  return (
    <Shell title={view === 'history' ? 'Chats' : t('ask')} sub={wide ? 'Only answers about your money' : undefined} right={
      <div className="row g8">
        <button className="ib" onClick={() => (view === 'history' ? setView('chat') : showHistory())} aria-label="Chat history" title="Chat history" style={view === 'history' ? { background: 'var(--red50)', color: 'var(--red)' } : undefined}><Icon name="history" /></button>
        <button className="ib asklang" onClick={() => setSheet(true)} aria-label="Language and voice" title="Language and voice">{lang.toUpperCase()}</button>
        <button className="ib askwide" onClick={newChat} aria-label={t('newChat')} title={t('newChat')}><Icon name="edit" /></button>
      </div>
    }>
      {view === 'history' ? (
        <div className="col g12" style={{ maxWidth: 720, width: '100%', margin: '0 auto' }}>
          <div className="input row g8" style={{ height: 44 }}><Icon name="search" size={18} color="var(--muted)" />
            <input className="askbare" placeholder="Search chats" value={find} onChange={(e) => setFind(e.target.value)} aria-label="Search chats" /></div>
          <span className="row g6 xs mu"><Icon name="lock" size={12} />Encrypted. Only you can read these.</span>
          {!threads && <span className="s t2">Loading…</span>}
          {threads && !groups.length && <span className="s t2">{find ? 'No chats match.' : 'No chats yet. Ask NURU anything about your money.'}</span>}
          {groups.map(([g, list]) => (
            <div key={g} className="col g4">
              <span className="xs mu w6" style={{ marginTop: 6 }}>{g}</span>
              {list.map((x) => (
                <div key={x.id} className="row g12 askthread">
                  <button className="row g12 grow askbtn" onClick={() => open(x.id)}>
                    <span className="tile" style={x.blocked ? { color: 'var(--red)' } : undefined}><Icon name={x.blocked ? 'shield' : 'message'} size={17} /></span>
                    <span className="col g4 grow" style={{ minWidth: 0 }}><span className="s w6 askclip">{x.title}</span>
                      <span className="xs mu">{x.messages} messages · {langNames[x.lang] || x.lang} · {new Date(x.at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}{x.blocked ? ' · blocked request' : ''}</span></span>
                  </button>
                  <button className="ib" onClick={() => remove(x.id)} aria-label="Delete chat" title="Delete chat"><Icon name="trash" size={16} color="var(--muted)" /></button>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
      <div className="col" style={{ maxWidth: 820, width: '100%', margin: '0 auto', flex: 1, minHeight: 'calc(100vh - 160px)' }}>
        <div className="col g12 grow" style={{ paddingBottom: 16 }}>
          {msgs.length === 0 && !busy && (
            <div className="col center g16" style={{ padding: '40px 0 16px', textAlign: 'center' }}>
              <span className="mark" style={{ width: 56, height: 56, fontSize: 30, borderRadius: 16 }}>N</span>
              <h2 className="h2" style={{ fontSize: 24 }}>{greet}{user ? `, ${user.name.split(' ')[0]}` : ''}</h2>
              <span className="t2" style={{ maxWidth: 460 }}>Ask anything about your accounts, spending, loans or business. I only see data you have linked.</span>
              <div className="col g10" style={{ width: '100%', maxWidth: 520, textAlign: 'left' }}>
                {suggestions[lang].slice(0, 4).map((s, i) => (
                  <button key={s} className="card row g12 askbtn" style={{ padding: 14 }} onClick={() => send(s)}>
                    <span className="tile" style={{ background: 'var(--red50)', color: 'var(--red)' }}><Icon name={starterIcons[i]} size={17} /></span>
                    <span className="s w6 grow">{s}</span><Icon name="chevr" size={16} color="var(--muted)" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => m.role === 'user' ? (
            <div key={i} className="bubble me">{m.content}</div>
          ) : m.blocked === 'injection' ? (
            <div key={i} className="col g8" style={{ alignSelf: 'flex-start', maxWidth: 560, width: '100%' }}>
              <div className="card col g10 askblock">
                <div className="row g10"><span className="tile" style={{ background: 'var(--bg)', color: 'var(--red)' }}><Icon name="shieldcheck" size={18} /></span>
                  <span className="col g4"><span className="s w6">Request blocked</span><span className="xs t2">This message tried to change how NURU works.</span></span></div>
                <span className="s t2">NURU never moves money from a chat message alone. Every transfer needs your PIN and a face check, and NURU can't switch those off.</span>
                <div className="row g8 wrap">{injectionTags(msgs[i - 1]?.content || '').map((x) => <span key={x} className="chip red">{x}</span>)}</div>
              </div>
              <div className="row g8 start"><span className="mark askmark">N</span><div className="bubble ai">{m.content}</div></div>
              <span className="xs mu" style={{ marginLeft: 36 }}>Logged to your Security centre</span>
            </div>
          ) : (
            <div key={i} className="col g8" style={{ alignSelf: 'flex-start', maxWidth: 680, width: m.chart ? '100%' : undefined }}>
              <div className="row g8 start">
                <span className="mark askmark">N</span>
                <div className="bubble ai">
                  {m.content}
                  {m.blocked === 'off_topic' && (
                    <div className="soft col g6" style={{ marginTop: 10, background: 'var(--bg)' }}>
                      <span className="xs t2">Try asking:</span>
                      {suggestions[lang].slice(0, 2).map((s) => <button key={s} className="s w6 red askbtn" style={{ textAlign: 'left' }} onClick={() => send(s)}>{s}</button>)}
                    </div>
                  )}
                </div>
              </div>
              {m.blocked === 'off_topic' && <div className="row" style={{ marginLeft: 36 }}><span className="chip"><Icon name="shield" size={12} />Finance only</span></div>}
              {m.actions?.filter((a) => a.kind === 'transfer').map((a, j) => <TransferCard key={j} action={a} onSent={say} />)}
              {m.actions?.filter((a) => a.kind === 'reminder').map((a, j) => <ReminderCard key={j} action={a} onSet={say} />)}
              {m.chart && <div className="card flat col g8" style={{ marginLeft: 36 }}><span className="s w6">{m.chart.title}</span><ChartView chart={m.chart} /></div>}
              {!!m.sources?.length && (
                <button className="row g6 xs mu askbtn asksrc" onClick={() => setSources(m.sources!)}><Icon name="info" size={12} />From: {m.sources.map((s) => s.detail).join(', ')}</button>
              )}
              <div className="row g6 wrap" style={{ marginLeft: 36 }}>
                {m.actions?.filter((a) => a.kind === 'offer' && !declined.includes(m.at)).map((a) => <span key="offer" className="row g6">
                  <button className="btn sm pri" onClick={() => { setDeclined((d) => [...d, m.at]); offer(a) }}><Icon name="send" size={14} color="#fff" />{a.label}{a.amount ? ` (${money(a.amount)})` : ''}</button>
                  <button className="btn sm" onClick={() => setDeclined((d) => [...d, m.at])}>Not now</button>
                </span>)}
                {m.actions?.filter((a) => !['transfer', 'reminder', 'offer'].includes(a.kind)).map((a) => (
                  <button key={a.label} className="btn sm" onClick={() => a.kind === 'describe' ? (setFocus(true), setLater(false)) : nav(a.kind === 'save' ? `/pay/send?save=${a.amount}` : a.to || '/')}>{a.label}</button>
                ))}
                <button className="btn sm ghost" onClick={() => speak(m.content, m.lang, m.at)} aria-label={speaking === m.at ? 'Stop reading' : 'Read aloud'} title={speaking === m.at ? 'Stop reading' : 'Read aloud'}><Icon name={speaking === m.at ? 'stop' : 'volume'} size={16} color={speaking === m.at ? 'var(--red)' : undefined} /></button>
                <button className="btn sm ghost" onClick={() => copy(m.content)} aria-label="Copy" title="Copy"><Icon name="copy" size={16} /></button>
              </div>
            </div>
          ))}
          {!busy && !later && (focus || msgs.length === 0) && pending?.items[0] && (() => {
            const p = pending.items[0]
            return (
              <div key={p.id} className="col g8" style={{ alignSelf: 'flex-start', maxWidth: 680, width: '100%' }}>
                <div className="row g8 start"><span className="mark askmark">N</span><div className="bubble ai">{askLine(p, money)}</div></div>
                <DescribeCard item={p} onSaved={(r) => described(r, p.id)} onUnknown={() => nav('/history/' + p.id + '?report=1')} />
                <div className="row g6" style={{ marginLeft: 36 }}><button className="btn sm ghost" onClick={() => setLater(true)}>Later</button></div>
              </div>
            )
          })()}
          {busy && msgs[msgs.length - 1]?.role === 'user' && <div className="row g8"><span className="mark askmark">N</span><div className="bubble ai mu">Thinking…</div></div>}
          <div ref={end} />
        </div>

        <div className="col g8" style={{ position: 'sticky', bottom: 16 }}>
          <form className="composer" onSubmit={(e) => { e.preventDefault(); send() }}>
            <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder={listening ? t('listening') : t('askPlaceholder')} aria-label={t('askPlaceholder')} maxLength={2000}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
            <button type="button" className="ib" onClick={listen} aria-label="Speak" style={listening ? { background: 'var(--red50)', color: 'var(--red)' } : undefined}><Icon name="mic" /></button>
            <button className="ib" style={{ background: 'var(--red)' }} disabled={busy || !text.trim()} aria-label={t('send')}><Icon name="send" color="#fff" /></button>
          </form>
          <div className="row between xs mu"><span className="row g6"><Icon name="lock" size={12} />{t('privateChat')}</span>{msgs.length > 0 && <button className="btn ghost sm xs" onClick={newChat}>{t('newChat')}</button>}</div>
        </div>
      </div>
      )}

      {sheet && (
        <Modal onClose={() => setSheet(false)}>
          <div className="col g12">
            <span className="h3">Language and voice</span>
            <span className="s t2">NURU replies in the language you choose, by text or voice.</span>
            {(Object.keys(langNames) as Lang[]).map((l) => (
              <div key={l} className={'row g12 asklangrow' + (l === lang ? ' on' : '')} role="radio" aria-checked={l === lang} tabIndex={0}
                onClick={() => update({ language: l })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') update({ language: l }) }}>
                <span className="col g4 grow"><span className="s w6">{langNames[l]}</span><span className="xs mu">{voiceName[l]}</span></span>
                <button className="ib" style={{ width: 32, height: 32 }} aria-label={`Hear ${langNames[l]}`} onClick={(e) => { e.stopPropagation(); speak(suggestions[l][0], l) }}><Icon name="volume" size={16} color="var(--muted)" /></button>
                <span className="askradio" />
              </div>
            ))}
            {langVoices.length > 0 && (
              <div className="field"><label htmlFor="voice">Voice</label>
                <select id="voice" className="input" value={voice} onChange={(e) => { setVoice(e.target.value); store.set('nuru.voice', e.target.value) }}>
                  <option value="">Automatic</option>
                  {langVoices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
                </select></div>
            )}
            <div className="row between"><span className="s w6">Read answers aloud</span>
              <button className={'asktgl' + (auto ? ' on' : '')} aria-pressed={auto} aria-label="Read answers aloud" onClick={() => { setAuto(!auto); store.set('nuru.voice.auto', auto ? '' : '1') }}><i /></button></div>
            <button className="btn pri block" onClick={() => setSheet(false)}>Done</button>
          </div>
        </Modal>
      )}

      {sources && (
        <Modal onClose={() => setSources(null)}>
          <div className="col g12">
            <span className="h3">How NURU got this answer</span>
            {sources.map((s) => (
              <div key={s.label + s.detail} className="row g12"><span className="tile"><Icon name={srcIcon[s.type] || 'database'} size={17} /></span>
                <span className="col g4"><span className="s w6">{s.label}</span><span className="xs mu">{s.detail}</span></span></div>
            ))}
            <div className="soft row g10 start"><Icon name="info" size={18} color="var(--muted)" /><span className="xs t2 grow">NURU reads only data you linked. Account numbers are masked before the assistant sees them, and your chats are not used to train AI models.</span></div>
            <button className="btn block" onClick={() => setSources(null)}>Close</button>
          </div>
        </Modal>
      )}
    </Shell>
  )
}

// ReminderCard confirms a reminder NURU drafted before it is saved.
function ReminderCard({ action, onSet }: { action: ChatAction; onSet: (text: string) => void }) {
  const money = useMoney()
  const { toast } = useApp()
  const [title, setTitle] = useState(action.title || 'Payment reminder')
  const [due, setDue] = useState(action.due || new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState(String(action.amount || ''))
  const [done, setDone] = useState(false)
  const day = new Date(due + 'T09:00:00')
  const label = day.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
  async function save() {
    try {
      await api('/reminders', { body: { title: title.trim(), kind: 'bill', amount: Number(amount || 0), due_at: day.toISOString() } })
      setDone(true)
      onSet(`Done. I will remind you about ${title.trim()} on ${label}. You can see it in your planner.`)
    } catch (e) { toast((e as Error).message) }
  }
  return (
    <div className="card col g12" style={{ marginLeft: 36, maxWidth: 380, padding: 16 }}>
      <div className="row g12">
        <span className="tile" style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--amber50)', color: 'var(--amber)' }}><Icon name="bell" size={18} /></span>
        <span className="col g4 grow"><span className="s w6">{title || 'Reminder'}</span><span className="xs mu">{Number(amount) ? `${money(Number(amount))} · ` : ''}Remind on {label}</span></span>
        <span className="chip amber">{label}</span>
      </div>
      {done ? (
        <div className="row g8" style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--green50)', color: 'var(--green)' }}><Icon name="check" size={18} /><span className="s w6">Reminder set</span></div>
      ) : <>
        <div className="field"><label htmlFor="rt">Title</label><input id="rt" className="input" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="grid g-2" style={{ gap: 10 }}>
          <div className="field"><label htmlFor="ra">Amount (₦)</label><input id="ra" className="input num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} /></div>
          <div className="field"><label htmlFor="rd">Date</label><input id="rd" className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
        </div>
        <button className="btn pri sm" disabled={!title.trim() || !due} onClick={save}><Icon name="bell" size={16} color="#fff" />Set reminder</button>
      </>}
    </div>
  )
}

// TransferCard is the draft NURU proposes in chat. A saved payee is filled in;
// someone new is collected right here. Every transfer needs a description, and
// nothing moves until the customer confirms and passes the PIN and face check
// (the first time, TransferGuard sets both up).
function TransferCard({ action, onSent }: { action: ChatAction; onSent: (text: string) => void }) {
  const money = useMoney()
  const payees = useLoad<Payee[]>('/payees').data
  const accts = useLoad<{ accounts: Account[] }>('/accounts').data?.accounts
  const [from, setFrom] = useState('')
  const [guard, setGuard] = useState(false)
  const [ref, setRef] = useState('')
  const [pick, setPick] = useState(action.new ? 'new' : '')
  const [bank, setBank] = useState(BANKS[0])
  const [account, setAccount] = useState('')
  const [name, setName] = useState('')
  const [note, setNote] = useState(action.note || '')
  const [amt, setAmt] = useState(action.amount ? String(action.amount) : '')
  const payee = pick === 'new' ? undefined : payees?.find((p) => (pick ? p.id === pick : p.name === action.payee))
  const acct = accts?.find((a) => a.id === from) || accts?.[0]
  if (!payees || !acct) return null
  const fresh = !payee
  const amount = Number(amt) || 0
  const ready = amount > 0 && note.trim().length >= 2 && acct.balance >= amount && (!fresh || (account.length === 10 && name.trim().length >= 2))
  const draft: Draft = payee
    ? { from: acct.id, payeeId: payee.id, toName: payee.name, toBank: payee.bank, amount, note: note.trim() }
    : { from: acct.id, toName: name.trim(), toBank: bank, toAccount: account, amount, note: note.trim() }
  const shown = payee?.name || name.trim() || 'New recipient'
  const initials = shown.split(/[\s,]+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const lock = !!ref
  return (
    <div className="card col g12 dcard">
      <div className="row between"><span className="xs mu w6 upper">{fresh ? 'New recipient' : 'Transfer draft'}</span><span className="chip amber">Sandbox</span></div>
      {(action.new || !payee) && (
        <div className="field"><label htmlFor="tto">Send to</label>
          <select id="tto" className="input" style={{ height: 44 }} value={pick || (payee ? payee.id : 'new')} disabled={lock} onChange={(e) => setPick(e.target.value)}>
            <option value="new">Someone new</option>
            {payees.map((p) => <option key={p.id} value={p.id}>{p.name}, {p.bank}</option>)}
          </select></div>
      )}
      {fresh ? <>
        <div className="field"><label htmlFor="tbank">Bank</label>
          <select id="tbank" className="input" style={{ height: 44 }} value={bank} disabled={lock} onChange={(e) => setBank(e.target.value)}>{BANKS.map((b) => <option key={b}>{b}</option>)}</select></div>
        <div className="field"><label htmlFor="tacct">Account number</label>
          <input id="tacct" className="input num" style={{ height: 44 }} inputMode="numeric" maxLength={10} placeholder="10 digits" value={account} disabled={lock} onChange={(e) => setAccount(e.target.value.replace(/\D/g, ''))} /></div>
        <div className="field"><label htmlFor="tname">Account name</label>
          <input id="tname" className="input" style={{ height: 44 }} maxLength={60} placeholder="As the bank shows it" value={name} disabled={lock} onChange={(e) => setName(e.target.value)} /></div>
      </> : (
        <div className="row g12"><span className="av" style={{ width: 40, height: 40, background: 'var(--blue)' }}>{initials}</span><span className="col"><span className="w6 s">{payee.name}</span><span className="xs mu">{payee.bank} {payee.account} · {payee.times ? `paid ${payee.times} ${payee.times === 1 ? 'time' : 'times'}` : 'saved payee'}</span></span></div>
      )}
      <div className="field"><label htmlFor="tnote">What is it for?</label>
        <input id="tnote" className="input" style={{ height: 44 }} maxLength={60} placeholder="For example, December rent" value={note} disabled={lock} onChange={(e) => setNote(e.target.value)} /></div>
      {action.amount ? (
        <div className="row between"><span className="s t2">Amount</span><span className="h3 num">{money(amount)}</span></div>
      ) : (
        <div className="field"><label htmlFor="tamt">Amount (₦)</label>
          <input id="tamt" className="input num" style={{ height: 44 }} inputMode="decimal" value={amt} disabled={lock} onChange={(e) => setAmt(e.target.value.replace(/[^\d.]/g, ''))} /></div>
      )}
      <div className="row between g8"><span className="s t2">From</span>
        <select className="input" style={{ height: 36, width: 'auto', minWidth: 0, fontSize: 13 }} value={acct.id} onChange={(e) => setFrom(e.target.value)} disabled={lock}>
          {accts!.map((a) => <option key={a.id} value={a.id}>{a.name} {a.number}</option>)}
        </select>
      </div>
      <div className="row between"><span className="s t2">Balance after</span><span className={'s w6 num' + (acct.balance < amount ? ' red' : '')}>{money(acct.balance - amount)}</span></div>
      {ref ? (
        <div className="row g8" style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--green50)', color: 'var(--green)' }}><Icon name="check" size={18} /><span className="s w6">Sent · Ref {ref}</span></div>
      ) : <>
        <button className="btn pri sm" disabled={!ready} onClick={() => setGuard(true)}><Icon name="shieldcheck" size={16} color="#fff" />{fresh ? 'Review and send' : 'Confirm and send'}</button>
        {fresh && <span className="row g6 xs mu"><Icon name="shieldcheck" size={12} />Saved to your payees once sent. Your first transfer sets up a PIN and face check.</span>}
      </>}
      {guard && <TransferGuard draft={draft} onClose={() => setGuard(false)} onDone={(r) => { setGuard(false); setRef(r.reference); onSent(`Done. ${money(r.amount)} for ${note.trim()} is on its way to ${r.to}. Reference ${r.reference}.`) }} />}
    </div>
  )
}
