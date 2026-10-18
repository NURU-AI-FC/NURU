import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Account } from '../../api'
import { Shell } from '../../Shell'
import { useApp, useMoney } from '../../store'
import { Icon, Modal, Skeleton, useLoad } from '../../ui'
import { BankLogo, Top } from './kit'

const badge = (a: Account): [string, string] => a.linked_via === 'sandbox' ? (a.kind === 'business' ? ['Business', 'blue'] : ['Main', 'green']) : a.bank === 'Demo Bank' ? ['Demo', 'blue'] : ['Read only', '']

export default function Accounts() {
  const { t, toast } = useApp()
  const money = useMoney()
  const { data, reload } = useLoad<{ accounts: Account[] }>('/accounts')
  const [drop, setDrop] = useState<Account | null>(null)

  async function unlink() {
    if (!drop) return
    try { await api('/accounts/' + drop.id, { method: 'DELETE' }); toast(drop.bank + ' disconnected'); reload() } catch (e) { toast((e as Error).message) }
    setDrop(null)
  }

  return (
    <Shell title={t('linkedAccounts')} sub="Banks and wallets NURU can read" right={<Link className="ib" to="/link" aria-label="Link another account"><Icon name="plus" /></Link>}>
      <div className="k-flow">
        <Top back="/settings" />
        {!data ? <Skeleton h={200} /> : data.accounts.map((a) => {
          const [b, tone] = badge(a)
          return (
            <div key={a.id} className="card col g12" style={{ padding: 14 }}>
              <div className="row g12">
                <BankLogo bank={a.bank === 'Demo Bank' ? 'Zenith Bank' : a.bank} sm />
                <span className="col g4 grow"><span className="s w6">{a.bank}{a.linked_via === 'mono-sandbox' ? ' (sandbox)' : ''}</span><span className="xs mu">{a.name} {a.number}</span></span>
                <span className="col g4" style={{ alignItems: 'flex-end' }}><span className={'chip ' + tone}>{b}</span><span className="xs w6 num">{money(a.balance)}</span></span>
              </div>
              <div className="row between">
                <span className="xs t2 row g4"><Icon name="refresh" size={12} color="var(--muted)" /> {a.linked_via === 'sandbox' ? 'Zenith account, always in sync' : 'Synced through Mono'}</span>
                {data.accounts.length > 1 && <button className="btn ghost sm red" style={{ height: 28, padding: '0 4px' }} onClick={() => setDrop(a)}>Disconnect</button>}
              </div>
            </div>
          )
        })}
        <div className="soft row g10"><Icon name="info" color="var(--blue)" /><span className="xs t2 grow">Judges can link any sandbox bank or the demo bank with any user ID and password.</span></div>
        <div className="k-flow-cta"><Link className="btn pri block" to="/link"><Icon name="plus" color="#fff" /> Link another account</Link></div>
      </div>
      {drop && (
        <Modal onClose={() => setDrop(null)}>
          <div className="col g16">
            <div className="col center g8" style={{ textAlign: 'center' }}>
              <BankLogo bank={drop.bank === 'Demo Bank' ? 'Zenith Bank' : drop.bank} />
              <span className="h3">Disconnect {drop.bank}?</span>
              <span className="s t2">NURU stops reading {drop.name} {drop.number} and removes its transactions from your insights. You can link it again any time.</span>
            </div>
            <button className="btn pri block" onClick={unlink}>Disconnect</button>
            <button className="btn block" onClick={() => setDrop(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </Shell>
  )
}
