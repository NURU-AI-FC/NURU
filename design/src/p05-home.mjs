import { icon, mobile, topbar, naira, bars, txn, listRow, line } from './lib.mjs';

const th = 'light';
const av = (t = 'AO', s = 40) => `<div class="av" style="width:${s}px;height:${s}px;font-size:${s * 0.36}px">${t}</div>`;
const header = `<div class="row between px20" style="height:56px;flex:none"><div class="row g10"><div class="ib">${icon('menu')}</div><div class="col"><span class="xs mu">Good evening</span><span class="h4">Adaeze</span></div></div><div class="row g8"><div class="ib">${icon('search')}</div><div class="ib" style="position:relative">${icon('bell')}<i style="position:absolute;top:9px;right:10px;width:8px;height:8px;border-radius:9px;background:var(--red);border:2px solid var(--surface)"></i></div></div></div>`;
const qa = (i, l) => `<div class="col center g6" style="width:70px"><div class="ic red" style="width:52px;height:52px;border-radius:16px">${icon(i, 22)}</div><span class="xs w5">${l}</span></div>`;

const hero = (cur = '₦', amt = naira(812450), sub = 'All accounts · 3 linked', hidden = false) => `
  <div class="hero col g12">
    <div class="row between"><span class="s" style="opacity:.85">Total balance</span><div class="row g6"><span class="badge" style="background:rgba(255,255,255,.18);color:#fff">${cur === '₦' ? 'NGN' : 'USD'} ${icon('chevd', 11, '#fff')}</span><div style="opacity:.9">${icon(hidden ? 'eyeoff' : 'eye', 18, '#fff')}</div></div></div>
    <div style="font-size:34px;font-weight:800;letter-spacing:-1px" class="num">${hidden ? '••••••' : amt}</div>
    <div class="row between"><span class="xs" style="opacity:.8">${sub}</span><span class="badge" style="background:rgba(255,255,255,.18);color:#fff">${icon('down', 11, '#fff')} 8% vs last month</span></div>
  </div>`;

const homeScreen = mobile('01 Home', th, `
  ${header}
  <div class="body" style="gap:14px">
    ${hero()}
    <div class="row between">${qa('send', 'Send')}${qa('receipt', 'Pay bills')}${qa('exchange', 'Convert')}${qa('grid', 'More')}</div>
    <div class="card row g12" style="padding:14px;background:var(--red50);border-color:transparent;box-shadow:none"><div class="ic red" style="width:40px;height:40px;border-radius:12px;background:var(--bg)">${icon('sparkles', 19)}</div><div class="col g4 grow"><span class="s w6">Food spend is up 31% this week</span><span class="xs t2">₦42,600 vs ₦32,500 average. Want a weekly food budget?</span></div>${icon('chevr', 18, 'var(--red)')}</div>
    <div class="card col g12">
      <div class="row between"><div class="col g4"><span class="xs mu">Spent this week</span><span class="h2 num">${naira(96300)}</span></div><div class="seg" style="width:150px"><span class="on">Week</span><span>Month</span></div></div>
      ${bars([12, 18, 9, 22, 30, 41, 16], { w: 316, h: 80, labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], hi: 5 })}
    </div>
    <div class="col g12"><div class="sec-title"><span class="h4">Recent</span><a>See all</a></div>
      ${txn('food', 'Chicken Republic', 'Food · 7:42 pm', naira(6800), { tone: 'red' })}
    </div>
  </div>`, { tab: 'home' });

const homeUsd = mobile('02 Home (USD view, hidden)', th, `
  ${header}
  <div class="body" style="gap:18px">
    ${hero('$', '$528.42', '₦1,537.50 per $1 · live', false)}
    <div class="card col g12">
      <div class="row between"><span class="h4">Show balances in</span><span class="xs mu">Live rates</span></div>
      ${[['NG', 'Nigerian naira', 'NGN', '₦812,450', 0], ['US', 'US dollar', 'USD', '$528.42', 1], ['GB', 'British pound', 'GBP', '£397.10', 0], ['EU', 'Euro', 'EUR', '€455.80', 0]].map(([f, n, c, v, on]) => `<div class="row g12"><div class="av" style="background:var(--surface2);color:var(--text);font-size:12px">${f}</div><div class="col g4 grow"><span class="s w6">${n}</span><span class="xs mu">${c}</span></div><span class="s w6 num">${v}</span><div style="width:20px;height:20px;border-radius:99px;border:2px solid ${on ? 'var(--red)' : 'var(--border)'};display:flex;align-items:center;justify-content:center">${on ? '<i style="width:10px;height:10px;border-radius:9px;background:var(--red);display:block"></i>' : ''}</div></div>`).join('')}
    </div>
    <div class="soft row g10">${icon('info', 18, 'var(--blue)')}<span class="xs t2">Your money stays in naira. This only changes how NURU shows amounts.</span></div>
  </div>`, { tab: 'home' });

