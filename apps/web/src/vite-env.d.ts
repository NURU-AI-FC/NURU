/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SENTRY_ENVIRONMENT?: string
  readonly VITE_RELEASE?: string
  readonly VITE_BANK_NAME?: string
  readonly VITE_BANK_BRAND?: string
  readonly VITE_BANK_PHONE?: string
  readonly VITE_BANK_STAFF_DOMAIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
