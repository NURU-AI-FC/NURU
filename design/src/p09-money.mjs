import { icon, mobile, topbar, naira, line, bars, ring, donut } from './lib.mjs';

const th = 'light';
const row = (l, r) => `<div class="row between"><span class="s t2">${l}</span><span class="s w6">${r}</span></div>`;
const prog = (pct, color = 'var(--red)') => `<div class="bar" style="height:6px"><i style="width:${Math.min(100, pct)}%;background:${color}"></i></div>`;
const seg = (items, on) => `<div class="seg">${items.map((t, i) => `<span class="${i === on ? 'on' : ''}">${t}</span>`).join('')}</div>`;
const tile = (i, tone, t, v, s) => `<div class="card col g8 grow" style="padding:14px"><div class="ic ${tone}" style="width:34px;height:34px;border-radius:10px">${icon(i, 16)}</div><span class="xs mu">${t}</span><span class="h4 num">${v}</span><span class="xs t2">${s}</span></div>`;

const loans = mobile('01 Loans overview', th, `
  ${topbar('Loans and credit')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="hero col g10">
      <span class="xs" style="opacity:.85">Total you owe</span>
      <span class="h1 num">${naira(612400)}</span>
      <div class="bar" style="height:6px;background:rgba(255,255,255,.25)"><i style="width:38%;background:#fff"></i></div>
      <span class="xs" style="opacity:.85">38% repaid · next payment ${naira(52300)} on 25 Oct</span>
    </div>
    ${[['Carbon personal loan', 'Carbon', 312400, 52300, '25 Oct', 46, 'amber'], ['Zenith salary advance', 'Zenith', 180000, 60000, '31 Oct', 33, 'red'], ['Equipment lease', 'Lendigo', 120000, 20000, '5 Nov', 25, 'blue']].map(([n, l, b, p, d, pct, t]) => `<div class="card col g10" style="padding:14px"><div class="row g12"><div class="ic ${t}" style="width:40px;height:40px;border-radius:12px">${icon('landmark', 18)}</div><div class="col g4 grow"><span class="s w6">${n}</span><span class="xs mu">${l} · ${naira(p)} due ${d}</span></div><span class="s w6 num">${naira(b)}</span></div>${prog(pct, 'var(--green)')}</div>`).join('')}
    <div class="soft row g10">${icon('sparkles', 18, 'var(--red)')}<span class="xs t2 grow">Paying Carbon first saves ${naira(14200)} in interest because it has the highest rate (4.5% monthly).</span></div>
  </div>`);

const loanDetail = mobile('02 Loan detail', th, `
  ${topbar('Carbon personal loan')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="card col g12">
      <div class="row between"><div class="col g4"><span class="xs mu">Balance</span><span class="h1 num">${naira(312400)}</span></div>${ring(46, { size: 64, sw: 7, color: 'var(--green)' })}</div>
      <div class="div"></div>
      ${row('Borrowed', naira(500000))}
      ${row('Interest', '4.5% monthly · 54% a year')}
      ${row('Disbursed', '12 Jun 2026')}
      ${row('Final payment', '12 Feb 2027')}
      ${row('Monthly payment', naira(52300))}
    </div>
    <span class="h4">Repayment schedule</span>
    ${[['25 Sep', 'Paid', 'green'], ['25 Oct', 'Due in 7 days', 'amber'], ['25 Nov', 'Upcoming', 'gray'], ['25 Dec', 'Upcoming', 'gray']].map(([d, s, t]) => `<div class="row g12"><div class="col center" style="width:10px;height:10px;border-radius:5px;background:var(--${t === 'gray' ? 'border' : t})"></div><span class="s w6 grow">${d}</span><span class="badge ${t}">${s}</span><span class="s num">${naira(52300)}</span></div>`).join('')}
  </div>
  <div class="row g10 px20" style="position:absolute;left:0;right:0;bottom:34px"><div class="btn sec grow">Set reminder</div><div class="btn pri grow">Pay early</div></div>`);

const loanOffer = mobile('03 Loan eligibility', th, `
  ${topbar('Borrow')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="card col center g8" style="text-align:center">
      <span class="xs mu">You can borrow up to</span>
      <span class="h1 num">${naira(750000)}</span>
      <span class="badge green">${icon('check', 11)} Based on 6 months of salary into Zenith</span>
    </div>
    <div class="field"><span class="label">How much do you need?</span><div class="input focus"><span class="num w6">${naira(300000)}</span></div></div>
    <span class="label">Pay back over</span>
    ${seg(['3 months', '6 months', '12 months'], 1)}
    <div class="card col g10">
      ${row('Monthly payment', naira(54800))}
      ${row('Interest rate', '2.5% monthly')}
      ${row('Total you repay', naira(328800))}
      ${row('Money arrives', 'In 5 minutes')}
    </div>
    <div class="soft row g10">${icon('info', 18, 'var(--muted)')}<span class="xs t2 grow">This would take your total monthly loan payments to 26% of income. Under 30% is healthy.</span></div>
  </div>
  <div class="px20" style="position:absolute;left:0;right:0;bottom:34px"><div class="btn pri">Continue</div></div>`);