const converter = mobile('03 Currency converter', th, `
  ${topbar('Convert')}
  <div class="col g16 px20" style="margin-top:8px">
    <div class="card col g16">
      <div class="col g6"><span class="xs mu">You send</span><div class="row between"><span class="num" style="font-size:30px;font-weight:700">₦250,000</span><span class="chip">${'NG'} NGN ${icon('chevd', 14)}</span></div></div>
      <div class="row g10"><div class="div grow" style="width:auto"></div><div class="ib" style="width:40px;height:40px;border-radius:99px;background:var(--red);color:#fff">${icon('exchange', 18, '#fff')}</div><div class="div grow" style="width:auto"></div></div>
      <div class="col g6"><span class="xs mu">They get</span><div class="row between"><span class="num" style="font-size:30px;font-weight:700">$162.60</span><span class="chip">US USD ${icon('chevd', 14)}</span></div></div>
    </div>
    <div class="row between soft"><span class="s t2">Rate</span><span class="s w6">₦1,537.50 = $1</span></div>
    <div class="card col g10">
      <div class="row between"><span class="h4">USD/NGN · 30 days</span><span class="badge red">${icon('up', 11)} 2.4%</span></div>
      ${line([1501, 1498, 1505, 1512, 1509, 1515, 1521, 1518, 1524, 1530, 1527, 1533, 1537], { w: 316, h: 100 })}
      <div class="row between xs mu"><span>18 Sep</span><span>Today</span></div>
    </div>
    <div class="soft row g10">${icon('bell', 18, 'var(--red)')}<span class="xs t2 grow">Alert me when $1 is below ₦1,500</span><div class="toggle on"><i></i></div></div>
  </div>
  <div style="position:absolute;left:20px;right:20px;bottom:44px"><div class="btn pri">Use in a transfer</div></div>`);

const bankTile = (c, l, s = 40) => `<div style="width:${s}px;height:${s}px;border-radius:12px;background:${c};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;flex:none">${l}</div>`;
const accounts = mobile('04 Accounts', th, `
  ${topbar('Connected accounts', { right: `<div class="ib">${icon('plus')}</div>` })}
  <div class="col g16 px20" style="margin-top:8px">
    <div class="card col g6"><span class="xs mu">Net worth</span><span class="h1 num">${naira(2163900)}</span><span class="xs gr w6">+₦184,200 this month</span></div>
    ${[['#E30613', 'Z', 'Zenith Bank', 'Savings •••• 4821', naira(812450), 'Synced 2 min ago'], ['#40196D', 'K', 'Kuda', 'Spend •••• 1187', naira(96200), 'Synced 1 hr ago'], ['#1DCF9F', 'O', 'Opay wallet', 'Wallet •••• 3302', naira(41250), 'Synced today'], ['#0B3B7A', 'P', 'Stanbic Pension', 'RSA •••• 7710', naira(1214000), 'Updated monthly']].map(([c, l, n, s, v, w]) => `<div class="card row g12" style="padding:14px">${bankTile(c, l)}<div class="col g4 grow"><span class="s w6">${n}</span><span class="xs mu">${s}</span></div><div class="col g4" style="align-items:flex-end"><span class="s w6 num">${v}</span><span class="xs mu">${w}</span></div></div>`).join('')}
    <div class="btn out">${icon('link', 18)} Link another account</div>
  </div>`);

