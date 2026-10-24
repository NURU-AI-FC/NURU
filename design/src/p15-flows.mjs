import { icon, web } from './lib.mjs';

const th = 'light';
const arrow = `<div style="flex:none;align-self:center;color:var(--muted)">${icon('chevr', 18)}</div>`;
const step = (ic, t, s, tone = 'gray') => `<div class="col g8 grow" style="padding:14px;border-radius:14px;border:1px solid var(--border);background:var(--bg);min-width:0"><div class="ic ${tone}" style="width:32px;height:32px;border-radius:10px">${icon(ic, 16)}</div><span class="s w6">${t}</span><span class="xs t2">${s}</span></div>`;
const flow = (n, title, sub, steps) => `<div class="card col g12" style="padding:16px 18px">
  <div class="row g10"><div class="mark" style="width:26px;height:26px;font-size:13px">${n}</div><span class="h4">${title}</span><span class="xs mu">${sub}</span></div>
  <div class="row g8" style="align-items:stretch">${steps.map((s) => step(...s)).join(arrow)}</div>
</div>`;

const flowsBody = `<div class="col g16" style="padding:24px 40px;height:900px;background:var(--surface)">
  <div class="col g4"><span class="h2" style="font-size:24px">User flows</span><span class="s t2">How customers and bank staff move through NURU</span></div>
  ${flow(1, 'Sign up and link a bank', 'About 3 minutes', [['user', 'Create account', 'Phone, email and password', 'red'], ['card', 'BVN or NIN', 'Checked with the bank', 'gray'], ['message', 'OTP', 'Sent by SMS', 'gray'], ['scanface', 'Face check', 'Liveness, stored as a template', 'gray'], ['lock', 'Set PIN', '4 digits, hashed', 'gray'], ['link', 'Link accounts', 'Partner Bank, OPay sandbox', 'gray'], ['home', 'Dashboard', 'First insights ready', 'green']])}
  ${flow(2, 'Ask NURU a money question', 'Text or voice, four languages', [['mic', 'Ask', 'Yorùbá voice or English text', 'red'], ['shield', 'Safety check', 'Blocks off topic and injection', 'gray'], ['database', 'Fetch data', 'Only this user, masked', 'gray'], ['sparkles', 'Answer', 'Plain words plus a chart', 'gray'], ['bulb', 'Suggest', 'One clear next step', 'gray'], ['check', 'Act', 'Tap to save, pay or remind', 'green']])}
  ${flow(3, 'Send money safely', 'Every payment needs two checks', [['send', 'Choose payee', 'Saved or new account', 'red'], ['edit', 'Amount and note', 'Shows live FX if foreign', 'gray'], ['eye', 'Review', 'Name check and fees', 'gray'], ['key', 'PIN', 'Hashed on the server', 'gray'], ['scanface', 'Face or passkey', 'Second factor', 'gray'], ['receipt', 'Receipt', 'Shareable, saved to history', 'green']])}
  ${flow(4, 'Bank turns insight into an offer', 'Staff console, opted in data only', [['lock', 'Consent', 'Customer opts in', 'red'], ['eyeoff', 'Anonymise', 'Names and numbers masked', 'gray'], ['users', 'Segment', 'Grouped by spending pattern', 'gray'], ['megaphone', 'Campaign', 'Offer in 4 languages', 'gray'], ['shieldcheck', 'Approve', 'Compliance sign off', 'gray'], ['trendup', 'Measure', 'Uptake and savings growth', 'green']])}
</div>`;

const box = (ic, t, s, tone = 'gray') => `<div class="row g10" style="padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg)"><div class="ic ${tone}" style="width:30px;height:30px;border-radius:9px">${icon(ic, 15)}</div><div class="col g4"><span class="s w6">${t}</span><span class="xs t2">${s}</span></div></div>`;
const column = (title, items, flex = 1) => `<div class="card col g10" style="flex:${flex};padding:16px"><span class="xs mu w6">${title}</span>${items.map((i) => box(...i)).join('')}</div>`;
const harrow = `<div class="col center" style="flex:none;color:var(--red)">${icon('chevr', 22)}</div>`;

const archBody = `<div class="col g20" style="padding:28px 40px;height:640px;background:var(--surface)">
  <div class="col g4"><span class="h2" style="font-size:24px">System architecture</span><span class="s t2">What runs where in the demo</span></div>
  <div class="row g12" style="align-items:stretch">
    ${column('CLIENTS', [['laptop', 'Web app', 'React and Vite on Vercel', 'red'], ['phone', 'Mobile app', 'Expo, iOS and Android', 'red'], ['grid', 'Bank console', 'Staff web app', 'red']])}
    ${harrow}
    ${column('CORE API', [['cpu', 'Go API', 'Auth, accounts, payments', 'gray'], ['lock', 'Security', 'Argon2id, OTP, passkeys', 'gray'], ['globe', 'FX rates', 'Live conversion, cached', 'gray'], ['bell', 'Reminders', 'Bills and investor meetings', 'gray']])}
    ${harrow}
    ${column('AI SERVICE', [['shield', 'Guardrails', 'Money only, injection filter', 'green'], ['database', 'Retrieval', 'pgvector over user data', 'green'], ['sparkles', 'Claude', 'Answers and insights', 'green'], ['volume', 'Voice', 'Azure Speech and Spitch', 'green']])}
    ${harrow}
    ${column('DATA AND PARTNERS', [['database', 'Postgres', 'With pgvector, on Railway', 'blue'], ['layers', 'Redis', 'Sessions and rate limits', 'blue'], ['link', 'Mono sandbox', 'Account linking', 'blue'], ['card', 'Paystack test', 'Payments demo', 'blue']])}
  </div>
  <div class="row g16" style="align-items:stretch">
    <div class="card col g10 grow" style="padding:16px"><span class="h4">Do visitors need Docker, n8n or Hermes?</span><span class="s t2">No. Visitors open one web link and sign in with the demo account. Docker is only used by the team to run everything locally with one command. n8n and Hermes are not needed.</span></div>
    <div class="card col g10 grow" style="padding:16px"><span class="h4">Demo account</span><div class="row g16">${[['Email', 'demo@nuru.app'], ['Password', 'Nuru-Demo-2026'], ['PIN', '1234'], ['OTP', '000000']].map(([l, v]) => `<div class="col g4"><span class="xs mu">${l}</span><span class="s w6">${v}</span></div>`).join('')}</div><span class="xs t2">Uses seeded sandbox data. No real money moves.</span></div>
  </div>
</div>`;

const flows = web('01 User flows', th, flowsBody, 'height:900px');
const arch = web('02 System architecture', th, archBody, 'height:640px');

export default [flows, arch];
