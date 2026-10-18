import { icon, web, logo, naira, bars, line, donut, legend, stacked } from './lib.mjs';

const th = 'light';
const navItems = [['home', 'Home'], ['chart', 'Insights'], ['sparkles', 'Ask NURU'], ['send', 'Pay and transfer'], ['landmark', 'Loans and savings'], ['briefcase', 'Business'], ['calendar', 'Planner']];
const chats = ['Where did my money go this week?', 'Can I afford a ₦5m loan?', 'Plan December spending', 'Ṣé mo lè fi ₦50,000 pamọ́?', 'Compare Aug, Sep and Oct'];

// Claude-style sidebar: full with labels and recent chats, or a narrow icon rail
const sidebar = (active, collapsed = false) => collapsed
  ? `<div class="col center g8" style="width:72px;height:900px;flex:none;background:var(--surface);border-right:1px solid var(--border);padding:16px 0">
      <div class="mark" style="width:36px;height:36px">N</div>
      <div class="ib" style="margin-top:6px;background:transparent">${icon('panel', 20, 'var(--text2)')}</div>
      <div class="ib" style="background:var(--red);color:#fff">${icon('plus', 20, '#fff')}</div>
      <div class="div" style="width:40px;margin:6px 0"></div>
      ${navItems.map(([ic, t]) => `<div class="ib" style="${t === active ? 'background:var(--red50);color:var(--red)' : 'background:transparent;color:var(--text2)'}">${icon(ic, 20)}</div>`).join('')}
      <div class="grow"></div>
      <div class="ib" style="background:transparent;color:var(--text2)">${icon('settings', 20)}</div>
      <div class="av" style="width:36px;height:36px;font-size:13px">AO</div>
    </div>`
  : `<div class="col" style="width:272px;height:900px;flex:none;background:var(--surface);border-right:1px solid var(--border);padding:16px 14px">
      <div class="row between" style="padding:0 6px">${logo(32)}<div class="ib" style="width:34px;height:34px;background:transparent">${icon('panel', 20, 'var(--text2)')}</div></div>
      <div class="btn pri sm" style="margin-top:18px;height:42px;justify-content:flex-start;font-size:14px">${icon('plus', 18, '#fff')} New chat with NURU</div>
      <div class="col" style="margin-top:14px;gap:2px">${navItems.map(([ic, t]) => `<div class="row g12" style="height:40px;padding:0 10px;border-radius:10px;font-size:14px;font-weight:${t === active ? 600 : 500};${t === active ? 'background:var(--red50);color:var(--red)' : 'color:var(--text2)'}">${icon(ic, 18)}<span>${t}</span></div>`).join('')}</div>
      <span class="xs mu w6" style="margin:18px 10px 6px">RECENT CHATS</span>
      <div class="col" style="gap:2px">${chats.map((t, i) => `<div class="row" style="height:34px;padding:0 10px;border-radius:8px;font-size:13px;color:var(--text2);${i === 0 && active === 'Ask NURU' ? 'background:var(--surface2);color:var(--text)' : ''}"><span>${t}</span></div>`).join('')}</div>
      <div class="grow"></div>
      <div class="row g10" style="padding:10px;border-radius:12px;border:1px solid var(--border);background:var(--bg)"><div class="av" style="width:34px;height:34px;font-size:12px">AO</div><div class="col g4 grow"><span class="s w6">Adaeze Okafor</span><span class="xs mu">Personal · Tier 2</span></div>${icon('settings', 18, 'var(--muted)')}</div>
    </div>`;

const topbar = (title, sub, right = '') => `<div class="row between" style="height:72px;padding:0 32px;flex:none;border-bottom:1px solid var(--border)">
  <div class="col g4"><span class="h2" style="font-size:20px">${title}</span><span class="xs mu">${sub}</span></div>
  <div class="row g12"><div class="input" style="width:280px;height:40px;background:var(--surface);border-color:transparent">${icon('search', 16, 'var(--muted)')}<span class="s mu">Search or ask NURU</span></div>${right}<div class="ib">${icon('bell', 18)}</div><div class="ib">${icon('sun', 18)}</div></div>
</div>`;
const shell = (name, active, title, sub, body, { collapsed = false, right = '' } = {}) =>
  web(name, th, `<div class="row" style="height:900px;align-items:stretch">${sidebar(active, collapsed)}<div class="col grow">${topbar(title, sub, right)}<div class="col grow" style="padding:24px 32px;gap:20px;background:var(--bg)">${body}</div></div></div>`, 'height:900px');