const accountDetail = mobile('05 Account detail', th, `
  ${topbar('Zenith Savings', { right: `<div class="ib">${icon('more')}</div>` })}
  <div class="col g16 px20" style="margin-top:8px">
    <div class="card col g10">
      <div class="row g10">${bankTile('#E30613', 'Z', 36)}<div class="col g4"><span class="s w6">Savings •••• 4821</span><span class="xs mu">Adaeze C. Okafor</span></div></div>
      <span class="h1 num">${naira(812450)}</span>
      ${line([620, 655, 640, 700, 690, 740, 720, 780, 760, 812], { w: 316, h: 80 })}
      <div class="row between xs mu"><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span></div>
    </div>
    <div class="row g12"><div class="card col g4 grow" style="padding:14px"><span class="xs mu">Money in · Oct</span><span class="h4 num gr">+${naira(512000)}</span></div><div class="card col g4 grow" style="padding:14px"><span class="xs mu">Money out · Oct</span><span class="h4 num">−${naira(405200)}</span></div></div>
    <div class="col g12"><div class="sec-title"><span class="h4">Transactions</span><a>Filter</a></div>
      ${txn('cart', 'Shoprite Lekki', 'Groceries · Today', naira(23450), { tone: 'amber' })}
      ${txn('zap', 'IKEDC prepaid', 'Bills · Yesterday', naira(15000), { tone: 'blue' })}
      ${txn('car', 'Bolt', 'Transport · Yesterday', naira(4200))}
    </div>
  </div>`);

const history = mobile('06 History', th, `
  ${topbar('History', { right: `<div class="ib">${icon('download')}</div>` })}
  <div class="col g12 px20">
    <div class="input" style="height:44px">${icon('search', 18, 'var(--muted)')}<span class="ph">Search transactions</span></div>
    <div class="row g8">${['All', 'In', 'Out', 'Bills', 'Food'].map((t, i) => `<span class="chip ${i === 0 ? 'on' : ''}">${t}</span>`).join('')}</div>
  </div>
  <div class="col g12 px20" style="margin-top:16px">
    <div class="row between"><span class="xs mu w6" style="letter-spacing:.6px">TODAY</span><span class="xs mu">−${naira(30250)}</span></div>
    ${txn('food', 'Chicken Republic', 'Food · 7:42 pm', naira(6800), { tone: 'red' })}
    ${txn('cart', 'Shoprite Lekki', 'Groceries · 1:15 pm', naira(23450), { tone: 'amber' })}
    <div class="row between" style="margin-top:6px"><span class="xs mu w6" style="letter-spacing:.6px">YESTERDAY</span><span class="xs gr">+${naira(430800)}</span></div>
    ${txn('briefcase', 'Kemi Foods Ltd', 'Salary · 9:00 am', naira(450000), { credit: true, tone: 'green' })}
    ${txn('zap', 'IKEDC prepaid', 'Bills · 8:12 am', naira(15000), { tone: 'blue' })}
    ${txn('car', 'Bolt', 'Transport · 7:30 am', naira(4200))}
    <div class="row between" style="margin-top:6px"><span class="xs mu w6" style="letter-spacing:.6px">15 OCT</span><span class="xs mu">−${naira(18900)}</span></div>
    ${txn('tv', 'DStv Compact', 'Subscription · Auto-debit', naira(15700), { tone: 'gray', badge: '<span class="badge amber">Recurring</span>' })}
    ${txn('phone', 'MTN airtime', 'Airtime', naira(3200))}
  </div>`, { tab: 'home' });

const txnDetail = mobile('07 Transaction detail', th, `
  ${topbar('Transaction', { right: `<div class="ib">${icon('more')}</div>` })}
  <div class="col center g8" style="padding:12px 20px 0">
    <div class="ic red" style="width:60px;height:60px;border-radius:20px">${icon('food', 28)}</div>
    <span class="h3">Chicken Republic</span><span class="num" style="font-size:32px;font-weight:800">−${naira(6800)}</span>
    <span class="badge green">${icon('check', 11)} Successful</span>
  </div>
  <div class="col g12 px20" style="margin-top:18px">
    <div class="card col g10">${[['Date', 'Fri 18 Oct, 7:42 pm'], ['Account', 'Zenith Savings •••• 4821'], ['Channel', 'POS · Lekki Phase 1'], ['Reference', 'ZEN2410181942XQ']].map(([k, v]) => `<div class="row between"><span class="s t2">${k}</span><span class="s w6">${v}</span></div>`).join('<div class="div"></div>')}</div>
    <div class="card row g12" style="padding:14px"><div class="col g4 grow"><span class="xs mu">Category</span><span class="s w6">Food & dining</span></div><span class="chip">${icon('edit', 14)} Change</span></div>
    <div class="soft row g10" style="background:var(--red50)">${icon('sparkles', 18, 'var(--red)')}<span class="xs t2">Your 4th fast-food purchase this week. Food is ${naira(4200)} over your weekly budget.</span></div>
    <div class="row g10"><div class="btn sec grow">${icon('receipt', 18)} Receipt</div><div class="btn sec grow">${icon('undo', 18)} Dispute</div></div>
  </div>`);

