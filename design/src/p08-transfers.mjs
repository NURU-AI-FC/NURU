import { icon, mobile, topbar, naira, listRow } from './lib.mjs';

const th = 'light';
const keypad = (extra = '') => `<div class="col g8" style="padding:0 24px">${[[1, 2, 3], [4, 5, 6], [7, 8, 9]].map(r => `<div class="row">${r.map(k => `<div class="key">${k}</div>`).join('')}</div>`).join('')}<div class="row"><div class="key">${extra}</div><div class="key">0</div><div class="key">${icon('chevl', 24)}</div></div></div>`;
const av = (t, bg = 'var(--red)') => `<div class="av" style="background:${bg}">${t}</div>`;
const row = (l, r, strong) => `<div class="row between"><span class="s t2">${l}</span><span class="s ${strong ? 'w6' : ''}">${r}</span></div>`;
const people = [['TA', 'Tunde Adebayo', 'GTBank •••• 2290', '#141416'], ['MO', 'Mama (Ngozi O.)', 'Main •••• 7712', '#E30613'], ['KF', 'Kemi Foods Ltd', 'Main •••• 0094', '#1D4ED8'], ['IA', 'Ibrahim Abdullahi', 'Opay •••• 5521', '#15803D']];

const hub = mobile('01 Pay hub', th, `
  ${topbar('Pay', { back: false, right: `<div class="ib">${icon('qr')}</div>` })}
  <div class="body" style="gap:18px">
    <div class="soft row between" style="padding:14px 16px"><div class="col g4"><span class="xs mu">Main •••• 4821</span><span class="h3 num">${naira(284650)}</span></div><span class="chip">Change ${icon('chevd', 14)}</span></div>
    <div class="row between">${[['send', 'Send money'], ['zap', 'Pay bills'], ['phone', 'Airtime'], ['qr', 'Scan to pay']].map(([i, t]) => `<div class="col center g8" style="width:76px"><div class="ic red" style="width:56px;height:56px;border-radius:18px">${icon(i, 24)}</div><span class="xs w5" style="text-align:center">${t}</span></div>`).join('')}</div>
    <div class="sec-title"><span class="h4">Recent people</span><a>See all</a></div>
    <div class="row between">${people.map(([i, n, , c]) => `<div class="col center g6" style="width:72px">${av(i, c)}<span class="xs" style="text-align:center">${n.split(' ')[0]}</span></div>`).join('')}</div>
    <div class="sec-title"><span class="h4">Scheduled</span><a>Manage</a></div>
    <div class="card col g12" style="padding:14px">
      ${listRow('building', 'Rent to Mr Okafor', 'Monthly · next 1 Nov', `<span class="s w6 num">${naira(250000)}</span>`)}
      <div class="div"></div>
      ${listRow('heart', 'Mama upkeep', 'Every 28th', `<span class="s w6 num">${naira(30000)}</span>`)}
    </div>
  </div>`, { tab: 'pay' });

const recipient = mobile('02 Choose recipient', th, `
  ${topbar('Send money')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="field"><span class="label">Account number</span><div class="input focus"><span class="num">0123456789</span></div></div>
    <div class="field"><span class="label">Bank</span><div class="input"><span class="grow">Guaranty Trust Bank</span>${icon('chevd', 18, 'var(--muted)')}</div></div>
    <div class="soft row g10" style="background:var(--green50)">${icon('shieldcheck', 18, 'var(--green)')}<div class="col g4"><span class="s w6">TUNDE ADEBAYO</span><span class="xs t2">Name confirmed by NIBSS</span></div></div>
    <span class="h4" style="margin-top:6px">Saved beneficiaries</span>
    ${people.map(([i, n, b, c]) => `<div class="row g12">${av(i, c)}<div class="col g4 grow"><span class="s w6">${n}</span><span class="xs mu">${b}</span></div>${icon('star', 18, 'var(--muted)')}</div>`).join('')}
  </div>
  <div class="px20" style="position:absolute;left:0;right:0;bottom:34px"><div class="btn pri">Continue</div></div>`);

