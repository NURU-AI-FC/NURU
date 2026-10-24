import { icon, mobile, topbar, naira, logo } from './lib.mjs';

const th = 'light';
const av = (t = 'AO', s = 40) => `<div class="av" style="width:${s}px;height:${s}px;font-size:${s * 0.36}px">${t}</div>`;
const sw = (on) => `<div class="toggle ${on ? 'on' : ''}"><i></i></div>`;
const radio = (on) => `<div style="width:22px;height:22px;border-radius:11px;flex:none;border:${on ? '7px solid var(--red)' : '2px solid var(--border)'}"></div>`;
const chev = icon('chevr', 18, 'var(--muted)');
const item = (ic, t, s = '', right = chev, tone = 'gray', pad = 10) => `<div class="row g12" style="padding:${pad}px 0"><div class="ic ${tone}" style="width:36px;height:36px;border-radius:11px">${icon(ic, 17)}</div><div class="col g4 grow"><span class="s w6">${t}</span>${s ? `<span class="xs mu">${s}</span>` : ''}</div>${right}</div>`;
const label = (t, top = 4) => `<span class="xs mu w6" style="margin-top:${top}px">${t}</span>`;
const bottom = (html) => `<div class="row g10 px20" style="position:absolute;left:0;right:0;bottom:34px">${html}</div>`;
const val = (t) => `<span class="xs t2">${t}</span>${chev}`;

const hub = mobile('01 Settings', th, `
  ${topbar('Settings', { back: false })}
  <div class="col g8 px20" style="margin-top:8px">
    <div class="card row g12" style="padding:14px">${av('AO', 48)}<div class="col g4 grow"><span class="h4">Adaeze Okafor</span><span class="xs mu">Tier 2 verified · Personal</span></div>${chev}</div>
    ${label('PREFERENCES')}
    ${item('sun', 'Appearance', '', val('System'), 'gray', 4)}
    ${item('globe', 'Language and voice', '', val('Yorùbá'), 'gray', 4)}
    ${item('exchange', 'Display currency', '', val('NGN'), 'gray', 4)}
    ${item('bell', 'Notifications', '', chev, 'gray', 4)}
    ${label('SECURITY AND PRIVACY')}
    ${item('shield', 'Security', '', chev, 'gray', 4)}
    ${item('eye', 'Privacy and data', '', chev, 'gray', 4)}
    ${item('link', 'Linked accounts', '', val('3'), 'gray', 4)}
    <div class="row g12" style="margin-top:6px">${[['book', 'Learn'], ['help', 'Help'], ['logout', 'Log out']].map(([ic, t], i) => `<div class="card col center g6 grow" style="padding:12px"><div class="ic ${i === 2 ? 'red' : 'gray'}" style="width:36px;height:36px;border-radius:11px">${icon(ic, 17)}</div><span class="xs w6">${t}</span></div>`).join('')}</div>
  </div>`, { tab: 'more' });

const preview = (mode, on) => {
  const dk = mode === 'Dark';
  const half = mode === 'System';
  const pane = (bg, fg, sub) => `<div class="pane col g4" style="flex:1;background:${bg};padding:10px 8px"><div style="width:30px;height:5px;border-radius:3px;background:${fg}"></div><div style="height:22px;border-radius:6px;background:#E30613;margin-top:4px"></div><div style="height:8px;border-radius:3px;background:${sub};margin-top:4px"></div><div style="height:8px;border-radius:3px;background:${sub}"></div></div>`;
  return `<div class="col center g8" style="flex:1"><div class="row" style="width:100%;height:96px;border-radius:14px;overflow:hidden;border:2px solid ${on ? 'var(--red)' : 'var(--border)'}">${half ? pane('#FFFFFF', '#141416', '#EFEFF2') + pane('#0D0D0F', '#F5F5F7', '#26262B') : dk ? pane('#0D0D0F', '#F5F5F7', '#26262B') : pane('#FFFFFF', '#141416', '#EFEFF2')}</div><span class="s ${on ? 'w6' : 't2'}">${mode}</span>${radio(on)}</div>`;
};
const appearance = mobile('02 Appearance', th, `
  ${topbar('Appearance')}
  <div class="col g16 px20" style="margin-top:8px">
    <span class="s t2">Choose how NURU looks. System follows your phone setting.</span>
    <div class="row g12">${preview('Light', 0)}${preview('Dark', 0)}${preview('System', 1)}</div>
    <div class="div"></div>
    <div class="row g12"><div class="col g4 grow"><span class="s w6">Hide balances on open</span><span class="xs mu">Tap the eye to show them</span></div>${sw(0)}</div>
    <div class="row g12"><div class="col g4 grow"><span class="s w6">Larger text</span><span class="xs mu">Easier reading for long answers</span></div>${sw(0)}</div>
    <div class="row g12"><div class="col g4 grow"><span class="s w6">Reduce motion</span><span class="xs mu">Fewer chart animations</span></div>${sw(0)}</div>
  </div>`);