const notifs = mobile('08 Notifications', th, `
  ${topbar('Notifications', { right: '<span class="s rd w6">Mark all read</span>' })}
  <div class="col px20 g4">
    <div class="row g8" style="margin-bottom:8px">${['All', 'Insights', 'Security', 'Bills'].map((t, i) => `<span class="chip ${i === 0 ? 'on' : ''}">${t}</span>`).join('')}</div>
    ${[['alert', 'red', 'Unusual spend spotted', '₦85,000 at an electronics store is 4× your normal. Was this you?', '5 min', 1], ['bell', 'amber', 'DStv renews tomorrow', '₦15,700 will be debited from Zenith Savings.', '1 hr', 1], ['sparkles', 'red', 'Your October report is ready', 'You saved 18% of income. See what changed.', '3 hr', 0], ['shieldcheck', 'green', 'New sign-in on MacBook', 'Chrome · Lagos. Not you? Secure your account.', 'Yesterday', 0], ['calendar', 'blue', 'Investor meeting at 10:00', 'Prep pack ready in Business › Investor prep.', 'Yesterday', 0], ['trendup', 'green', 'Goal milestone', 'Rent fund is 75% complete. ₦300,000 to go.', '2 days', 0]].map(([i, tone, t, s, w, unread]) => `<div class="row g12" style="padding:12px 0;align-items:flex-start"><div class="ic ${tone}" style="width:40px;height:40px;border-radius:12px">${icon(i, 19)}</div><div class="col g4 grow"><div class="row between"><span class="s w6">${t}</span><span class="xs mu">${w}</span></div><span class="xs t2">${s}</span></div>${unread ? '<i style="width:8px;height:8px;border-radius:9px;background:var(--red);display:block;margin-top:6px;flex:none"></i>' : ''}</div>`).join('')}
  </div>`);

const search = mobile('09 Search', th, `
  <div class="row g10 px20" style="height:56px"><div class="input focus grow" style="height:44px">${icon('search', 18, 'var(--muted)')}<span>bolt</span></div><span class="s rd w6">Cancel</span></div>
  <div class="col g12 px20" style="margin-top:8px">
    <div class="soft row g10" style="background:var(--red50)">${icon('sparkles', 18, 'var(--red)')}<div class="col g4 grow"><span class="s w6">Ask NURU: “How much did I spend on Bolt?”</span><span class="xs t2">Get totals, trends and tips</span></div></div>
    <div class="row between"><span class="xs mu w6" style="letter-spacing:.6px">23 RESULTS · ${naira(61400)}</span><span class="xs rd w6">Filter</span></div>
    ${txn('car', 'Bolt', 'Transport · Yesterday', naira(4200))}
    ${txn('car', 'Bolt', 'Transport · 16 Oct', naira(3800))}
    ${txn('car', 'Bolt Food', 'Food · 14 Oct', naira(7900), { tone: 'red' })}
    ${txn('car', 'Bolt', 'Transport · 12 Oct', naira(2600))}
    <span class="xs mu w6" style="letter-spacing:.6px;margin-top:8px">RECENT SEARCHES</span>
    <div class="row g8 wrap">${['DStv', 'Salary', 'Shoprite', 'Over ₦50,000'].map(t => `<span class="chip">${icon('history', 14)} ${t}</span>`).join('')}</div>
  </div>`);

