import { useEffect, useMemo, useRef } from 'react'
import { View } from 'react-native'
import { WebView } from 'react-native-webview'
import { useTheme } from '@/lib/theme'

export type Pin = { id: string; name: string; lat: number; lon: number; kind: 'branch' | 'atm' }

// LiveMap shows a real OpenStreetMap map (same free CARTO tiles as the web branch finder)
// inside a WebView, so it needs no API key and works in Expo Go and the APK.
export function LiveMap({ pins, me, selected, onSelect, height = 220 }: {
  pins: Pin[]
  me: [number, number]
  selected?: string
  onSelect?: (id: string) => void
  height?: number
}) {
  const { c, dark } = useTheme()
  const web = useRef<WebView>(null)
  const ready = useRef(false)
  const state = JSON.stringify({ pins, me, selected })

  // The page is built once per theme; pins and selection are pushed in afterwards.
  const html = useMemo(() => page(dark, c.red, c.blue), [dark, c.red, c.blue])

  useEffect(() => {
    if (ready.current) web.current?.injectJavaScript(`window.draw(${state});true;`)
  }, [state])

  return (
    <View style={{ height, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: c.border, backgroundColor: c.card }}>
      <WebView
        ref={web}
        originWhitelist={['*']}
        source={{ html }}
        style={{ backgroundColor: 'transparent' }}
        scrollEnabled={false}
        onLoadEnd={() => { ready.current = true; web.current?.injectJavaScript(`window.draw(${state});true;`) }}
        onMessage={(e) => onSelect?.(e.nativeEvent.data)}
      />
    </View>
  )
}

const page = (dark: boolean, red: string, blue: string) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html,body,#m{margin:0;height:100%;background:${dark ? '#1A1A1D' : '#EEF0F2'}}
.p{width:22px;height:22px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);background:${red}}
.p.atm{background:${blue}}.p.on{width:30px;height:30px;margin:-4px}
.me{width:14px;height:14px;border-radius:50%;background:${blue};border:3px solid #fff;box-shadow:0 0 0 10px ${blue}33}
.leaflet-control-attribution{font-size:9px}
</style></head><body><div id="m"></div><script>
var m=L.map('m',{zoomControl:false}).setView([6.4317,3.4229],13)
L.tileLayer('https://{s}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'rastertiles/voyager'}/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:19,attribution:'© OpenStreetMap, © CARTO'}).addTo(m)
var g=L.layerGroup().addTo(m),fitted=false
window.draw=function(s){
  g.clearLayers()
  L.marker(s.me,{interactive:false,icon:L.divIcon({className:'',html:'<div class="me"></div>',iconSize:[14,14]})}).addTo(g)
  s.pins.forEach(function(b){
    var on=b.id===s.selected
    L.marker([b.lat,b.lon],{zIndexOffset:on?1000:0,icon:L.divIcon({className:'',html:'<div class="p'+(b.kind==='atm'?' atm':'')+(on?' on':'')+'"></div>',iconSize:[22,22]})})
      .on('click',function(){window.ReactNativeWebView.postMessage(b.id)}).addTo(g)
  })
  var sel=s.pins.filter(function(b){return b.id===s.selected})[0]
  if(!fitted&&s.pins.length){fitted=true;m.fitBounds(L.latLngBounds(s.pins.map(function(b){return[b.lat,b.lon]}).concat([s.me])),{padding:[30,30],maxZoom:15})}
  else if(sel){m.panTo([sel.lat,sel.lon])}
}
</script></body></html>`