const language = mobile('03 Language and voice', th, `
  ${topbar('Language and voice')}
  <div class="col g10 px20" style="margin-top:8px">
    ${label('APP AND NURU LANGUAGE', 0)}
    ${[['English', 'English'], ['Yorùbá', 'Èdè Yorùbá', 1], ['Igbo', 'Asụsụ Igbo'], ['Hausa', 'Harshen Hausa']].map(([l, s, on]) => `<div class="row g12" style="padding:12px 14px;border-radius:14px;border:1.5px solid ${on ? 'var(--red)' : 'var(--border)'}"><div class="col g4 grow"><span class="s w6">${l}</span><span class="xs mu">${s}</span></div>${radio(on)}</div>`).join('')}
    ${label('VOICE')}
    <div class="card col g12">
      <div class="row g12"><span class="s grow">Voice</span><span class="xs t2">Female · Ayọ̀</span>${chev}</div>
      <div class="row g12"><span class="s grow">Speaking speed</span><span class="xs t2">Normal</span>${chev}</div>
      <div class="row g12"><span class="s grow">Read answers aloud</span>${sw(1)}</div>
      <div class="row g12"><span class="s grow">Hold to talk</span>${sw(1)}</div>
    </div>
    <div class="soft row g10">${icon('volume', 18, 'var(--red)')}<span class="xs t2 grow">Ẹ kú àárọ̀ Adaeze. Owó tí o ná lọ́sẹ̀ yìí dín sí ti ọ̀sẹ̀ tó kọjá.</span><span class="xs rd w6">Play</span></div>
  </div>`);

const rates = [['₦', 'NGN', 'Nigerian naira', '₦1.00', 1], ['$', 'USD', 'US dollar', '₦1,523.50'], ['£', 'GBP', 'British pound', '₦2,031.20'], ['€', 'EUR', 'Euro', '₦1,768.40'], ['C$', 'CAD', 'Canadian dollar', '₦1,104.90'], ['₵', 'GHS', 'Ghana cedi', '₦98.70']];
const currency = mobile('04 Display currency', th, `
  ${topbar('Display currency')}
  <div class="col g10 px20" style="margin-top:8px">
    <span class="s t2">Balances and charts show in this currency. Transfers still go in naira.</span>
    <div class="soft row g8">${icon('refresh', 16, 'var(--green)')}<span class="xs t2 grow">Live rates, updated 2 minutes ago</span></div>
    ${rates.map(([f, c, n, r, on]) => `<div class="row g12" style="padding:10px 0"><div class="ic gray" style="width:36px;height:36px;border-radius:18px;font-size:15px;font-weight:700">${f}</div><div class="col g4 grow"><span class="s w6">${c}</span><span class="xs mu">${n}</span></div><span class="xs t2 num">${r}</span>${radio(on)}</div>`).join('')}
  </div>`);

const security = mobile('05 Security', th, `
  ${topbar('Security')}
  <div class="col g8 px20" style="margin-top:8px">
    ${label('SIGN IN', 0)}
    ${item('fingerprint', 'Passkeys', 'iPhone 15, MacBook Air', `<span class="badge green">On</span>`, 'green')}
    ${item('key', 'Password', 'Changed 3 months ago')}
    ${item('message', 'One-time codes', 'SMS to +234 803 *** 7890')}
    ${label('TRANSFERS')}
    ${item('lock', 'Transaction PIN', 'Change your 4-digit PIN')}
    <div class="row g12" style="padding:10px 0"><div class="ic green" style="width:36px;height:36px;border-radius:11px">${icon('scanface', 17)}</div><div class="col g4 grow"><span class="s w6">Face check</span><span class="xs mu">For transfers above ${naira(50000)}</span></div>${sw(1)}</div>
    <div class="row g12" style="padding:10px 0"><div class="ic gray" style="width:36px;height:36px;border-radius:11px">${icon('dollar', 17)}</div><div class="col g4 grow"><span class="s w6">Daily transfer limit</span><span class="xs mu">${naira(500000)}</span></div>${chev}</div>
    ${label('DEVICES')}
    ${item('phone', 'Trusted devices', '2 active sessions')}
    <div class="btn out" style="margin-top:8px;color:var(--red);border-color:var(--red)">${icon('alert', 18, 'var(--red)')} Freeze my account</div>
  </div>`);

