import { icon, mobile, topbar, naira, bars, stacked, line, donut, ring, heat, legend, txn, cat } from './lib.mjs';

const th = 'light';
const seg = (items, on) => `<div class="seg">${items.map((t, i) => `<span class="${i === on ? 'on' : ''}">${t}</span>`).join('')}</div>`;
const prog = (pct, color = 'var(--red)') => `<div class="bar" style="height:6px"><i style="width:${Math.min(100, pct)}%;background:${color}"></i></div>`;
const kpi = (l, v, d, up) => `<div class="card col g4 grow" style="padding:14px"><span class="xs mu">${l}</span><span class="h4 num">${v}</span><span class="xs ${up ? 'rd' : 'gr'} w6">${d}</span></div>`;
const cats = [['Food & dining', 126400, 31], ['Transport', 64800, 16], ['Bills & utilities', 58200, 14], ['Shopping', 52700, 13], ['Family & gifts', 40500, 10], ['Subscriptions', 33100, 8], ['Other', 29500, 8]];

const overview = mobile('01 Insights overview', th, `
  ${topbar('Insights', { back: false, right: `<div class="ib">${icon('calendar')}</div>` })}
  <div class="body" style="gap:14px">
    ${seg(['Day', 'Week', 'Month', 'Year'], 2)}
    <div class="card col g10">
      <div class="row between"><div class="col g4"><span class="xs mu">Spent in October</span><span class="h1 num">${naira(405200)}</span></div><span class="badge red">${icon('up', 11)} 12% vs Sep</span></div>
      ${line([318, 352, 341, 389, 362, 405], { w: 316, h: 90, labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'], dots: true })}
    </div>
    <div class="row g12">${kpi('Income', naira(512000), '+4% vs Sep', false)}${kpi('Saved', '18%', '−3 pts', true)}</div>
    <div class="card row g16" style="align-items:center">${donut(cats.slice(0, 5).map(c => c[1]), { size: 116, sw: 16, center: '5', sub: 'top' })}<div class="grow">${legend(cats.slice(0, 5).map(([l, v, p]) => [l, '', p + '%']))}</div></div>
  </div>`, { tab: 'insights' });