const amount = mobile('03 Amount with FX', th, `
  ${topbar('Send to Tunde')}
  <div class="col center g8" style="margin-top:22px">
    ${av('TA', '#141416')}
    <span class="s t2">GTBank •••• 2290</span>
    <span class="num" style="font-size:44px;font-weight:700;letter-spacing:-1px;margin-top:6px">${naira(45000)}</span>
    <span class="xs mu">≈ $29.41 · £22.63 · live rate ₦1,530/$</span>
    <div class="row g8" style="margin-top:6px">${['₦5k', '₦10k', '₦20k', '₦50k'].map((t) => `<span class="chip">${t}</span>`).join('')}</div>
    <div class="input" style="width:350px;margin-top:10px">${icon('edit', 18, 'var(--muted)')}<span class="ph">Add a note (optional)</span></div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:100px">${keypad('.')}</div>
  <div class="px20" style="position:absolute;left:0;right:0;bottom:30px"><div class="btn pri">Review</div></div>`);

const review = mobile('04 Review transfer', th, `
  ${topbar('Review')}
  <div class="col g16 px20" style="margin-top:8px">
    <div class="card col g12">
      <div class="row g12">${av('TA', '#141416')}<div class="col g4"><span class="s w6">Tunde Adebayo</span><span class="xs mu">GTBank •••• 2290</span></div></div>
      <div class="div"></div>
      ${row('Amount', `<span class="h3 num">${naira(45000)}</span>`)}
      ${row('Fee', naira(10))}
      ${row('Note', 'Generator repair')}
      ${row('From', 'Main •••• 4821')}
      ${row('Arrives', 'Instantly')}
      <div class="div"></div>
      ${row('Total', `<span class="h4 num">${naira(45010)}</span>`, true)}
    </div>
    <div class="soft row g10">${icon('sparkles', 18, 'var(--red)')}<span class="xs t2 grow">You have paid Tunde 4 times. This amount is normal for him.</span></div>
    <div class="soft row g10">${icon('shield', 18, 'var(--muted)')}<span class="xs t2 grow">You will confirm with your PIN, then a quick face check.</span></div>
  </div>
  <div class="px20" style="position:absolute;left:0;right:0;bottom:34px"><div class="btn pri">${icon('lock', 18, '#fff')} Confirm and send</div></div>`);

const pin = mobile('05 Enter PIN', th, `
  ${topbar('')}
  <div class="col center g12" style="margin-top:20px;padding:0 30px;text-align:center">
    <div class="ic red" style="width:56px;height:56px;border-radius:18px">${icon('lock', 26)}</div>
    <span class="h2">Enter your PIN</span>
    <span class="s t2">To send ${naira(45010)} to Tunde Adebayo</span>
    <div class="row g16" style="margin-top:16px">${[1, 1, 1, 0].map((d) => `<div class="dot ${d ? 'on' : ''}"></div>`).join('')}</div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:60px">${keypad(icon('fingerprint', 26, 'var(--red)'))}</div>`);

const face = mobile('06 Face step-up', th, `
  ${topbar('')}
  <div class="col center g12" style="margin-top:12px;padding:0 30px;text-align:center">
    <span class="h2">Look at the camera</span>
    <span class="s t2">Large transfers need a quick face check. It takes 2 seconds.</span>
  </div>
  <div class="col center" style="margin-top:28px">
    <div style="width:240px;height:300px;border-radius:120px;border:4px solid var(--red);background:linear-gradient(180deg,#E9E9EE,#D3D3DA);position:relative" class="col center">
      ${icon('scanface', 80, 'var(--muted)', 1.4)}
      <div style="position:absolute;left:20px;right:20px;top:140px;height:3px;background:var(--red);border-radius:2px;box-shadow:0 0 12px rgba(227,6,19,.6)"></div>
    </div>
    <div class="row g8" style="margin-top:22px"><span class="badge green">${icon('check', 11)} PIN correct</span><span class="badge gray">Checking face…</span></div>
  </div>
  <div class="row center g6 xs mu" style="position:absolute;left:0;right:0;bottom:44px">${icon('lock', 12)} Your face data never leaves NURU's secure vault</div>`);

