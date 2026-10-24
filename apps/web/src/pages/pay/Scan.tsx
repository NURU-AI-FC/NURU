import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Account } from '../../api'
import { TransferGuard, type Receipt } from '../../Guard'
import { useApp, useMoney } from '../../store'
import { Icon, Modal, useLoad } from '../../ui'
import { AccountSelect, Avatar, ReceiptView, Sub } from './common'

type Merchant = { name: string; place: string; code: string }
type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
const DEMO: Merchant = { name: 'Mama Bisi Kitchen', place: 'Lekki Phase 1', code: 'NQR-44100231' }

// Reads a NURU or NQR code. NURU codes are JSON with a name; anything else
// is treated as a merchant code so the sandbox can still pay it.
function parse(raw: string): Merchant {
  try {
    const j = JSON.parse(raw)
    if (j.name) return { name: String(j.name).slice(0, 60), place: String(j.place || 'Merchant'), code: String(j.code || 'NURU-' + Date.now()).slice(0, 20) }
  } catch { /* not json */ }
  const code = raw.replace(/[^0-9A-Za-z-]/g, '').slice(0, 20) || DEMO.code
  return { name: 'Merchant ' + code.slice(-6), place: 'NQR merchant', code: code.length < 4 ? DEMO.code : code }
}

export default function Scan() {
  const money = useMoney()
  const { user } = useApp()
  const nav = useNavigate()
  const { data, reload } = useLoad<{ accounts: Account[] }>('/accounts')
  const accts = data?.accounts
  const video = useRef<HTMLVideoElement>(null)
  const [cam, setCam] = useState<'start' | 'on' | 'none'>('start')
  const [m, setM] = useState<Merchant | null>(null)
  const [from, setFrom] = useState('')
  const [amount, setAmount] = useState('')
  const [guard, setGuard] = useState(false)
  const [mine, setMine] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)

  useEffect(() => { if (accts && !from) setFrom(accts[0]?.id || '') }, [accts]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (m || receipt) return
    let stream: MediaStream | null = null
    let live = true
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (!live || !video.current) return
        video.current.srcObject = stream
        await video.current.play().catch(() => {})
        setCam('on')
        const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector
        if (!BD) return
        const d = new BD({ formats: ['qr_code'] })
        while (live) {
          const codes = await d.detect(video.current).catch(() => [])
          if (codes[0]?.rawValue) { setM(parse(codes[0].rawValue)); break }
          await new Promise((r) => setTimeout(r, 300))
        }
      } catch { if (live) setCam('none') }
    })()
    return () => { live = false; stream?.getTracks().forEach((t) => t.stop()) }
  }, [m, receipt])

  const acct = accts?.find((a) => a.id === from)
  const amt = Number(amount || 0)

  if (receipt && m) return <Sub title="Paid"><ReceiptView r={receipt} title="Paid" detail={m.place} onDone={() => nav('/pay')} /></Sub>

  return (
    <Sub title="Scan to pay" sub="Point at any NQR or NURU code">
      <div className="grid g-2" style={{ alignItems: 'start' }}>
        <div className="payscan">
          {cam === 'none' ? <span className="col center g8" style={{ color: '#fff', padding: 24, textAlign: 'center' }}><Icon name="camera" size={40} color="#fff" /><span className="s">No camera found or permission was denied.</span></span>
            : <video ref={video} playsInline muted />}
          {cam !== 'none' && <><div className="frame" /><div className="beam" /></>}
        </div>
        <div className="card col g12">
          {m ? <>
            <div className="row g12"><Avatar name={m.name} /><span className="col grow"><span className="s w6">{m.name}</span><span className="xs mu">Merchant · {m.place}</span></span><span className="chip green"><Icon name="shieldcheck" size={12} />Verified</span></div>
            <div className="field"><label htmlFor="mamt">Amount (₦)</label><input id="mamt" className="input num w6" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} /></div>
            <div className="field"><label htmlFor="mfrom">From</label><AccountSelect id="mfrom" accts={accts} value={from} onChange={setFrom} /></div>
            {acct && amt > acct.balance && <span className="err">That is more than the {money(acct.balance)} in this account.</span>}
            <button className="btn pri block" disabled={amt < 50 || !acct || amt > acct.balance} onClick={() => setGuard(true)}>Pay this merchant</button>
            <button className="btn block" onClick={() => { setM(null); setAmount('') }}>Scan again</button>
          </> : <>
            <span className="h3">Looking for a code</span>
            <span className="s t2">{cam === 'on' ? 'Hold the code inside the frame.' : 'Allow the camera to scan.'} Codes are read on your device.</span>
            {import.meta.env.VITE_DEMO !== 'false' && <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setM(DEMO)}>Use the sandbox merchant</button>}
          </>}
          <button className="btn ghost block" onClick={() => setMine(true)}><Icon name="qr" size={18} />Show my code</button>
        </div>
      </div>
      {guard && m && <TransferGuard path="/payments/bill" draft={{ from, toName: m.name, amount: amt, category: 'Shopping', biller: m.name, customer: m.code }} onClose={() => setGuard(false)} onDone={(r) => { setGuard(false); setReceipt(r); reload() }} />}
      {mine && (
        <Modal onClose={() => setMine(false)}>
          <div className="col g12 center" style={{ textAlign: 'center' }}>
            <span className="tile" style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--red50)', color: 'var(--red)' }}><Icon name="qr" size={30} /></span>
            <span className="h3">Get paid</span>
            <span className="s t2">Share these details so people can send money to you.</span>
            <div className="soft col g4" style={{ alignSelf: 'stretch' }}><span className="s w6">{user?.name}</span><span className="xs mu">{accts?.[0] ? `${accts[0].bank} ${accts[0].number}` : ''}</span></div>
            <button className="btn pri block" onClick={() => setMine(false)}>Done</button>
          </div>
        </Modal>
      )}
    </Sub>
  )
}
