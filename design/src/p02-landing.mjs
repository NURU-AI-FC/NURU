import { icon, web, mobile, logo, naira, bars, line, status } from './lib.mjs';
import { mapArt } from './p17-branches.mjs';

const th = 'light';
const big = (t, size = 56, color = 'var(--text)') => `<div style="font-size:${size}px;line-height:${Math.round(size * 1.1)}px;font-weight:800;letter-spacing:${-size / 28}px;color:${color}">${t}</div>`;
const pill = (ic, t) => `<div class="row g8" style="height:34px;padding:0 14px;border-radius:999px;background:var(--red50);color:var(--red);font-size:13px;font-weight:600;align-self:flex-start">${icon(ic, 15)}<span>${t}</span></div>`;
const check = (t) => `<div class="row g10">${icon('check', 18, 'var(--green)')}<span class="b t2">${t}</span></div>`;

// small phone that shows the product inside the hero
const phone = (w = 300) => {
  const inner = w - 20;
  return `<div class="pane" style="width:${w}px;height:${Math.round(w * 2.05)}px;border-radius:44px;background:#141416;padding:10px;flex:none;box-shadow:0 30px 60px rgba(20,20,22,.25)">
  <div class="col" style="width:${inner}px;height:100%;border-radius:36px;background:#FFFFFF;overflow:hidden;color:#141416">
    <div class="row between" style="height:40px;padding:0 22px;font-size:13px;font-weight:600;flex:none"><span>9:41</span>${icon('wifi', 13, '#141416')}</div>
    <div class="col g12" style="padding:6px 16px">
      <div class="row between"><div class="col g4"><span class="xs" style="color:#8C8C97">Good morning</span><span class="h4">Adaeze</span></div><div class="av" style="width:32px;height:32px;font-size:12px">AO</div></div>
      <div class="col g6" style="background:linear-gradient(135deg,#E30613 0%,#A3000D 100%);border-radius:20px;padding:16px;color:#fff"><span class="xs" style="opacity:.85">Total balance</span><span style="font-size:24px;font-weight:700;letter-spacing:-.5px">${naira(1284500)}</span><span class="xs" style="opacity:.85">3 accounts · +₦62,400 this week</span></div>
      <div class="col g8" style="border:1px solid #E6E6EA;border-radius:18px;padding:12px"><span class="s w6">This week</span>${bars([9, 14, 7, 18, 11, 16, 8], { w: inner - 58, h: 80, labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], hi: 3, base: '#EFEFF2' })}</div>
      <div class="col g6" style="background:#F7F7F8;border-radius:16px 16px 16px 6px;padding:12px"><div class="row g6">${icon('sparkles', 13, '#E30613')}<span class="xs w6" style="color:#E30613">NURU</span></div><span class="s">You spent 12% less on food this week. Move ₦15,000 to your Japa fund?</span></div>
    </div>
  </div></div>`;
};

const nav = `<div class="row between" style="height:76px;padding:0 80px;flex:none;border-bottom:1px solid var(--border)">
  ${logo(34)}
  <div class="row g32" style="font-size:15px;font-weight:500;color:var(--text2)"><span>Features</span><span>Languages</span><span>Business</span><span>Security</span><span>Branches</span><span>For judges</span></div>
  <div class="row g12"><div class="row" style="height:40px;padding:4px;border-radius:12px;background:var(--surface);gap:2px">${['sun', 'moon', 'monitor'].map((i, k) => `<div class="row center" style="width:32px;height:32px;border-radius:9px;${k === 0 ? 'background:var(--bg);color:var(--red);box-shadow:0 1px 3px rgba(0,0,0,.08)' : 'color:var(--muted)'}">${icon(i, 16)}</div>`).join('')}</div><div class="btn ghost sm" style="font-size:15px">Sign in</div><div class="btn pri sm" style="height:42px;font-size:15px">Get started</div></div>
</div>`;

