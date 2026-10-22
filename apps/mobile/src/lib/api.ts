// Thin client for the NURU Go API, mirroring apps/web/src/api.ts.
// The session token is kept in memory and persisted with expo-secure-store.
import { getItem, setItem } from './storage'

const DEFAULT_API = 'https://web-production-fd530.up.railway.app/api'
export const BASE = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API).replace(/\/$/, '')
const TOKEN_KEY = 'nuru.token'

export class ApiError extends Error {
  status: number
  data: Record<string, unknown>
  constructor(status: number, message: string, data: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.data = data
  }
}

let current = ''
let onExpired: (() => void) | null = null

export const token = () => current
export async function loadToken() {
  current = (await getItem(TOKEN_KEY)) || ''
  return current
}
export async function setToken(t: string) {
  current = t
  await setItem(TOKEN_KEY, t || null)
}
/** Called when the API answers 401 for a signed in user. */
export function onSessionExpired(fn: () => void) { onExpired = fn }

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method: opts.method || (opts.body ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json', ...(current ? { Authorization: 'Bearer ' + current } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Could not reach NURU. Check your connection and try again.')
  }
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && current) {
    await setToken('')
    onExpired?.()
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
  let res: Response
  try {
    res = await fetch(BASE + '/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(current ? { Authorization: 'Bearer ' + current } : {}) },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Could not reach NURU. Check your connection and try again.')
  }
  // a server without streaming yet answers the plain way
  if (res.status === 404 || res.status === 405) return api<ChatReply>('/chat', { body })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    if (res.status === 401 && current) { await setToken(''); onExpired?.() }
    throw new ApiError(res.status, (data as { error?: string }).error || 'Something went wrong', data as Record<string, unknown>)
  }
  let soFar = ''
  let reply: ChatReply | null = null
  const take = (line: string) => {
    if (!line.trim() || reply) return
    let msg: { delta?: string; done?: ChatReply; error?: string }
    try { msg = JSON.parse(line) } catch { return }
    if (msg.error) throw new ApiError(502, msg.error)
    if (msg.done) reply = msg.done
    else if (msg.delta) { soFar += msg.delta; onText(soFar) }
  }
  const reader = typeof TextDecoder !== 'undefined' ? res.body?.getReader() : undefined
  if (!reader) {
    // no streaming here: read the whole answer at once
    ;(await res.text()).split('\n').forEach(take)
  } else {
    const dec = new TextDecoder()
    let buf = ''
    while (!reply) {
      const { done, value } = await reader.read()
      if (value) buf += dec.decode(value, { stream: true })
      let nl
      while (!reply && (nl = buf.indexOf('\n')) >= 0) {
        take(buf.slice(0, nl))
        buf = buf.slice(nl + 1)
      }
      if (done) { take(buf); break }
    }
    reader.cancel().catch(() => {})
  }
  if (!reply) throw new ApiError(502, 'NURU could not answer, try again')
  return reply
}

export type Lang = 'en' | 'yo' | 'ig' | 'ha'
export type ThemePref = 'light' | 'dark' | 'system'
export type User = {
  id: string; name: string; email: string; phone: string; role: 'customer' | 'staff'
  language: Lang; theme: ThemePref; currency: string
  business_name: string; business_type: string; has_pin: boolean; kyc_verified: boolean
}
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

// Types for endpoints the web app types inline.
export type Reminder = { id: string; title: string; kind: string; amount: number; due_at: string; done: boolean }
export type Budget = { id: string; category: string; limit: number; spent: number; pct: number }
export type Budgets = { categories: string[]; days_left: number; items: Budget[]; limit: number; month: string; spent: number }
export type Goal = { id: string; name: string; note: string; icon: string; target: number; saved: number; pct: number; due_at: string; auto_amount: number; auto_day: number; monthly_needed: number }
export type Note = { id: string; kind: string; tone: string; icon: string; title: string; body: string; amount: number; link: string; read: boolean; at: string }
export type Security = { has_pin: boolean; face_enrolled: boolean; tries_left: number; locked_until?: string }
export type Health = { change: number; label: string; score: number; since: string; tip: string; parts: { key: string; name: string; detail: string; score: number; weight: number }[] }
export type Receipt = { id?: string; reference: string; amount: number; to: string; at?: string; session_id?: string; fee?: number }
export type Prefs = { save_chats?: boolean; login_alerts?: boolean; insights?: boolean; improve?: boolean; [k: string]: unknown }
export type Business = {
  name: string; account: string; cash: number; runway_days: number; overdue: number; overdue_count: number; payroll: number
  enabled: boolean; monthly: { month: string; sales: number; costs: number; profit: number }[]
  advertising: { channel: string; spend: number }[]
  staff: { id: string; name: string; role?: string; gross: number; net: number }[]
  payroll_due?: { amount: number; due_at: string; paid_at: string | null }
}
