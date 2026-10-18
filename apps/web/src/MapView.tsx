import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { Branch } from './branches'
import { paths } from './icons'

const svg = (name: string, color: string, size = 16) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`

const pin = (b: Branch, on: boolean) => L.divIcon({
  className: 'bpin-wrap',
  html: `<div class="bpin${on ? ' on' : ''}${b.kind === 'atm' ? ' atm' : ''}">${svg(b.kind === 'atm' ? 'card' : 'landmark', on ? '#fff' : 'var(--red)')}</div>`,
  iconSize: [44, 44], iconAnchor: [22, 44],
})

const me = L.divIcon({ className: 'bpin-wrap', html: '<div class="bme"><i></i></div>', iconSize: [56, 56], iconAnchor: [28, 28] })

const tiles = (dark: boolean) => dark
  ? L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap, © CARTO', subdomains: 'abcd', maxZoom: 19 })
  : L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap, © CARTO', subdomains: 'abcd', maxZoom: 19 })

// MapView draws branches on a live OpenStreetMap map and follows the app theme.
export function MapView({ center, user, branches, selected, onSelect, interactive = true }: {
  center: [number, number]
  user?: [number, number] | null
  branches: Branch[]
  selected?: string | null
  onSelect?: (id: string) => void
  interactive?: boolean
}) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const base = useRef<L.TileLayer | null>(null)
  const pick = useRef(onSelect)
  pick.current = onSelect

  useEffect(() => {
    const m = L.map(box.current!, { zoomControl: false, attributionControl: true, scrollWheelZoom: interactive, dragging: interactive, touchZoom: interactive, doubleClickZoom: interactive })
    m.setView(center, 14)
    if (interactive) L.control.zoom({ position: 'bottomright' }).addTo(m)
    const dark = () => document.documentElement.dataset.theme === 'dark'
    base.current = tiles(dark()).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    // swap tiles when the theme changes
    const obs = new MutationObserver(() => { base.current?.remove(); base.current = tiles(dark()).addTo(m) })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const ro = new ResizeObserver(() => m.invalidateSize())
    ro.observe(box.current!)
    return () => { obs.disconnect(); ro.disconnect(); m.remove(); map.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { map.current?.flyTo(center, map.current.getZoom() < 12 ? 14 : map.current.getZoom(), { duration: 0.8 }) }, [center])

  useEffect(() => {
    const g = layer.current
    if (!g) return
    g.clearLayers()
    if (user) L.marker(user, { icon: me, interactive: false, zIndexOffset: -10 }).addTo(g)
    for (const b of branches) {
      const on = b.id === selected
      L.marker([b.lat, b.lon], { icon: pin(b, on), title: b.name, zIndexOffset: on ? 1000 : 0, keyboard: true })
        .on('click', () => pick.current?.(b.id)).addTo(g)
    }
  }, [branches, selected, user])

  useEffect(() => {
    const b = branches.find((x) => x.id === selected)
    if (b && map.current) map.current.panTo([b.lat, b.lon], { animate: true })
  }, [selected, branches])

  return <div ref={box} className="bmap" />
}
