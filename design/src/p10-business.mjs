import { icon, mobile, topbar, naira, bars, stacked, line, donut, legend } from './lib.mjs';

const th = 'light';
const row = (l, r) => `<div class="row between"><span class="s t2">${l}</span><span class="s w6">${r}</span></div>`;
const kpi = (l, v, d, tone = 'gr') => `<div class="card col g4 grow" style="padding:14px"><span class="xs mu">${l}</span><span class="h4 num">${v}</span><span class="xs ${tone} w6">${d}</span></div>`;
const av = (t, bg) => `<div class="av" style="background:${bg};width:36px;height:36px;font-size:13px">${t}</div>`;
const chipRow = (items, on = 0) => `<div class="row g8">${items.map((t, i) => `<span class="chip ${i === on ? 'on' : ''}">${t}</span>`).join('')}</div>`;
const staff = [['AO', 'Aisha Okoro', 'Head chef', 180000, '#E30613'], ['BE', 'Bayo Eze', 'Kitchen staff', 95000, '#1D4ED8'], ['CN', 'Chioma Nwosu', 'Cashier', 85000, '#15803D'], ['DU', 'Dauda Umar', 'Dispatch rider', 75000, '#B45309'], ['FA', 'Funke Ade', 'Cleaner', 55000, '#7C3AED']];

const setup = mobile('01 Business setup', th, `
  ${topbar('Set up your business')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="row g6">${[1, 1, 0, 0].map((d) => `<div class="grow" style="height:4px;border-radius:2px;background:${d ? 'var(--red)' : 'var(--border)'}"></div>`).join('')}</div>
    <span class="h2">Tell NURU about your business</span>
    <div class="field"><span class="label">Business name</span><div class="input"><span>Kemi Foods Ltd</span></div></div>
    <div class="field"><span class="label">RC number</span><div class="input"><span class="num">RC 1843327</span>${icon('shieldcheck', 18, 'var(--green)')}</div></div>
    <span class="label">What kind of business?</span>
    <div class="row wrap g8" style="gap:8px">${['Food and drinks', 'Retail', 'Fashion', 'Services', 'Logistics', 'Agriculture', 'Tech'].map((t, i) => `<span class="chip ${i === 0 ? 'on' : ''}">${t}</span>`).join('')}</div>
    <div class="row g12"><div class="field grow"><span class="label">Staff</span><div class="input"><span class="num">5</span></div></div><div class="field grow"><span class="label">Monthly sales</span><div class="input"><span class="num">${naira(2400000)}</span></div></div></div>
    <div class="field"><span class="label">Who are your customers?</span><div class="input"><span class="grow">Office workers in Lekki, 25 to 40</span></div></div>
  </div>
  <div class="px20" style="position:absolute;left:0;right:0;bottom:34px"><div class="btn pri">Continue</div></div>`);

const dash = mobile('02 Business dashboard', th, `
  <div class="row between px20" style="height:56px;flex:none"><div class="row g10"><div class="mark" style="background:#1D4ED8">K</div><div class="col g4" style="gap:0"><span class="h4">Kemi Foods Ltd</span><span class="xs mu">Business · Main •••• 0094</span></div></div><div class="ib">${icon('chevd')}</div></div>
  <div class="body" style="gap:14px">
    <div class="card col g10">
      <div class="row between"><div class="col g4"><span class="xs mu">Profit in October</span><span class="h1 num">${naira(684000)}</span></div><span class="badge green">${icon('up', 11)} 9% vs Sep</span></div>
      ${stacked([[2.1, 2.3, 2.2, 2.6, 2.4, 2.7], [1.4, 1.5, 1.5, 1.7, 1.6, 1.8]], { w: 316, h: 100, labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'], colors: ['#15803D', '#E30613'] })}
      ${legend([['Sales', ''], ['Costs', '']], ['#15803D', '#E30613'])}
    </div>
    <div class="row g12">${kpi('Cash in bank', naira(1820000), '41 days of runway')}${kpi('Unpaid invoices', naira(415000), '3 overdue', 'rd')}</div>
    <div class="row between">${[['users', 'Payroll'], ['package', 'Vendors'], ['file', 'Invoices'], ['receipt', 'Expenses']].map(([i, t]) => `<div class="col center g8" style="width:76px"><div class="ic blue" style="width:52px;height:52px;border-radius:16px">${icon(i, 22)}</div><span class="xs w5">${t}</span></div>`).join('')}</div>
  </div>`, { tab: 'home' });

