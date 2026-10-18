// Zenith Bank branch and ATM lookup for the branch finder.
// Live data comes from OpenStreetMap through the Overpass API. The list below is the
// fallback when Overpass is slow or has nothing near the user; its coordinates are approximate.

export type Branch = {
  id: string
  name: string
  address: string
  lat: number
  lon: number
  kind: 'branch' | 'atm'
  phone?: string
  hours?: string
  source: 'osm' | 'list'
  km?: number
}

export const HEAD_OFFICE: [number, number] = [6.4317, 3.4229]
export const CONTACT = '+23412787000'

const LIST: Omit<Branch, 'source'>[] = [
  { id: 'ho', name: 'Zenith Bank Head Office', address: 'Plot 84 Ajose Adeogun St, Victoria Island, Lagos', lat: 6.4317, lon: 3.4229, kind: 'branch' },
  { id: 'adeola', name: 'Zenith Bank Adeola Odeku', address: 'Adeola Odeku St, Victoria Island, Lagos', lat: 6.4296, lon: 3.4158, kind: 'branch' },
  { id: 'awolowo', name: 'Zenith Bank Awolowo Road', address: 'Awolowo Rd, Ikoyi, Lagos', lat: 6.4466, lon: 3.4268, kind: 'branch' },
  { id: 'lekki', name: 'Zenith Bank Lekki Phase 1', address: 'Admiralty Way, Lekki Phase 1, Lagos', lat: 6.4474, lon: 3.4723, kind: 'branch' },
  { id: 'yaba', name: 'Zenith Bank Yaba', address: 'Herbert Macaulay Way, Yaba, Lagos', lat: 6.508, lon: 3.378, kind: 'branch' },
  { id: 'surulere', name: 'Zenith Bank Surulere', address: 'Adeniran Ogunsanya St, Surulere, Lagos', lat: 6.4952, lon: 3.3555, kind: 'branch' },
  { id: 'allen', name: 'Zenith Bank Allen Avenue', address: 'Allen Avenue, Ikeja, Lagos', lat: 6.601, lon: 3.353, kind: 'branch' },
  { id: 'abuja', name: 'Zenith Bank Central Business District', address: 'Ahmadu Bello Way, Central Area, Abuja', lat: 9.0575, lon: 7.4951, kind: 'branch' },
  { id: 'wuse', name: 'Zenith Bank Wuse II', address: 'Aminu Kano Crescent, Wuse II, Abuja', lat: 9.079, lon: 7.47, kind: 'branch' },
  { id: 'ph', name: 'Zenith Bank Trans Amadi', address: 'Trans Amadi Rd, Port Harcourt', lat: 4.8156, lon: 7.0498, kind: 'branch' },
  { id: 'ibadan', name: 'Zenith Bank Ring Road', address: 'Ring Road, Ibadan', lat: 7.3577, lon: 3.878, kind: 'branch' },
  { id: 'kano', name: 'Zenith Bank Bank Road', address: 'Bank Road, Kano', lat: 12.0, lon: 8.52, kind: 'branch' },
  { id: 'atm-vi', name: 'Zenith Bank ATM', address: 'Akin Adesola St, Victoria Island, Lagos', lat: 6.4335, lon: 3.4195, kind: 'atm' },
  { id: 'atm-lekki', name: 'Zenith Bank ATM', address: 'Freedom Way, Lekki Phase 1, Lagos', lat: 6.4447, lon: 3.4655, kind: 'atm' },
]