const hero = `<div class="row g48" style="padding:72px 80px 56px;align-items:center">
  <div class="col g24 grow">
    ${pill('sparkles', 'Zecathon 6.0 · Built for Zenith Bank customers')}
    <div class="col">${big('Your money, explained', 60)}${big('in your language.', 60, 'var(--red)')}</div>
    <span style="font-size:19px;line-height:30px;color:var(--text2);max-width:560px">NURU is an AI copilot that reads your account history and tells you, in English, Yorùbá, Igbo or Hausa, where your money went and what to do next.</span>
    <div class="row g12"><div class="btn pri" style="height:56px;padding:0 28px">Try the live demo ${icon('chevr', 18, '#fff')}</div><div class="btn out" style="height:56px;padding:0 24px">${icon('play', 18)} Watch 60-second tour</div></div>
    <div class="row g24" style="margin-top:8px">${[['4', 'languages with voice'], ['13', 'kinds of insight'], ['0', 'data shared outside Zenith']].map(([v, l]) => `<div class="col g4"><span style="font-size:28px;font-weight:800;letter-spacing:-1px">${v}</span><span class="s t2">${l}</span></div>`).join('<div style="width:1px;height:44px;background:var(--border)"></div>')}</div>
  </div>
  <div class="row" style="width:520px;justify-content:center;position:relative">
    ${phone(300)}
    <div class="card row g10" style="position:absolute;left:0;top:90px;padding:12px 14px">${icon('volume', 18, 'var(--red)')}<div class="col g4"><span class="xs mu">Voice reply</span><span class="s w6">Ẹ kú àárọ̀, Adaeze</span></div></div>
    <div class="card row g10" style="position:absolute;right:0;top:330px;padding:12px 14px"><div class="ic green" style="width:32px;height:32px;border-radius:10px">${icon('shieldcheck', 16)}</div><div class="col g4"><span class="xs mu">Transfer protected</span><span class="s w6">Face check passed</span></div></div>
  </div>
</div>`;

const strip = `<div class="row center g40" style="padding:22px 80px;background:var(--surface);font-size:14px;color:var(--muted);font-weight:600">
  <span>Works with</span>${['Zenith Bank', 'OPay sandbox', 'Mono', 'Paystack test', 'Azure Speech', 'Spitch'].map((t) => `<span style="color:var(--text2)">${t}</span>`).join('')}
</div>`;

const feats = [
  ['chart', 'red', 'Daily to yearly insights', 'Power BI-style charts for every account, with a 3-month comparison and a forecast of next month.'],
  ['message', 'blue', 'Ask NURU anything about money', 'Type or speak. NURU only answers money questions and refuses tricks that try to change its rules.'],
  ['briefcase', 'amber', 'Tools for your business', 'Payroll, vendors, invoices, ads spend, a 12-month plan and a Decision Room for big choices.'],
  ['landmark', 'green', 'Loans, savings and pension', 'See interest, disbursement and repayment dates, fixed deposits, insurance and pension in one place.'],
  ['shield', 'red', 'Bank-grade protection', 'Passkeys, PIN plus face check, BVN and NIN checks, one-time codes and encrypted private chats.'],
  ['exchange', 'blue', 'Live currency view', 'Switch your balance to dollars, pounds or euros with live rates, then switch back in one tap.'],
];
const features = `<div class="col g40" style="padding:88px 80px">
  <div class="col g12 center">${pill('grid', 'Features').replace('align-self:flex-start', 'align-self:center')}${big('Everything your money needs', 44)}<span style="font-size:18px;line-height:28px;color:var(--text2)">One app for spending, saving, borrowing and running a business.</span></div>
  <div class="row wrap" style="gap:24px;align-items:stretch">${feats.map(([ic, tone, t, s]) => `<div class="card col g12" style="width:405px;padding:28px"><div class="ic ${tone}" style="width:52px;height:52px;border-radius:16px">${icon(ic, 24)}</div><span class="h3" style="font-size:20px;line-height:26px">${t}</span><span class="b t2">${s}</span></div>`).join('')}</div>
</div>`;

