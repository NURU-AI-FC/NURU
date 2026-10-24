import { icon, mobile, topbar, naira, ring } from './lib.mjs';

const th = 'light';
const step = (n, total = 4) => `<div class="px20"><div class="bar"><i style="width:${(n / total) * 100}%"></i></div></div>`;
const cta = (label, extra = '') => `<div class="col g10" style="position:absolute;left:20px;right:20px;bottom:44px"><div class="btn pri">${label}</div>${extra}</div>`;
const keypad = (extra = '') => `<div class="col g8" style="padding:0 24px">${[[1, 2, 3], [4, 5, 6], [7, 8, 9]].map(r => `<div class="row">${r.map(k => `<div class="key">${k}</div>`).join('')}</div>`).join('')}<div class="row"><div class="key">${extra}</div><div class="key">0</div><div class="key">${icon('chevl', 24)}</div></div></div>`;
const check = (t, sub, done = true) => `<div class="row g12"><div class="ic ${done ? 'green' : 'gray'}" style="width:32px;height:32px;border-radius:10px">${icon(done ? 'check' : 'clock', 16)}</div><div class="col g4 grow"><span class="s w6">${t}</span>${sub ? `<span class="xs mu">${sub}</span>` : ''}</div></div>`;

const intro = mobile('01 Verify identity', th, `
  ${topbar('Verify identity')}
  <div class="col g20 px20" style="margin-top:12px">
    <div class="ic red" style="width:56px;height:56px;border-radius:18px">${icon('shieldcheck', 26)}</div>
    <div class="col g6"><div class="h2">Let’s confirm it’s really you</div><div class="s t2">CBN rules require identity checks before you can move money. It takes about two minutes.</div></div>
    <div class="card col g16">
      ${[['landmark', 'Bank Verification Number', 'Your 11-digit BVN'], ['user', 'National Identity Number', 'Your 11-digit NIN'], ['camera', 'Selfie liveness check', 'A short video of your face'], ['lock', 'Transaction PIN', 'Used to approve transfers']].map(([i, t, s], k) => `<div class="row g12"><div class="ic ${k === 0 ? 'red' : 'gray'}" style="width:40px;height:40px;border-radius:12px">${icon(i, 19)}</div><div class="col g4 grow"><span class="h4" style="font-size:14px">${t}</span><span class="xs mu">${s}</span></div><span class="xs mu">${k + 1}/4</span></div>`).join('')}
    </div>
    <div class="soft row g10">${icon('lock', 18, 'var(--red)')}<span class="xs t2">Checked securely through a licensed KYC partner. NURU never stores your full BVN or NIN in plain text.</span></div>
  </div>
  ${cta('Start verification')}`);

const bvn = mobile('02 Enter BVN', th, `
  ${topbar('Verify identity', { right: '<span class="xs mu">1 of 4</span>' })}
  ${step(1)}
  <div class="col g16 px20" style="margin-top:20px">
    <div class="col g6"><div class="h2">Enter your BVN</div><div class="s t2">Dial *565*0# on the phone linked to your bank to get your BVN.</div></div>
    <div class="field"><span class="label">Bank Verification Number</span><div class="input focus" style="font-size:20px;letter-spacing:4px;font-weight:600"><span class="grow num">2234 5678 901</span>${icon('check', 18, 'var(--green)')}</div><span class="xs mu">11 digits · 11/11</span></div>
    <div class="field"><span class="label">Date of birth</span><div class="input">${icon('calendar', 18, 'var(--muted)')}<span class="grow">14 March 1996</span>${icon('chevd', 16, 'var(--muted)')}</div></div>
    <div class="soft col g8"><div class="row g8">${icon('info', 16, 'var(--blue)')}<span class="s w6">Why we need this</span></div><span class="xs t2">Your BVN confirms your name, phone and date of birth with NIBSS. It does not give NURU access to your bank accounts.</span></div>
  </div>
  ${cta('Verify BVN')}`);

