import { lazy, useState, type ComponentType, type ReactElement } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Props<C> = C extends ComponentType<infer P> ? P : never

// page wraps a page module so it loads in its own chunk. Calling preload()
// starts the download early; once it has arrived the page renders directly,
// without suspending, so the first screen is not held back by React's
// Suspense reveal delay.
export function page<M, K extends keyof M = 'default' & keyof M>(load: () => Promise<M>, key?: K) {
  let Comp: ComponentType<any> | null = null
  let p: Promise<void> | null = null
  const preload = () => (p ??= load().then(
    (m) => { Comp = m[(key ?? 'default') as K] as ComponentType<any> },
    (e) => { p = null; throw e },
  ))
  const Lazy = lazy(() => preload().then(() => ({ default: Comp! })))
  function Page(props: Props<M[K]>) {
    // Decided once per mount so the element type never changes under it.
    const [direct] = useState(() => !!Comp)
    return direct && Comp ? <Comp {...(props as object)} /> : <Lazy {...(props as object)} />
  }
  return Object.assign(Page, { preload })
}

// preloadFor finds the page inside a route element (for example
// <Private><Home /></Private>) and returns its preload, if it has one.
export function preloadFor(el: unknown): (() => Promise<unknown>) | undefined {
  for (let e = el as ReactElement<{ children?: unknown }> | undefined; e && typeof e === 'object' && 'type' in e; e = e.props.children as typeof e) {
    const pre = (e.type as { preload?: () => Promise<unknown> }).preload
    if (pre) return pre
  }
  return undefined
}
