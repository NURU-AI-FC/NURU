import type { IconName } from '../ui/iconPaths'

const SYM: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' }

/** naira formats an amount the way the design does: ₦812,450 */
export function money(v: number, opts: { sign?: boolean; compact?: boolean; cur?: string; rate?: number; dp?: number } = {}) {
  const cur = opts.cur || 'NGN'
  const amt = cur === 'NGN' ? v : v * (opts.rate ?? 1)
  const abs = Math.abs(amt)
  const dp = opts.dp ?? (cur === 'NGN' ? 0 : 2)
  let s: string
  if (opts.compact && abs >= 1000) s = abs >= 1e6 ? (abs / 1e6).toFixed(abs >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'm' : Math.round(abs / 1000) + 'k'
  else s = group(abs, dp)
  const sign = amt < 0 ? '−' : opts.sign ? '+' : ''
  return sign + (SYM[cur] || cur + ' ') + s
}

// group adds thousands separators without relying on Intl, which Hermes on
// older Android builds only partly supports.
function group(n: number, dp: number) {
  const [i, f] = n.toFixed(dp).split('.')
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f ? '.' + f : '')
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function clock(d: Date) {
  let h = d.getHours()
  const m = d.getMinutes()
  const ap = h >= 12 ? 'pm' : 'am'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ap}`
}

export const shortDate = (at: string | Date) => { const d = new Date(at); return `${d.getDate()} ${MONTHS[d.getMonth()]}` }
export const dayName = (at: string | Date) => DAYS[new Date(at).getDay()]
export const monthName = (d = new Date()) => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()]

/** when renders "Today 7:42 pm", "Yesterday" or "14 Oct". */
export function when(at: string) {
  const d = new Date(at)
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (d.getTime() >= start) return 'Today ' + clock(d)
  if (d.getTime() >= start - 864e5) return 'Yesterday'
  return shortDate(d)
}

export function dueLabel(at: string) {
  const d = new Date(at)
  const days = Math.ceil((d.getTime() - Date.now()) / 864e5)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return dayName(d)
  return shortDate(d)
}

export const initials = (name: string) => name.split(/[\s,()]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

export function greeting(d = new Date()): 'morning' | 'afternoon' | 'evening' {
  const h = d.getHours()
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}

const CAT_ICON: Record<string, IconName> = {
  food: 'food', groceries: 'cart', transport: 'car', shopping: 'cart', bills: 'zap', 'data and power': 'wifi',
  family: 'heart', entertainment: 'tv', subscriptions: 'tv', salary: 'briefcase', income: 'briefcase', rent: 'building',
  health: 'heart', education: 'grad', savings: 'target', transfer: 'send', airtime: 'phone', other: 'more',
}
export const catIcon = (c: string): IconName => CAT_ICON[c.toLowerCase()] || 'receipt'

export type Tone = 'red' | 'gray' | 'green' | 'amber' | 'blue'
const CAT_TONE: Record<string, Tone> = { food: 'red', shopping: 'amber', groceries: 'amber', bills: 'blue', 'data and power': 'blue', family: 'red', salary: 'green', income: 'green' }
export const catTone = (c: string): Tone => CAT_TONE[c.toLowerCase()] || 'gray'

/** Avatar colours used for people in the design. */
const AV = ['#141416', '#E30613', '#1D4ED8', '#15803D', '#7C3AED', '#B45309', '#3F3F46']
export const avatarColor = (name: string) => AV[[...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % AV.length]
