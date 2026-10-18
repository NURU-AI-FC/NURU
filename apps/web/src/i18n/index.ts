// UI strings, one file per language so each reviewer edits only their own.
import type { Lang } from '../api'
import en, { suggestions as enS, type Dict } from './en'
import ha, { suggestions as haS } from './ha'
import ig, { suggestions as igS } from './ig'
import yo, { suggestions as yoS } from './yo'

const dicts: Record<Lang, Partial<Dict>> = { en, yo, ig, ha }
export type Key = keyof Dict
export const langNames: Record<Lang, string> = { en: 'English', yo: 'Yorùbá', ig: 'Igbo', ha: 'Hausa' }
export const translate = (lang: Lang) => (k: Key) => dicts[lang]?.[k] ?? en[k]
export const suggestions: Record<Lang, string[]> = { en: enS, yo: yoS, ig: igS, ha: haS }
