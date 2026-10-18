// Every email NURU sends. One shell (logo, card, button, safety footer) so they
// read as one family; the body changes per trigger. 600px card, the standard
// width that renders in Gmail, Outlook and Apple Mail.
import { icon, web, naira, bars } from './lib.mjs';

const th = 'light';
const btn = (t, ghost = false) => `<div class="row center" style="height:48px;padding:0 24px;border-radius:12px;align-self:flex-start;${ghost ? 'border:1.5px solid var(--border);color:var(--text)' : 'background:var(--red);color:#fff'};font-size:15px;font-weight:600">${t}</div>`;
const kv = (rows) => `<div class="col" style="border:1px solid var(--border);border-radius:14px;padding:4px 18px">${rows.map(([k, v], i) => `<div class="row between" style="height:44px;${i ? 'border-top:1px solid var(--border)' : ''}"><span class="s t2">${k}</span><span class="s w6">${v}</span></div>`).join('')}</div>`;
const code = (c) => `<div class="row center g10" style="height:72px;border-radius:14px;background:var(--surface)">${c.split('').map((d) => `<span style="font-size:34px;font-weight:700;letter-spacing:2px;font-variant-numeric:tabular-nums">${d}</span>`).join('')}</div>`;
const hero = (ic, tone, amount = '', sub = '') => `<div class="col g10" style="align-items:flex-start"><div class="ic ${tone}" style="width:52px;height:52px;border-radius:16px">${icon(ic, 24)}</div>${amount ? `<span class="num" style="font-size:34px;font-weight:800;letter-spacing:-.5px${tone === 'green' ? ';color:var(--green)' : ''}">${amount}</span>` : ''}${sub ? `<span class="s t2">${sub}</span>` : ''}</div>`;
const note = (t, ic = 'shieldcheck', tone = 'var(--surface)') => `<div class="row g10" style="padding:14px 16px;border-radius:14px;background:${tone};align-items:flex-start">${icon(ic, 18, 'var(--text2)')}<span class="xs t2" style="line-height:18px">${t}</span></div>`;
const stat = (k, v, d = '', up = true) => `<div class="col g4 grow" style="padding:14px;border-radius:14px;background:var(--surface)"><span class="xs t2">${k}</span><span class="h3 num">${v}</span>${d ? `<span class="xs w6" style="color:${up ? 'var(--green)' : 'var(--red)'}">${d}</span>` : ''}</div>`;

const shell = (name, subject, preview, inner, { promo = false } = {}) => web(name, th, `
  <div class="col g10" style="padding:28px 40px 40px">
    <div class="col g4" style="padding:0 4px 8px"><span class="xs mu">Subject</span><span class="s w6">${subject}</span><span class="xs mu">${preview}</span></div>
    <div class="col" style="background:var(--bg);border-radius:20px;overflow:hidden;border:1px solid var(--border)">
      <div class="row between" style="height:72px;padding:0 32px;border-bottom:1px solid var(--border)">
        <div class="logo"><div class="mark" style="width:32px;height:32px;font-size:18px;border-radius:10px">N</div><span>NURU</span></div>
        <span class="xs mu">with Zenith Bank</span>
      </div>
      <div class="col g20" style="padding:32px">${inner}</div>
      <div class="col g10" style="padding:24px 32px;background:var(--surface)">
        <span class="row g6 xs t2">${icon('lock', 12)}NURU will never ask for your PIN, password, OTP or BVN by email, call or chat.</span>
        <span class="xs mu">Zenith Bank Plc, Plot 84 Ajose Adeogun Street, Victoria Island, Lagos · 0201 278 7000</span>
        <span class="xs mu">${promo ? 'You get this because tips are on. <u>Unsubscribe</u> · ' : ''}<u>Email settings</u> · <u>Privacy</u> · <u>Help</u></span>
      </div>
    </div>
  </div>`, 'width:680px;min-height:0;background:#ECECEF');

const H = (t) => `<span class="h2">${t}</span>`;
const P = (t) => `<span class="b t2">${t}</span>`;

