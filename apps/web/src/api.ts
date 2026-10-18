// Thin client for the NURU Go API. The token lives in sessionStorage so it
// is gone when the tab closes; nothing else sensitive is stored in the browser.
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api'

export class ApiError extends Error {
  status: number
  data: Record<string, unknown>
  constructor(status: number, message: string, data: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.data = data
  }
}

export function token() {
  try { return sessionStorage.getItem('nuru.token') || '' } catch { return '' }
}
export function setToken(t: string) {
  try { t ? sessionStorage.setItem('nuru.token', t) : sessionStorage.removeItem('nuru.token') } catch { /* private mode */ }
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: 'Bearer ' + token() } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && token()) {
    setToken('')
    location.assign('/login')
  }
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error || 'Something went wrong', data as Record<string, unknown>)
  return data as T
}

export type User = {
  id: string; name: string; email: string; phone: string; role: 'customer' | 'staff' | 'hq'
  language: Lang; theme: 'light' | 'dark' | 'system'; currency: string
  business_name: string; business_type: string; has_pin: boolean; kyc_verified: boolean
  hq_role?: string; console_role?: string
}
export type Lang = 'en' | 'yo' | 'ig' | 'ha'
export type Account = { id: string; bank: string; name: string; number: string; kind: string; balance: number; linked_via: string }
export type Tx = { id: string; account: string; direction: 'credit' | 'debit'; amount: number; category: string; merchant: string; narration: string; at: string }
export type Cat = { category: string; amount: number }
export type Summary = { period: string; in: number; out: number; categories: Cat[]; series: { label: string; in: number; out: number }[]; prev_out: number }
export type Compare = { month: string; weeks: number[]; total: number; in: number }[]
export type Forecast = { daily_spend: number; end: number; lowest: number; points: { label: string; balance: number }[] }
export type Insight = { kind: string; tone: string; title: string; body: string; amount: number }
export type Chart = { type: 'bar' | 'line' | 'donut'; title: string; labels: string[]; series: { name: string; values: number[] }[] }
export type ChatAction = { kind: string; label: string; amount?: number; to?: string; payee?: string; note?: string; title?: string; due?: string; new?: boolean }
export type PendingTx = { id: string; direction: 'credit' | 'debit'; amount: number; merchant: string; account: string; at: string }
export type Pending = { items: PendingTx[]; count: number }
export type Payee = { id: string; name: string; bank: string; account: string; tag?: string; starred?: boolean; times?: number }
export type Source = { type: string; label: string; detail: string }
export type ChatReply = { answer: string; blocked: string; chart: Chart | null; actions: ChatAction[]; sources?: Source[]; thread?: string }
export type ChatMsg = { role: 'user' | 'assistant'; content: string; lang: Lang; at: string; chart?: Chart | null; actions?: ChatAction[]; blocked?: string; sources?: Source[]; thread?: string }
export type Thread = { id: string; title: string; lang: Lang; started_at: string; at: string; messages: number; blocked: number }
