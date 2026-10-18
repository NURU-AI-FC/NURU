import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { Shell } from '../../Shell'
import { useApp } from '../../store'
import { Icon, useLoad } from '../../ui'
import { Back, num } from '../money/kit'
import type { Biz } from './data'

const kinds = ['Food and drinks', 'Retail', 'Fashion', 'Services', 'Logistics', 'Agriculture', 'Tech']

export default function Setup() {
  const { toast, refresh } = useApp()
  const nav = useNavigate()
  const b = useLoad<Biz>('/business').data
  const [f, setF] = useState({ name: '', rc: '', type: kinds[0], staff: '', sales: '', customers: '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (b?.enabled) setF({ name: b.name, rc: b.rc, type: b.type, staff: String(b.staff_count || ''), sales: b.monthly_sales ? String(b.monthly_sales) : '', customers: b.customers })
  }, [b])
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  const done = [f.name.trim(), f.type, f.staff, f.customers.trim()].filter(Boolean).length

  const save = async () => {
    setBusy(true)
    try {
      await api('/business', { method: 'PATCH', body: { name: f.name, rc: f.rc, type: f.type, staff: Number(f.staff) || 0, sales: num(f.sales), customers: f.customers } })
      await refresh()
      toast('Business saved')
      nav('/business')
    } catch (e) { toast((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Shell title="Set up your business">
      <Back to="/business" label="Business" />
      <div className="col g16 kit-narrow">
        <div className="row g6">{[0, 1, 2, 3].map((i) => <div key={i} className="grow" style={{ height: 4, borderRadius: 2, background: i < done ? 'var(--red)' : 'var(--border)' }} />)}</div>
        <span className="h2">Tell NURU about your business</span>
        <div className="field"><label htmlFor="bn">Business name</label><input id="bn" className="input" maxLength={80} value={f.name} onChange={(e) => set('name')(e.target.value)} placeholder="Kemi Foods Ltd" /></div>
        <div className="field"><label htmlFor="rc">RC number (optional)</label>
          <div className="row g8"><input id="rc" className="input num" maxLength={20} value={f.rc} onChange={(e) => set('rc')(e.target.value)} placeholder="RC 1843327" />{/^(RC\s?)?\d{5,8}$/i.test(f.rc.trim()) && <Icon name="shieldcheck" color="var(--green)" />}</div>
        </div>
        <div className="field"><label>What kind of business?</label>
          <div className="kit-pick">{[...new Set([...kinds, f.type])].filter(Boolean).map((k) => <button key={k} type="button" className={f.type === k ? 'on' : ''} onClick={() => set('type')(k)}>{k}</button>)}</div>
        </div>
        <div className="grid g-2" style={{ gap: 12 }}>
          <div className="field"><label htmlFor="st">Staff</label><input id="st" className="input num" inputMode="numeric" value={f.staff} onChange={(e) => set('staff')(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="5" /></div>
          <div className="field"><label htmlFor="ms">Monthly sales</label><input id="ms" className="input num" inputMode="numeric" value={num(f.sales) ? num(f.sales).toLocaleString('en-NG') : ''} onChange={(e) => set('sales')(e.target.value)} placeholder="₦0" /></div>
        </div>
        <div className="field"><label htmlFor="cu">Who are your customers?</label><input id="cu" className="input" maxLength={200} value={f.customers} onChange={(e) => set('customers')(e.target.value)} placeholder="Office workers in Lekki, 25 to 40" /></div>
        <button className="btn pri block" disabled={busy || !f.name.trim() || !f.type} onClick={save}>{b?.enabled ? 'Save' : 'Continue'}</button>
      </div>
    </Shell>
  )
}