const langs = [['English', 'How much did I spend on food this month?', '₦132,000. That is ₦12,000 over your budget.'], ['Yorùbá', 'Èló ni mo ná lórí oúnjẹ lóṣù yìí?', '₦132,000. Ó ju ìnáwó rẹ lọ pẹ̀lú ₦12,000.'], ['Igbo', 'Ego ole ka m ji zụta nri n’ọnwa a?', '₦132,000. Ọ karịrị atụmatụ gị ₦12,000.'], ['Hausa', 'Nawa na kashe a kan abinci a wannan wata?', '₦132,000. Ya wuce kasafin ku da ₦12,000.']];
const languages = `<div class="row" style="gap:64px;padding:88px 80px;background:var(--surface);align-items:center">
  <div class="col g20" style="width:460px">
    ${pill('globe', 'Languages and voice')}
    ${big('Speak to NURU the way you speak at home', 40)}
    <span class="b t2">Every screen and every answer works in four languages. Hold the mic to talk and NURU replies with a natural voice.</span>
    ${check('Yorùbá, Igbo, Hausa and Nigerian English')}${check('Voice in and voice out, powered by Azure Speech and Spitch')}${check('Switch language any time from the chat')}
  </div>
  <div class="row wrap grow" style="gap:20px;align-items:stretch">${langs.map(([l, q, a]) => `<div class="card col g10" style="width:330px;padding:20px"><span class="badge red" style="align-self:flex-start">${l}</span><div class="bubble me" style="max-width:290px">${q}</div><div class="bubble ai" style="max-width:290px;background:var(--surface)">${a}</div></div>`).join('')}</div>
</div>`;

const business = `<div class="row" style="gap:64px;padding:88px 80px;align-items:center">
  <div class="card col g16" style="width:600px;padding:28px">
    <div class="row between"><div class="col g4"><span class="s mu">Kemi Foods Ltd · profit</span><span class="h1 num">${naira(684000)}</span></div><span class="badge green">${icon('up', 11)} 9% vs Sep</span></div>
    ${line([420, 380, 510, 470, 560, 610, 684], { w: 542, h: 160, color: 'var(--green)', labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'], compare: [400, 410, 430, 450, 470, 500, 520] })}
    <div class="row g12">${[['Payroll', naira(590450), 'Due 28 Oct'], ['Unpaid invoices', naira(415000), '3 overdue'], ['Runway', '41 days', 'Healthy']].map(([l, v, s]) => `<div class="soft col g4 grow"><span class="xs mu">${l}</span><span class="h4 num">${v}</span><span class="xs t2">${s}</span></div>`).join('')}</div>
  </div>
  <div class="col g20 grow">
    ${pill('briefcase', 'For business owners')}
    ${big('Run payroll, chase invoices, plan the year', 40)}
    <span class="b t2">Switch to Business mode to manage staff salaries with PAYE and pension worked out, pay vendors, track ad spend per order and prepare for investor meetings.</span>
    ${check('Decision Room: test a loan or a new branch before you commit')}${check('Reminders for repayments, insurance and meetings')}${check('One-page investor summary drafted for you')}
  </div>
</div>`;