const bvnMatch = mobile('03 Confirm BVN details', th, `
  ${topbar('Verify identity', { right: '<span class="xs mu">1 of 4</span>' })}
  ${step(1)}
  <div class="col g16 px20" style="margin-top:20px">
    <div class="row g10"><div class="ic green" style="width:40px;height:40px;border-radius:12px">${icon('check', 20)}</div><div class="col g4"><div class="h3">BVN found</div><div class="xs mu">Matched with NIBSS just now</div></div></div>
    <div class="card col g12">
      ${[['Full name', 'Adaeze Chioma Okafor'], ['Date of birth', '14 Mar 1996'], ['Phone', '+234 803 *** 7890'], ['BVN', '223*****901']].map(([k, v]) => `<div class="row between"><span class="s t2">${k}</span><span class="s w6">${v}</span></div>`).join('<div class="div"></div>')}
    </div>
    <div class="row g10 soft">${icon('check', 18, 'var(--green)')}<span class="s">Name matches your NURU profile</span></div>
    <div class="row g10 soft">${icon('check', 18, 'var(--green)')}<span class="s">Phone matches the number you verified</span></div>
  </div>
  ${cta('Yes, this is me', '<div class="btn ghost">These details are wrong</div>')}`);

const nin = mobile('04 Enter NIN', th, `
  ${topbar('Verify identity', { right: '<span class="xs mu">2 of 4</span>' })}
  ${step(2)}
  <div class="col g16 px20" style="margin-top:20px">
    <div class="col g6"><div class="h2">Enter your NIN</div><div class="s t2">Find it on your NIN slip or dial *346# from your registered line.</div></div>
    <div class="field"><span class="label">National Identity Number</span><div class="input focus" style="font-size:20px;letter-spacing:4px;font-weight:600"><span class="grow num">7012 3456 7</span><span class="xs mu" style="letter-spacing:0;font-weight:500">9/11</span></div></div>
    <div class="row g12">
      <div class="card col g8 grow" style="padding:14px;border-color:var(--red)">${icon('file', 20, 'var(--red)')}<span class="s w6">NIN slip</span><span class="xs mu">Type the number</span></div>
      <div class="card col g8 grow" style="padding:14px">${icon('qr', 20)}<span class="s w6">Scan ID card</span><span class="xs mu">Use the QR on the back</span></div>
    </div>
    <div class="soft row g10">${icon('shield', 18, 'var(--red)')}<span class="xs t2">Verified with NIMC. We keep only a masked copy and a verification reference.</span></div>
  </div>
  ${cta('Verify NIN')}`);

const selfie = mobile('05 Selfie liveness', th, `
  ${topbar('Selfie check', { right: '<span class="xs mu">3 of 4</span>' })}
  ${step(3)}
  <div class="col center g16" style="margin-top:24px;padding:0 28px">
    <div style="width:260px;height:320px;border-radius:999px;border:4px solid var(--red);background:linear-gradient(180deg,#2B2B31,#141416);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
      ${icon('scanface', 120, 'rgba(255,255,255,.55)', 1)}
      <div style="position:absolute;left:0;right:0;top:58%;height:3px;background:var(--red);box-shadow:0 0 18px var(--red)"></div>
    </div>
    <div class="col center g6"><div class="h3">Slowly turn your head left</div><div class="s t2" style="text-align:center">Keep your face inside the oval, in good light, without glasses or a cap.</div></div>
    <div class="row g8">${['Look ahead', 'Turn left', 'Turn right', 'Blink'].map((t, i) => `<span class="badge ${i === 0 ? 'green' : i === 1 ? 'red' : 'gray'}">${i === 0 ? icon('check', 11) : ''}${t}</span>`).join('')}</div>
  </div>
  <div class="row center g8 xs mu" style="position:absolute;left:0;right:0;bottom:44px">${icon('lock', 14, 'var(--muted)')} Video is encrypted and deleted after the check</div>`);

const checking = mobile('06 Checking identity', th, `
  <div class="col center grow g20" style="padding:0 32px">
    <div style="position:relative;width:120px;height:120px">${ring(28, { size: 120, sw: 6, label: ' ' })}<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${icon('scanface', 48, 'var(--red)', 1.6)}</div></div>
    <div class="col center g8"><div class="h2" style="text-align:center">Checking your details</div><div class="s t2" style="text-align:center">This usually takes less than 20 seconds. Please keep the app open.</div></div>
    <div class="card col g14" style="width:100%;gap:14px">${check('BVN matched', 'NIBSS')}${check('NIN matched', 'NIMC')}${check('Face matched to BVN photo', '98% confidence')}${check('Liveness confirmed', 'Running anti-spoof checks', false)}</div>
  </div>`);

