import { useEffect, useState } from 'react'
import { api, type Account } from '../../api'
import { Shell } from '../../Shell'
import { useApp } from '../../store'
import { Icon, Modal, useLoad } from '../../ui'
import { Item, Toggle, Top, type Prefs } from './kit'

export default function Privacy() {
  const { t, toast } = useApp()
  const [p, setP] = useState<Prefs | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<'' | 'chats' | 'history'>('')
  const { data: accts } = useLoad<{ accounts: Account[] }>('/accounts')
  useEffect(() => { api<Prefs>('/me/prefs').then(setP).catch(() => {}) }, [])
  const viaMono = (accts?.accounts || []).filter((a) => a.linked_via.startsWith('mono')).length

  async function set(patch: Partial<Prefs>) {
    if (patch.save_chats === false) { setConfirm('history'); return }
    if (p) setP({ ...p, ...patch })
    try { setP(await api<Prefs>('/me/prefs', { method: 'PATCH', body: patch })) } catch (e) { toast((e as Error).message) }
  }
  async function download() {
    setBusy(true)
    try {
      const data = await api('/me/export')
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const a = Object.assign(document.createElement('a'), { href: url, download: `nuru-data-${new Date().toISOString().slice(0, 10)}.json` })
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
      toast('Your data file is downloading')
    } catch (e) { toast((e as Error).message) } finally { setBusy(false) }
  }
  async function doConfirm() {
    if (confirm === 'history') {
      try { setP(await api<Prefs>('/me/prefs', { method: 'PATCH', body: { save_chats: false } })); toast('Chat history is off and was deleted') } catch (e) { toast((e as Error).message) }
    } else {
      await api('/chat', { method: 'DELETE' }).catch(() => {}); toast('Chat history deleted')
    }
    setConfirm('')
  }

  return (
    <Shell title={t('privacy')} sub="What NURU keeps and who can see it">
      <div className="k-flow">
        <Top back="/settings" />
        <div className="soft row g10" style={{ background: 'var(--green50)' }}><Icon name="lock" color="var(--green)" /><span className="xs t2 grow">Your chats with NURU are encrypted and only you can read them. Bank staff cannot see them.</span></div>
        <span className="k-label">NURU AI</span>
        <div className="card col g16">
          {!p ? <div className="skeleton" style={{ height: 130 }} /> : ([
            ['save_chats', 'Save chat history', 'Turning this off deletes saved chats'],
            ['use_insights', 'Use my data for insights', 'Only inside your account'],
            ['improve', 'Help improve NURU', 'Anonymous, never your name or BVN'],
          ] as const).map(([k, title, sub]) => (
            <div key={k} className="row g12"><span className="col g4 grow"><span className="s w6">{title}</span><span className="xs mu">{sub}</span></span><Toggle on={p[k]} onChange={(v) => set({ [k]: v })} label={title} /></div>
          ))}
        </div>
        <span className="k-label">Your data</span>
        <div className="card col" style={{ padding: '6px 20px' }}>
          <Item icon="download" title={busy ? 'Preparing your file…' : 'Download my data'} sub="Transactions, chats and settings as a JSON file" onClick={download} />
          <Item icon="link" title="Apps with access" sub={viaMono ? `Mono open banking (sandbox), ${viaMono} account${viaMono === 1 ? '' : 's'}` : 'None'} to="/settings/accounts" />
          <Item icon="trash" title="Delete chat history" tone="red" onClick={() => setConfirm('chats')} />
        </div>
        <span className="xs mu">NURU follows the Nigeria Data Protection Act 2023. Account numbers are masked before the assistant sees them, and NURU never sends your data to advertisers.</span>
      </div>
      {confirm && (
        <Modal onClose={() => setConfirm('')}>
          <div className="col g16">
            <div className="col center g8" style={{ textAlign: 'center' }}>
              <span className="k-ic red lg"><Icon name="trash" size={26} /></span>
              <span className="h3">{confirm === 'history' ? 'Stop saving chats?' : 'Delete chat history?'}</span>
              <span className="s t2">Every saved conversation with NURU will be deleted. This cannot be undone.</span>
            </div>
            <button className="btn pri block" onClick={doConfirm}>Delete</button>
            <button className="btn block" onClick={() => setConfirm('')}>Cancel</button>
          </div>
        </Modal>
      )}
    </Shell>
  )
}