const security = `<div class="pane col g40" style="padding:88px 80px;background:#141416;color:#FFFFFF">
  <div class="row between" style="align-items:flex-end">
    <div class="col g16" style="width:620px"><div class="row g8" style="height:34px;padding:0 14px;border-radius:999px;background:rgba(255,255,255,.1);font-size:13px;font-weight:600;align-self:flex-start">${icon('shield', 15, '#fff')}<span>Security first</span></div>${big('Your money and your chats stay yours', 40, '#FFFFFF')}</div>
    <span class="b" style="width:440px;color:#B3B3BD">NURU never moves money without your PIN and face check, and it cannot be talked into breaking its own rules.</span>
  </div>
  <div class="row g20">${[['fingerprint', 'Passkeys and PIN', 'Sign in without passwords. Hashed with Argon2id.'], ['scanface', 'Face check', 'Liveness check for large or unusual transfers.'], ['shieldcheck', 'BVN and NIN', 'Identity verified once, at sign up.'], ['lock', 'Private chats', 'Encrypted. Not even Zenith staff can read them.'], ['alert', 'Injection guard', 'Blocks prompts that try to change NURU’s rules.']].map(([ic, t, s]) => `<div class="col g12 grow" style="padding:24px;border-radius:20px;background:#1D1D21;border:1px solid #2B2B31"><div class="row center" style="width:44px;height:44px;border-radius:14px;background:rgba(227,6,19,.18)">${icon(ic, 20, '#FF2E3E')}</div><span class="h4" style="color:#FFFFFF">${t}</span><span class="s" style="color:#B3B3BD">${s}</span></div>`).join('')}</div>
</div>`;

const branchSec = `<div class="row" style="gap:64px;padding:88px 80px;background:var(--surface);align-items:center">
  <div class="col g20" style="width:460px">
    ${pill('pin', 'Branches and ATMs')}
    ${big('Find a Zenith branch near you', 40)}
    <span class="b t2">Need to visit in person? NURU shows the closest Zenith branches and ATMs on a live map, with opening hours and one-tap directions.</span>
    ${check('Uses your location once, never stored')}${check('Open now, ATM and cash deposit filters')}${check('Directions in Google Maps or Apple Maps')}
  </div>
  <div class="card" style="padding:0;overflow:hidden;position:relative;width:700px;height:420px">${mapArt(700, 420, [[200, 180, true], [380, 140], [470, 290], [150, 320], [580, 360]], [320, 240])}
    <div class="card col g8" style="position:absolute;left:24px;bottom:24px;width:300px;padding:16px"><div class="row between"><span class="s w6">Zenith Bank Head Office</span><span class="badge green">Open</span></div><span class="xs t2">Plot 84 Ajose Adeogun St · 1.2 km away</span><div class="btn pri sm">${icon('car', 16, '#fff')} Directions</div></div>
  </div>
</div>`;

const judges = `<div class="row g48" style="padding:88px 80px;align-items:center">
  <div class="col g16 grow">
    ${pill('flag', 'For Zecathon judges')}
    ${big('Test NURU in two minutes', 40)}
    <span class="b t2">Everything runs on sandbox data. No real money moves and no real bank login is needed.</span>
    ${[['1', 'Tap Try the live demo on any phone or laptop'], ['2', 'Sign in with the demo account below'], ['3', 'Ask NURU in Yorùbá: “Èló ni mo ná lọ́sẹ̀ yìí?”'], ['4', 'Say “send ₦5,000 to Tunde” and set up your PIN and face']].map(([n, t]) => `<div class="row g12"><div class="row center" style="width:32px;height:32px;border-radius:16px;background:var(--red50);color:var(--red);font-weight:700;font-size:14px;flex:none">${n}</div><span class="b">${t}</span></div>`).join('')}
  </div>
  <div class="card col g16" style="width:460px;padding:28px">
    <span class="h3">Demo account</span>
    ${[['Email', 'judge@nuru.app'], ['Password', 'Zecathon-2026'], ['OTP code', '000000'], ['Transaction PIN', 'You create it on your first transfer']].map(([l, v]) => `<div class="row between" style="padding:12px 14px;border-radius:12px;background:var(--surface)"><span class="s t2">${l}</span><span class="s w6 num">${v}</span></div>`).join('')}
    <div class="btn pri">Open the demo ${icon('chevr', 18, '#fff')}</div>
  </div>
</div>`;

