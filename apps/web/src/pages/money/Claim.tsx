import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Icon, Skeleton, useLoad } from '../../ui'
import { Back, Ic, Sandbox, Tip, num } from './kit'
import { kindIcon, type Policy } from './Insurance'

export default function Claim() {
  const { id } = useParams()
  const { toast } = useApp()
  const money = useMoney()
  const nav = useNavigate()
  const p = useLoad<{ policies: Policy[] }>('/insurance').data?.policies.find((x) => x.id === id)
  const [what, setWhat] = useState('')
  const [cost, setCost] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const urls = useRef<string[]>([])
  urls.current = photos
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), [])

  const add = (files: FileList | null) => {
    if (!files) return
    setPhotos((ph) => [...ph, ...[...files].filter((f) => f.type.startsWith('image/')).map((f) => URL.createObjectURL(f))].slice(0, 6))
  }
  const submit = async () => {
    setBusy(true)
    try {
      const r = await api<{ reference: string }>('/insurance/claims', { body: { policy_id: id, description: what, amount: num(cost), photos: photos.length } })
      toast(`Claim ${r.reference} sent to ${p?.provider}`)
      nav('/money/insurance')
    } catch (e) { toast((e as Error).message) } finally { setBusy(false) }
  }
  const [ic, tone, label] = kindIcon[p?.kind || ''] || ['shield', 'gray', 'Policy']

  return (
    <Shell title="Make a claim">
      <Back to="/money/insurance" label="Insurance" />
      <div className="col g16 kit-narrow">
        {p ? <div className="soft row g12"><Ic name={ic} tone={tone} size={36} /><span className="col g4"><span className="s w6">{label} · {p.provider}</span><span className="xs mu">Policy {p.policy_no}</span></span></div> : <Skeleton h={64} />}
        <div className="field"><label htmlFor="what">What happened?</label>
          <textarea id="what" className="input" maxLength={1000} value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Rear bumper hit at Lekki toll gate on 16 Oct" />
        </div>
        <div className="field">
          <label>Photos and documents</label>
          <div className="kit-thumbs">
            {photos.map((src) => <img key={src} src={src} alt="Claim photo" />)}
            {photos.length < 6 && <button type="button" onClick={() => file.current?.click()} aria-label="Add photo"><Icon name="plus" size={22} color="var(--muted)" /></button>}
          </div>
          <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
        </div>
        <div className="field"><label htmlFor="cost">Estimated repair cost</label>
          <input id="cost" className="input num w6" inputMode="numeric" value={num(cost) ? num(cost).toLocaleString('en-NG') : ''} onChange={(e) => setCost(e.target.value)} placeholder="₦0" />
        </div>
        {p && <Tip icon="info" tone="gray">Your excess is {money(p.excess)}. {p.provider} usually settles in 7 to 10 days.{num(cost) > p.excess ? ` You could get about ${money(num(cost) - p.excess)}.` : ''}</Tip>}
        <Sandbox>Sandbox claim. Photos stay on this device and are not uploaded.</Sandbox>
        <button className="btn pri block" disabled={busy || !p || !what.trim() || !num(cost)} onClick={submit}>Submit claim</button>
      </div>
    </Shell>
  )
}