const payroll = mobile('03 Payroll', th, `
  ${topbar('Payroll', { right: `<div class="ib">${icon('plus')}</div>` })}
  <div class="col g12 px20" style="margin-top:8px">
    <div class="soft row between"><div class="col g4"><span class="xs mu">October payroll · 5 staff</span><span class="h3 num">${naira(490000)}</span></div><span class="badge amber">Due 28 Oct</span></div>
    <div class="row g12">${kpi('PAYE tax', naira(31200), 'auto-filed with LIRS', 't2')}${kpi('Pension 18%', naira(88200), 'to 3 PFAs', 't2')}</div>
    <span class="h4" style="margin-top:4px">Staff</span>
    ${staff.map(([i, n, r, s, c]) => `<div class="row g12" style="padding:4px 0">${av(i, c)}<div class="col g4 grow"><span class="s w6">${n}</span><span class="xs mu">${r}</span></div><span class="s w6 num">${naira(s)}</span></div>`).join('')}
  </div>
  <div class="px20" style="position:absolute;left:0;right:0;bottom:34px"><div class="btn pri">Review and run payroll</div></div>`);

const runPayroll = mobile('04 Run payroll', th, `
  ${topbar('Run payroll')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="card col g10">
      ${row('Net salaries', naira(458800))}
      ${row('PAYE (LIRS)', naira(31200))}
      ${row('Employee pension 8%', naira(39200))}
      ${row('Employer pension 10%', naira(49000))}
      ${row('NHF 2.5%', naira(12250))}
      <div class="div"></div>
      <div class="row between"><span class="s w6">Total from your bank •••• 0094</span><span class="h4 num">${naira(590450)}</span></div>
    </div>
    <div class="soft row g10" style="background:var(--green50)">${icon('check', 18, 'var(--green)')}<span class="xs t2 grow">You have ${naira(1820000)}. After payroll, ${naira(1229550)} stays in the account.</span></div>
    <div class="soft row g10">${icon('calendar', 18, 'var(--muted)')}<div class="col g4 grow"><span class="s w6">Pay on 28 Oct, 9:00 am</span><span class="xs mu">Staff get an SMS payslip</span></div><span class="rd s w6">Change</span></div>
  </div>
  <div class="px20" style="position:absolute;left:0;right:0;bottom:34px"><div class="btn pri">${icon('lock', 18, '#fff')} Approve ${naira(590450)}</div></div>`);

const payslip = mobile('05 Payslip', th, `
  ${topbar('Payslip', { right: `<div class="ib">${icon('download')}</div>` })}
  <div class="card col g12" style="margin:8px 20px 0">
    <div class="row g12">${av('AO', '#E30613')}<div class="col g4 grow"><span class="s w6">Aisha Okoro</span><span class="xs mu">Head chef · October 2026</span></div></div>
    <div class="div"></div>
    <span class="xs mu w6">EARNINGS</span>
    ${row('Basic', naira(108000))}
    ${row('Housing', naira(45000))}
    ${row('Transport', naira(27000))}
    <span class="xs mu w6" style="margin-top:4px">DEDUCTIONS</span>
    ${row('PAYE', '−' + naira(12400))}
    ${row('Pension 8%', '−' + naira(14400))}
    ${row('NHF', '−' + naira(4500))}
    <div class="div"></div>
    <div class="row between"><span class="s w6">Net pay</span><span class="h3 num">${naira(148700)}</span></div>
  </div>
  <div class="row g10 px20" style="margin-top:16px"><div class="btn sec grow">${icon('send', 18)} Send</div><div class="btn sec grow">${icon('download', 18)} PDF</div></div>`);

const vendors = mobile('06 Vendors', th, `
  ${topbar('Vendors', { right: `<div class="ib">${icon('plus')}</div>` })}
  <div class="col g12 px20" style="margin-top:8px">
    ${chipRow(['All', 'Due soon', 'Paid'])}
    ${[['Mile 12 Market (Alhaji Sule)', 'Tomatoes, peppers · weekly', 185000, 'Due Fri', 'amber'], ['Gas Plus Ikota', 'Cooking gas · bi-weekly', 64000, 'Due 24 Oct', 'amber'], ['Femi Solar Ltd', 'Inverter maintenance', 45000, 'Paid', 'green'], ['Pack-It Nigeria', 'Takeaway packs', 92000, 'Paid', 'green'], ['IKEDC (shop)', 'Electricity', 38000, 'Paid', 'green']].map(([n, s, a, st, t]) => `<div class="card row g12" style="padding:14px"><div class="ic gray" style="width:40px;height:40px;border-radius:12px">${icon('package', 18)}</div><div class="col g4 grow"><span class="s w6">${n}</span><span class="xs mu">${s}</span></div><div class="col g4" style="align-items:flex-end"><span class="s w6 num">${naira(a)}</span><span class="badge ${t}">${st}</span></div></div>`).join('')}
  </div>`);

