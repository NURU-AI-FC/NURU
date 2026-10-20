import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CONTACT, HEAD_OFFICE, appleDirections, areaName, directions, geocode, nearby, services, status, type Branch } from '../branches'
import { MapView } from '../LazyMap'
import { Shell } from '../Shell'
import { useApp } from '../store'
import { ThemePicker } from '../ThemePicker'
import { Icon, Logo } from '../ui'
import './branches.css'

type Filter = 'open' | 'atm' | 'deposit' | 'account'
const FILTERS: [Filter, string][] = [['open', 'Open now'], ['atm', 'ATM'], ['deposit', 'Cash deposit'], ['account', 'Account opening']]

const fmtKm = (k?: number) => k == null ? '' : k < 1 ? `${Math.round(k * 1000)} m` : `${k.toFixed(1)} km`

function Frame({ children }: { children: ReactNode }) {
  const { user } = useApp()
  if (user) return <Shell title="Branches" sub="Zenith branches and ATMs near you">{children}</Shell>
  return (
    <div className="bguest">
      <header className="row between"><Link to="/"><Logo size={30} /></Link><div className="row g8"><ThemePicker /><Link to="/login" className="btn sm">Sign in</Link></div></header>
      <div className="bguest-body">{children}</div>
    </div>
  )
}

