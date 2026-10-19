// Error reporting with Sentry. It only loads when VITE_SENTRY_DSN was set at
// build time, so builds without it ship none of the SDK.
type SentryModule = typeof import('@sentry/react')

const dsn = import.meta.env.VITE_SENTRY_DSN
let sentry: SentryModule | null = null

export function initSentry() {
  if (!dsn) return
  import('@sentry/react').then((S) => {
    S.init({
      dsn,
      release: import.meta.env.VITE_RELEASE || undefined,
      environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
      sendDefaultPii: false,
      tracesSampleRate: 0,
    })
    S.setTag('service', 'web')
    sentry = S
  }).catch(() => { /* reporting is best effort */ })
}

// reportError is wired to React's root error hooks.
export function reportError(error: unknown, info?: { componentStack?: string }) {
  console.error(error)
  sentry?.captureException(error, info?.componentStack ? { contexts: { react: { componentStack: info.componentStack } } } : undefined)
}