const privacy = mobile('06 Privacy and data', th, `
  ${topbar('Privacy and data')}
  <div class="col g12 px20" style="margin-top:8px">
    <div class="soft row g10" style="background:var(--green50)">${icon('lock', 18, 'var(--green)')}<span class="xs t2 grow">Your chats with NURU are encrypted and only you can read them. Bank staff cannot see them.</span></div>
    ${label('NURU AI')}
    <div class="card col g12">
      <div class="row g12"><div class="col g4 grow"><span class="s w6">Save chat history</span><span class="xs mu">Kept for 90 days, then deleted</span></div>${sw(1)}</div>
      <div class="row g12"><div class="col g4 grow"><span class="s w6">Use my data for insights</span><span class="xs mu">Only inside your account</span></div>${sw(1)}</div>
      <div class="row g12"><div class="col g4 grow"><span class="s w6">Help improve NURU</span><span class="xs mu">Anonymous, never your name or BVN</span></div>${sw(0)}</div>
    </div>
    ${label('YOUR DATA')}
    ${item('download', 'Download my data', 'Transactions, chats and settings as a file')}
    ${item('link', 'Apps with access', 'Mono, Paystack (test)')}
    ${item('trash', 'Delete chat history', '', chev, 'red')}
    <span class="xs mu">NURU follows the Nigeria Data Protection Act 2023. Read our privacy policy.</span>
  </div>`);

const linked = mobile('07 Linked accounts', th, `
  ${topbar('Linked accounts', { right: `<div class="ib">${icon('plus')}</div>` })}
  <div class="col g12 px20" style="margin-top:8px">
    ${[['P', '#E30613', 'Partner Bank', 'Savings •••• 4417', 'Main', 'green', 'Synced just now'], ['O', '#1DCF9F', 'OPay (sandbox)', 'Wallet •••• 2290', 'Demo', 'blue', 'Synced 4 min ago'], ['K', '#40196D', 'Kuda', 'Current •••• 7781', 'Read only', 'gray', 'Synced 1 hr ago']].map(([l, c, n, a, b, tone, s]) => `<div class="card col g12" style="padding:14px"><div class="row g12"><div class="mark" style="background:${c};width:40px;height:40px;font-size:18px;border-radius:12px">${l}</div><div class="col g4 grow"><span class="s w6">${n}</span><span class="xs mu">${a}</span></div><span class="badge ${tone}">${b}</span></div><div class="row between"><span class="xs t2">${icon('refresh', 12, 'var(--muted)')} ${s}</span><span class="xs rd w6">Disconnect</span></div></div>`).join('')}
    <div class="soft row g10">${icon('info', 18, 'var(--blue)')}<span class="xs t2 grow">You can link the OPay sandbox with any phone number and code 123456.</span></div>
  </div>
  ${bottom('<div class="btn pri grow">' + icon('plus', 18, '#fff') + ' Link another account</div>')}`);

const learn = mobile('08 Learn about money', th, `
  ${topbar('Learn')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="hero col g10">
      <span class="xs" style="opacity:.85">Continue</span>
      <span class="h3" style="color:#fff">Treasury bills in plain words</span>
      <span class="xs" style="opacity:.85">Lesson 3 of 5 · 4 min</span>
      <div style="height:6px;border-radius:3px;background:rgba(255,255,255,.3)"><div style="width:60%;height:6px;border-radius:3px;background:#fff"></div></div>
    </div>
    <div class="row g8"><span class="chip on">All</span><span class="chip">Saving</span><span class="chip">Credit</span><span class="chip">Business</span></div>
    ${[['percent', 'red', 'How loan interest really works', '5 lessons · Credit'], ['target', 'green', 'The 50/30/20 budget', '3 lessons · Saving'], ['briefcase', 'blue', 'Pay yourself first as a business owner', '4 lessons · Business'], ['shield', 'amber', 'Spot fake alerts and scam calls', '3 lessons · Safety'], ['trendup', 'green', 'Beat inflation with your savings', '4 lessons · Investing']].map(([ic, tone, t, s]) => `<div class="row g12"><div class="ic ${tone}" style="width:44px;height:44px;border-radius:13px">${icon(ic, 19)}</div><div class="col g4 grow"><span class="s w6">${t}</span><span class="xs mu">${s}</span></div>${icon('play', 18, 'var(--muted)')}</div>`).join('')}
  </div>`);

