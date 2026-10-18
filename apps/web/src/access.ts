import type { User } from './api'

// Which areas each staff sub-role can open. This mirrors hqAreas and
// consoleAreas in services/api/internal/httpapi/access.go; the API enforces
// it, the web app only uses it to hide what someone cannot open.
const HQ: Record<string, string[]> = {
  overview: ['owner', 'ops', 'analyst'],
  health: ['owner', 'ops', 'engineer'],
  support: ['owner', 'ops', 'support'],
  emails: ['owner', 'ops', 'analyst'],
  team: ['owner'],
}
const CONSOLE: Record<string, string[]> = {
  overview: ['viewer', 'analyst', 'campaigns', 'risk', 'admin'],
  segments: ['viewer', 'analyst', 'campaigns', 'risk', 'admin'],
  customers: ['analyst', 'admin'],
  export: ['analyst', 'admin'],
  campaigns: ['campaigns', 'admin'],
  approve: ['admin'],
  risk: ['risk', 'admin'],
  data: ['risk', 'admin'],
  team: ['admin'],
}

export const HQ_ROLES: Record<string, string> = { owner: 'CEO · Owner', ops: 'Operations', support: 'Support', engineer: 'Engineer', analyst: 'Analyst' }
export const CONSOLE_ROLES: Record<string, string> = { viewer: 'Viewer', analyst: 'Insights analyst', campaigns: 'Campaign manager', risk: 'Risk officer', admin: 'Console admin' }

export function canHQ(user: User | null, area: string) {
  return !!user && user.role === 'hq' && (HQ[area] || []).includes(user.hq_role || '')
}
export function canConsole(user: User | null, area: string) {
  return !!user && user.role === 'staff' && (CONSOLE[area] || []).includes(user.console_role || '')
}

// homeFor is where someone lands after signing in.
export function homeFor(user: User) {
  if (user.role === 'staff') return '/console'
  if (user.role === 'hq') return firstHQ(user)
  return '/'
}

const HQ_PATHS: [string, string][] = [['overview', '/hq'], ['health', '/hq/health'], ['support', '/hq/support'], ['emails', '/hq/emails'], ['team', '/hq/team']]
export function firstHQ(user: User) {
  return HQ_PATHS.find(([a]) => canHQ(user, a))?.[1] || '/hq'
}