export default function Branches() {
  const { toast } = useApp()
  const [ask, setAsk] = useState<'unknown' | 'ask' | 'done'>('unknown')
  const [me, setMe] = useState<[number, number] | null>(null)
  const [center, setCenter] = useState<[number, number]>(HEAD_OFFICE)
  const [area, setArea] = useState('Victoria Island')
  const [list, setList] = useState<Branch[] | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [detail, setDetail] = useState(false)
  const [filters, setFilters] = useState<Set<Filter>>(new Set())
  const [q, setQ] = useState('')
  const [locating, setLocating] = useState(false)

  // skip the permission card when the browser already allows location
  useEffect(() => {
    let live = true
    const perm = navigator.permissions?.query({ name: 'geolocation' as PermissionName })
    if (!perm) { setAsk('ask'); return }
    perm.then((p) => { if (!live) return; if (p.state === 'granted') locate(); else setAsk('ask') }).catch(() => live && setAsk('ask'))
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const ctl = new AbortController()
    setList(null)
    nearby(center, ctl.signal).then((b) => { if (!ctl.signal.aborted) { setList(b); setSel((s) => (s && b.some((x) => x.id === s) ? s : b[0]?.id ?? null)) } })
    return () => ctl.abort()
  }, [center])

  function locate() {
    setAsk('done')
    if (!navigator.geolocation) { toast('Location is not available on this device'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition((p) => {
      const at: [number, number] = [p.coords.latitude, p.coords.longitude]
      setMe(at); setCenter(at); setLocating(false)
      areaName(at).then((n) => n && setArea(n))
    }, () => { setLocating(false); toast('Location was blocked, showing Victoria Island') }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 })
  }

  async function search(e: React.FormEvent) {
    e.preventDefault()
    const s = q.trim()
    if (!s) return
    const hit = list?.find((b) => (b.name + ' ' + b.address).toLowerCase().includes(s.toLowerCase()))
    if (hit) { setSel(hit.id); setDetail(true); return }
    const g = await geocode(s)
    if (!g) { toast('No place found for "' + s + '"'); return }
    setCenter(g.at); setArea(g.label); setDetail(false)
  }

  const shown = useMemo(() => (list || []).filter((b) => {
    if (filters.has('open') && !status(b).open) return false
    if (filters.has('atm') && b.kind !== 'atm' && !services(b).includes('ATM 24/7')) return false
    if (filters.has('deposit') && !services(b).includes('Cash deposit')) return false
    if (filters.has('account') && !services(b).includes('Account opening')) return false
    return true
  }), [list, filters])

  const cur = shown.find((b) => b.id === sel) || null
  const toggle = (f: Filter) => setFilters((s) => { const n = new Set(s); if (n.has(f)) n.delete(f); else n.add(f); return n })
  const choose = (id: string) => { setSel(id); setDetail(true) }
  const share = async (b: Branch) => {
    const url = directions(b)
    try { if (navigator.share) await navigator.share({ title: b.name, text: b.address, url }); else { await navigator.clipboard.writeText(`${b.name}, ${b.address}: ${url}`); toast('Directions link copied') } } catch { /* cancelled */ }
  }

  const chips = (
    <div className="bchips" role="group" aria-label="Filters">
      {FILTERS.map(([f, l]) => <button key={f} type="button" className={'bchip' + (filters.has(f) ? ' on' : '')} aria-pressed={filters.has(f)} onClick={() => toggle(f)}>{l}</button>)}
    </div>
  )

  const searchBox = (
    <form className="bsearch" onSubmit={search} role="search">
      <Icon name="search" size={18} color="var(--muted)" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search area or branch" aria-label="Search area or branch" />
      <button type="submit" className="bsearch-go" aria-label="Search"><Icon name="filter" size={18} color="var(--text2)" /></button>
    </form>
  )

  const rows = list === null
    ? [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 84, borderRadius: 16 }} />)
    : shown.length === 0
      ? <div className="soft s t2">No branch matches these filters. Clear a filter or search another area.</div>
      : shown.map((b) => {
        const st = status(b)
        return (
          <button key={b.id} type="button" className={'brow' + (b.id === sel ? ' on' : '')} onClick={() => choose(b.id)}>
            <span className="bic"><Icon name={b.kind === 'atm' ? 'card' : 'landmark'} size={18} color="var(--red)" /></span>
            <span className="col g4 grow" style={{ minWidth: 0 }}>
              <span className="s w6 ell">{b.name}</span>
              <span className="xs t2 ell">{b.address}</span>
              <span className={'xs w6 ' + (st.open ? 'bopen' : 'mu')}>{st.label}</span>
            </span>
            <span className="col" style={{ alignItems: 'flex-end', gap: 10 }}>
              <span className="s w6 num">{fmtKm(b.km)}</span>
              <Icon name="chevr" size={16} color="var(--muted)" />
            </span>
          </button>
        )
      })

  const detailView = cur && (
    <div className="bdetail col g16">
      <div className="row between">
        <span className={'chip ' + (status(cur).open ? 'green' : 'amber')}>{status(cur).label}</span>
        <button className="ib" style={{ width: 34, height: 34 }} onClick={() => setDetail(false)} aria-label="Back to list"><Icon name="x" size={18} /></button>
      </div>
      <div className="col g4"><h2 className="h2">{cur.name}</h2><span className="s t2">{cur.address}</span></div>
      <div className="row g8 wrap">
        <a className="btn pri grow" href={directions(cur)} target="_blank" rel="noreferrer"><Icon name="car" color="#fff" />Directions</a>
        <a className="btn" href={'tel:' + (cur.phone || CONTACT).replace(/\s/g, '')}><Icon name="phone" />Call</a>
        <button className="btn" onClick={() => share(cur)}><Icon name="send" />Share</button>
      </div>
      <div className="row g10">
        <div className="soft col g4 grow"><span className="row g6 s w6"><Icon name="clock" size={16} color="var(--red)" />{fmtKm(cur.km)}</span><span className="xs t2">About {Math.max(2, Math.round((cur.km || 0) * 4))} min drive</span></div>
        <div className="soft col g4 grow"><span className="row g6 s w6"><Icon name="users" size={16} color="var(--red)" />{cur.kind === 'atm' ? 'Self service' : 'Quiet'}</span><span className="xs t2">{cur.kind === 'atm' ? 'No queue for staff' : 'Usual wait 10 min'}</span></div>
      </div>
      <div className="col g8">
        <span className="s w6">Opening hours</span>
        {cur.kind === 'atm'
          ? <div className="row between s"><span className="t2">Every day</span><span className="w5">24 hours</span></div>
          : <>
            <div className="row between s"><span className="t2">Monday to Friday</span><span className="w5">8:00am to 4:00pm</span></div>
            <div className="row between s"><span className="t2">Saturday</span><span className="w5">ATM and self-service only</span></div>
            <div className="row between s"><span className="t2">Sunday</span><span className="w5">ATM only</span></div>
          </>}
        {cur.hours && <span className="xs mu">Listed on OpenStreetMap: {cur.hours}</span>}
      </div>
      <div className="col g8"><span className="s w6">Services</span><div className="row g8 wrap">{services(cur).map((s) => <span key={s} className="chip">{s}</span>)}</div></div>
      <a className="xs mu" href={appleDirections(cur)} target="_blank" rel="noreferrer">Open in Apple Maps instead</a>
    </div>
  )

  return (
    <Frame>
      <div className="bwrap">
        <section className="bside">
          <div className="bside-head">
            <div className="col g4"><span className="h3">{list ? `${shown.length} ${shown.length === 1 ? 'place' : 'places'} near you` : 'Finding branches…'}</span><span className="xs mu">{me ? 'Using your location · ' : 'Showing · '}{area}</span></div>
            {searchBox}
            {chips}
          </div>
          <div className="blist col g12">{detail && cur ? detailView : rows}</div>
          <div className="soft row g10 xs t2" style={{ alignItems: 'flex-start' }}><Icon name="info" size={16} />Branch data comes from OpenStreetMap, with a backup list of major branches. Hours can change on public holidays.</div>
        </section>

        <section className="bmapbox">
          <MapView center={center} user={me} branches={shown} selected={sel} onSelect={choose} />
          <button className="ib blocate" onClick={locate} aria-label="Use my location" title="Use my location"><Icon name={locating ? 'refresh' : 'target'} size={20} color="var(--blue)" /></button>
          {cur && !detail && (
            <div className="card bpop col g8">
              <div className="row between g8"><span className="s w6 ell">{cur.name}</span><span className={'chip ' + (status(cur).open ? 'green' : 'amber')}>{status(cur).open ? 'Open' : 'Closed'}</span></div>
              <span className="xs t2 ell">{cur.address} · {fmtKm(cur.km)}</span>
              <div className="row g8"><a className="btn pri sm grow" href={directions(cur)} target="_blank" rel="noreferrer"><Icon name="car" size={16} color="#fff" />Directions</a><button className="btn sm" onClick={() => setDetail(true)}>Details</button></div>
            </div>
          )}
          {ask === 'ask' && (
            <div className="bask">
              <div className="card col g16 center" style={{ maxWidth: 360, padding: 28, textAlign: 'center' }}>
                <span className="bic big"><Icon name="pin" size={30} color="var(--red)" /></span>
                <span className="h2">Find Zenith near you</span>
                <span className="s t2">NURU uses your location once to show the closest branches and ATMs. It is never stored or shared.</span>
                <button className="btn pri block" onClick={locate}>Use my location</button>
                <button className="btn ghost block" style={{ color: 'var(--red)' }} onClick={() => setAsk('done')}>Search by area instead</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </Frame>
  )
}