const refunds = mobile('04 Refunds and disputes', th, `
  ${topbar('Refunds', { right: `<div class="ib">${icon('plus')}</div>` })}
  <div class="col g12 px20" style="margin-top:8px">
    <div class="row g12">${tile('undo', 'green', 'Refunded this year', naira(46900), '5 refunds')}${tile('clock', 'amber', 'In progress', naira(18500), '2 claims')}</div>
    <span class="h4" style="margin-top:4px">Claims</span>
    ${[['Jumia order #88213', 'Item not delivered', 12500, 'In review', 'amber', 60], ['POS double charge', 'Shoprite Lekki', 6000, 'Bank investigating', 'amber', 35], ['Bolt trip refund', 'Driver cancelled', 3400, 'Refunded', 'green', 100], ['Failed transfer', 'To Opay •••• 5521', 20000, 'Reversed', 'green', 100]].map(([n, s, a, st, t, pct]) => `<div class="card col g10" style="padding:14px"><div class="row g12"><div class="col g4 grow"><span class="s w6">${n}</span><span class="xs mu">${s}</span></div><div class="col g4" style="align-items:flex-end"><span class="s w6 num">${naira(a)}</span><span class="badge ${t}">${st}</span></div></div>${pct < 100 ? prog(pct, 'var(--amber)') : ''}</div>`).join('')}
  </div>`);

const invest = mobile('05 Investments', th, `
  ${topbar('Investments')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="card col g10">
      <div class="row between"><div class="col g4"><span class="xs mu">Portfolio value</span><span class="h1 num">${naira(2184000)}</span></div><span class="badge green">${icon('up', 11)} 14.2% this year</span></div>
      ${line([1.62, 1.71, 1.78, 1.84, 1.95, 2.04, 2.18], { w: 316, h: 90, labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'], color: 'var(--green)' })}
    </div>
    ${[['Zenith fixed deposit', '18% a year · matures 12 Jan', 1000000, '+₦61,200', 'landmark', 'red'], ['FGN savings bond', '16.4% · quarterly coupon', 500000, '+₦20,500', 'shield', 'blue'], ['Money market fund', 'Stanbic IBTC · 21.3%', 484000, '+₦44,100', 'trendup', 'green'], ['US stocks', 'Bamboo · $130', 200000, '+₦12,900', 'globe', 'amber']].map(([n, s, v, g, i, t]) => `<div class="row g12"><div class="ic ${t}" style="width:40px;height:40px;border-radius:12px">${icon(i, 18)}</div><div class="col g4 grow"><span class="s w6">${n}</span><span class="xs mu">${s}</span></div><div class="col g4" style="align-items:flex-end"><span class="s w6 num">${naira(v)}</span><span class="xs gr w6">${g}</span></div></div>`).join('')}
    <div class="btn pri" style="margin-top:4px">${icon('plus', 18, '#fff')} Invest more</div>
  </div>`);

const investDetail = mobile('06 Fixed deposit', th, `
  ${topbar('Zenith fixed deposit')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="card col g12">
      <span class="xs mu">You will receive on 12 Jan 2027</span>
      <span class="h1 num">${naira(1090000)}</span>
      <div class="row g8"><span class="badge green">+${naira(90000)} interest</span><span class="badge gray">18% a year</span></div>
      ${prog(56, 'var(--green)')}
      <div class="row between xs mu"><span>Started 14 Jul</span><span>56% of term</span><span>12 Jan</span></div>
    </div>
    <div class="card col g10">
      ${row('Principal', naira(1000000))}
      ${row('Interest so far', naira(61200))}
      ${row('Withholding tax (10%)', '−' + naira(6120))}
      ${row('Rollover', 'Auto, with interest')}
    </div>
    <div class="soft row g10">${icon('alert', 18, 'var(--amber)')}<span class="xs t2 grow">Breaking it early costs 30% of interest earned (about ${naira(18360)}).</span></div>
  </div>
  <div class="row g10 px20" style="position:absolute;left:0;right:0;bottom:34px"><div class="btn sec grow">Withdraw</div><div class="btn pri grow">Top up</div></div>`);

const pension = mobile('07 Pension', th, `
  ${topbar('Pension')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="card col g10">
      <div class="row between"><div class="col g4"><span class="xs mu">Retirement savings account</span><span class="h1 num">${naira(3420800)}</span></div><span class="badge blue">ARM Pension</span></div>
      <span class="xs t2">PIN PEN100293847561 · RSA Fund II</span>
      ${bars([118, 122, 8, 124, 126, 126], { w: 316, h: 80, labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'], hi: 2, color: 'var(--amber)', base: 'var(--blue)', rx: 4 })}
    </div>
    <div class="soft row g10" style="background:var(--amber50)">${icon('alert', 18, 'var(--amber)')}<span class="xs t2 grow">Your employer skipped July's contribution (${naira(41600)}). NURU can draft a letter to HR.</span></div>
    <div class="row g12">${tile('briefcase', 'gray', 'Employer 10%', naira(41600), 'monthly')}${tile('user', 'gray', 'You 8%', naira(33300), 'monthly')}</div>
    <div class="card col g8">
      <span class="s w6">At 60 you could have</span>
      <span class="h3 num">${naira(48500000)}</span>
      <span class="xs t2">If contributions continue and returns average 12% a year. Adding ${naira(10000)} voluntary monthly adds ${naira(9200000)}.</span>
    </div>
  </div>`);

