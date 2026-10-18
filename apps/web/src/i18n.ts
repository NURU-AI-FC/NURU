// UI strings in English, Yorùbá, Igbo and Hausa. The language owners in
// docs/TEAM.md review these; missing keys fall back to English.
import type { Lang } from './api'

const en = {
  home: 'Home', insights: 'Insights', ask: 'Ask NURU', pay: 'Pay and transfer', money: 'Loans and savings',
  business: 'Business', planner: 'Planner', settings: 'Settings', console: 'Bank console', logout: 'Sign out',
  newChat: 'New chat with NURU', recent: 'Recent chats', search: 'Search or ask NURU',
  morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening',
  linked: 'linked accounts', totalBalance: 'Total balance', spentIn: 'Spent in', savedMonth: 'Saved this month', nextBill: 'Next bill',
  thisWeek: 'this week', lessThan: 'less than', moreThan: 'more than', ofIncome: 'of income',
  spending3: 'Spending, last 3 months', eachWeek: 'Each week of', whereWent: 'Where it went',
  recentTx: 'Recent transactions', seeAll: 'See all', name: 'Name', category: 'Category', date: 'Date', amount: 'Amount', account: 'Account',
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly',
  moneyIn: 'Money in', moneyOut: 'Money out', net: 'Net', forecast: 'Next 30 days', heat: 'When you spend',
  askPlaceholder: 'Ask about your money…', send: 'Send', listening: 'Listening…', privateChat: 'Chats are encrypted and only you can read them.',
  suggestions: 'Try asking', clear: 'Clear chat',
  from: 'From', to: 'Recipient name', bank: 'Bank', accountNo: 'Account number', note: 'Note', continue: 'Continue',
  enterPin: 'Enter your transaction PIN', confirm: 'Confirm', sent: 'Sent', convert: 'Currency converter', rate: 'Rate',
  loans: 'Loans', investments: 'Investments and pension', nextPayment: 'Next payment', balanceLeft: 'Balance left', interest: 'Interest',
  disbursed: 'Disbursed', paid: 'paid', growth: 'Growth', contributed: 'Contributed',
  staff: 'Staff and salaries', payroll: 'Monthly payroll', runway: 'Cash runway', days: 'days', sales: 'Sales', costs: 'Costs', profit: 'Profit',
  advertising: 'Advertising', funding: 'Funding and insurance', cash: 'Business cash',
  reminders: 'Reminders', addReminder: 'Add reminder', title: 'Title', due: 'Due', add: 'Add',
  appearance: 'Appearance', light: 'Light', dark: 'Dark', system: 'System', language: 'Language', currency: 'Display currency',
  security: 'Security', setPin: 'Set transaction PIN', changePin: 'Change PIN', verifyId: 'Verify BVN or NIN', verified: 'Verified',
  passkey: 'Passkey', face: 'Face check', save: 'Save', saved: 'Saved',
  login: 'Sign in', signup: 'Create account', email: 'Email', password: 'Password', fullName: 'Full name', phone: 'Phone',
  haveBiz: 'I also run a business', otpTitle: 'Enter the code', otpSent: 'We sent a 6 digit code to', verify: 'Verify',
  demo: 'Judges: use the demo account', noAccount: 'New to NURU?', haveAccount: 'Already have an account?',
}
type Dict = typeof en

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
}
const ig: Partial<Dict> = {
  home: 'Ụlọ', insights: 'Nghọta', ask: 'Jụọ NURU', pay: 'Kwụọ na zipu', money: 'Mbinye ego na nchekwa',
  business: 'Azụmahịa', planner: 'Atụmatụ', settings: 'Ntọala', logout: 'Pụọ',
  newChat: 'Mkparịta ụka ọhụrụ na NURU', recent: 'Mkparịta ụka na nso', search: 'Chọọ ma ọ bụ jụọ NURU',
  morning: 'Ụtụtụ ọma', afternoon: 'Ehihie ọma', evening: 'Mgbede ọma',
  linked: 'akaụntụ ejikọrọ', totalBalance: 'Ego niile', spentIn: 'Ego emefuru na', savedMonth: 'Echekwara n\'ọnwa a', nextBill: 'Ụgwọ na-esote',
  thisWeek: 'izu a', spending3: 'Mmefu ọnwa atọ', whereWent: 'Ebe ego gara', recentTx: 'Azụmahịa na nso', seeAll: 'Hụ niile',
  moneyIn: 'Ego batara', moneyOut: 'Ego pụrụ', askPlaceholder: 'Jụọ maka ego gị…', send: 'Ziga', suggestions: 'Gbalịa ịjụ',
  enterPin: 'Tinye PIN gị', confirm: 'Kwado', loans: 'Mbinye ego', reminders: 'Ncheta', appearance: 'Ọdịdị', language: 'Asụsụ',
  light: 'Ìhè', dark: 'Ọchịchịrị', system: 'Sistemụ', security: 'Nchekwa', save: 'Chekwaa', login: 'Banye', signup: 'Mepee akaụntụ',
  email: 'Email', password: 'Okwuntughe', verify: 'Nyochaa', otpTitle: 'Tinye koodu',
}
const ha: Partial<Dict> = {
  home: 'Gida', insights: 'Bayanai', ask: 'Tambayi NURU', pay: 'Biya da aikawa', money: 'Bashi da ajiya',
  business: 'Kasuwanci', planner: 'Tsari', settings: 'Saituna', logout: 'Fita',
  newChat: 'Sabuwar hira da NURU', recent: 'Hirarraki na kwanan nan', search: 'Nema ko tambayi NURU',
  morning: 'Barka da safiya', afternoon: 'Barka da rana', evening: 'Barka da yamma',
  linked: 'asusun da aka haɗa', totalBalance: 'Jimillar kuɗi', spentIn: 'Kashewa a', savedMonth: 'Ajiyar wannan wata', nextBill: 'Biyan gaba',
  thisWeek: 'wannan mako', spending3: 'Kashewa, watanni 3', whereWent: 'Inda kuɗi ya tafi', recentTx: 'Mu\'amaloli na baya', seeAll: 'Duba duka',
  moneyIn: 'Kuɗin shiga', moneyOut: 'Kuɗin fita', askPlaceholder: 'Tambaya game da kuɗinka…', send: 'Aika', suggestions: 'Gwada tambaya',
  enterPin: 'Shigar da PIN ɗinka', confirm: 'Tabbatar', loans: 'Bashi', reminders: 'Tunatarwa', appearance: 'Kamanni', language: 'Harshe',
  light: 'Haske', dark: 'Duhu', system: 'Na\'ura', security: 'Tsaro', save: 'Ajiye', login: 'Shiga', signup: 'Buɗe asusu',
  email: 'Imel', password: 'Kalmar sirri', verify: 'Tabbatar', otpTitle: 'Shigar da lambar',
}

const dicts: Record<Lang, Partial<Dict>> = { en, yo, ig, ha }
export type Key = keyof Dict
export const langNames: Record<Lang, string> = { en: 'English', yo: 'Yorùbá', ig: 'Igbo', ha: 'Hausa' }
export const translate = (lang: Lang) => (k: Key) => dicts[lang]?.[k] ?? en[k]

export const suggestions: Record<Lang, string[]> = {
  en: ['Where did my money go this month?', 'Compare my last 3 months', 'Will I have enough at month end?', 'What subscriptions do I pay for?', 'How is my business doing?'],
  yo: ['Ibo ni owó mi lọ lóṣù yìí?', 'Fi oṣù mẹ́ta tó kọjá wé ara wọn', 'Ṣé owó mi yóò tó títí òpin oṣù?'],
  ig: ['Ebe ole ka ego m gara n\'ọnwa a?', 'Tụnyere ọnwa atọ gara aga', 'Ego m ga-ezu ruo ngwụcha ọnwa?'],
  ha: ['Ina kuɗina ya tafi a wannan wata?', 'Kwatanta watanni uku da suka wuce', 'Kuɗina zai isa har ƙarshen wata?'],
}