// km is the straight-line distance between two points.
export function km(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180
  const dLat = (b[0] - a[0]) * r
  const dLon = (b[1] - a[1]) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

// lagosNow returns the weekday (0 is Sunday) and hour in West Africa Time.
function lagosNow() {
  const d = new Date(Date.now() + 3600_000)
  return { day: d.getUTCDay(), hour: d.getUTCHours() + d.getUTCMinutes() / 60 }
}

// status says whether a branch is open, using standard Zenith banking hours.
export function status(b: Branch): { open: boolean; label: string } {
  if (b.kind === 'atm') return { open: true, label: 'Open 24 hours' }
  const { day, hour } = lagosNow()
  const weekday = day >= 1 && day <= 5
  if (weekday && hour >= 8 && hour < 16) return { open: true, label: 'Open · closes 4pm' }
  if (weekday && hour < 8) return { open: false, label: 'Opens 8am today' }
  return { open: false, label: day === 5 || day === 6 ? 'Opens 8am Monday' : 'Opens 8am tomorrow' }
}

export function services(b: Branch) {
  return b.kind === 'atm' ? ['ATM 24/7', 'Cash withdrawal'] : ['ATM 24/7', 'Cash deposit', 'Account opening', 'Card collection', 'Business banking', 'FX desk']
}

export const directions = (b: Branch) => `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lon}`
export const appleDirections = (b: Branch) => `https://maps.apple.com/?daddr=${b.lat},${b.lon}`

type OsmEl = { id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

function fromOsm(e: OsmEl): Branch | null {
  const lat = e.lat ?? e.center?.lat
  const lon = e.lon ?? e.center?.lon
  const t = e.tags || {}
  if (lat == null || lon == null) return null
  const atm = t.amenity === 'atm'
  const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ')
  const area = t['addr:suburb'] || t['addr:district'] || t['addr:city'] || ''
  let name = t.name || (atm ? 'Zenith Bank ATM' : 'Zenith Bank')
  if (!/zenith/i.test(name)) name = 'Zenith Bank ' + name
  if (!atm && t.branch && !name.includes(t.branch)) name = 'Zenith Bank ' + t.branch
  return {
    id: e.type + e.id, name, lat, lon, kind: atm ? 'atm' : 'branch', source: 'osm',
    address: [street, area].filter(Boolean).join(', ') || 'Address on the map',
    phone: t.phone || t['contact:phone'], hours: t.opening_hours,
  }
}

// nearby returns Zenith branches and ATMs around a point, closest first.
export async function nearby(at: [number, number], signal?: AbortSignal): Promise<Branch[]> {
  const list: Branch[] = LIST.map((b) => ({ ...b, source: 'list' }))
  let live: Branch[] = []
  try {
    const q = `[out:json][timeout:12];(nwr["amenity"~"^(bank|atm)$"]["name"~"zenith",i](around:20000,${at[0]},${at[1]});nwr["amenity"~"^(bank|atm)$"]["brand"~"zenith",i](around:20000,${at[0]},${at[1]});nwr["amenity"~"^(bank|atm)$"]["operator"~"zenith",i](around:20000,${at[0]},${at[1]}););out center 80;`
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 9000)
    signal?.addEventListener('abort', () => ctl.abort())
    const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl.signal })
    clearTimeout(timer)
    if (r.ok) live = ((await r.json()).elements as OsmEl[]).map(fromOsm).filter((b): b is Branch => !!b)
  } catch { /* fall back to the list */ }
  const all = [...live]
  for (const b of list) if (!all.some((x) => km([x.lat, x.lon], [b.lat, b.lon]) < 0.2)) all.push(b)
  const near = all.map((b) => ({ ...b, km: km(at, [b.lat, b.lon]) })).sort((a, b) => a.km! - b.km!)
  const close = near.filter((b) => b.km! <= 25)
  return close.length >= 3 ? close.slice(0, 40) : near.slice(0, 8)
}

// geocode turns a typed area into coordinates, limited to Nigeria.
export async function geocode(q: string): Promise<{ at: [number, number]; label: string } | null> {
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ng&q=' + encodeURIComponent(q))
    const [hit] = await r.json()
    if (!hit) return null
    return { at: [+hit.lat, +hit.lon], label: String(hit.display_name).split(',').slice(0, 2).join(',') }
  } catch { return null }
}

// areaName gives a short place name for a point, for the "near you" label.
export async function areaName(at: [number, number]): Promise<string> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=14&lat=${at[0]}&lon=${at[1]}`)
    const j = await r.json()
    const a = j.address || {}
    return a.suburb || a.neighbourhood || a.city_district || a.town || a.city || a.state || ''
  } catch { return '' }
}

// known returns the backup list, for previews that should not wait on the network.
export const known = (): Branch[] => LIST.map((b) => ({ ...b, source: 'list' }))
