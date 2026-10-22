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

/**
 * chat asks NURU a question and calls onText with the answer so far while it
 * is being written. Resolves with the full reply, which may differ from the
 * streamed text when the answer checks replaced it.
 */
export async function chat(body: { message: string; lang: Lang; thread?: string }, onText: (soFar: string) => void): Promise<ChatReply> {
  const res = await fetch(BASE + '/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: 'Bearer ' + token() } : {}) },
    body: JSON.stringify(body),
  })
  // a server without streaming yet answers the plain way
  if (res.status === 404 || res.status === 405 || !res.body) return api<ChatReply>('/chat', { body })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    if (res.status === 401 && token()) { setToken(''); location.assign('/login') }
    throw new ApiError(res.status, (data as { error?: string }).error || 'Something went wrong', data as Record<string, unknown>)
  }
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  let soFar = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (value) buf += dec.decode(value, { stream: true })
    let nl
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (!line) continue
      let msg: { delta?: string; done?: ChatReply; error?: string }
      try { msg = JSON.parse(line) } catch { continue }
      if (msg.done) return msg.done
      if (msg.error) throw new ApiError(502, msg.error, {})
      if (msg.delta) { soFar += msg.delta; onText(soFar) }
    }
    if (done) throw new ApiError(502, 'NURU could not answer, try again', {})
  }
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
export type ChatReply = { answer: string; blocked: string; chart: Chart | null; actions: ChatAction[]; sources?: Source[]; thread?: string; lang?: Lang }
export type ChatMsg = { role: 'user' | 'assistant'; content: string; lang: Lang; at: string; chart?: Chart | null; actions?: ChatAction[]; blocked?: string; sources?: Source[]; thread?: string }
export type Thread = { id: string; title: string; lang: Lang; started_at: string; at: string; messages: number; blocked: number }