const help = mobile('09 Help and support', th, `
  ${topbar('Help and support')}
  <div class="col g12 px20" style="margin-top:8px">
    <div class="input" style="background:var(--surface);border-color:transparent">${icon('search', 18, 'var(--muted)')}<span class="mu grow">Search help</span></div>
    <div class="row g12">
      ${[['message', 'Chat with us', 'Replies in minutes'], ['phone', 'Call your bank', '24 hours']].map(([ic, t, s]) => `<div class="card col g8 grow" style="padding:14px"><div class="ic red" style="width:36px;height:36px;border-radius:11px">${icon(ic, 17)}</div><span class="s w6">${t}</span><span class="xs mu">${s}</span></div>`).join('')}
    </div>
    ${label('POPULAR QUESTIONS')}
    ${['A transfer failed but I was debited', 'How do I reset my transaction PIN?', 'Why was my transfer held for a face check?', 'How does NURU keep my chats private?', 'How do I link an OPay account?'].map((t) => `<div class="row g12" style="padding:10px 0;border-bottom:1px solid var(--border)"><span class="s grow">${t}</span>${chev}</div>`).join('')}
    ${label('REPORT')}
    ${item('alert', 'Report fraud', 'We freeze your card in one tap', chev, 'red')}
  </div>`);

const msg = (who, t, time) => who === 'me'
  ? `<div class="col g4" style="align-items:flex-end"><div class="bubble me">${t}</div><span class="xs mu">${time}</span></div>`
  : `<div class="col g4"><div class="bubble ai">${t}</div><span class="xs mu">${time}</span></div>`;
const support = mobile('10 Customer service chat', th, `
  <div class="row g12 px20" style="height:56px;flex:none"><div class="ib">${icon('chevl')}</div><div class="av" style="width:36px;height:36px;font-size:13px;background:#1D4ED8">TB</div><div class="col g4 grow"><span class="s w6">Tunde B. · Customer support</span><span class="xs gr w6">Online</span></div><div class="ib">${icon('phone')}</div></div>
  <div class="col g12 px20" style="margin-top:8px">
    <div class="row center"><span class="badge gray">${icon('sparkles', 11)} NURU passed your chat to a person</span></div>
    ${msg('me', 'I sent ₦25,000 to my brother yesterday. It left my account but he has not received it.', '10:14 am')}
    ${msg('ai', 'Sorry about that, Adaeze. I can see the transfer to Chinedu Okafor (GTBank) on 17 Oct, 6:42 pm. It is stuck at the receiving bank.', '10:16 am')}
    ${msg('ai', 'I have raised a claim. If GTBank does not credit him by 4 pm today, we refund you automatically.', '10:16 am')}
    <div class="card row g12" style="padding:12px"><div class="ic amber" style="width:36px;height:36px;border-radius:11px">${icon('clock', 17)}</div><div class="col g4 grow"><span class="s w6">Claim ZB-88213</span><span class="xs mu">${naira(25000)} · refund by 4:00 pm</span></div><span class="badge amber">Open</span></div>
    ${msg('me', 'Thank you Tunde', '10:17 am')}
  </div>
  <div class="row g10 px20" style="position:absolute;left:0;right:0;bottom:34px"><div class="input grow" style="height:48px"><span class="mu grow">Type a message</span>${icon('camera', 18, 'var(--muted)')}</div><div class="ib" style="width:48px;height:48px;background:var(--red);color:#fff">${icon('send', 20, '#fff')}</div></div>`);

const logout = mobile('11 Log out', th, `
  ${topbar('Settings', { back: false })}
  <div class="col g8 px20" style="margin-top:8px">
    <div class="card row g12" style="padding:14px">${av('AO', 48)}<div class="col g4 grow"><span class="h4">Adaeze Okafor</span><span class="xs mu">Tier 2 verified · Personal</span></div></div>
    ${item('sun', 'Appearance', '', val('System'))}
    ${item('globe', 'Language and voice', '', val('Yorùbá'))}
    ${item('exchange', 'Display currency', '', val('NGN'))}
  </div>
  <div class="scrim"></div>
  <div class="sheet">
    <div class="grab"></div>
    <div class="col center g8"><div class="ic red" style="width:56px;height:56px;border-radius:18px">${icon('logout', 24)}</div><span class="h3">Log out of NURU?</span><span class="s t2" style="text-align:center">You will need your passkey or password to sign in again. Your chats stay saved.</span></div>
    <div class="row g12"><div class="col g4 grow"><span class="s w6">Log out on all devices</span><span class="xs mu">Also signs out your MacBook</span></div>${sw(0)}</div>
    <div class="btn pri">Log out</div>
    <div class="btn sec">Cancel</div>
  </div>`);

export default [hub, appearance, language, currency, security, privacy, linked, learn, help, support, logout];