const footer = `<div class="col g32" style="padding:56px 80px 40px;border-top:1px solid var(--border)">
  <div class="row between" style="align-items:flex-start">
    <div class="col g12" style="width:340px">${logo(32)}<span class="s t2">An AI financial copilot built for Zenith Bank Zecathon 6.0 by team NURU.</span></div>
    ${[['Product', ['Insights', 'Ask NURU', 'Business', 'Security']], ['Company', ['About the team', 'Contact', 'Press kit']], ['Legal', ['Privacy policy', 'Terms', 'NDPA 2023']]].map(([h, ls]) => `<div class="col g12" style="width:180px"><span class="s w6">${h}</span>${ls.map((l) => `<span class="s t2">${l}</span>`).join('')}</div>`).join('')}
  </div>
  <div class="row between"><span class="xs mu">© 2026 NURU. Demo product. Not a licensed bank.</span><div class="row g16">${['sun', 'moon', 'monitor'].map((i, k) => `<div class="ib" style="width:32px;height:32px;${k === 2 ? 'background:var(--red50);color:var(--red)' : ''}">${icon(i, 16)}</div>`).join('')}</div></div>
</div>`;

const desktop = web('01 Landing desktop', th, nav + hero + strip + features + languages + business + security + branchSec + judges + footer);

const mHero = mobile('02 Landing mobile', th, `
  <div class="row between px20" style="height:56px;flex:none">${logo(28)}<div class="ib">${icon('menu')}</div></div>
  <div class="col g16 px20" style="margin-top:12px">
    ${pill('sparkles', 'Built for Zenith Bank customers')}
    <div class="col">${big('Your money,', 36)}${big('explained in', 36)}${big('your language.', 36, 'var(--red)')}</div>
    <span class="b t2">An AI copilot that reads your account history and tells you, in English, Yorùbá, Igbo or Hausa, where your money went.</span>
    <div class="btn pri">Try the live demo</div>
    <div class="btn out">${icon('play', 18)} Watch the tour</div>
  </div>
  <div class="row center" style="margin-top:24px">${phone(240)}</div>`);

const mFeatures = mobile('03 Landing mobile features', th, `
  <div class="row between px20" style="height:56px;flex:none">${logo(28)}<div class="ib">${icon('menu')}</div></div>
  <div class="col g12 px20" style="margin-top:8px">
    <span class="h1">Everything your money needs</span>
    ${feats.slice(0, 5).map(([ic, tone, t, s]) => `<div class="card row g12" style="padding:14px;align-items:flex-start"><div class="ic ${tone}" style="width:40px;height:40px;border-radius:12px">${icon(ic, 19)}</div><div class="col g4 grow"><span class="s w6">${t}</span><span class="xs t2">${s}</span></div></div>`).join('')}
  </div>`);

const mMenu = mobile('04 Landing mobile menu', th, `
  <div class="row between px20" style="height:56px;flex:none">${logo(28)}<div class="ib">${icon('x')}</div></div>
  <div class="col px20" style="margin-top:12px">
    ${['Features', 'Languages', 'Business', 'Security', 'Branches', 'For judges'].map((t) => `<div class="row between" style="height:60px;border-bottom:1px solid var(--border)"><span class="h3">${t}</span>${icon('chevr', 18, 'var(--muted)')}</div>`).join('')}
    <div class="row g10" style="margin-top:24px"><span class="s t2 grow">Theme</span><div class="seg" style="width:220px"><span>Light</span><span>Dark</span><span class="on">System</span></div></div>
    <div class="row g10" style="margin-top:16px"><span class="s t2 grow">Language</span><span class="chip">English</span><span class="chip on">Yorùbá</span></div>
  </div>
  <div class="col g10 px20" style="position:absolute;left:0;right:0;bottom:34px"><div class="btn pri">Get started</div><div class="btn sec">Sign in</div></div>`);

export default [desktop, mHero, mFeatures, mMenu];