const invoices = mobile('07 Invoices', th, `
  ${topbar('Invoices', { right: `<div class="ib">${icon('plus')}</div>` })}
  <div class="col g12 px20" style="margin-top:8px">
    <div class="row g12">${kpi('Owed to you', naira(415000), '5 invoices', 't2')}${kpi('Overdue', naira(240000), '3 invoices', 'rd')}</div>
    ${[['INV-0142', 'Lekki Tech Hub (lunch)', 120000, '14 days late', 'red'], ['INV-0139', 'Bimbo\'s wedding', 85000, '6 days late', 'red'], ['INV-0145', 'Yaba Coworking', 35000, '2 days late', 'red'], ['INV-0147', 'Access Bank staff party', 175000, 'Due 30 Oct', 'amber'], ['INV-0140', 'Chevron canteen', 260000, 'Paid', 'green']].map(([id, n, a, st, t]) => `<div class="row g12" style="padding:6px 0"><div class="col g4 grow"><span class="s w6">${n}</span><span class="xs mu">${id}</span></div><div class="col g4" style="align-items:flex-end"><span class="s w6 num">${naira(a)}</span><span class="badge ${t}">${st}</span></div></div>`).join('<div class="div"></div>')}
    <div class="soft row g10">${icon('sparkles', 18, 'var(--red)')}<span class="xs t2 grow">Send polite reminders to 3 late customers by WhatsApp and email?</span><span class="rd s w6">Send</span></div>
  </div>`);

const expenses = mobile('08 Expenses', th, `
  ${topbar('Business expenses')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="card row g16" style="align-items:center">${donut([590, 520, 180, 160, 150], { size: 110, sw: 16, center: naira(1.6, 1) + 'm', sub: 'Oct', colors: ['#E30613', '#3F3F46', '#FB7185', '#F59E0B', '#94A3B8'] })}<div class="grow">${legend([['Salaries', '37%'], ['Ingredients', '33%'], ['Advertising', '11%'], ['Rent and power', '10%'], ['Other', '9%']], ['#E30613', '#3F3F46', '#FB7185', '#F59E0B', '#94A3B8'])}</div></div>
    <span class="h4">Advertising</span>
    ${[['Instagram ads', '412 orders tracked', 95000, '₦230 per order'], ['Flyers in Lekki', 'No tracking', 45000, 'Unknown'], ['Chowdeck promo', '186 orders', 40000, '₦215 per order']].map(([n, s, a, r]) => `<div class="row g12"><div class="ic red" style="width:36px;height:36px;border-radius:11px">${icon('megaphone', 17)}</div><div class="col g4 grow"><span class="s w6">${n}</span><span class="xs mu">${s}</span></div><div class="col g4" style="align-items:flex-end"><span class="s w6 num">${naira(a)}</span><span class="xs t2">${r}</span></div></div>`).join('')}
    <div class="soft row g10">${icon('bulb', 18, 'var(--amber)')}<span class="xs t2 grow">Flyers have no tracking. Move ${naira(45000)} to Chowdeck, which brings orders at the lowest cost.</span></div>
  </div>`);

const plan = mobile('09 Financial plan', th, `
  ${topbar('12-month plan')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="card col g10">
      <div class="row between"><span class="s w6">Cash forecast</span><span class="badge blue">Nov 2026 to Oct 2027</span></div>
      ${line([1.82, 1.95, 2.3, 1.7, 1.9, 2.1, 2.4, 2.6, 2.2, 2.5, 2.9, 3.2], { w: 316, h: 90, labels: ['Nov', '', '', 'Feb', '', '', 'May', '', '', 'Aug', '', 'Oct'], color: 'var(--blue)' })}
    </div>
    <span class="h4">Plan items</span>
    ${[['umbrella', 'Insurance', 'Shop and staff health cover', 'Jan', 'green'], ['landmark', 'Funding', 'Raise ₦5m for a second kitchen', 'Mar', 'blue'], ['megaphone', 'Marketing', 'Target offices in Victoria Island', 'Feb', 'red'], ['calendar', 'Investor meeting', 'Ventures Platform · Femi O.', '22 Oct', 'amber']].map(([i, t, s, d, tone]) => `<div class="row g12"><div class="ic ${tone}" style="width:40px;height:40px;border-radius:12px">${icon(i, 18)}</div><div class="col g4 grow"><span class="s w6">${t}</span><span class="xs mu">${s}</span></div><span class="badge gray">${d}</span></div>`).join('')}
  </div>
  <div class="px20" style="position:absolute;left:0;right:0;bottom:34px"><div class="btn pri">${icon('sparkles', 18, '#fff')} Ask NURU to stress-test this plan</div></div>`);