const insurance = mobile('08 Insurance', th, `
  ${topbar('Insurance')}
  <div class="col g12 px20" style="margin-top:8px">
    <div class="row g12">${tile('umbrella', 'green', 'Covered for', naira(15500000), '3 policies')}${tile('calendar', 'amber', 'Premiums due', naira(18400), 'next 30 days')}</div>
    ${[['heart', 'red', 'Health · AXA Mansard', 'HMO Silver · you and 2 dependants', 'Renews 1 Feb', 'Active', 'green'], ['car', 'blue', 'Car · Leadway', 'Toyota Corolla 2016 · comprehensive', 'Renews 14 Nov', 'Due soon', 'amber'], ['building', 'gray', 'Shop · AIICO', 'Kemi Foods stock and fire', 'Renews 3 Mar', 'Active', 'green']].map(([i, t, n, s, r, st, stt]) => `<div class="card row g12" style="padding:14px"><div class="ic ${t}" style="width:40px;height:40px;border-radius:12px">${icon(i, 18)}</div><div class="col g4 grow"><span class="s w6">${n}</span><span class="xs mu">${s}</span><span class="xs t2">${r}</span></div><span class="badge ${stt}">${st}</span></div>`).join('')}
    <div class="card col g10" style="border-color:var(--red)">
      <div class="row g10">${icon('sparkles', 18, 'var(--red)')}<span class="s w6">Gap NURU found</span></div>
      <span class="xs t2">You have no life cover, but 2 people depend on your income. Term life for ${naira(10000000)} costs about ${naira(4200)} a month.</span>
      <div class="row g8"><div class="btn pri sm">Compare quotes</div><div class="btn sec sm">Not now</div></div>
    </div>
  </div>`);

const claim = mobile('09 Insurance claim', th, `
  ${topbar('Make a claim')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="soft row g12"><div class="ic blue" style="width:36px;height:36px;border-radius:11px">${icon('car', 17)}</div><div class="col g4"><span class="s w6">Car · Leadway</span><span class="xs mu">Policy LDW-C-449812</span></div></div>
    <div class="field"><span class="label">What happened?</span><div class="input" style="height:96px;align-items:flex-start;padding-top:14px"><span class="s">Rear bumper hit by a danfo at Lekki toll gate on 16 Oct.</span></div></div>
    <span class="label">Photos and documents</span>
    <div class="row g10">${[0, 1, 2].map((i) => `<div class="col center" style="width:80px;height:80px;border-radius:14px;background:${i < 2 ? 'linear-gradient(135deg,#D3D3DA,#B8B8C2)' : 'var(--surface)'};border:${i < 2 ? 'none' : '1.5px dashed var(--border)'}">${i < 2 ? icon('camera', 22, '#fff') : icon('plus', 22, 'var(--muted)')}</div>`).join('')}</div>
    <div class="field"><span class="label">Estimated repair cost</span><div class="input"><span class="num w6">${naira(185000)}</span></div></div>
    <div class="soft row g10">${icon('info', 18, 'var(--muted)')}<span class="xs t2 grow">Your excess is ${naira(25000)}. Leadway usually settles in 7 to 10 days.</span></div>
  </div>
  <div class="px20" style="position:absolute;left:0;right:0;bottom:34px"><div class="btn pri">Submit claim</div></div>`);

const savings = mobile('10 Savings vaults', th, `
  ${topbar('Savings', { right: `<div class="ib">${icon('plus')}</div>` })}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="card row g16" style="align-items:center">${donut([560, 900, 310, 120], { size: 104, sw: 14, center: '4', sub: 'vaults', colors: ['#E30613', '#15803D', '#1D4ED8', '#F59E0B'] })}<div class="col g6 grow"><span class="xs mu">Total saved</span><span class="h2 num">${naira(1890000)}</span><span class="xs gr w6">Earning 12% a year</span></div></div>
    ${[['Emergency fund', 560000, 'Locked till you need it', '#E30613'], ['Rent fund', 900000, 'Unlocks 1 Jan', '#15803D'], ['New laptop', 310000, 'Flexible', '#1D4ED8'], ['Japa fund', 120000, 'Locked 2 years · 15%', '#F59E0B']].map(([n, v, s, c]) => `<div class="row g12"><div style="width:10px;height:36px;border-radius:5px;background:${c}"></div><div class="col g4 grow"><span class="s w6">${n}</span><span class="xs mu">${s}</span></div><span class="s w6 num">${naira(v)}</span></div>`).join('')}
    <div class="soft row g10">${icon('refresh', 18, 'var(--green)')}<span class="xs t2 grow">Auto-save on: ${naira(25000)} every payday and round-ups on card spend.</span></div>
  </div>`);

export default [loans, loanDetail, loanOffer, refunds, invest, investDetail, pension, insurance, claim, savings];