// grouped bars: one cluster per label, one bar per series
const gbars = (series, { w = 560, h = 170, labels = [], colors = ['#94A3B8', '#3F3F46', '#E30613'] } = {}) => {
  const max = Math.max(...series.flat()), n = labels.length, k = series.length, gw = w / n, bw = Math.min(22, (gw * 0.7) / k), ch = h - 22;
  let out = '';
  labels.forEach((l, i) => {
    const x0 = i * gw + (gw - bw * k - 4 * (k - 1)) / 2;
    series.forEach((sv, j) => { const bh = (sv[i] / max) * (ch - 6); out += `<rect x="${(x0 + j * (bw + 4)).toFixed(1)}" y="${(ch - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="4" fill="${colors[j]}"></rect>`; });
    out += `<text x="${(i * gw + gw / 2).toFixed(1)}" y="${h - 4}" text-anchor="middle" font-size="11" fill="#8c8c97">${l}</text>`;
  });
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${out}</svg>`;
};

const kpi = (l, v, d, tone = 'gr', ic = 'wallet') => `<div class="card col g8 grow" style="padding:18px"><div class="row between"><span class="s mu">${l}</span><div class="ic gray" style="width:32px;height:32px;border-radius:10px">${icon(ic, 16)}</div></div><span class="h1 num" style="font-size:26px">${v}</span><span class="xs ${tone} w6">${d}</span></div>`;
const txRow = (ic, n, c, d, a, credit) => `<tr><td><div class="row g10"><div class="ic gray" style="width:32px;height:32px;border-radius:10px">${icon(ic, 15)}</div><span class="w6">${n}</span></div></td><td class="t2">${c}</td><td class="t2">${d}</td><td style="text-align:right" class="w6 num ${credit ? 'gr' : ''}">${credit ? '+' : '-'}${naira(a)}</td></tr>`;

const dashBody = (wide) => `
  <div class="row g16">${kpi('Total balance', naira(1284500), '+₦62,400 this week', 'gr', 'wallet')}${kpi('Spent in October', naira(293500), '8% less than September', 'gr', 'down')}${kpi('Saved this month', naira(128000), '20% of income', 'gr', 'target')}${kpi('Next bill', naira(350000), 'Rent · 21 Oct', 'am', 'calendar')}</div>
  <div class="row g16" style="align-items:stretch">
    <div class="card col g12" style="flex:${wide ? 1.7 : 1.5}">
      <div class="row between"><div class="col g4"><span class="h4">Spending, last 3 months</span><span class="xs mu">Each week of August, September and October</span></div><div class="seg" style="width:260px"><span>Daily</span><span>Weekly</span><span class="on">Monthly</span><span>Yearly</span></div></div>
      ${gbars([[61, 72, 66, 69], [70, 95, 74, 73], [68, 71, 82, 72]], { w: wide ? 700 : 560, h: 170, labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'] })}
      <div class="row g24">${[['August', naira(268000), 'Steady month', '#94A3B8'], ['September', naira(312000), 'Highest, school fees', '#3F3F46'], ['October', naira(293500), '8% less than September', '#E30613']].map(([m, v, s, c]) => `<div class="col g4"><div class="row g6"><div style="width:10px;height:10px;border-radius:3px;background:${c}"></div><span class="xs mu">${m}</span></div><span class="h4 num">${v}</span><span class="xs t2">${s}</span></div>`).join('')}</div>
    </div>
    <div class="card col g12" style="flex:1">
      <span class="h4">Where it went</span>
      <div class="row g16">${donut([32, 18, 14, 12, 24], { size: 140, sw: 18, center: '₦293k', sub: 'Oct' })}<div class="col g8 grow">${[['Food', '32%'], ['Transport', '18%'], ['Bills', '14%'], ['Family', '12%'], ['Other', '24%']].map(([l, p], i) => `<div class="row g8"><div style="width:10px;height:10px;border-radius:3px;background:${['#E30613', '#3F3F46', '#FB7185', '#F59E0B', '#94A3B8'][i]}"></div><span class="s grow">${l}</span><span class="s w6">${p}</span></div>`).join('')}</div></div>
      <div class="soft row g10">${icon('sparkles', 18, 'var(--red)')}<span class="xs t2 grow">Food is ₦12,000 over budget. Cooking at home twice more a week brings it back.</span></div>
    </div>
  </div>
  <div class="card col" style="padding:0">
    <div class="row between" style="padding:16px 18px 6px"><span class="h4">Recent transactions</span><span class="s rd w6">See all</span></div>
    <table class="tbl"><tr><th>Name</th><th>Category</th><th>Date</th><th style="text-align:right">Amount</th></tr>
    ${txRow('food', 'Shoprite Lekki', 'Food', 'Today, 9:12 am', 86500)}${txRow('down', 'Andela Nigeria', 'Salary', 'Yesterday', 640000, true)}${txRow('car', 'Bolt', 'Transport', '16 Oct', 4200)}</table>
  </div>`;

const dash = shell('01 Dashboard', 'Home', 'Good morning, Adaeze', 'Saturday 18 October 2026 · 3 linked accounts', dashBody(false));
const dashCollapsed = shell('02 Dashboard, sidebar collapsed', 'Home', 'Good morning, Adaeze', 'Saturday 18 October 2026 · 3 linked accounts', dashBody(true), { collapsed: true });

const chatBody = `
  <div class="col g20" style="width:760px;align-self:center;flex:1">
    <div class="bubble me" style="max-width:520px;font-size:15px">Where did my money go this week, and how does it compare with the last two months?</div>
    <div class="row g12" style="align-items:flex-start">
      <div class="mark" style="width:32px;height:32px;font-size:16px;flex:none">N</div>
      <div class="col g14 grow" style="gap:14px">
        <span class="b">You spent <b>${naira(84200)}</b> this week, 12% less than your weekly average. Food and transport made up most of it.</span>
        <div class="card col g10"><div class="row between"><span class="s w6">Weekly spending, Aug to Oct</span><span class="badge green">${icon('down', 11)} 12%</span></div>${line([92, 88, 101, 95, 99, 104, 96, 91, 97, 93, 89, 84], { w: 640, h: 140, labels: ['Aug', '', '', '', 'Sep', '', '', '', 'Oct', '', '', 'Now'], compare: [95, 95, 95, 95, 95, 95, 95, 95, 95, 95, 95, 95] })}</div>
        <div class="row g10">${[['food', 'Food', naira(31400)], ['car', 'Transport', naira(18900)], ['zap', 'Data and power', naira(12600)]].map(([ic, l, v]) => `<div class="soft row g10 grow">${icon(ic, 18, 'var(--text2)')}<div class="col g4"><span class="xs mu">${l}</span><span class="s w6 num">${v}</span></div></div>`).join('')}</div>
        <span class="b">Want me to move the ${naira(15000)} you saved into your Japa fund?</span>
        <div class="row g8"><span class="chip on">Yes, move it</span><span class="chip">Show me by day</span><span class="chip">Explain in Yorùbá</span></div>
        <div class="row g12">${['copy', 'volume', 'thumbup', 'refresh'].map((i) => icon(i, 16, 'var(--muted)')).join('')}<span class="xs mu">Sources: Zenith •••• 4417, OPay sandbox</span></div>
      </div>
    </div>
  </div>
  <div class="col g8" style="width:760px;align-self:center">
    <div class="row g10" style="padding:12px 14px;border-radius:20px;border:1.5px solid var(--border);background:var(--bg);box-shadow:var(--shadow)">
      <div class="ib" style="width:36px;height:36px">${icon('plus', 18)}</div><span class="b mu grow">Ask about your money, in any language</span>
      <span class="chip" style="height:30px">${icon('globe', 14)} English</span>
      <div class="ib" style="width:36px;height:36px">${icon('mic', 18)}</div>
      <div class="ib" style="width:36px;height:36px;background:var(--red);color:#fff">${icon('send', 18, '#fff')}</div>
    </div>
    <span class="xs mu" style="text-align:center">NURU only answers money questions. Your chat is encrypted and private.</span>
  </div>`;
const chat = shell('03 Ask NURU', 'Ask NURU', 'Ask NURU', 'Private chat · encrypted', chatBody);

const insightsBody = `
  <div class="row between"><div class="row g8">${['This month', 'Last 3 months', 'This year', 'Custom'].map((t, i) => `<span class="chip ${i === 1 ? 'on' : ''}">${t}</span>`).join('')}</div><div class="row g8"><span class="chip">${icon('filter', 14)} All accounts</span><span class="chip">${icon('download', 14)} Export</span></div></div>
  <div class="row g16" style="align-items:stretch">
    <div class="card col g10" style="flex:1.4"><span class="h4">Money in vs money out</span>${gbars([[640, 640, 652], [268, 312, 293]], { w: 520, h: 180, labels: ['August', 'September', 'October'], colors: ['#15803D', '#E30613'] })}${legend([['Money in', ''], ['Money out', '']], ['#15803D', '#E30613'])}</div>
    <div class="card col g10" style="flex:1"><span class="h4">Daily spending heat</span>${(() => { const v = [3, 5, 2, 8, 4, 9, 6, 2, 4, 7, 3, 5, 8, 6, 1, 3, 6, 4, 7, 9, 5, 2, 4, 3, 6, 8, 4, 2]; return `<div class="row wrap" style="gap:6px;width:330px">${v.map((x) => `<div style="width:40px;height:40px;border-radius:8px;background:rgba(227,6,19,${(x / 10).toFixed(2)})"></div>`).join('')}</div>`; })()}<span class="xs mu">Fridays and Saturdays cost the most</span></div>
  </div>
  <div class="row g16" style="align-items:stretch">
    <div class="card col g10" style="flex:1"><span class="h4">Top merchants</span>${[['Shoprite', 86500, 100], ['Chowdeck', 41200, 48], ['Bolt', 29800, 34], ['MTN', 15000, 17]].map(([n, v, p]) => `<div class="col g6"><div class="row between"><span class="s">${n}</span><span class="s w6 num">${naira(v)}</span></div><div style="height:6px;border-radius:3px;background:var(--surface2)"><div style="width:${p}%;height:6px;border-radius:3px;background:var(--red)"></div></div></div>`).join('')}</div>
    <div class="card col g10" style="flex:1"><span class="h4">Financial health</span><div class="row g16"><div class="col g4"><span class="h1" style="font-size:40px">742</span><span class="xs gr w6">Good · up 18 points</span></div></div>${[['Saving rate', '20%', 'gr'], ['Debt to income', '7%', 'gr'], ['Emergency fund', '2.4 months', 'am']].map(([l, v, t]) => `<div class="row between"><span class="s t2">${l}</span><span class="s w6 ${t}">${v}</span></div>`).join('')}</div>
    <div class="card col g10" style="flex:1"><span class="h4">Forecast for November</span>${line([1284, 1230, 1190, 1420, 1360, 1310], { w: 300, h: 110, color: 'var(--blue)', labels: ['Now', '', 'Rent', 'Salary', '', '30 Nov'] })}<span class="xs t2">Your balance should end November near ${naira(1310000)}.</span></div>
  </div>`;
const insights = shell('04 Insights', 'Insights', 'Insights', 'August to October 2026 · all accounts', insightsBody);

const bizBody = `
  <div class="row g16">${kpi('Profit in October', naira(684000), '9% more than September', 'gr', 'trendup')}${kpi('Cash in bank', naira(1820000), '41 days of runway', 'gr', 'wallet')}${kpi('Unpaid invoices', naira(415000), '3 overdue', 'rd', 'file')}${kpi('Payroll due', naira(590450), '28 Oct · 5 staff', 'am', 'users')}</div>
  <div class="row g16" style="align-items:stretch">
    <div class="card col" style="flex:1.4;padding:0">
      <div class="row between" style="padding:16px 18px 6px"><span class="h4">Payroll · October</span><div class="btn pri sm">Run payroll</div></div>
      <table class="tbl"><tr><th>Staff</th><th>Role</th><th>Gross</th><th>PAYE</th><th style="text-align:right">Net pay</th></tr>
      ${[['AO', 'Aisha Okoro', 'Head chef', 180000, 11400, '#E30613'], ['BE', 'Bayo Eze', 'Kitchen staff', 95000, 6100, '#1D4ED8'], ['CN', 'Chioma Nwosu', 'Cashier', 85000, 5300, '#15803D'], ['DU', 'Dauda Umar', 'Dispatch rider', 75000, 4900, '#B45309'], ['FA', 'Funke Ade', 'Cleaner', 55000, 3500, '#7C3AED']].map(([i, n, r, g, p, c]) => `<tr><td><div class="row g10"><div class="av" style="width:30px;height:30px;font-size:11px;background:${c}">${i}</div><span class="w6">${n}</span></div></td><td class="t2">${r}</td><td class="num">${naira(g)}</td><td class="num t2">${naira(p)}</td><td style="text-align:right" class="w6 num">${naira(g - p - g * 0.08)}</td></tr>`).join('')}</table>
    </div>
    <div class="card col g12" style="flex:1"><span class="h4">Sales and costs</span>${stacked([[2.1, 2.3, 2.2, 2.6, 2.4, 2.7], [1.4, 1.5, 1.5, 1.7, 1.6, 1.8]], { w: 380, h: 170, labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'], colors: ['#15803D', '#E30613'] })}${legend([['Sales', ''], ['Costs', '']], ['#15803D', '#E30613'])}<div class="soft row g10">${icon('sparkles', 18, 'var(--red)')}<span class="xs t2 grow">Move ₦45,000 from flyers to Chowdeck ads. It brings orders at the lowest cost.</span></div></div>
  </div>`;
const business = shell('05 Business', 'Business', 'Kemi Foods Ltd', 'Business mode · Zenith •••• 0094', bizBody, { right: `<div class="seg" style="width:200px"><span>Personal</span><span class="on">Business</span></div>` });

const settingsBody = `
  <div class="row g24" style="align-items:flex-start">
    <div class="col" style="width:220px;gap:2px">${['Profile', 'Appearance', 'Language and voice', 'Currency', 'Security', 'Privacy and data', 'Linked accounts', 'Notifications'].map((t) => `<div class="row" style="height:40px;padding:0 12px;border-radius:10px;font-size:14px;${t === 'Appearance' ? 'background:var(--surface2);font-weight:600' : 'color:var(--text2)'}"><span>${t}</span></div>`).join('')}</div>
    <div class="col g20 grow">
      <div class="card col g16"><span class="h4">Theme</span><div class="row g16">${[['Light', '#FFFFFF', '#EFEFF2', 0], ['Dark', '#0D0D0F', '#26262B', 0], ['System', '', '', 1]].map(([t, bg, sub, on]) => `<div class="col g8" style="width:200px"><div class="row" style="height:120px;border-radius:14px;overflow:hidden;border:2px solid ${on ? 'var(--red)' : 'var(--border)'}">${(bg ? [[bg, sub]] : [['#FFFFFF', '#EFEFF2'], ['#0D0D0F', '#26262B']]).map(([b, s]) => `<div class="pane col g6 grow" style="background:${b};padding:12px"><div style="height:10px;width:50px;border-radius:3px;background:${s}"></div><div style="height:30px;border-radius:6px;background:#E30613"></div><div style="height:10px;border-radius:3px;background:${s}"></div></div>`).join('')}</div><span class="s ${on ? 'w6' : 't2'}">${t}</span></div>`).join('')}</div></div>
      <div class="card col g14"><span class="h4">Language</span><div class="row g10">${['English', 'Yorùbá', 'Igbo', 'Hausa'].map((l, i) => `<span class="chip ${i === 1 ? 'on' : ''}">${l}</span>`).join('')}</div><div class="row between"><span class="s t2">Read answers aloud</span><div class="toggle on"><i></i></div></div></div>
      <div class="card col g14"><span class="h4">Display currency</span><div class="row g10">${['NGN', 'USD', 'GBP', 'EUR'].map((l, i) => `<span class="chip ${i === 0 ? 'on' : ''}">${l}</span>`).join('')}</div><span class="xs mu">Live rate: $1 = ₦1,523.50 · updated 2 minutes ago</span></div>
    </div>
  </div>`;
const settings = shell('06 Settings', '', 'Settings', 'Appearance, language and currency', settingsBody, { collapsed: true });

export default [dash, dashCollapsed, chat, insights, business, settings];
