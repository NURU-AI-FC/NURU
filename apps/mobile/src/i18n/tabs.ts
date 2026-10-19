// Short tab bar labels. The shared dictionaries have longer page titles
// ("Pay and transfer") that do not fit a 64 point tab.
import type { Lang } from '../lib/api'

export const tabLabels: Record<Lang, { home: string; insights: string; ask: string; pay: string }> = {
  en: { home: 'Home', insights: 'Insights', ask: 'Ask NURU', pay: 'Pay' },
  yo: { home: 'Ilé', insights: 'Òye', ask: 'Bi NURU', pay: 'Sanwó' },
  ig: { home: 'Ụlọ', insights: 'Nghọta', ask: 'Jụọ NURU', pay: 'Kwụọ' },
  ha: { home: 'Gida', insights: 'Bayani', ask: 'Tambayi NURU', pay: 'Biya' },
}
