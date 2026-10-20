import { lazy, Suspense, useEffect, useRef, useState, type ComponentProps } from 'react'

// Leaflet is only needed where a map is on screen, so the map loads in its own
// chunk once its box scrolls near the viewport. The placeholder is the same
// empty .bmap box the map draws into, so the layout does not move.
const Inner = lazy(() => import('./MapView').then((m) => ({ default: m.MapView })))

export function MapView(props: ComponentProps<typeof Inner>) {
  const box = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    if (near || !box.current) return
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setNear(true) }, { rootMargin: '400px' })
    io.observe(box.current)
    return () => io.disconnect()
  }, [near])
  const placeholder = <div ref={box} className="bmap" />
  return near ? <Suspense fallback={placeholder}><Inner {...props} /></Suspense> : placeholder
}