const receipt = mobile('07 Transfer receipt', th, `
  <div class="col center g10" style="margin-top:36px;padding:0 30px;text-align:center">
    <div class="col center" style="width:80px;height:80px;border-radius:40px;background:var(--green50)">${icon('check', 40, 'var(--green)', 2.6)}</div>
    <span class="h2" style="margin-top:6px">Sent</span>
    <span class="num" style="font-size:36px;font-weight:700;letter-spacing:-.8px">${naira(45000)}</span>
    <span class="s t2">to Tunde Adebayo · GTBank</span>
  </div>
  <div class="card col g12" style="margin:22px 20px 0">
    ${row('Reference', 'NURU-2410-8F3K21')}
    ${row('Session ID', '000015241018143300')}
    ${row('Date', '18 Oct 2026, 2:33 pm')}
    ${row('Fee', naira(10))}
    ${row('Status', '<span class="badge green">Successful</span>')}
  </div>
  <div class="row g10 px20" style="margin-top:16px"><div class="btn sec grow">${icon('download', 18)} Receipt</div><div class="btn sec grow">${icon('send', 18)} Share</div></div>
  <div class="px20" style="position:absolute;left:0;right:0;bottom:34px"><div class="btn pri">Done</div></div>`);

const billsPay = mobile('08 Pay bills', th, `
  ${topbar('Pay bills')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="input">${icon('search', 18, 'var(--muted)')}<span class="ph">Search billers</span></div>
    <div class="row between">${[['zap', 'Electricity'], ['tv', 'TV'], ['wifi', 'Internet'], ['phone', 'Data']].map(([i, t]) => `<div class="col center g8" style="width:76px"><div class="ic gray" style="width:52px;height:52px;border-radius:16px">${icon(i, 22)}</div><span class="xs w5">${t}</span></div>`).join('')}</div>
    <span class="h4" style="margin-top:4px">IKEDC prepaid</span>
    <div class="field"><span class="label">Meter number</span><div class="input"><span class="num">4502 1198 776</span></div></div>
    <div class="soft row g10" style="background:var(--green50)">${icon('shieldcheck', 18, 'var(--green)')}<span class="s w6">ADAEZE OKONKWO · 12 Admiralty Way</span></div>
    <div class="field"><span class="label">Amount</span><div class="input focus"><span class="num w6">${naira(15000)}</span></div></div>
    <div class="soft row g10">${icon('sparkles', 18, 'var(--red)')}<span class="xs t2 grow">You usually buy ${naira(15000)} every 9 days. Set it to repeat?</span><div class="toggle"><i></i></div></div>
  </div>
  <div class="px20" style="position:absolute;left:0;right:0;bottom:34px"><div class="btn pri">Pay ${naira(15000)}</div></div>`);

const airtime = mobile('09 Airtime and data', th, `
  ${topbar('Airtime and data')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="seg"><span class="on">Airtime</span><span>Data</span></div>
    <div class="field"><span class="label">Phone number</span><div class="input"><span class="badge amber">MTN</span><span class="num grow">0803 555 1234</span>${icon('user', 18, 'var(--muted)')}</div></div>
    <span class="label">Choose amount</span>
    <div class="row wrap g10" style="gap:10px">${['₦100', '₦200', '₦500', '₦1,000', '₦2,000', '₦5,000'].map((t, i) => `<div class="col center" style="width:110px;height:56px;border-radius:14px;border:1.5px solid ${i === 3 ? 'var(--red)' : 'var(--border)'};background:${i === 3 ? 'var(--red50)' : 'transparent'}"><span class="s w6 num ${i === 3 ? 'rd' : ''}">${t}</span></div>`).join('')}</div>
    <div class="soft row g10">${icon('percent', 18, 'var(--green)')}<span class="xs t2">Get 2% cashback on airtime this month</span></div>
  </div>
  <div class="px20" style="position:absolute;left:0;right:0;bottom:34px"><div class="btn pri">Buy ${naira(1000)} airtime</div></div>`);

const scheduled = mobile('10 Scheduled payments', th, `
  ${topbar('Scheduled', { right: `<div class="ib">${icon('plus')}</div>` })}
  <div class="col g12 px20" style="margin-top:8px">
    <div class="soft row between"><div class="col g4"><span class="xs mu">Going out in the next 30 days</span><span class="h3 num">${naira(325700)}</span></div><span class="badge amber">4 payments</span></div>
    ${[['building', 'Rent to Mr Okafor', 'Monthly · 1 Nov', 250000, 'amber'], ['heart', 'Mama upkeep', 'Monthly · 28 Oct', 30000, 'red'], ['tv', 'DStv Compact', 'Monthly · 19 Oct', 15700, 'blue'], ['briefcase', 'Kemi Foods savings', 'Weekly · Fridays', 30000, 'green']].map(([i, n, s, a, t]) => `<div class="card row g12" style="padding:14px"><div class="ic ${t}" style="width:40px;height:40px;border-radius:12px">${icon(i, 18)}</div><div class="col g4 grow"><span class="s w6">${n}</span><span class="xs mu">${s}</span></div><div class="col g4" style="align-items:flex-end"><span class="s w6 num">${naira(a)}</span><div class="toggle on"><i></i></div></div></div>`).join('')}
  </div>`);

