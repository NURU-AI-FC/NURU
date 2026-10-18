import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Payee } from '../../api'
import { useApp } from '../../store'
import { Icon, Modal, Skeleton, useLoad } from '../../ui'
import { Avatar, BANKS, Sub } from './common'

const TAGS = ['Family', 'Business', 'Vendors']

export default function Beneficiaries() {
  const { toast } = useApp()
  const nav = useNavigate()
  const loaded = useLoad<Payee[]>('/payees').data
  const [rows, setRows] = useState<Payee[] | null>(null)
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('')
  const [adding, setAdding] = useState(false)
  const [menu, setMenu] = useState('')
  const [f, setF] = useState({ name: '', bank: 'GTBank', account: '', tag: '' })
  const [err, setErr] = useState('')
  const list = rows || loaded

  const shown = list?.filter((p) => (!tag || p.tag === tag) && (!q || `${p.name} ${p.bank} ${p.account}`.toLowerCase().includes(q.toLowerCase())))

  async function act(fn: () => Promise<Payee[]>, done?: string) {
    try { setRows(await fn()); if (done) toast(done) } catch (e) { toast((e as Error).message) }
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    setErr('')
    if (!/^\d{10}$/.test(f.account)) { setErr('Account numbers are 10 digits'); return }
    try {
      setRows(await api<Payee[]>('/payees', { body: f }))
      setAdding(false)
      setF({ name: '', bank: 'GTBank', account: '', tag: '' })
      toast('Beneficiary saved')
    } catch (e) { setErr((e as Error).message) }
  }

  return (
    <Sub title="Beneficiaries" sub="People and businesses you pay" right={<button className="ib" onClick={() => setAdding(true)} aria-label="Add beneficiary"><Icon name="plus" /></button>}>
      <div className="card col g12">
        <div className="input row g8" style={{ height: 44 }}><Icon name="search" size={18} color="var(--muted)" />
          <input style={{ border: 0, outline: 0, background: 'transparent', color: 'inherit', flex: 1, font: 'inherit' }} placeholder="Search name or account" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search beneficiaries" /></div>
        <div className="row g8 wrap">
          {['', ...TAGS].map((x) => <button key={x || 'all'} className={'chip' + (tag === x ? ' red' : '')} style={{ border: 0, cursor: 'pointer' }} onClick={() => setTag(x)}>{x || 'All'}</button>)}
        </div>
        {shown ? shown.length ? shown.map((p) => (
          <div key={p.id} className="row g12" style={{ position: 'relative' }}>
            <button className="payrow grow" onClick={() => nav('/pay/send?payee=' + p.id)}>
              <Avatar name={p.name} />
              <span className="col grow"><span className="s w6">{p.name}</span><span className="xs mu">{p.bank} {p.account}{p.tag ? ` · ${p.tag}` : ''}</span></span>
            </button>
            <button className="ib" aria-label={p.starred ? 'Unstar' : 'Star'} onClick={() => act(() => api<Payee[]>('/payees/' + p.id, { method: 'PATCH', body: { starred: !p.starred } }))}>
              <Icon name="star" size={18} color={p.starred ? 'var(--amber)' : 'var(--muted)'} />
            </button>
            <button className="ib" aria-label="More" onClick={() => setMenu(menu === p.id ? '' : p.id)}><Icon name="more" size={18} color="var(--muted)" /></button>
            {menu === p.id && (
              <div className="card col g4" style={{ position: 'absolute', right: 0, top: 44, zIndex: 5, padding: 8, minWidth: 180 }}>
                <button className="btn sm ghost" style={{ justifyContent: 'flex-start' }} onClick={() => nav('/pay/send?payee=' + p.id)}><Icon name="send" size={16} />Send money</button>
                {TAGS.filter((x) => x !== p.tag).map((x) => <button key={x} className="btn sm ghost" style={{ justifyContent: 'flex-start' }} onClick={() => { setMenu(''); act(() => api<Payee[]>('/payees/' + p.id, { method: 'PATCH', body: { tag: x } })) }}><Icon name="flag" size={16} />Move to {x}</button>)}
                <button className="btn sm ghost" style={{ justifyContent: 'flex-start', color: 'var(--red)' }} onClick={() => { setMenu(''); if (confirm(`Remove ${p.name}?`)) act(() => api<Payee[]>('/payees/' + p.id, { method: 'DELETE' }), 'Removed') }}><Icon name="trash" size={16} />Remove</button>
              </div>
            )}
          </div>
        )) : <span className="s t2" style={{ padding: '12px 0' }}>No one matches. Add a beneficiary with the plus button.</span> : <Skeleton h={280} />}
      </div>

      {adding && (
        <Modal onClose={() => setAdding(false)}>
          <form className="col g12" onSubmit={add}>
            <span className="h3">Add a beneficiary</span>
            <div className="field"><label htmlFor="bn">Name on the account</label><input id="bn" className="input" required maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div className="field"><label htmlFor="bb">Bank</label><select id="bb" className="input" value={f.bank} onChange={(e) => setF({ ...f, bank: e.target.value })}>{BANKS.map((b) => <option key={b}>{b}</option>)}</select></div>
            <div className="field"><label htmlFor="ba">Account number</label><input id="ba" className="input num" inputMode="numeric" maxLength={10} required value={f.account} onChange={(e) => setF({ ...f, account: e.target.value.replace(/\D/g, '') })} /></div>
            <div className="field"><label htmlFor="bt">Group</label><select id="bt" className="input" value={f.tag} onChange={(e) => setF({ ...f, tag: e.target.value })}><option value="">None</option>{TAGS.map((x) => <option key={x}>{x}</option>)}</select></div>
            {err && <span className="err" role="alert">{err}</span>}
            <button className="btn pri">Save beneficiary</button>
          </form>
        </Modal>
      )}
    </Sub>
  )
}
