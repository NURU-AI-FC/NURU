// Holds the sign in / sign up form between the form screen and the OTP screen,
// so the password never travels in a route parameter.
export type AuthForm = { name: string; email: string; phone: string; password: string; business: boolean }
type Flow = { mode: 'login' | 'signup'; form: AuthForm; hint: string }

let flow: Flow | null = null
export const setFlow = (f: Flow) => { flow = f }
export const getFlow = () => flow
export const clearFlow = () => { flow = null }

export const DEMO = { email: 'judge@nuru.app', password: 'Zecathon-2026', code: '000000' }

export const PASSWORD_RULES: [string, (p: string) => boolean][] = [
  ['At least 12 characters', (p) => p.length >= 12],
  ['One number and one symbol', (p) => /\d/.test(p) && /[^A-Za-z0-9]/.test(p)],
  ['Upper and lower case', (p) => /[a-z]/.test(p) && /[A-Z]/.test(p)],
]