const daily = mobile('02 Daily spending', th, `
  ${topbar('Daily spending')}
  <div class="col g16 px20" style="margin-top:8px">
    ${seg(['Day', 'Week', 'Month', 'Year'], 0)}
    <div class="card col g10">
      <div class="row between"><span class="xs mu">Today · Fri 18 Oct</span><span class="badge amber">Above usual</span></div>
      <span class="h1 num">${naira(30250)}</span>
      ${bars([0, 0, 0, 0, 0, 0, 0, 2.1, 0.8, 0, 0, 0, 23.4, 0, 0, 0, 0, 0, 0, 6.8, 0, 0, 0, 0], { w: 316, h: 90, labels: ['12a', '', '', '', '', '', '6a', '', '', '', '', '', '12p', '', '', '', '', '', '6p', '', '', '', '', '11p'], hi: 12, gap: 0.25, rx: 3 })}
    </div>
    <div class="card col g12">
      <div class="row between"><span class="h4">October heatmap</span><span class="xs mu">Darker = more spend</span></div>
      <div class="row between xs mu" style="padding:0 2px">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<span style="width:38px;text-align:center">${d}</span>`).join('')}</div>
      ${heat(5, 7, { cell: 38, gap: 6 })}
      <div class="row between"><span class="xs t2">Busiest day: Saturday</span><span class="xs w6">avg ${naira(21400)}</span></div>
    </div>
  </div>`);

const categories = mobile('03 Categories', th, `
  ${topbar('Categories', { right: '<span class="chip">Oct ' + icon('chevd', 14) + '</span>' })}
  <div class="col g12 px20" style="margin-top:8px">
    <div class="soft row between"><span class="s t2">Total spent</span><span class="h4 num">${naira(405200)}</span></div>
    ${cats.map(([l, v, p], i) => `<div class="col g8" style="padding:6px 0"><div class="row g12"><div class="ic" style="width:36px;height:36px;border-radius:11px;background:${cat[i]}22;color:${cat[i]}">${icon(['food', 'car', 'zap', 'cart', 'heart', 'tv', 'more'][i], 17)}</div><span class="s w6 grow">${l}</span><div class="col" style="align-items:flex-end"><span class="s w6 num">${naira(v)}</span><span class="xs mu">${p}%</span></div></div>${prog(p * 3, cat[i])}</div>`).join('')}
  </div>`);

const catDetail = mobile('04 Category detail (Food)', th, `
  ${topbar('Food & dining', { right: `<div class="ib">${icon('more')}</div>` })}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="card col g10">
      <div class="row between"><div class="col g4"><span class="xs mu">October</span><span class="h1 num">${naira(126400)}</span></div><div class="col g4" style="align-items:flex-end"><span class="badge red">${icon('up', 11)} 22%</span><span class="xs mu">Budget ${naira(100000)}</span></div></div>
      ${prog(100)}
      <span class="xs rd w6">${naira(26400)} over budget with 13 days left</span>
    </div>
    <div class="card col g10"><span class="h4">Last 6 months</span>${bars([84, 92, 88, 101, 103, 126], { w: 316, h: 90, labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'], hi: 5 })}</div>
    <div class="col g12"><span class="h4">Top places</span>
      ${txn('food', 'Chicken Republic', '9 visits', naira(38700), { tone: 'red' })}
      ${txn('cart', 'Shoprite Lekki', 'Groceries · 4 visits', naira(31200), { tone: 'amber' })}
      ${txn('food', 'Bolt Food', '6 orders', naira(27900), { tone: 'red' })}
    </div>
    <div class="soft row g10" style="background:var(--red50)">${icon('sparkles', 18, 'var(--red)')}<span class="xs t2">Cooking 2 more meals a week could save about ${naira(18000)} a month.</span></div>
  </div>`);

const compare = mobile('05 3-month comparison', th, `
  ${topbar('Compare months')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="row g8">${['Aug', 'Sep', 'Oct'].map((m, i) => `<span class="chip ${i === 2 ? 'on' : ''}" style="flex:1;justify-content:center">${m}</span>`).join('')}</div>
    <div class="card col g10">
      <div class="row between"><span class="h4">Spend by category</span><span class="xs mu">₦ thousands</span></div>
      ${stacked([[101, 103, 126], [58, 61, 65], [55, 57, 58], [61, 44, 53], [38, 33, 41]], { w: 316, h: 130, labels: ['Aug ₦389k', 'Sep ₦362k', 'Oct ₦405k'] })}
      ${legend([['Food', '', ''], ['Transport', '', ''], ['Bills', '', ''], ['Shopping', '', ''], ['Family', '', '']]).replace('class="col g10"', 'class="row wrap" style="gap:8px 14px"')}
    </div>
    <div class="card col g10">
      <div class="row xs mu w6"><span class="grow">Category</span><span style="width:60px;text-align:right">Sep</span><span style="width:60px;text-align:right">Oct</span><span style="width:56px;text-align:right">Change</span></div>
      ${[['Food', '103k', '126k', '+22%', 1], ['Shopping', '44k', '53k', '+20%', 1], ['Transport', '61k', '65k', '+6%', 1], ['Subscriptions', '36k', '33k', '−8%', 0]].map(([c, a, b, d, up]) => `<div class="row s"><span class="grow w5">${c}</span><span class="num t2" style="width:60px;text-align:right">${a}</span><span class="num w6" style="width:60px;text-align:right">${b}</span><span class="num w6 ${up ? 'rd' : 'gr'}" style="width:56px;text-align:right">${d}</span></div>`).join('<div class="div"></div>')}
    </div>
  </div>`);

const bills = mobile('06 Bills and subscriptions', th, `
  ${topbar('Bills and subscriptions')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="row g12">${kpi('Monthly recurring', naira(91300), '7 active', false)}${kpi('Due in 7 days', naira(30700), '3 bills', true)}</div>
    <span class="h4">Coming up</span>
    ${[['tv', 'DStv Compact', 'Tomorrow · auto-debit', naira(15700), 'amber', 'Tomorrow'], ['zap', 'IKEDC prepaid', 'Usually every 9 days', naira(15000), 'blue', 'Sun'], ['phone', 'MTN data 20GB', '23 Oct', naira(6500), 'gray', 'Wed']].map(([i, n, s, v, t, b]) => `<div class="card row g12" style="padding:14px"><div class="ic ${t}" style="width:40px;height:40px;border-radius:12px">${icon(i, 19)}</div><div class="col g4 grow"><span class="s w6">${n}</span><span class="xs mu">${s}</span></div><div class="col g4" style="align-items:flex-end"><span class="s w6 num">${v}</span><span class="badge ${t === 'amber' ? 'amber' : 'gray'}">${b}</span></div></div>`).join('')}
    <div class="soft col g8"><div class="row g8">${icon('sparkles', 16, 'var(--red)')}<span class="s w6">2 subscriptions you rarely use</span></div><span class="xs t2">Netflix Premium (${naira(7000)}) and Apple Music (${naira(1100)}). Cancelling saves ${naira(97200)} a year.</span><span class="s rd w6">Review</span></div>
  </div>`);

const merchants = mobile('07 Top merchants and products', th, `
  ${topbar('Where you spend')}
  <div class="col g12 px20" style="margin-top:8px">
    ${seg(['Merchants', 'Products', 'Channels'], 0)}
    ${[['Shoprite', 'Groceries', 71400, 92], ['Chicken Republic', 'Food', 38700, 50], ['Bolt', 'Transport', 34200, 44], ['IKEDC', 'Electricity', 30000, 39], ['Jumia', 'Shopping', 27800, 36], ['DStv', 'Subscription', 15700, 20]].map(([n, c, v, p], i) => `<div class="row g12" style="padding:6px 0"><span class="s w7 mu" style="width:16px">${i + 1}</span><div class="col g6 grow"><div class="row between"><span class="s w6">${n}</span><span class="s w6 num">${naira(v)}</span></div><div class="row g8"><div class="grow">${prog(p, i === 0 ? 'var(--red)' : 'var(--ink)')}</div><span class="xs mu" style="width:70px;text-align:right">${c}</span></div></div></div>`).join('')}
    <div class="card row g12" style="padding:14px"><div class="col g4 grow"><span class="xs mu">POS vs transfer vs online</span><span class="s w6">48% · 31% · 21%</span></div>${donut([48, 31, 21], { size: 56, sw: 9 })}</div>
  </div>`);

const forecast = mobile('08 Cash-flow forecast', th, `
  ${topbar('Forecast')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="card col g10">
      <div class="row between"><div class="col g4"><span class="xs mu">Expected balance on 31 Oct</span><span class="h1 num">${naira(188400)}</span></div><span class="badge green">86% confident</span></div>
      ${line([812, 780, 742, 701, 655, 610, 520, 470, 410, 330, 260, 188], { w: 316, h: 100, compare: [812, 790, 760, 730, 700, 670, 640, 600, 560, 520, 480, 440], labels: ['18 Oct', '25 Oct', '31 Oct'] })}
      <div class="row g16 xs t2"><span class="row g6"><i style="width:14px;height:3px;background:var(--red);display:block;border-radius:2px"></i>Forecast</span><span class="row g6"><i style="width:14px;height:0;border-top:2px dashed var(--muted);display:block"></i>Usual month</span></div>
    </div>
    <div class="soft row g10" style="background:var(--amber50)">${icon('alert', 18, 'var(--amber)')}<span class="xs t2">Rent of ${naira(250000)} on 1 Nov could leave you ${naira(61600)} short. Move money from savings or pause 2 goals.</span></div>
    <span class="h4">What drives it</span>
    ${[['Salary (Kemi Foods)', '+' + naira(450000), '25 Oct', 1], ['Rent', '−' + naira(250000), '1 Nov', 0], ['Bills and subscriptions', '−' + naira(91300), 'This month', 0]].map(([n, v, d, up]) => `<div class="row between"><div class="col g4"><span class="s w6">${n}</span><span class="xs mu">${d}</span></div><span class="s w6 num ${up ? 'gr' : ''}">${v}</span></div>`).join('<div class="div"></div>')}
  </div>`);

const health = mobile('09 Financial health score', th, `
  ${topbar('Health score')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="card col center g8" style="padding:20px">${ring(74, { size: 150, sw: 14, color: 'var(--green)', label: '742' })}<span class="h3">Good, and improving</span><span class="xs t2">Up 18 points since September</span></div>
    ${[['Saving rate', '18% of income', 72, 'var(--green)'], ['Spending stability', 'Food is volatile', 58, 'var(--amber)'], ['Bills paid on time', '12 of 12', 100, 'var(--green)'], ['Debt to income', '14%', 80, 'var(--green)'], ['Emergency fund', '1.4 months', 35, 'var(--red)']].map(([n, s, p, c]) => `<div class="col g6"><div class="row between"><span class="s w6">${n}</span><span class="xs t2">${s}</span></div>${prog(p, c)}</div>`).join('')}
    <div class="soft row g10" style="background:var(--red50)">${icon('target', 18, 'var(--red)')}<span class="xs t2">Building your emergency fund to 3 months would add about 60 points.</span></div>
  </div>`);

const budgets = mobile('10 Budgets', th, `
  ${topbar('Budgets', { right: `<div class="ib">${icon('plus')}</div>` })}
  <div class="col g12 px20" style="margin-top:8px">
    <div class="card col g8"><div class="row between"><span class="xs mu">October budget</span><span class="xs mu">13 days left</span></div><div class="row between"><span class="h2 num">${naira(405200)}</span><span class="s t2">of ${naira(450000)}</span></div>${prog(90)}</div>
    ${[['food', 'Food & dining', 126400, 100000], ['car', 'Transport', 64800, 70000], ['cart', 'Shopping', 52700, 60000], ['tv', 'Subscriptions', 33100, 35000], ['heart', 'Family & gifts', 40500, 60000]].map(([i, n, v, b]) => { const p = Math.round(v / b * 100); const c = p >= 100 ? 'var(--red)' : p > 85 ? 'var(--amber)' : 'var(--green)'; return `<div class="card col g8" style="padding:14px"><div class="row g10"><div class="ic gray" style="width:34px;height:34px;border-radius:10px">${icon(i, 16)}</div><span class="s w6 grow">${n}</span><span class="xs w6" style="color:${c}">${p}%</span></div>${prog(p, c)}<div class="row between xs t2"><span>${naira(v)} spent</span><span>${p >= 100 ? naira(v - b) + ' over' : naira(b - v) + ' left'}</span></div></div>`; }).join('')}
  </div>`);

const goals = mobile('11 Goals', th, `
  ${topbar('Goals', { right: `<div class="ib">${icon('plus')}</div>` })}
  <div class="col g12 px20" style="margin-top:8px">
    ${[['Rent fund', 'Due 1 Jan', 900000, 1200000, 'building'], ['Emergency fund', '3 months of expenses', 560000, 1215000, 'umbrella'], ['New laptop', 'MacBook Air · Mar 2027', 310000, 1450000, 'laptop'], ['Japa fund', 'Long term', 120000, 5000000, 'globe']].map(([n, s, v, t, i], k) => `<div class="card row g14" style="padding:14px;gap:14px">${ring(Math.round(v / t * 100), { size: 56, sw: 6, color: k === 0 ? 'var(--green)' : 'var(--red)' })}<div class="col g4 grow"><span class="s w6">${n}</span><span class="xs mu">${s}</span><span class="xs t2"><b class="w6" style="color:var(--text)">${naira(v)}</b> of ${naira(t)}</span></div>${icon(i, 20, 'var(--muted)')}</div>`).join('')}
    <div class="soft row g10" style="background:var(--red50)">${icon('sparkles', 18, 'var(--red)')}<span class="xs t2">Auto-save ${naira(25000)} every payday to hit the rent fund 3 weeks early.</span></div>
    <div class="btn pri">${icon('plus', 18)} New goal</div>
  </div>`);

const anomaly = mobile('12 Unusual spend alert', th, `
  ${topbar('Alert')}
  <div class="col center g8" style="padding:8px 28px 0">
    <div class="ic red" style="width:64px;height:64px;border-radius:20px">${icon('alert', 30)}</div>
    <span class="h2" style="text-align:center">Was this you?</span>
    <span class="s t2" style="text-align:center">This payment is 4× bigger than your usual electronics spend.</span>
  </div>
  <div class="col g14 px20" style="margin-top:18px;gap:14px">
    <div class="card col g10">
      <div class="row g12"><div class="ic gray" style="width:44px;height:44px">${icon('laptop', 20)}</div><div class="col g4 grow"><span class="s w6">Slot Systems Ikeja</span><span class="xs mu">POS · Today 2:14 pm · Kuda •••• 1187</span></div></div>
      <div class="row between"><span class="s t2">Amount</span><span class="h3 num">${naira(85000)}</span></div>
      <div class="row between"><span class="s t2">Your usual</span><span class="s w6 num">${naira(21000)}</span></div>
    </div>
    <div class="card col g8"><span class="xs mu">Electronics spend · last 6 months</span>${bars([18, 22, 0, 25, 19, 85], { w: 316, h: 70, labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'], hi: 5 })}</div>
  </div>
  <div class="col g10" style="position:absolute;left:20px;right:20px;bottom:44px"><div class="btn pri">Yes, it was me</div><div class="btn out" style="color:var(--red);border-color:var(--red)">No, freeze my card</div></div>`);

const report = mobile('13 Monthly report', th, `
  ${topbar('October report', { right: `<div class="ib">${icon('download')}</div>` })}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="hero col g8"><span class="xs" style="opacity:.85">October 2026 · Adaeze</span><span style="font-size:22px;font-weight:800;line-height:28px">You kept ₦106,800 of what you earned.</span><div class="row g8">${['Saved 18%', 'Score 742', '3 bills auto-paid'].map(t => `<span class="badge" style="background:rgba(255,255,255,.18);color:#fff">${t}</span>`).join('')}</div></div>
    <span class="h4">Highlights</span>
    ${[['trendup', 'green', 'Income up 4%', 'Freelance design paid ₦62,000'], ['alert', 'red', 'Food over budget', '₦26,400 more than planned'], ['check', 'green', 'Subscriptions down 8%', 'You cancelled Showmax'], ['target', 'amber', 'Rent fund on track', '75% saved, due 1 Jan']].map(([i, t, a, b]) => `<div class="row g12"><div class="ic ${t}" style="width:36px;height:36px;border-radius:11px">${icon(i, 17)}</div><div class="col g4"><span class="s w6">${a}</span><span class="xs mu">${b}</span></div></div>`).join('')}
    <div class="row g10"><div class="btn sec grow" style="font-size:14px">${icon('volume', 18)} Listen (Yorùbá)</div><div class="btn sec grow">${icon('send', 18)} Share</div></div>
  </div>`);

export default [overview, daily, categories, catDetail, compare, bills, merchants, forecast, health, budgets, goals, anomaly, report];
