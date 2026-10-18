export type Slip = { id: string; name: string; role: string; gross: number; basic: number; housing: number; transport: number; paye: number; pension: number; nhf: number; net: number; employer_pension: number }

export type Biz = {
  enabled: boolean; name: string; type: string; rc: string; customers: string; staff_count: number; monthly_sales: number; account: string
  cash: number; runway_days: number; payroll: number
  staff: { id: string; name: string; role: string; gross: number; paye: number; pension: number; nhf: number; net: number }[]
  monthly: { month: string; sales: number; costs: number; profit: number }[]
  advertising: { channel: string; spend: number }[]
  unpaid: number; unpaid_count: number; overdue: number; overdue_count: number
  payroll_due: { amount: number; due_at: string; paid_at: string | null }
}

export const AV = ['var(--c1)', 'var(--blue)', 'var(--green)', 'var(--amber)', 'var(--c7)', 'var(--c6)']
export const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('')

// Last full month, or the current one if there is no history yet.
export const lastFull = (b: Biz) => b.monthly[b.monthly.length - 2] || b.monthly[b.monthly.length - 1] || { month: '', sales: 0, costs: 0, profit: 0 }
