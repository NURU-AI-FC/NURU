import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../api'
import { canConsole } from '../../access'
import { useApp, useMoney } from '../../store'
import { Icon, Seg, Skeleton, useLoad, when } from '../../ui'
import { BasisTag, ConsoleShell, fmt, useScope } from './Layout'
import type { Segment } from './Segments'

type Campaign = { id: string; name: string; segment: string; segment_name: string; offer: string; message: string; language: string; channels: string[]; send_at: string; status: string; reach: number; expected: number; created_at: string }
type Lang = 'en' | 'yo' | 'ig' | 'ha'
const CHANNELS: [string, string, number][] = [['chat', 'In NURU chat', 1], ['push', 'Push', 0.82], ['sms', 'SMS', 0.95], ['email', 'Email', 0.61]]
const TEMPLATES: Record<string, Partial<Record<Lang, string>>> = {
  salary: {
    en: 'Your salary just landed. Shall I move 10% into a savings plan every payday? It earns 12% a year and you can stop any time.',
    yo: 'Ẹ kú iṣẹ́ o! Owó oṣù yín ti wọlé. Ṣé kí n fi 10% pamọ́ fún yín ní gbogbo ọjọ́ owó oṣù? Èlé jẹ́ 12% lọ́dún.',
  },
  trader: { en: 'Good sales today! Shall I put aside 5% of your POS takings each evening, so restocking money is ready when you need it?' },
  student: { en: 'Your allowance just arrived. Open a zero fee student account and I will save a small part of every allowance for you.' },
  business: { en: 'Cash runs low before your sales settle. An overdraft line covers the gap, and you only pay interest on what you use.' },
  high: { en: 'You spend a lot on travel and dining. A premium card gives 5% cashback on both, with no extra fee for the first year.' },
}
const STATUS: Record<string, [string, string]> = { draft: ['Draft', ''], pending: ['Waiting for approval', 'amber'], approved: ['Approved', 'blue'], sent: ['Sent', 'green'], stopped: ['Stopped', 'red'] }
const NEXT: Record<string, [string, string]> = { draft: ['pending', 'Send for approval'], pending: ['approved', 'Approve'], approved: ['sent', 'Mark sent'] }