const qr = mobile('11 Scan to pay', th, `
  <div style="position:absolute;inset:0;background:#141416"></div>
  <div class="row between px20" style="height:52px;position:relative;margin-top:4px"><div class="ib" style="background:rgba(255,255,255,.12)">${icon('x', 20, '#fff')}</div><span class="h4" style="color:#fff">Scan to pay</span><div class="ib" style="background:rgba(255,255,255,.12)">${icon('zap', 20, '#fff')}</div></div>
  <div class="col center" style="position:relative;margin-top:70px">
    <div style="width:250px;height:250px;border-radius:28px;border:3px solid #fff;position:relative">
      <div style="position:absolute;left:16px;right:16px;top:120px;height:3px;background:var(--red);box-shadow:0 0 14px rgba(227,6,19,.8)"></div>
    </div>
    <span class="s" style="color:#fff;margin-top:24px">Point at any NQR or NURU code</span>
  </div>
  <div class="sheet" style="gap:12px">
    <div class="grab"></div>
    <div class="row g12">${av('MB', '#B45309')}<div class="col g4 grow"><span class="s w6">Mama Bisi Kitchen</span><span class="xs mu">Merchant · Lekki Phase 1</span></div><span class="badge green">${icon('shieldcheck', 11)} Verified</span></div>
    <div class="btn pri">Pay this merchant</div>
    <div class="btn out">${icon('qr', 18)} Show my code</div>
  </div>`, { statusLight: true });

const blocked = mobile('12 Suspicious transfer blocked', th, `
  ${topbar('')}
  <div class="col center g12" style="margin-top:20px;padding:0 30px;text-align:center">
    <div class="ic red" style="width:72px;height:72px;border-radius:22px">${icon('shield', 34)}</div>
    <span class="h2">We paused this transfer</span>
    <span class="s t2">This looks like a scam pattern we see often. Your money has not left your account.</span>
  </div>
  <div class="card col g10" style="margin:20px 20px 0">
    ${row('To', 'Quick Loans Agent · Palmpay')}
    ${row('Amount', `<b class="num">${naira(380000)}</b>`)}
    <div class="div"></div>
    ${[['New account, created 2 days ago'], ['8× bigger than your usual transfer'], ['You were on a call while sending']].map(([t]) => `<div class="row g8">${icon('alert', 16, 'var(--red)')}<span class="s">${t}</span></div>`).join('')}
  </div>
  <div class="soft row g10" style="margin:14px 20px 0">${icon('info', 18, 'var(--muted)')}<span class="xs t2 grow">Bank staff will never ask you to move money to a "safe account".</span></div>
  <div class="col g10 px20" style="position:absolute;left:0;right:0;bottom:34px"><div class="btn pri">Cancel transfer</div><div class="btn ghost">I know this person, continue</div></div>`);

const beneficiaries = mobile('13 Beneficiaries', th, `
  ${topbar('Beneficiaries', { right: `<div class="ib">${icon('plus')}</div>` })}
  <div class="col g12 px20" style="margin-top:8px">
    <div class="input" style="height:44px">${icon('search', 18, 'var(--muted)')}<span class="ph">Search name or account</span></div>
    <div class="row g8"><span class="chip on">All</span><span class="chip">Family</span><span class="chip">Business</span><span class="chip">Vendors</span></div>
    ${[...people, ['CO', 'Chidi Okeke', 'Access •••• 3310', '#7C3AED'], ['FS', 'Femi Solar Ltd', 'Main •••• 6620', '#B45309'], ['AO', 'Mr Okafor (Rent)', 'UBA •••• 1123', '#3F3F46']].map(([i, n, b, c], k) => `<div class="row g12" style="padding:4px 0">${av(i, c)}<div class="col g4 grow"><span class="s w6">${n}</span><span class="xs mu">${b}</span></div>${k < 2 ? icon('star', 18, 'var(--amber)') : icon('more', 18, 'var(--muted)')}</div>`).join('')}
  </div>`);

export default [hub, recipient, amount, review, pin, face, receipt, billsPay, airtime, scheduled, qr, blocked, beneficiaries];