const drawerItem = (i, l, on = false, badge = '') => `<div class="row g12" style="height:44px;padding:0 12px;border-radius:12px;${on ? 'background:var(--red50);color:var(--red)' : ''}">${icon(i, 19)}<span class="s ${on ? 'w6' : 'w5'} grow">${l}</span>${badge}</div>`;
const drawer = mobile('10 Menu (sidebar)', th, `
  <div class="scrim" style="left:300px"></div>
  <div style="position:absolute;left:0;top:0;bottom:0;width:300px;background:var(--bg);box-shadow:10px 0 40px rgba(0,0,0,.15);display:flex;flex-direction:column;padding:56px 12px 24px">
    <div class="row g10" style="padding:0 8px 16px">${av()}<div class="col g4 grow"><span class="h4">Adaeze Okafor</span><span class="xs mu">Personal · Tier 2</span></div>${icon('chevd', 16, 'var(--muted)')}</div>
    <div class="btn pri sm" style="height:42px;margin:0 4px 12px">${icon('sparkles', 16)} Ask NURU</div>
    <div class="col g2">
      ${drawerItem('home', 'Home', true)}${drawerItem('wallet', 'Connected wallets')}${drawerItem('history', 'History')}${drawerItem('chart', 'Insights')}${drawerItem('scale', 'Decision Room', false, '<span class="badge red">New</span>')}${drawerItem('landmark', 'Loans and refunds')}${drawerItem('users', 'Payroll')}${drawerItem('calendar', 'Planner')}
    </div>
    <div class="div" style="margin:10px 0"></div>
    <span class="xs mu w6" style="padding:0 12px 6px;letter-spacing:.6px">RECENT CHATS</span>
    ${['Where did my money go in Sept?', 'Can I afford a ₦3m car loan?', 'Ṣé mo lè fi owó pamọ́?'].map(t => `<div class="s t2" style="padding:8px 12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t}</div>`).join('')}
    <div class="col g2" style="margin-top:auto">${drawerItem('settings', 'Settings')}${drawerItem('help', 'Help and support')}${drawerItem('logout', 'Log out')}</div>
  </div>`);

const profile = mobile('11 Profile', th, `
  ${topbar('Profile', { right: `<div class="ib">${icon('edit')}</div>` })}
  <div class="col center g8" style="padding:8px 20px 0">${av('AO', 80)}<span class="h2">Adaeze Okafor</span><span class="s t2">adaeze.okafor@gmail.com · +234 803 *** 7890</span><div class="row g8"><span class="badge green">${icon('shieldcheck', 11)} Tier 2 verified</span><span class="badge gray">Personal</span></div></div>
  <div class="col px20" style="margin-top:16px">
    <div class="card row" style="padding:14px;justify-content:space-around">${[['3', 'Accounts'], ['18%', 'Saved'], ['742', 'Health score']].map(([v, l]) => `<div class="col center g4"><span class="h3 num">${v}</span><span class="xs mu">${l}</span></div>`).join('<div style="width:1px;height:36px;background:var(--border)"></div>')}</div>
    ${listRow('user', 'Personal details', 'Name, date of birth, address')}
    ${listRow('briefcase', 'Switch to Business mode', 'Payroll, vendors, investor tools', icon('chevr', 18, 'var(--muted)'), 'red')}
    ${listRow('globe', 'Language and voice', 'Yorùbá · Female voice')}
    ${listRow('star', 'Refer a friend', 'Get ₦1,000 when they link a bank')}
    ${listRow('file', 'Statements and documents', 'Download monthly reports')}
  </div>`);

const emptyHome = mobile('12 Home (no account linked)', th, `
  ${header}
  <div class="body" style="gap:18px">
    <div class="hero col g12" style="height:170px"><span class="s" style="opacity:.85">Total balance</span><div style="font-size:34px;font-weight:800">₦0.00</div><span class="xs" style="opacity:.8">Link an account to see your real numbers</span></div>
    <div class="card col center g12" style="padding:28px 20px">
      <div class="ic red" style="width:64px;height:64px;border-radius:20px">${icon('link', 30)}</div>
      <span class="h3" style="text-align:center">Connect your first account</span>
      <span class="s t2" style="text-align:center">NURU needs your transaction history to find insights. Read-only and secured by Mono.</span>
      <div class="btn pri" style="width:100%">Link a bank account</div>
      <span class="s rd w6">Try the demo bank instead</span>
    </div>
    <div class="col g10">${[['chart', 'See spending by category'], ['bell', 'Get bill and anomaly alerts'], ['message', 'Ask questions in your language']].map(([i, t]) => `<div class="row g10">${icon(i, 18, 'var(--red)')}<span class="s t2">${t}</span></div>`).join('')}</div>
  </div>`, { tab: 'home' });

export default [homeScreen, homeUsd, converter, accounts, accountDetail, history, txnDetail, notifs, search, drawer, profile, emptyHome];