const decision = mobile('10 Decision Room', th, `
  ${topbar('Decision Room')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="soft col g6"><span class="xs mu">You asked</span><span class="s w6">Should I open a second kitchen in Yaba in March?</span></div>
    <span class="label">Change the numbers</span>
    ${[['Loan amount', naira(5000000), 62], ['Expected daily orders', '85', 48], ['Interest rate', '24% a year', 40]].map(([l, v, p]) => `<div class="col g8"><div class="row between"><span class="s t2">${l}</span><span class="s w6 num">${v}</span></div><div style="position:relative;height:6px;border-radius:3px;background:var(--surface2)"><div style="width:${p}%;height:6px;border-radius:3px;background:var(--red)"></div><div style="position:absolute;left:calc(${p}% - 10px);top:-7px;width:20px;height:20px;border-radius:10px;background:#fff;border:2px solid var(--red)"></div></div></div>`).join('')}
    <div class="row g12">${kpi('Break-even', '7 months', 'Sep 2027', 't2')}${kpi('Year-1 profit', naira(3900000), '+57%')}</div>
  </div>
  <div class="px20" style="position:absolute;left:0;right:0;bottom:34px"><div class="btn pri">See NURU's verdict</div></div>`);

const verdict = mobile('11 Decision result', th, `
  ${topbar('Verdict')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="card col g10" style="border-color:var(--green)">
      <div class="row g10"><div class="ic green" style="width:40px;height:40px;border-radius:12px">${icon('check', 20)}</div><div class="col g4"><span class="h4">Yes, with conditions</span><span class="xs mu">Confidence 72%</span></div></div>
      <span class="s t2">The Yaba kitchen pays back in about 7 months if you reach 85 orders a day. Your cash stays above ${naira(600000)} the whole year.</span>
    </div>
    <span class="h4">Do these first</span>
    ${['Keep 2 months of payroll (about ₦1.2m) untouched', 'Test Yaba demand with Chowdeck for 4 weeks', 'Choose a fixed-rate loan, not variable'].map((t, i) => `<div class="row g12"><div class="col center" style="width:26px;height:26px;border-radius:13px;background:var(--red50);color:var(--red);font-size:13px;font-weight:700">${i + 1}</div><span class="s grow">${t}</span></div>`).join('')}
    <span class="h4">Risks</span>
    ${[['Orders below 60 a day delays break-even to 14 months'], ['Diesel above ₦1,400 a litre cuts profit by 18%']].map(([t]) => `<div class="row g10">${icon('alert', 16, 'var(--amber)')}<span class="s grow">${t}</span></div>`).join('')}
  </div>
  <div class="row g10 px20" style="position:absolute;left:0;right:0;bottom:34px"><div class="btn sec grow">Save to plan</div><div class="btn pri grow">Find a loan</div></div>`);

const investor = mobile('12 Investor prep', th, `
  ${topbar('Investor meeting')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="card row g12"><div class="ic blue" style="width:44px;height:44px;border-radius:14px">${icon('calendar', 20)}</div><div class="col g4 grow"><span class="s w6">Femi O. · Ventures Platform</span><span class="xs mu">Tue 22 Oct · 2:00 pm · Google Meet</span></div></div>
    <span class="h4">One-page summary NURU drafted</span>
    <div class="card col g10">
      ${row('Revenue (last 12 months)', naira(26400000))}
      ${row('Gross margin', '38%')}
      ${row('Monthly growth', '6.2%')}
      ${row('Repeat customers', '64%')}
      ${row('Asking', naira(5000000) + ' for 10%')}
    </div>
    <span class="h4">Questions to expect</span>
    ${['Why Yaba and not Ikeja?', 'What happens if food prices rise again?', 'How will you hire a second head chef?'].map((t) => `<div class="row g10">${icon('help', 16, 'var(--muted)')}<span class="s grow">${t}</span></div>`).join('')}
  </div>
  <div class="row g10 px20" style="position:absolute;left:0;right:0;bottom:34px"><div class="btn sec grow">${icon('bell', 18)} Remind me</div><div class="btn pri grow">${icon('download', 18, '#fff')} Export PDF</div></div>`);

export default [setup, dash, payroll, runPayroll, payslip, vendors, invoices, expenses, plan, decision, verdict, investor];