const kycDone = mobile('07 Identity verified', th, `
  <div class="col center grow g20" style="padding:0 28px">
    <div style="width:120px;height:120px;border-radius:999px;background:var(--green50);display:flex;align-items:center;justify-content:center"><div style="width:80px;height:80px;border-radius:999px;background:var(--green);display:flex;align-items:center;justify-content:center">${icon('shieldcheck', 40, '#fff', 2)}</div></div>
    <div class="col center g8"><div class="h1" style="text-align:center">You’re verified</div><div class="b t2" style="text-align:center">Your account is now Tier 2. Set a transaction PIN to start sending money.</div></div>
    <div class="card col g12" style="width:100%">
      <div class="row between"><span class="s t2">Account tier</span><span class="badge green">Tier 2</span></div><div class="div"></div>
      <div class="row between"><span class="s t2">Daily transfer limit</span><span class="s w6 num">${naira(200000)}</span></div><div class="div"></div>
      <div class="row between"><span class="s t2">Maximum balance</span><span class="s w6 num">${naira(500000)}</span></div>
    </div>
    <span class="s rd w6">How to upgrade to Tier 3</span>
  </div>
  <div style="padding:0 20px 44px"><div class="btn pri">Create transaction PIN</div></div>`);

const pin = (n, title, sub, filled, err = false) => mobile(n, th, `
  ${topbar('Transaction PIN', { right: '<span class="xs mu">4 of 4</span>' })}
  ${step(4)}
  <div class="col center g12" style="padding-top:36px">
    <div class="ic red" style="width:56px;height:56px;border-radius:18px">${icon('lock', 26)}</div>
    <div class="h2">${title}</div>
    <div class="s t2" style="text-align:center;padding:0 40px">${sub}</div>
    <div class="row g16" style="margin-top:12px">${[0, 1, 2, 3].map(i => `<div class="dot ${i < filled ? 'on' : ''}" style="width:16px;height:16px"></div>`).join('')}</div>
    ${err ? `<div class="badge red" style="margin-top:8px">${icon('alert', 11)} PINs don’t match. Try again.</div>` : '<div class="xs mu" style="margin-top:8px">Avoid 1234, 0000 or your birth year</div>'}
  </div>
  <div style="position:absolute;left:0;right:0;bottom:30px">${keypad()}</div>`);

const biometric = mobile('10 Face check for transfers', th, `
  ${topbar('Transfer security')}
  <div class="col center g20" style="padding:28px 28px 0">
    <div style="width:132px;height:132px;border-radius:40px;background:var(--red50);display:flex;align-items:center;justify-content:center">${icon('scanface', 64, 'var(--red)', 1.6)}</div>
    <div class="col center g8"><div class="h2" style="text-align:center">Add a face check to transfers</div><div class="b t2" style="text-align:center">Your PIN plus your face, so nobody can move your money even if they learn your PIN.</div></div>
    <div class="card col g12" style="width:100%">
      <div class="row g12"><div class="toggle on"><i></i></div><div class="col g4 grow"><span class="s w6">PIN for every transfer</span><span class="xs mu">Required</span></div></div><div class="div"></div>
      <div class="row g12"><div class="toggle on"><i></i></div><div class="col g4 grow"><span class="s w6">Face check above ${naira(50000)}</span><span class="xs mu">Recommended</span></div></div><div class="div"></div>
      <div class="row g12"><div class="toggle"><i></i></div><div class="col g4 grow"><span class="s w6">Face check on every transfer</span><span class="xs mu">Strictest</span></div></div>
    </div>
  </div>
  ${cta('Turn on face check', '<div class="btn ghost">Not now</div>')}`);

