import { useEffect, useMemo, useState } from 'react'
import { Linking, Platform, View } from 'react-native'
import * as Location from 'expo-location'
import { LiveMap } from '@/components/LiveMap'
import { BANK, callSupport } from '@/lib/bank'
import { useApp } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { Icon } from '@/ui/Icon'
import { Badge, Button, Card, Chip, Ic, Input, Row, Screen, T, TopBar } from '@/ui/kit'

type Branch = { id: string; name: string; address: string; lat: number; lon: number; kind: 'branch' | 'atm' }

// Same fallback list as the web branch finder (apps/web/src/branches.ts). Coordinates are approximate.
const LIST: Branch[] = [
  { id: 'ho', name: BANK.name + ' Victoria Island', address: 'Ajose Adeogun St, Victoria Island, Lagos', lat: 6.4317, lon: 3.4229, kind: 'branch' },
  { id: 'adeola', name: BANK.name + ' Adeola Odeku', address: 'Adeola Odeku St, Victoria Island, Lagos', lat: 6.4296, lon: 3.4158, kind: 'branch' },
  { id: 'awolowo', name: BANK.name + ' Awolowo Road', address: 'Awolowo Rd, Ikoyi, Lagos', lat: 6.4466, lon: 3.4268, kind: 'branch' },
  { id: 'lekki', name: BANK.name + ' Lekki Phase 1', address: 'Admiralty Way, Lekki Phase 1, Lagos', lat: 6.4474, lon: 3.4723, kind: 'branch' },
  { id: 'yaba', name: BANK.name + ' Yaba', address: 'Herbert Macaulay Way, Yaba, Lagos', lat: 6.508, lon: 3.378, kind: 'branch' },
  { id: 'surulere', name: BANK.name + ' Surulere', address: 'Adeniran Ogunsanya St, Surulere, Lagos', lat: 6.4952, lon: 3.3555, kind: 'branch' },
  { id: 'allen', name: BANK.name + ' Allen Avenue', address: 'Allen Avenue, Ikeja, Lagos', lat: 6.601, lon: 3.353, kind: 'branch' },
  { id: 'abuja', name: BANK.name + ' Central Business District', address: 'Ahmadu Bello Way, Central Area, Abuja', lat: 9.0575, lon: 7.4951, kind: 'branch' },
  { id: 'wuse', name: BANK.name + ' Wuse II', address: 'Aminu Kano Crescent, Wuse II, Abuja', lat: 9.079, lon: 7.47, kind: 'branch' },
  { id: 'ph', name: BANK.name + ' Trans Amadi', address: 'Trans Amadi Rd, Port Harcourt', lat: 4.8156, lon: 7.0498, kind: 'branch' },
  { id: 'ibadan', name: BANK.name + ' Ring Road', address: 'Ring Road, Ibadan', lat: 7.3577, lon: 3.878, kind: 'branch' },
  { id: 'kano', name: BANK.name + ' Bank Road', address: 'Bank Road, Kano', lat: 12.0, lon: 8.52, kind: 'branch' },
  { id: 'atm-vi', name: BANK.name + ' ATM', address: 'Akin Adesola St, Victoria Island, Lagos', lat: 6.4335, lon: 3.4195, kind: 'atm' },
  { id: 'atm-lekki', name: BANK.name + ' ATM', address: 'Freedom Way, Lekki Phase 1, Lagos', lat: 6.4447, lon: 3.4655, kind: 'atm' },
]
const HOME: [number, number] = [6.4317, 3.4229]

function km(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}
function status(b: Branch) {
  if (b.kind === 'atm') return { open: true, label: 'Open 24 hours' }
  const d = new Date(Date.now() + 3600_000), day = d.getUTCDay(), hour = d.getUTCHours() + d.getUTCMinutes() / 60
  const weekday = day >= 1 && day <= 5
  if (weekday && hour >= 8 && hour < 16) return { open: true, label: 'Open · closes 4pm' }
  if (weekday && hour < 8) return { open: false, label: 'Opens 8am today' }
  return { open: false, label: day === 5 || day === 6 ? 'Opens 8am Monday' : 'Opens 8am tomorrow' }
}
const directions = (b: Branch) => Platform.OS === 'ios' ? `https://maps.apple.com/?daddr=${b.lat},${b.lon}` : `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lon}`

