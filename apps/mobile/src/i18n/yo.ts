// Yorùbá UI strings, owned by the Yorùbá reviewer in docs/TEAM.md.
// Missing keys fall back to English.
import type { Dict } from './en'

const yo: Partial<Dict> = {
  home: 'Ilé', insights: 'Òye', ask: 'Bi NURU', pay: 'Sanwó àti fi ránṣẹ́', money: 'Gbèsè àti ìfowópamọ́',
  business: 'Iṣẹ́ òwò', planner: 'Ètò', branches: 'Ẹ̀ka báǹkì', settings: 'Ètò àkáǹtì', console: 'Ojú-iṣẹ́ báǹkì', logout: 'Jáde',
  newChat: 'Ìjíròrò tuntun pẹ̀lú NURU', recent: 'Ìjíròrò àìpẹ́', search: 'Wá tàbí bi NURU',
  morning: 'Ẹ káàárọ̀', afternoon: 'Ẹ káàsán', evening: 'Ẹ kúrọ̀lẹ́',
  linked: 'àkáǹtì tí a so pọ̀', totalBalance: 'Gbogbo owó', spentIn: 'Ohun tí o ná ní', savedMonth: 'Ìfowópamọ́ oṣù yìí', nextBill: 'Owó tó kàn',
  thisWeek: 'ọ̀sẹ̀ yìí', lessThan: 'kéré sí', moreThan: 'ju', ofIncome: 'nínú owó tí o ń gbà',
  spending3: 'Ìnáwó oṣù mẹ́ta', eachWeek: 'Ọ̀sẹ̀ kọ̀ọ̀kan nínú', whereWent: 'Ibi tí owó lọ',
  recentTx: 'Ìṣòwò àìpẹ́', seeAll: 'Wo gbogbo', name: 'Orúkọ', category: 'Ẹ̀ka', date: 'Ọjọ́', amount: 'Iye owó', account: 'Àkáǹtì',
  daily: 'Ojoojúmọ́', weekly: 'Ọ̀sọ̀ọ̀sẹ̀', monthly: 'Oṣooṣù', yearly: 'Ọdọọdún',
  moneyIn: 'Owó wọlé', moneyOut: 'Owó jáde', net: 'Àṣẹ́kù', forecast: 'Ọgbọ̀n ọjọ́ tó ń bọ̀', heat: 'Ìgbà tí o ń náwó',
  askPlaceholder: 'Bèèrè nípa owó rẹ…', send: 'Fi ránṣẹ́', listening: 'Mo ń gbọ́…', privateChat: 'Ìjíròrò rẹ wà ní àṣírí, ìwọ nìkan ló lè kà á.',
  suggestions: 'Gbìyànjú bíbéèrè', clear: 'Pa ìjíròrò rẹ́',
  from: 'Láti', to: 'Orúkọ ẹni tí yóò gbà á', bank: 'Báǹkì', accountNo: 'Nọ́mbà àkáǹtì', note: 'Àkọsílẹ̀', continue: 'Tẹ̀síwájú',
  enterPin: 'Tẹ PIN ìsanwó rẹ', confirm: 'Jẹ́rìí', sent: 'Ó ti lọ', convert: 'Ìpààrọ̀ owó ilẹ̀ òkèèrè', rate: 'Ìwọ̀n',
  loans: 'Gbèsè', investments: 'Ìdókòwò àti owó ìfẹ̀yìntì', nextPayment: 'Ìsanwó tó kàn', balanceLeft: 'Iye tó ṣẹ́ kù', interest: 'Èlé',
  disbursed: 'Owó tí a fún ọ', paid: 'ti san', growth: 'Ìdàgbàsókè', contributed: 'Iye tí o ti dá',
  staff: 'Òṣìṣẹ́ àti owó-oṣù', payroll: 'Owó-oṣù òṣìṣẹ́', runway: 'Ìgbà tí owó yóò tó', days: 'ọjọ́', sales: 'Ọjà tí a tà', costs: 'Ìnáwó', profit: 'Èrè',
  advertising: 'Ìpolówó', funding: 'Owó ìrànwọ́ àti ìbánigbófò', cash: 'Owó iṣẹ́ òwò',
  reminders: 'Ìránnilétí', addReminder: 'Ṣe ìránnilétí', title: 'Àkọlé', due: 'Ọjọ́ ìsanwó', add: 'Fi kún un',
  appearance: 'Ìrísí', light: 'Ìmọ́lẹ̀', dark: 'Òkùnkùn', system: 'Ẹ̀rọ', language: 'Èdè', currency: 'Owó tí a ó fi hàn',
  security: 'Ààbò', setPin: 'Ṣe PIN ìsanwó', changePin: 'Yí PIN padà', verifyId: 'Jẹ́rìí BVN tàbí NIN', verified: 'A ti jẹ́rìí rẹ̀',
  passkey: 'Kọ́kọ́rọ́ ìwọlé', face: 'Àyẹ̀wò ojú', save: 'Fipamọ́', saved: 'A ti fi pamọ́',
  login: 'Wọlé', signup: 'Ṣí àkáǹtì', email: 'Ímeèlì', password: 'Ọ̀rọ̀ aṣínà', fullName: 'Orúkọ rẹ ní kíkún', phone: 'Fóònù',
  haveBiz: 'Mo tún ní iṣẹ́ òwò', otpTitle: 'Tẹ kóòdù náà', otpSent: 'A ti fi kóòdù oní-nọ́mbà mẹ́fà ránṣẹ́ sí', verify: 'Jẹ́rìí',
  demo: 'Adájọ́: ẹ lo àkáǹtì àyẹ̀wò', noAccount: 'Ṣé o jẹ́ tuntun sí NURU?', haveAccount: 'Ṣé o ti ní àkáǹtì?',
  overview: 'Àkópọ̀', bills: 'Owó ìsanwó', whereSpend: 'Ibi tí o ti ń náwó', healthScore: 'Ìlera owó rẹ', budgets: 'Ìṣúná', goals: 'Àfojúsùn', report: 'Ìròyìn oṣù',
  calendar: 'Kàlẹ́ńdà', budget: 'Ìṣúná', savingsGoal: 'Àfojúsùn ìfowópamọ́', monthlyPlan: 'Ètò oṣù', weeklyRecap: 'Àkópọ̀ ọ̀sẹ̀', newGoal: 'Àfojúsùn tuntun', newBudget: 'Ìṣúná tuntun',
  connectedAccounts: 'Àkáǹtì tí a so pọ̀', historyTitle: 'Ìtàn ìṣòwò', txTitle: 'Ìṣòwò', notificationsTitle: 'Ìfitónilétí',
  notifySettingsTitle: 'Ètò ìfitónilétí', alertTitle: 'Ìkìlọ̀', profileTitle: 'Nípa mi', searchTitle: 'Wá',
  hideBalance: 'Bo iye owó mọ́', showBalance: 'Fi iye owó hàn', netWorth: 'Gbogbo ohun ìní', linkAnother: 'So àkáǹtì mìíràn pọ̀',
  linkBank: 'So àkáǹtì báǹkì pọ̀', tryDemoBank: 'Lo báǹkì àyẹ̀wò dípò', connectFirst: 'So àkáǹtì àkọ́kọ́ rẹ pọ̀',
  searchTx: 'Wá ìṣòwò', askAboutThis: 'Bi NURU nípa èyí', reportProblem: 'Sọ ìṣòro kan', markAllRead: 'Sàmì sí gbogbo rẹ̀ pé o ti kà á',
  loadMore: 'Fi púpọ̀ sí i hàn', noMatches: 'Kò sí ohun tó bá a mu síbẹ̀', memberSince: 'Ọmọ ẹgbẹ́ láti', editProfile: 'Ṣàtúnṣe ìwífún rẹ',
  languageVoice: 'Èdè àti ohùn', privacy: 'Àṣírí àti ìwífún', linkedAccounts: 'Àkáǹtì tí a so pọ̀', devices: 'Ẹ̀rọ tí o fọkàn tán',
  securityCentre: 'Ibùdó ààbò', learn: 'Kọ́ ẹ̀kọ́', help: 'Ìrànwọ́', supportChat: 'Iṣẹ́ oníbàárà',
  forgot: 'Ṣé o gbàgbé ọ̀rọ̀ aṣínà?', logoutAsk: 'Ṣé o fẹ́ jáde kúrò ní NURU?', verifyIdentity: 'Jẹ́rìí ìdánimọ̀ rẹ', linkAccount: 'So àkáǹtì kan pọ̀',
  assistantTitle: 'NURU wà ní ìkáwọ́ rẹ', assistantAsk: 'Kí ni o fẹ́ mọ̀ nípa owó rẹ?',
  assistantThinking: 'Mo ń ronú…', assistantSpeaking: 'Mo ń sọ̀rọ̀…', assistantPaused: 'Tẹ òbìrìkìtì náà láti béèrè', assistantHint: 'Yóò dúró fúnra rẹ̀ nígbà tí o bá dákẹ́',
}
export default yo

export const suggestions = ['Ibo ni owó mi lọ lóṣù yìí?', 'Fi oṣù mẹ́ta tó kọjá wé ara wọn', 'Ṣé owó mi yóò tó títí òpin oṣù?', 'Àwọn subscription wo ni mo ń sanwó fún?', 'Báwo ni business mi ṣe ń lọ?']
