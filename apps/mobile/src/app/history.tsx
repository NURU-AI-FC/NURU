import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { api, type Tx } from '@/lib/api'
import { catIcon, catTone, clock } from '@/lib/format'
import { useApp, useMoney } from '@/lib/store'
import { Button, Card, Chip, Input, Row, Screen, Skeleton, T, TopBar, TxRow } from '@/ui/kit'

type Page = { items: Tx[]; count: number; in: number; out: number; more: boolean }
const PAGE = 30

function dayLabel(d: Date) {
  const today = new Date(new Date().toDateString()).getTime()
  const diff = Math.round((today - new Date(d.toDateString()).getTime()) / 864e5)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

// p05 "06 Transaction history": search, filter chips and day groups with the net per day.
export default function History() {
  const { t } = useApp()
  const money = useMoney()
  const [q, setQ] = useState('')
  const [dir, setDir] = useState<'' | 'credit' | 'debit'>('')
  const [rows, setRows] = useState<Tx[] | null>(null)
  const [meta, setMeta] = useState<Page | null>(null)
  const [busy, setBusy] = useState(false)
  const query = (offset: number) => {
    const p = new URLSearchParams({ limit: String(PAGE), offset: String(offset), meta: '1' })
    if (q.trim()) p.set('q', q.trim())
    if (dir) p.set('direction', dir)
    return '/transactions?' + p.toString()
  }
  useEffect(() => {
    let live = true
    const id = setTimeout(() => {
      setRows(null)
      api<Page>(query(0)).then((d) => { if (live) { setRows(d.items); setMeta(d) } }).catch(() => live && setRows([]))
    }, 250)
    return () => { live = false; clearTimeout(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, dir])
  async function more() {
    if (!rows) return
    setBusy(true)
    try { const d = await api<Page>(query(rows.length)); setRows([...rows, ...d.items]); setMeta({ ...d, items: [] }) } finally { setBusy(false) }
  }
  const groups: { label: string; net: number; rows: Tx[] }[] = []
  for (const x of rows || []) {
    const label = dayLabel(new Date(x.at)); let g = groups[groups.length - 1]
    if (!g || g.label !== label) groups.push(g = { label, net: 0, rows: [] })
    g.rows.push(x); g.net += x.direction === 'credit' ? x.amount : -x.amount
  }

  return (
    <Screen gap={12} top={<TopBar title={t('historyTitle')} />}>
      <Input icon="search" value={q} onChangeText={setQ} placeholder={t('searchTx')} round height={46} />
      <Row gap={8}>{([['', 'All'], ['debit', 'Money out'], ['credit', 'Money in']] as ['' | 'credit' | 'debit', string][]).map(([k, l]) => <Chip key={l} label={l} on={dir === k} onPress={() => setDir(k)} />)}</Row>
      {meta && <Row gap={12}>
        <Card pad={12} style={{ flex: 1, gap: 4 }}><T v="xs" tone="mu">Money in</T><T v="h4" num tone="gr">{money(meta.in, { compact: true })}</T></Card>
        <Card pad={12} style={{ flex: 1, gap: 4 }}><T v="xs" tone="mu">Money out</T><T v="h4" num>{money(meta.out, { compact: true })}</T></Card>
      </Row>}
      {!rows ? <Skeleton h={360} /> : rows.length === 0 ? <T v="s" tone="t2" center style={{ paddingVertical: 30 }}>No transactions match.</T> : groups.map((g) => (
        <View key={g.label} style={{ gap: 12 }}>
          <Row between><T v="xs" w={600} tone="mu" style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>{g.label}</T><T v="xs" w={600} tone={g.net > 0 ? 'gr' : 'mu'} num>{money(g.net, { sign: g.net > 0 })}</T></Row>
          {g.rows.map((x) => (
            <TxRow key={x.id} icon={catIcon(x.category)} tone={x.direction === 'credit' ? 'green' : catTone(x.category)} name={x.merchant} sub={`${x.category} · ${clock(new Date(x.at))}`} amount={money(x.amount)} credit={x.direction === 'credit'} />
          ))}
        </View>
      ))}
      {meta?.more && <Button label="Load more" variant="sec" loading={busy} onPress={more} />}
    </Screen>
  )
}