// p17 branch finder: a live map of the nearest pins, then the list. Distances are from the
// phone's location when allowed, otherwise from Victoria Island.
export default function Branches() {
  const { c } = useTheme()
  const { t } = useApp()
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<'' | 'branch' | 'atm'>('')
  const [sel, setSel] = useState<string>('')
  const [me, setMe] = useState<[number, number]>(HOME)
  const [located, setLocated] = useState(false)
  useEffect(() => {
    let live = true
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      if (live) { setMe([p.coords.latitude, p.coords.longitude]); setLocated(true) }
    })().catch(() => {})
    return () => { live = false }
  }, [])
  const list = useMemo(() => LIST
    .filter((b) => !kind || b.kind === kind)
    .filter((b) => !q.trim() || (b.name + b.address).toLowerCase().includes(q.trim().toLowerCase()))
    .map((b) => ({ ...b, km: km(me, [b.lat, b.lon]) }))
    .sort((a, b) => a.km - b.km), [q, kind, me])
  const near = list.filter((b) => b.km < 25).slice(0, 7)
  const pick = list.find((b) => b.id === sel) || list[0]

  return (
    <Screen gap={12} top={<TopBar title={t('branches')} />}>
      <Input icon="search" value={q} onChangeText={setQ} placeholder="Search area or branch" round height={46} />
      <LiveMap pins={near.length ? near : list.slice(0, 7)} me={me} selected={pick?.id} onSelect={setSel} />
      {!located && <T v="xs" tone="mu">Distances are from Victoria Island. Allow location to see branches near you.</T>}
      <Row gap={8}>{([['', 'All'], ['branch', 'Branches'], ['atm', 'ATMs']] as ['' | 'branch' | 'atm', string][]).map(([k, l]) => <Chip key={l} label={l} on={kind === k} onPress={() => setKind(k)} />)}</Row>
      {pick && (
        <Card style={{ gap: 12 }}>
          <Row gap={12}>
            <Ic name={pick.kind === 'atm' ? 'card' : 'landmark'} tone="red" />
            <View style={{ flex: 1, gap: 4 }}><T v="h4">{pick.name}</T><T v="xs" tone="mu" lines={2}>{pick.address}</T></View>
          </Row>
          <Row gap={8}><Badge tone={status(pick).open ? 'green' : 'gray'} label={status(pick).label} /><T v="xs" tone="t2">{pick.km.toFixed(1)} km away</T></Row>
          <Row gap={10}>
            <Button grow sm label="Directions" icon="navigation" onPress={() => Linking.openURL(directions(pick))} />
            <Button grow sm variant="sec" label="Call" icon="phone" onPress={callSupport} />
          </Row>
        </Card>
      )}
      {list.filter((b) => b.id !== pick?.id).map((b) => {
        const s = status(b)
        return (
          <Card key={b.id} pad={14} onPress={() => setSel(b.id)}>
            <Row gap={12}>
              <Ic name={b.kind === 'atm' ? 'card' : 'landmark'} tone={b.kind === 'atm' ? 'blue' : 'gray'} size={40} r={12} iconSize={18} />
              <View style={{ flex: 1, gap: 4 }}>
                <T v="s" w={600} lines={1}>{b.name}</T>
                <T v="xs" tone="mu" lines={1}>{b.address}</T>
                <Row gap={6}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.open ? c.green : c.muted }} /><T v="xs" tone={s.open ? 'gr' : 'mu'} w={600}>{s.label}</T></Row>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}><T v="xs" w={600}>{b.km < 10 ? b.km.toFixed(1) : Math.round(b.km)} km</T><Icon name="chevr" size={16} color={c.muted} /></View>
            </Row>
          </Card>
        )
      })}
    </Screen>
  )
}