function nextPayday() {
  const d = new Date()
  d.setDate(25)
  d.setHours(9, 0, 0, 0)
  if (d < new Date()) d.setMonth(d.getMonth() + 1)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T09:00`
}

export default function Campaigns() {
  const scope = useScope()
  const { user } = useApp()
  const money = useMoney()
  const [params] = useSearchParams()
  const { data: segs } = useLoad<{ segments: Segment[] }>('/console/segments?src=all')
  const { data: list, reload } = useLoad<Campaign[]>('/console/campaigns')
  const [segment, setSegment] = useState(params.get('segment') || 'salary')
  const [lang, setLang] = useState<Lang>('en')
  const [channels, setChannels] = useState(['chat', 'push'])
  const [name, setName] = useState('')
  const [message, setMessage] = useState(TEMPLATES.salary.en!)
  const [sendAt, setSendAt] = useState(nextPayday())
  const [onlyOpted] = useState(true)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  const seg = segs?.segments.find((s) => s.key === segment)

  useEffect(() => {
    if (!seg) return
    setName((n) => n || seg.product + ' for ' + seg.name.toLowerCase())
  }, [seg])
  const pickSeg = (k: string) => {
    setSegment(k)
    const s = segs?.segments.find((x) => x.key === k)
    if (s) setName(s.product + ' for ' + s.name.toLowerCase())
    setMessage(TEMPLATES[k]?.[lang] || TEMPLATES[k]?.en || '')
  }
  const pickLang = (l: Lang) => {
    setLang(l)
    if (TEMPLATES[segment]?.[l]) setMessage(TEMPLATES[segment][l]!)
  }
  const toggle = (c: string) => setChannels((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]))

  const reach = seg ? seg.reachable : 0
  const best = Math.max(0, ...CHANNELS.filter((c) => channels.includes(c[0])).map((c) => c[2]))
  const reached = Math.round(reach * best)
  const join = seg ? Math.round((reached * seg.uptake) / 100) : 0
  const cost = channels.includes('sms') ? reached * 4 : 0
  const translated = !!TEMPLATES[segment]?.[lang]

  const save = async (status: 'draft' | 'pending') => {
    setErr(''); setOk(''); setBusy(true)
    try {
      const r = await api<{ reach: number; expected: number }>('/console/campaigns', { body: { name, segment, offer: seg?.product || '', message, language: lang, channels, send_at: new Date(sendAt).toISOString(), status } })
      setOk(status === 'pending' ? `Sent for approval. ${fmt(r.reach)} opted in customers, about ${fmt(r.expected)} likely to join.` : 'Draft saved.')
      reload()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  const move = async (id: string, status: string) => {
    try { await api('/console/campaigns/' + id, { method: 'PATCH', body: { status } }); reload() } catch (e) { setErr((e as Error).message) }
  }

  return (
    <ConsoleShell title="Campaigns" sub="Turn a segment insight into an offer" scope={scope} range={false}>
      <div className="cpair">
        <div className="col g16" style={{ flex: 1.2, minWidth: 0 }}>
          <div className="card col g12">
            <span className="h3">1. Audience</span>
            {segs ? (
              <div className="row between wrap g8">
                <select className="input" style={{ maxWidth: 300 }} value={segment} onChange={(e) => pickSeg(e.target.value)} aria-label="Segment">
                  {segs.segments.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
                </select>
                {seg && <span className="xs mu">{fmt(seg.customers)} customers · {fmt(seg.reachable)} allow offers</span>}
              </div>
            ) : <Skeleton h={46} />}
            {seg && <span className="xs t2">{seg.signal}.</span>}
          </div>
          <div className="card col g12">
            <span className="h3">2. Offer</span>
            <div className="field"><label htmlFor="cname">Campaign name</label><input id="cname" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
            {seg && <div className="row g8 wrap">{seg.bullets.map((b) => <span key={b} className="chip">{b}</span>)}</div>}
          </div>
          <div className="card col g12">
            <span className="h3">3. Channel and time</span>
            <div className="row g8 wrap">{CHANNELS.map(([k, l]) => <button key={k} className={'chip' + (channels.includes(k) ? ' red' : '')} onClick={() => toggle(k)} aria-pressed={channels.includes(k)}>{l}</button>)}</div>
            <div className="row between wrap g8">
              <div className="field" style={{ minWidth: 220 }}><label htmlFor="when">Send on</label><input id="when" type="datetime-local" className="input" value={sendAt} onChange={(e) => setSendAt(e.target.value)} /></div>
              <div className="row g8"><span className="s t2">Only customers who allow offers</span><button className={'ctoggle' + (onlyOpted ? ' on' : '')} aria-label="Only opted in customers, always on" disabled><i /></button></div>
            </div>
          </div>
          <div className="card col g10">
            <div className="row between"><span className="h3">Expected result</span><BasisTag b="estimated" /></div>
            <div className="grid g-4" style={{ gap: 10 }}>
              {[['Reached', fmt(reached)], ['Likely to join', fmt(join)], ['New savings a month', money(join * (seg?.monthly_saving || 0), { compact: true })], ['Cost', money(cost)]].map(([l, v]) => (
                <div key={l} className="soft col g4"><span className="xs mu">{l}</span><span className="s w6 num">{v}</span></div>
              ))}
            </div>
            <span className="xs mu">Based on how often this segment acts on NURU insights ({seg?.uptake ?? 0}%). SMS costs about ₦4 a message.</span>
          </div>
        </div>
        <div className="card col g16" style={{ flex: 1, minWidth: 0 }}>
          <div className="row between wrap g8">
            <span className="h3">Preview</span>
            <Seg value={lang} onChange={pickLang} options={[['en', 'English'], ['yo', 'Yorùbá'], ['ig', 'Igbo'], ['ha', 'Hausa']]} />
          </div>
          <div className="cmsg">
            <div className="row g10"><span className="mark" style={{ width: 28, height: 28, fontSize: 14 }}>N</span><span className="s w6">NURU</span><span className="xs mu">now</span></div>
            <span>{message || 'Write your message below.'}</span>
            <div className="row g8"><span className="chip red">Yes, start</span><span className="chip">Not now</span></div>
          </div>
          <div className="field">
            <label htmlFor="msg">Message</label>
            <textarea id="msg" className="input" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={400} />
            <span className="xs mu">{message.length}/400{!translated && lang !== 'en' ? ' · No ready translation for this segment yet, write it in this language.' : ''}</span>
          </div>
          <div className="soft row g10"><Icon name="shieldcheck" size={18} color="var(--green)" /><span className="xs t2 grow">Checked by compliance rules: no account numbers, links, PINs or promised returns. Customers can stop offers at any time in Settings.</span></div>
          {err && <span className="err s">{err}</span>}
          {ok && <span className="s pos w6">{ok}</span>}
          <div className="grow" />
          <div className="row g10">
            <button className="btn grow" disabled={busy || !channels.length} onClick={() => save('draft')}>Save draft</button>
            <button className="btn pri grow" disabled={busy || !channels.length} onClick={() => save('pending')}>Send for approval</button>
          </div>
        </div>
      </div>

      <div className="card col" style={{ padding: 0 }}>
        <div className="row between" style={{ padding: '16px 18px 6px' }}><span className="h3">All campaigns</span><span className="xs mu">{list?.length ?? 0} in total</span></div>
        <div className="cscroll">
          <table className="tx">
            <thead><tr><th>Campaign</th><th>Audience</th><th className="hide-sm">Channels</th><th>Reach</th><th className="hide-sm">Send</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list?.map((c) => {
                const [label, tone] = STATUS[c.status] || [c.status, '']
                const next = NEXT[c.status] && (c.status === 'draft' || canConsole(user, 'approve')) ? NEXT[c.status] : undefined
                return (
                  <tr key={c.id}>
                    <td><div className="col g4"><span className="s w6">{c.name}</span><span className="xs mu">{c.offer} · {c.language.toUpperCase()}</span></div></td>
                    <td className="s">{c.segment_name}</td>
                    <td className="xs t2 hide-sm">{c.channels.map((x) => CHANNELS.find((k) => k[0] === x)?.[1] || x).join(', ')}</td>
                    <td className="num s"><b>{fmt(c.reach)}</b><div className="xs mu">{fmt(c.expected)} likely</div></td>
                    <td className="xs t2 hide-sm">{when(c.send_at)}</td>
                    <td><span className={'chip ' + tone}>{label}</span></td>
                    <td><div className="row g6">
                      {next && <button className="btn sm" onClick={() => move(c.id, next[0])}>{next[1]}</button>}
                      {['draft', 'pending', 'approved'].includes(c.status) && <button className="btn sm ghost" onClick={() => move(c.id, 'stopped')} aria-label="Stop campaign"><Icon name="x" size={14} /></button>}
                    </div></td>
                  </tr>
                )
              })}
              {!list && <tr><td colSpan={7}><Skeleton h={120} /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </ConsoleShell>
  )
}