const banks = [['Partner Bank', '#E30613', 'P'], ['Access Bank', '#F57C00', 'A'], ['GTBank', '#DD4F05', 'G'], ['First Bank', '#0B3B7A', 'F'], ['UBA', '#C8102E', 'U'], ['Kuda', '#40196D', 'K'], ['Opay', '#1DCF9F', 'O'], ['Moniepoint', '#0357EE', 'M']];
const linkBank = mobile('11 Link account', th, `
  ${topbar('Link an account')}
  <div class="col g16 px20" style="margin-top:8px">
    <div class="col g6"><div class="h2">Choose your bank</div><div class="s t2">NURU reads your transactions to build insights. It can never move money without your PIN and face check.</div></div>
    <div class="input">${icon('search', 18, 'var(--muted)')}<span class="ph">Search 120+ banks and wallets</span></div>
    <div class="row g12 soft" style="border:1.5px dashed var(--red);background:var(--red50)"><div class="ic red" style="width:40px;height:40px;border-radius:12px;background:var(--bg)">${icon('sparkles', 19)}</div><div class="col g4 grow"><span class="s w6">Use the demo bank</span><span class="xs t2">Six months of sample transactions, no real login</span></div>${icon('chevr', 18, 'var(--red)')}</div>
    <div class="row between"><span class="xs mu w6" style="letter-spacing:.6px">POPULAR</span></div>
    <div class="row wrap" style="gap:12px">${banks.map(([n, c, l]) => `<div class="col center g8" style="width:76px"><div style="width:52px;height:52px;border-radius:16px;background:${c};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px">${l}</div><span class="xs t2" style="text-align:center">${n}</span></div>`).join('')}</div>
  </div>
  <div class="row center g6 xs mu" style="position:absolute;left:0;right:0;bottom:40px">${icon('lock', 13, 'var(--muted)')} Secured by Mono open banking · read-only</div>`);

const monoLogin = mobile('12 Bank login (Mono)', th, `
  ${topbar('Link an account')}
  <div class="scrim"></div>
  <div class="sheet" style="height:620px">
    <div class="grab"></div>
    <div class="row between"><div class="row g10"><div style="width:40px;height:40px;border-radius:12px;background:#E30613;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800">P</div><div class="col g4"><span class="h4">Partner Bank</span><span class="xs mu">Internet banking login</span></div></div><div class="ib" style="width:34px;height:34px;border-radius:999px">${icon('x', 16)}</div></div>
    <div class="field"><span class="label">User ID</span><div class="input">${icon('user', 18, 'var(--muted)')}<span>adaeze.okafor</span></div></div>
    <div class="field"><span class="label">Password</span><div class="input focus">${icon('lock', 18, 'var(--muted)')}<span class="grow">••••••••</span>${icon('eye', 18, 'var(--muted)')}</div></div>
    <div class="soft col g8">
      <div class="row g8">${icon('shieldcheck', 16, 'var(--green)')}<span class="s w6">Read-only access</span></div>
      <span class="xs t2">Your login goes straight to the bank through Mono. NURU never sees or stores your bank password.</span>
    </div>
    <div class="btn pri" style="margin-top:auto">Log in securely</div>
    <div class="row center g6 xs mu">${icon('lock', 13, 'var(--muted)')} Sandbox mode · test credentials accepted</div>
  </div>`);

const consent = mobile('13 Data permissions', th, `
  ${topbar('Link an account')}
  <div class="col g16 px20" style="margin-top:8px">
    <div class="col g6"><div class="h2">Allow NURU to read</div><div class="s t2">Choose what NURU can see from your bank Bank •••• 4821. You can change this any time.</div></div>
    <div class="card col g12">
      ${[['wallet', 'Balances', 'Current and available balance', 1], ['history', 'Transactions', 'Last 12 months, then ongoing', 1], ['user', 'Account identity', 'Name and account number', 1], ['receipt', 'Statements', 'Monthly PDF statements', 0]].map(([i, t, s, on]) => `<div class="row g12"><div class="ic gray" style="width:40px;height:40px;border-radius:12px">${icon(i, 19)}</div><div class="col g4 grow"><span class="s w6">${t}</span><span class="xs mu">${s}</span></div><div class="toggle ${on ? 'on' : ''}"><i></i></div></div>`).join('<div class="div"></div>')}
    </div>
    <div class="soft row g10">${icon('alert', 18, 'var(--amber)')}<span class="xs t2">NURU cannot make payments from this link. Transfers always need your PIN and face check.</span></div>
    <div class="row g8 xs mu">${icon('clock', 14, 'var(--muted)')} Access expires in 12 months unless you renew it</div>
  </div>
  ${cta('Allow and continue')}`);

