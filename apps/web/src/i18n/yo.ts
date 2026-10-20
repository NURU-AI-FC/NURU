// Yorùbá UI strings, owned by the Yorùbá reviewer in docs/TEAM.md.
// Missing keys fall back to English.
import type { Dict } from './en'

const yo: Partial<Dict> = {
  home: 'Ilé', insights: 'Òye', ask: 'Bi NURU', pay: 'Sanwó àti fi ránṣẹ́', money: 'Gbèsè àti ìfowópamọ́',
  business: 'Iṣẹ́ òwò', planner: 'Ètò', settings: 'Ètò àkáǹtì', logout: 'Jáde',
  newChat: 'Ìjíròrò tuntun pẹ̀lú NURU', recent: 'Ìjíròrò àìpẹ́', search: 'Wá tàbí bi NURU',
  morning: 'Ẹ káàárọ̀', afternoon: 'Ẹ káàsán', evening: 'Ẹ kúrọ̀lẹ́',
  linked: 'àkáǹtì tí a so pọ̀', totalBalance: 'Gbogbo owó', spentIn: 'Ohun tí o ná ní', savedMonth: 'Ìfowópamọ́ oṣù yìí', nextBill: 'Owó tó kàn',
  thisWeek: 'ọ̀sẹ̀ yìí', spending3: 'Ìnáwó oṣù mẹ́ta', whereWent: 'Ibi tí owó lọ', recentTx: 'Ìṣòwò àìpẹ́', seeAll: 'Wo gbogbo',
  moneyIn: 'Owó wọlé', moneyOut: 'Owó jáde', askPlaceholder: 'Bèèrè nípa owó rẹ…', send: 'Fi ránṣẹ́', suggestions: 'Gbìyànjú bíbéèrè',
  enterPin: 'Tẹ PIN rẹ', confirm: 'Jẹ́rìí', loans: 'Gbèsè', reminders: 'Ìránnilétí', appearance: 'Ìrísí', language: 'Èdè',
  light: 'Ìmọ́lẹ̀', dark: 'Òkùnkùn', system: 'Ẹ̀rọ', security: 'Ààbò', save: 'Fipamọ́', login: 'Wọlé', signup: 'Ṣí àkáǹtì',
  email: 'Ímeèlì', password: 'Ọ̀rọ̀ aṣínà', verify: 'Jẹ́rìí', otpTitle: 'Tẹ kóòdù náà',
  assistantTitle: 'NURU wà ní ìkáwọ́ rẹ', assistantAsk: 'Kí ni o fẹ́ mọ̀ nípa owó rẹ?',
}
export default yo

export const suggestions = ['Ibo ni owó mi lọ lóṣù yìí?', 'Fi oṣù mẹ́ta tó kọjá wé ara wọn', 'Ṣé owó mi yóò tó títí òpin oṣù?']
