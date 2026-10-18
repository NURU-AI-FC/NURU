// English UI strings. Every other language falls back to these keys.
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
  connectedAccounts: 'Connected accounts', historyTitle: 'History', txTitle: 'Transaction', notificationsTitle: 'Notifications',
  notifySettingsTitle: 'Notification settings', alertTitle: 'Alert', profileTitle: 'Profile', searchTitle: 'Search',
  hideBalance: 'Hide balance', showBalance: 'Show balance', netWorth: 'Net worth', linkAnother: 'Link another account',
  linkBank: 'Link a bank account', tryDemoBank: 'Try the demo bank instead', connectFirst: 'Connect your first account',
  searchTx: 'Search transactions', askAboutThis: 'Ask NURU about this', reportProblem: 'Report a problem', markAllRead: 'Mark all read',
  loadMore: 'Load more', noMatches: 'Nothing matches yet', memberSince: 'Member since', editProfile: 'Edit profile',
}
export default en
export type Dict = typeof en

export const suggestions = ['Where did my money go this month?', 'Compare my last 3 months', 'Will I have enough at month end?', 'What subscriptions do I pay for?', 'How is my business doing?']