const linked = mobile('14 Account linked', th, `
  <div class="col center grow g20" style="padding:0 28px">
    <div style="width:120px;height:120px;border-radius:999px;background:var(--green50);display:flex;align-items:center;justify-content:center"><div style="width:80px;height:80px;border-radius:999px;background:var(--green);display:flex;align-items:center;justify-content:center">${icon('link', 38, '#fff', 2.2)}</div></div>
    <div class="col center g8"><div class="h1" style="text-align:center">Partner Bank linked</div><div class="b t2" style="text-align:center">NURU is reading your history. Your first insights will be ready in a moment.</div></div>
    <div class="card col g12" style="width:100%">
      <div class="row g12"><div style="width:40px;height:40px;border-radius:12px;background:#E30613;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800">Z</div><div class="col g4 grow"><span class="s w6">Savings •••• 4821</span><span class="xs mu">Adaeze C. Okafor</span></div><span class="h4 num">${naira(812450)}</span></div>
      <div class="div"></div>
      <div class="col g8"><div class="row between"><span class="xs t2">Importing transactions</span><span class="xs w6">1,248 of 1,610</span></div><div class="bar"><i style="width:78%"></i></div></div>
    </div>
  </div>
  <div class="col g10" style="padding:0 20px 44px"><div class="btn pri">Go to my dashboard</div><div class="btn ghost">Link another account</div></div>`);

const secCentre = mobile('15 Security centre', th, `
  ${topbar('Security centre')}
  <div class="col g16 px20" style="margin-top:8px">
    <div class="card row g16" style="padding:18px">
      ${ring(86, { size: 64, sw: 7, color: 'var(--green)', label: '86' })}
      <div class="col g4 grow"><span class="h3">Strong protection</span><span class="xs t2">Turn on face check for every transfer to reach 100.</span></div>
    </div>
    <div class="col">
      ${[['fingerprint', 'Passkeys', '2 devices · iPhone 15, MacBook', 'green', 'On'], ['lock', 'Transaction PIN', 'Changed 12 days ago', 'green', 'On'], ['scanface', 'Face check for transfers', 'Above ₦50,000', 'green', 'On'], ['phone', 'Trusted devices', '2 active sessions', 'gray', ''], ['bell', 'Login alerts', 'SMS and push', 'green', 'On'], ['key', 'Change password', 'Last changed 3 months ago', 'gray', '']].map(([i, t, s, tone, b]) => `<div class="row g12" style="padding:12px 0"><div class="ic gray" style="width:40px;height:40px;border-radius:12px">${icon(i, 19)}</div><div class="col g4 grow"><span class="h4" style="font-size:15px">${t}</span><span class="xs mu">${s}</span></div>${b ? `<span class="badge ${tone}">${b}</span>` : ''}${icon('chevr', 18, 'var(--muted)')}</div>`).join('')}
    </div>
    <div class="btn out" style="color:var(--red);border-color:var(--red)">${icon('alert', 18, 'var(--red)')} Freeze my account</div>
  </div>`);

const devices = mobile('16 Devices and sessions', th, `
  ${topbar('Trusted devices')}
  <div class="col g16 px20" style="margin-top:8px">
    <div class="s t2">Devices that can sign in to NURU. Remove any you don’t recognise.</div>
    ${[['phone', 'iPhone 15 Pro', 'This device · Lagos, NG', 'Active now', 1], ['laptop', 'MacBook Pro · Chrome', 'Lagos, NG', '2 hours ago', 0], ['phone', 'Samsung A54', 'Abuja, NG', 'Signed out 3 weeks ago', 0]].map(([i, t, s, w, cur]) => `<div class="card row g12" style="padding:14px"><div class="ic ${cur ? 'red' : 'gray'}" style="width:44px;height:44px">${icon(i, 20)}</div><div class="col g4 grow"><span class="s w6">${t}</span><span class="xs mu">${s}</span><span class="xs ${cur ? 'gr w6' : 'mu'}">${w}</span></div>${cur ? '<span class="badge green">This device</span>' : '<span class="btn sm sec">Remove</span>'}</div>`).join('')}
    <div class="soft col g8"><div class="row g8">${icon('alert', 16, 'var(--amber)')}<span class="s w6">New device rule</span></div><span class="xs t2">A new device must pass a face check, and transfers from it are limited to ${naira(20000)} for 24 hours.</span></div>
  </div>
  ${cta('Sign out of all other devices')}`);

export default [intro, bvn, bvnMatch, nin, selfie, checking, kycDone,
  pin('08 Create PIN', 'Create a 4-digit PIN', 'You’ll use this PIN to approve every transfer and payment.', 2),
  pin('09 Confirm PIN', 'Confirm your PIN', 'Enter the same 4 digits again.', 4, true),
  biometric, linkBank, monoLogin, consent, linked, secCentre, devices];