// Account and security
const emails = [
  shell('01 Welcome and verify email', 'Welcome to NURU, Adaeze. Here is your code', 'Enter 482 913 to finish creating your account.', `
    ${H('Welcome to NURU')}${P('Your money, explained in your language. Enter this code in the app to verify your email. It expires in 10 minutes.')}
    ${code('482913')}
    ${note('Did not sign up? Ignore this email and no account will be created.', 'info')}`),
  shell('02 Sign-in code', 'Your NURU sign-in code is 731 052', 'Requested from Chrome on Mac, Lagos, 7:42pm.', `
    ${H('Your sign-in code')}${code('731052')}
    ${kv([['Device', 'Chrome on Mac'], ['Location', 'Lagos, Nigeria'], ['Time', 'Sun 18 Oct, 7:42pm']])}
    ${note('Not you? Do not share this code. Change your password and call Zenith on 0201 278 7000.', 'alert', 'var(--red50)')}`),
  shell('03 Password reset code', 'Reset your NURU password', 'Use 905 118 within 10 minutes.', `
    ${H('Reset your password')}${P('Enter this code on the reset screen, then choose a new password.')}${code('905118')}
    ${note('If you did not ask for this, your account is still safe. You can ignore this email.', 'info')}`),
  shell('04 Password changed', 'Your NURU password was changed', 'If this was not you, secure your account now.', `
    ${hero('key', 'green')}${H('Password changed')}${P('Your password was changed on Sun 18 Oct at 7:51pm from Chrome on Mac in Lagos. All other devices were signed out.')}
    ${btn('This was not me', true)}`),
  shell('05 New device sign-in', 'New sign-in to NURU on an iPhone', 'Was this you? iPhone 15, Abuja, 9:14am.', `
    ${hero('phone', 'amber')}${H('New sign-in on an iPhone')}
    ${kv([['Device', 'iPhone 15, NURU app'], ['Location', 'Abuja, Nigeria'], ['Time', 'Mon 19 Oct, 9:14am'], ['IP address', '102.89.•••.21']])}
    <div class="row g12">${btn('Yes, it was me', true)}${btn('Sign it out')}</div>`),
  shell('06 Transaction PIN and face check set', 'Your transaction PIN and face check are ready', 'Every transfer now needs both.', `
    ${hero('shieldcheck', 'green')}${H('Your transfers are protected')}${P('You created a transaction PIN and enrolled your face on Sun 18 Oct. From now on every transfer needs both, and NURU can never switch them off.')}
    ${note('We store a face template, not a photo, encrypted on Zenith servers. Your PIN is stored hashed, never as the digits.')}`),
  shell('07 Transfers paused after failed checks', 'We paused transfers on your NURU account', '3 failed PIN or face checks. Paused for 30 minutes.', `
    ${hero('lock', 'red')}${H('Transfers paused for 30 minutes')}${P('Someone failed the PIN or face check 3 times while sending ₦400,000 to Musa. Nothing was sent. Transfers unlock at 8:32pm.')}
    ${btn('Call Zenith support')}${note('If this was you, wait 30 minutes and try again. If not, change your password now.', 'alert', 'var(--red50)')}`),
  shell('08 Identity verified', 'You are verified, Adaeze', 'BVN and NIN checks passed. Higher limits are on.', `
    ${hero('check', 'green')}${H('Identity verified')}${P('Your BVN, NIN and selfie match. Your account is now Tier 2.')}
    ${kv([['Daily transfer limit', naira(5000000)], ['Account tier', 'Tier 2'], ['Verified', 'Sun 18 Oct']])}${btn('Open NURU')}`),
  shell('09 Account linked', 'Kuda Spend is now linked to NURU', 'NURU can now include it in your insights.', `
    ${hero('link', 'blue')}${H('Kuda Spend is linked')}${P('NURU imported 12 months of transactions from Kuda Spend •••• 8053. It can read balances and history only, never move money from it.')}
    ${btn('See all accounts')}${note('You can unlink any account from Settings, Linked accounts. We delete its data within 24 hours.')}`),
  shell('10 Data export ready', 'Your NURU data download is ready', 'Download it within 7 days.', `
    ${hero('download', 'gray')}${H('Your data is ready')}${P('Your accounts, transactions, chats and settings are in one encrypted file. The link works for 7 days and needs you to sign in.')}${btn('Download my data')}`),
  shell('11 Account deletion scheduled', 'Your NURU account will be deleted on 1 Nov', 'Changed your mind? Cancel before then.', `
    ${hero('trash', 'red')}${H('Deletion scheduled')}${P('We will delete your NURU profile, chats and linked account data on 1 Nov. Your Zenith bank accounts are not affected.')}${btn('Keep my account', true)}`),

  // Money
  shell('12 Transfer sent', 'You sent ₦25,000 to Tunde Bakare', 'Generator repair · Ref NURU-8F2A91C0', `
    ${hero('send', 'gray', naira(25000), 'Sent to Tunde Bakare')}
    ${kv([['To', 'Tunde Bakare, GTBank •••• 6621'], ['For', 'Generator repair'], ['From', 'Zenith Savings •••• 4417'], ['Date', 'Sun 18 Oct, 7:58pm'], ['Reference', 'NURU-8F2A91C0']])}
    ${btn('View receipt', true)}`),
  shell('13 Money received', 'You received ₦150,000', 'From an OPay wallet. Tell NURU what it was for.', `
    ${hero('down', 'green', '+' + naira(150000), 'Into OPay Wallet •••• 2290')}
    ${P('It came with no description. Tell NURU what it was for so your plan and insights stay accurate.')}
    <div class="row g8 wrap">${['Salary', 'Business sale', 'Family support', 'Refund', 'Other'].map((t) => `<span class="chip">${t}</span>`).join('')}</div>${btn('Describe it in NURU')}`),
  shell('14 Payment needs a description', '2 payments need a description', 'Help NURU tell salary from a loan or a sale.', `
    ${H('What were these for?')}${P('These moved with no description. A few words each keeps your advice right.')}
    <div class="col g10">${[['down', 'green', 'OPay wallet transfer', 'Today 9:12am', '+' + naira(150000)], ['up', 'red', 'POS purchase', 'Wed 14 Oct', '-' + naira(18500)]].map(([ic, t, n, d, a]) => `<div class="row g12" style="padding:12px 14px;border:1px solid var(--border);border-radius:14px"><div class="ic ${t}" style="width:40px;height:40px;border-radius:12px">${icon(ic, 18)}</div><div class="col g4 grow"><span class="s w6">${n}</span><span class="xs mu">${d} · no narration</span></div><span class="s w6 num">${a}</span></div>`).join('')}</div>
    ${btn('Describe them')}`),
  shell('15 Transfer paused for review', 'We paused your ₦400,000 transfer', 'New account and bigger than usual. Confirm it in the app.', `
    ${hero('shield', 'amber', naira(400000), 'To Musa Ibrahim, Moniepoint •••• 1180')}
    ${P('We held this transfer because it looks different from how you usually pay:')}
    <div class="col g8">${['New account, never paid before', '8× bigger than your usual transfer', 'Over ₦200,000 in one go to someone new'].map((t) => `<span class="row g8 s">${icon('alert', 16, 'var(--amber)')}${t}</span>`).join('')}</div>
    <div class="row g12">${btn('Review in NURU')}${btn('I did not do this', true)}</div>`),
  shell('16 Unusual payment alert', 'Unusual payment: ₦86,400 at Jumia', '3× your usual shopping spend. Was this you?', `
    ${hero('alert', 'red', naira(86400), 'Jumia · Kuda Spend •••• 8053 · 2:16pm')}
    ${P('This is about 3× what you usually spend on shopping. If you did not make it, freeze your card now.')}
    <div class="row g12">${btn('Yes, it was me', true)}${btn('Freeze my card')}</div>`),
  shell('17 Bill payment receipt', 'DStv Compact paid: ₦15,700', 'Smartcard •••• 4471 renewed until 18 Nov.', `
    ${hero('tv', 'gray', naira(15700), 'DStv Compact renewed')}
    ${kv([['Smartcard', '•••• 4471'], ['Valid until', '18 Nov 2026'], ['From', 'Zenith Savings •••• 4417'], ['Reference', 'NURU-BILL-77D2']])}`),
  shell('18 Low balance warning', 'Zenith Savings is below ₦20,000', 'DStv renews in 2 days. Top up to avoid a failed payment.', `
    ${hero('wallet', 'amber', naira(18240), 'Zenith Savings •••• 4417')}
    ${P('Your DStv renewal of ₦15,700 is due on 20 Oct, and you usually spend about ₦6,000 a day. NURU suggests moving ₦25,000 from OPay Wallet.')}${btn('Move ₦25,000')}`),
  shell('19 Dispute update', 'Update on your report NURU-RPT-3391', 'Zenith reversed ₦9,500 to your account.', `
    ${hero('check', 'green')}${H('Your report is resolved')}
    <div class="col g12">${[['Report received', 'Fri 16 Oct', true], ['Reviewed by Zenith', 'Sat 17 Oct', true], ['₦9,500 reversed', 'Today', true]].map(([t, d, on]) => `<div class="row g12"><div style="width:12px;height:12px;border-radius:6px;background:${on ? 'var(--green)' : 'var(--border)'}"></div><span class="s w6 grow">${t}</span><span class="xs mu">${d}</span></div>`).join('')}</div>
    ${kv([['Payment', 'Charged twice, Bolt'], ['Amount', naira(9500)], ['Reference', 'NURU-RPT-3391']])}`),

  // Insights and engagement
  shell('20 Weekly money recap', 'Your week: ₦61,200 out, ₦18,400 less than last week', 'Food fell 22%. You are on track for your rent goal.', `
    ${H('Your week in money')}
    <div class="row g10">${stat('Money in', naira(150000), '+12%')}${stat('Money out', naira(61200), '-23%')}${stat('Saved', naira(20000), 'On track')}</div>
    <div class="col g8"><span class="s w6">Spending by day</span>${bars([8, 12, 6, 9, 15, 7, 4], { w: 536, h: 110, labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], hi: 4 })}</div>
    ${note('Friday was your biggest day: ₦15,200, mostly Chowdeck and Bolt. Want a ₦10,000 weekend food budget?', 'sparkles', 'var(--red50)')}
    ${btn('Ask NURU about my week')}`, { promo: true }),
  shell('21 Monthly report', 'Your September report is ready', 'You saved 18% of your income, up from 11%.', `
    ${H('September in review')}
    <div class="row g10">${stat('Income', naira(820000))}${stat('Spent', naira(612400), '-6%')}${stat('Saved', '18%', '+7 pts')}</div>
    <div class="col g8">${[['Food', 182000, 30], ['Bills', 96000, 16], ['Transport', 74000, 12], ['Shopping', 61000, 10]].map(([c, a, p]) => `<div class="col g6"><div class="row between"><span class="s">${c}</span><span class="s w6 num">${naira(a)}</span></div><div style="height:6px;border-radius:3px;background:var(--surface2)"><div style="width:${p * 3}%;height:6px;border-radius:3px;background:var(--red)"></div></div></div>`).join('')}</div>
    <div class="row g12">${btn('See full report')}${btn('Download PDF', true)}</div>`, { promo: true }),
  shell('22 Budget almost used', 'You have used 85% of your food budget', '₦12,000 left for 9 days.', `
    ${hero('pie', 'amber')}${H('Food budget: 85% used')}
    <div class="col g8"><div class="row between"><span class="s">${naira(68000)} of ${naira(80000)}</span><span class="s w6">9 days left</span></div><div style="height:10px;border-radius:5px;background:var(--surface2)"><div style="width:85%;height:10px;border-radius:5px;background:var(--amber)"></div></div></div>
    ${P('At your current pace you will go about ₦9,000 over. Cooking at home twice this week would keep you inside.')}${btn('Adjust my budget', true)}`),
  shell('23 Savings goal milestone', 'Halfway to your rent goal', '₦225,000 of ₦450,000 saved. Keep going.', `
    ${hero('target', 'green', naira(225000), 'of ' + naira(450000) + ' for December rent')}
    <div style="height:12px;border-radius:6px;background:var(--surface2)"><div style="width:50%;height:12px;border-radius:6px;background:var(--green)"></div></div>
    ${P('Three more ₦75,000 moves and you are done by 1 Dec, with ₦25,000 to spare.')}${btn('Add money now')}`),
  shell('24 Bill and loan reminder', 'Coming up: Carbon loan ₦42,500 on 22 Oct', 'Plus DStv on 20 Oct. You have enough in Zenith Savings.', `
    ${H('Due this week')}
    <div class="col g10">${[['calendar', 'DStv Compact', 'Tue 20 Oct', 15700], ['landmark', 'Carbon loan repayment', 'Thu 22 Oct', 42500], ['zap', 'IKEDC prepaid', 'Sat 24 Oct', 10000]].map(([ic, n, d, a]) => `<div class="row g12" style="padding:12px 14px;border:1px solid var(--border);border-radius:14px"><div class="ic gray" style="width:40px;height:40px;border-radius:12px">${icon(ic, 18)}</div><div class="col g4 grow"><span class="s w6">${n}</span><span class="xs mu">${d}</span></div><span class="s w6 num">${naira(a)}</span></div>`).join('')}</div>
    ${note('Zenith Savings has ₦3.4m, enough for all three.', 'check', 'var(--green50)')}${btn('Open planner', true)}`),
  shell('25 Subscription renewal', 'Netflix renews tomorrow: ₦7,000', 'You have not watched in 5 weeks. Cancel?', `
    ${hero('play', 'gray', naira(7000), 'Netflix Standard · renews 19 Oct')}
    ${P('NURU found 4 subscriptions costing ₦31,900 a month. Netflix has not been used in 5 weeks.')}
    <div class="row g12">${btn('Review subscriptions')}${btn('Keep it', true)}</div>`),
  shell('26 Loan offer', 'You can borrow up to ₦500,000 from Zenith', 'Pre-checked from your income. 2.5% a month.', `
    ${hero('landmark', 'blue', naira(500000), 'Zenith QuickCredit, pre-checked')}
    ${kv([['Monthly rate', '2.5%'], ['Repay over', 'Up to 12 months'], ['Example', '₦47,800 a month for 12 months'], ['Paid out', 'Within 5 minutes']])}
    ${note('Only borrow what your plan shows you can repay. NURU can show you the effect on next month first.', 'info')}${btn('See my plan with this loan')}`, { promo: true }),
  shell('27 Daily plan', 'Your plan for Monday 19 Oct', '3 tasks, 1 payment, investor call at 2pm.', `
    ${H('Good morning, Adaeze')}${P('Here is your day.')}
    <div class="col g10">${[['9:00am', 'Pay Mile 12 Market', naira(60000)], ['2:00pm', 'Investor call, Lagos Angels', ''], ['5:00pm', 'Send payslips to staff', '']].map(([t, n, a]) => `<div class="row g12"><span class="xs w6 mu" style="width:60px">${t}</span><span class="s w6 grow">${n}</span><span class="s num">${a}</span></div>`).join('')}</div>
    ${btn('Open planner', true)}`),
  shell('28 Payroll paid', 'Payroll paid: 6 staff, ₦590,450', 'Kemi Foods Ltd · payslips sent.', `
    ${hero('users', 'green', naira(590450), 'Kemi Foods Ltd, October payroll')}
    ${kv([['Staff paid', '6 of 6'], ['From', 'Kemi Foods Ltd •••• 0094'], ['Payslips', 'Sent by email'], ['Business balance after', naira(1284000)]])}${btn('View payroll', true)}`),
  shell('29 Invoice paid and vendor due', 'Shoprite paid your ₦480,000 invoice', 'Mile 12 Market is due on Friday.', `
    ${hero('receipt', 'green', '+' + naira(480000), 'Invoice INV-0042, Shoprite Lekki')}
    ${note('Mile 12 Market (₦185,000) is due on Fri 23 Oct. You have enough in the business account.', 'calendar')}${btn('Open business tools', true)}`),

  // Lifecycle
  shell('30 Day 1: try Ask NURU', 'Ask NURU anything, in Yorùbá too', 'Three questions to start with.', `
    ${H('Ask NURU in your own language')}${P('NURU answers in English, Yorùbá, Igbo and Hausa, by text or voice. Try one of these:')}
    <div class="col g8">${['Where did my money go this month?', 'Ṣé mo lè ra fóònù ₦250,000 ní oṣù yìí?', 'Will I have enough at month end?'].map((q) => `<div class="row g10" style="padding:12px 14px;border-radius:14px;background:var(--surface)">${icon('sparkles', 16, 'var(--red)')}<span class="s w6">${q}</span></div>`).join('')}</div>${btn('Open Ask NURU')}`, { promo: true }),
  shell('31 Day 3: link more accounts', 'NURU sees 1 of your accounts', 'Link OPay, Kuda or Moniepoint for the full picture.', `
    ${H('Get the full picture')}${P('Most people have money in 3 places. Link the others and NURU can tell you your real balance and where it all goes.')}
    <div class="row g10">${['OPay', 'Kuda', 'Moniepoint', 'PalmPay'].map((b) => `<div class="col center g6 grow" style="padding:14px;border-radius:14px;border:1px solid var(--border)"><div class="ic gray" style="width:36px;height:36px;border-radius:10px">${icon('landmark', 16)}</div><span class="xs w6">${b}</span></div>`).join('')}</div>${btn('Link an account')}`, { promo: true }),
  shell('32 We miss you', 'Your money moved ₦184,000 since you last looked', 'NURU has 3 things for you.', `
    ${H('A lot happened in 2 weeks')}
    <div class="col g10">${['You spent ₦38,000 more on food than usual', 'Netflix and Showmax renewed (₦11,500)', 'Your rent goal is 2 weeks behind'].map((t, i) => `<div class="row g12"><div class="ic ${['amber', 'gray', 'red'][i]}" style="width:36px;height:36px;border-radius:10px">${icon(['food', 'play', 'target'][i], 16)}</div><span class="s grow">${t}</span></div>`).join('')}</div>${btn('Catch up in 1 minute')}`, { promo: true }),
];

export default emails;
