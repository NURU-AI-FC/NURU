import { icon, web, naira, line, bars, donut } from './lib.mjs';

// NURU HQ: the internal dashboard for the CEO and the NURU team, plus the
// access screens the Partner Bank console needs (staff sign in, team and roles).
const th = 'light';

const hqNav = [['grid', 'Overview'], ['cpu', 'Platform health'], ['headphones', 'Support and reports'], ['mail', 'Emails and nudges'], ['users', 'Team and access']];
const hqSide = (active) => `<div class="col" style="width:256px;height:900px;flex:none;background:#141416;color:#fff;padding:16px 14px">
  <div class="row g10" style="padding:0 6px"><div class="mark" style="width:32px;height:32px;font-size:18px">N</div><div class="col g4"><span class="s w7">NURU HQ</span><span class="xs" style="color:#8C8C97">Internal · team only</span></div></div>
  <div class="col" style="margin-top:22px;gap:2px">${hqNav.map(([ic, t]) => `<div class="row g12" style="height:40px;padding:0 10px;border-radius:10px;font-size:14px;font-weight:${t === active ? 600 : 500};${t === active ? 'background:#2B2B31;color:#fff' : 'color:#B3B3BD'}">${icon(ic, 18)}<span>${t}</span></div>`).join('')}</div>
  <div class="col g6" style="margin-top:22px;padding:12px;border-radius:12px;background:#1D1D21;border:1px solid #2B2B31"><div class="row g8">${icon('eyeoff', 15, '#4ADE80')}<span class="xs w6">No customer data here</span></div><span class="xs" style="color:#B3B3BD">Counts and health only. Chats, balances and names never reach HQ.</span></div>
  <div class="grow"></div>
  <div class="row g10" style="padding:10px;border-radius:12px;background:#1D1D21;border:1px solid #2B2B31"><div class="av" style="width:34px;height:34px;font-size:12px">BJ</div><div class="col g4 grow"><span class="s w6">Bolaji Jimoh</span><span class="xs" style="color:#8C8C97">CEO · Owner</span></div>${icon('logout', 18, '#8C8C97')}</div>
</div>`;

const csNav = [['grid', 'Overview'], ['users', 'Segments'], ['user', 'Customer view'], ['megaphone', 'Campaigns'], ['shield', 'Risk and AI safety'], ['database', 'Data and consent'], ['key', 'Team and access']];
const csSide = (active) => `<div class="col" style="width:256px;height:900px;flex:none;background:var(--surface);border-right:1px solid var(--border);padding:16px 14px">
  <div class="row g10" style="padding:0 6px"><div class="mark" style="width:32px;height:32px;font-size:18px">N</div><div class="col g4"><span class="s w7">NURU Console</span><span class="xs mu">Partner Bank · staff</span></div></div>
  <div class="col" style="margin-top:22px;gap:2px">${csNav.map(([ic, t]) => `<div class="row g12" style="height:40px;padding:0 10px;border-radius:10px;font-size:14px;font-weight:${t === active ? 600 : 500};${t === active ? 'background:var(--red50);color:var(--red)' : 'color:var(--text2)'}">${icon(ic, 18)}<span>${t}</span></div>`).join('')}</div>
  <div class="grow"></div>
  <div class="row g10" style="padding:10px;border-radius:12px;border:1px solid var(--border);background:var(--bg)"><div class="av" style="width:34px;height:34px;font-size:12px;background:#141416">AO</div><div class="col g4 grow"><span class="s w6">Amaka Obi</span><span class="xs mu">Console admin</span></div>${icon('logout', 18, 'var(--muted)')}</div>
</div>`;

const top = (title, sub, right = '') => `<div class="row between" style="height:72px;padding:0 32px;flex:none;border-bottom:1px solid var(--border)">
  <div class="col g4"><span class="h2" style="font-size:20px">${title}</span><span class="xs mu">${sub}</span></div>
  <div class="row g12">${right}<div class="ib">${icon('bell', 18)}</div><div class="ib">${icon('sun', 18)}</div></div>
</div>`;
const shell = (name, side, title, sub, body, right = '') =>
  web(name, th, `<div class="row" style="height:900px;align-items:stretch">${side}<div class="col grow">${top(title, sub, right)}<div class="col grow" style="padding:24px 32px;gap:20px;background:var(--bg)">${body}</div></div></div>`, 'height:900px');

const kpi = (l, v, d, tone = 'gr', ic = 'users') => `<div class="card col g8 grow" style="padding:18px"><div class="row between"><span class="s mu">${l}</span><div class="ic gray" style="width:32px;height:32px;border-radius:10px">${icon(ic, 16)}</div></div><span class="h1 num" style="font-size:26px">${v}</span><span class="xs ${tone} w6">${d}</span></div>`;
const range = `<div class="seg" style="width:250px"><span>Today</span><span class="on">7 days</span><span>30 days</span></div>`;
const bar = (p, c = 'var(--red)') => `<div style="height:6px;border-radius:3px;background:var(--surface2)"><div style="width:${p}%;height:6px;border-radius:3px;background:${c}"></div></div>`;
const dot = (c) => `<div style="width:8px;height:8px;border-radius:4px;background:${c};flex:none"></div>`;
const badge = (t, c) => `<span class="badge ${c}">${t}</span>`;

// 01 CEO overview
const overviewBody = `
  <div class="row g16">${kpi('Customers', '1,284', '+212 this week', 'gr', 'users')}${kpi('Active this week', '806', '63% of customers', 'gr', 'zap')}${kpi('Questions answered', '9,412', '38% in Yorùbá, Igbo or Hausa', 'gr', 'message')}${kpi('Money moved safely', naira(48200000), '1,930 transfers, 0 lost', 'gr', 'send')}${kpi('Uptime', '99.98%', 'All services up', 'gr', 'cpu')}</div>
  <div class="row g16" style="align-items:stretch">
    <div class="card col g12" style="flex:1.6">
      <div class="row between"><div class="col g4"><span class="h4">Daily active customers</span><span class="xs mu">Dashed line is last week</span></div>${badge(icon('up', 11) + ' 18%', 'green')}</div>
      ${line([92, 110, 104, 131, 128, 150, 171], { w: 640, h: 170, labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], compare: [80, 88, 95, 101, 99, 120, 132] })}
    </div>
    <div class="card col g12" style="flex:1">
      <span class="h4">Sign up to first insight</span>
      ${[['Signed up', 100, '412'], ['Verified BVN', 82, '338'], ['Linked an account', 66, '272'], ['Asked NURU', 58, '239'], ['Acted on a tip', 37, '152']].map(([l, p, n]) => `<div class="col g6"><div class="row between"><span class="s">${l}</span><span class="s w6 num">${n}</span></div>${bar(p)}</div>`).join('')}
    </div>
  </div>
  <div class="row g16" style="align-items:stretch">
    <div class="card col g10" style="flex:1"><div class="row between"><span class="h4">Needs your attention</span>${badge('3 open', 'red')}</div>
      ${[['alert', 'red', 'AI fallback used for 4% of replies', 'Claude timed out twice at 14:10', 'Platform health'], ['headphones', 'amber', '6 reports waiting over 24 hours', 'Oldest: charged twice, Bolt', 'Support'], ['mail', 'blue', 'Weekly recap open rate fell to 41%', 'Down from 52% last week', 'Emails']].map(([ic, t, h, s, a]) => `<div class="row g12"><div class="ic ${t}" style="width:36px;height:36px;border-radius:10px">${icon(ic, 17)}</div><div class="col g4 grow"><span class="s w6">${h}</span><span class="xs mu">${s}</span></div><span class="s rd w6">${a}</span></div>`).join('')}
    </div>
    <div class="card col g10" style="flex:1"><span class="h4">Pilot goals</span>
      ${[['Weekly active customers', '806 of 1,000', 81], ['Insights acted on', '37% of 40%', 92], ['Questions in local languages', '38% of 30%', 100], ['Average reply time', '1.8s of 2s', 100]].map(([l, v, p]) => `<div class="col g6"><div class="row between"><span class="s">${l}</span><span class="xs mu">${v}</span></div>${bar(p, p >= 100 ? 'var(--green)' : 'var(--red)')}</div>`).join('')}
    </div>
  </div>`;
const overview = shell('01 HQ overview (CEO)', hqSide('Overview'), 'Good evening, Bolaji', 'How NURU is doing right now', overviewBody, range);

// 02 Platform health
const svc = [['Web app', 'Vercel', 'up', '99.99%', '120ms'], ['Core API', 'Go · Railway', 'up', '99.98%', '84ms'], ['AI service', 'Python · Claude', 'warn', '99.91%', '1.8s'], ['Database', 'Postgres + pgvector', 'up', '100%', '6ms'], ['Cache', 'Redis', 'up', '100%', '2ms'], ['Voice', 'Azure Speech · Spitch', 'up', '99.95%', '640ms']];
const healthBody = `
  <div class="row g16">${kpi('Requests today', '182,400', 'Peak 41 a second at 13:00', 'gr', 'zap')}${kpi('Errors', '0.12%', '38 in Sentry, 2 new', 'rd', 'alert')}${kpi('API p95', '210ms', 'Target under 300ms', 'gr', 'clock')}${kpi('AI cost today', '$18.40', '$0.002 per answer', 'gr', 'dollar')}</div>
  <div class="row g16" style="align-items:stretch">
    <div class="card col" style="flex:1.5;padding:0">
      <div class="row between" style="padding:16px 18px 6px"><div class="col g4"><span class="h4">Services</span><span class="xs mu">Checked every minute by UptimeRobot</span></div><span class="s rd w6">Status page</span></div>
      <table class="tbl"><tr><th>Service</th><th>Runs on</th><th>Status</th><th>30 days</th><th>Response</th></tr>
      ${svc.map(([n, r, s, u, l]) => `<tr><td class="w6">${n}</td><td class="t2">${r}</td><td><div class="row g6">${dot(s === 'up' ? 'var(--green)' : 'var(--amber)')}<span class="s">${s === 'up' ? 'Up' : 'Slow'}</span></div></td><td class="num">${u}</td><td class="num">${l}</td></tr>`).join('')}</table>
    </div>
    <div class="card col g12" style="flex:1"><span class="h4">Errors by hour</span>${bars([2, 1, 0, 3, 1, 9, 4, 2, 1, 3, 2, 1], { w: 380, h: 110, labels: ['8', '', '10', '', '12', '', '14', '', '16', '', '18', ''], hi: 5 })}
      <div class="soft row g10">${icon('info', 16, 'var(--blue)')}<span class="xs t2 grow">The 13:00 spike was Claude timing out. NURU answered from its built in templates, so no customer saw an error.</span></div>
    </div>
  </div>
  <div class="row g16" style="align-items:stretch">
    <div class="card col g10" style="flex:1"><span class="h4">Latest releases</span>
      ${[['web', 'Landing matches the Figma design', '19:33', 'green'], ['api', 'Customers describe unexplained payments', '19:24', 'green'], ['ai', 'NURU offers to send money after advice', '19:24', 'green']].map(([s, t, w, c]) => `<div class="row g12">${badge(s, 'gray')}<span class="s grow">${t}</span><span class="xs mu">${w}</span>${dot('var(--green)')}</div>`).join('')}
    </div>
    <div class="card col g10" style="flex:1"><span class="h4">AI answers today</span>
      <div class="row g16">${donut([92, 4, 3, 1], { size: 96, sw: 14, colors: ['#15803D', '#F59E0B', '#E30613', '#94A3B8'], center: '92%', sub: 'Claude' })}<div class="col g8 grow">${[['Answered by Claude', '8,659'], ['Template fallback', '376'], ['Blocked attacks', '282'], ['Off topic declined', '95']].map(([l, v], i) => `<div class="row g8"><div style="width:10px;height:10px;border-radius:3px;background:${['#15803D', '#F59E0B', '#E30613', '#94A3B8'][i]}"></div><span class="s grow">${l}</span><span class="s w6 num">${v}</span></div>`).join('')}</div></div>
    </div>
  </div>`;
const health = shell('02 HQ platform health', hqSide('Platform health'), 'Platform health', 'Uptime, errors, speed and AI usage', healthBody, range);

// 03 Support and reports
const tickets = [['NURU-RPT-3402', 'Charged twice, Bolt', 'Dispute', '26h', 'red', 'Kemi A.'], ['NURU-RPT-3398', 'Face check keeps failing', 'Security', '9h', 'amber', 'Unassigned'], ['NURU-SUP-1180', 'How do I link Kuda?', 'Question', '2h', 'gray', 'Dayo S.'], ['NURU-RPT-3391', 'Reversal received, thank you', 'Dispute', 'Closed', 'green', 'Kemi A.'], ['NURU-SUP-1176', 'Hausa voice sounds robotic', 'Feedback', '5h', 'gray', 'Unassigned']];
const supportBody = `
  <div class="row g16">${kpi('Open reports', '14', '6 waiting over 24 hours', 'rd', 'headphones')}${kpi('First reply', '38 min', 'Target under 1 hour', 'gr', 'clock')}${kpi('Resolved this week', '61', '94% without a call', 'gr', 'check')}${kpi('Customer rating', '4.6 of 5', 'From 210 ratings', 'gr', 'star')}</div>
  <div class="row g16" style="align-items:stretch">
    <div class="card col" style="flex:1.6;padding:0">
      <div class="row between" style="padding:16px 18px 6px"><span class="h4">Queue</span><div class="row g8">${['All', 'Disputes', 'Security', 'Questions'].map((t, i) => `<span class="chip ${i === 0 ? 'on' : ''}">${t}</span>`).join('')}</div></div>
      <table class="tbl"><tr><th>Reference</th><th>Subject</th><th>Type</th><th>Waiting</th><th>Owner</th></tr>
      ${tickets.map(([r, s, t, w, c, o]) => `<tr><td class="num w6">${r}</td><td>${s}</td><td>${badge(t, 'gray')}</td><td>${badge(w, c)}</td><td class="t2">${o}</td></tr>`).join('')}</table>
    </div>
    <div class="card col g12" style="flex:1"><span class="h4">What customers struggle with</span>
      ${[['Linking OPay or Kuda', 100], ['Face check in low light', 72], ['Describing old payments', 41], ['Changing language', 18]].map(([q, p]) => `<div class="col g6"><div class="row between"><span class="s">${q}</span><span class="xs mu">${Math.round(p * 0.4)}</span></div>${bar(p)}</div>`).join('')}
      <div class="soft row g10">${icon('lock', 16, 'var(--green)')}<span class="xs t2 grow">Support sees the report and masked payment only. Opening a customer's details needs their consent in the app.</span></div>
    </div>
  </div>`;
const support = shell('03 HQ support and reports', hqSide('Support and reports'), 'Support and reports', 'Disputes, questions and feedback from customers', supportBody, `<div class="btn pri sm">${icon('plus', 16, '#fff')} New ticket</div>`);

// 04 Emails and nudges
const emails = [['Welcome and verify', '412', '78%', '61%'], ['Transfer sent', '1,930', '64%', '9%'], ['What was this payment for?', '318', '71%', '48%'], ['Weekly money recap', '806', '41%', '17%'], ['Budget almost used', '122', '69%', '33%'], ['We miss you', '96', '28%', '11%']];
const emailBody = `
  <div class="row g16">${kpi('Emails sent', '4,184', 'This week, 32 templates', 'gr', 'mail')}${kpi('Opened', '58%', 'Industry average 21%', 'gr', 'eye')}${kpi('Clicked', '24%', '+3 points', 'gr', 'zap')}${kpi('Came back after a nudge', '211', 'Inactive 7+ days', 'gr', 'refresh')}</div>
  <div class="card col" style="padding:0">
    <div class="row between" style="padding:16px 18px 6px"><span class="h4">By email</span><span class="xs mu">Sent with Resend</span></div>
    <table class="tbl"><tr><th>Email</th><th>Sent</th><th>Opened</th><th>Clicked</th><th>Open rate</th></tr>
    ${emails.map(([n, s, o, c]) => `<tr><td class="w6">${n}</td><td class="num">${s}</td><td class="num">${o}</td><td class="num">${c}</td><td><div style="width:160px">${bar(parseInt(o), parseInt(o) < 45 ? 'var(--amber)' : 'var(--green)')}</div></td></tr>`).join('')}</table>
  </div>
  <div class="soft row g10">${icon('bulb', 18, 'var(--amber)')}<span class="s t2 grow">"We miss you" works best on Sunday evenings. NURU will move it there unless you say no.</span><span class="chip">Keep as is</span><span class="chip on">Move to Sunday</span></div>`;
const email = shell('04 HQ emails and nudges', hqSide('Emails and nudges'), 'Emails and nudges', 'How each email keeps customers coming back', emailBody, range);

// 05 Team and access (NURU staff)
const roles = [['CEO · Owner', 'Everything, including team and billing', 'red'], ['Operations', 'Overview, health, support, emails', 'blue'], ['Support', 'Support queue and masked reports', 'amber'], ['Engineer', 'Platform health, releases and logs', 'gray'], ['Analyst', 'Overview and emails, read only', 'green']];
const team = [['Bolaji Jimoh', 'CEO · Owner', 'Passkey', 'Now'], ['Zainab Wahab', 'Operations', 'Passkey', '12 min ago'], ['Kemi Adeyemi', 'Support', 'Authenticator', '1 h ago'], ['Emmanuel Sawacha', 'Engineer', 'Passkey', 'Yesterday'], ['Maryam Qoseem', 'Analyst', 'Invite sent', '—']];
const teamBody = `
  <div class="row g16" style="align-items:stretch">
    <div class="card col" style="flex:1.6;padding:0">
      <div class="row between" style="padding:16px 18px 6px"><div class="col g4"><span class="h4">NURU team</span><span class="xs mu">Everyone signs in with a passkey or authenticator code</span></div><div class="btn pri sm">${icon('plus', 16, '#fff')} Invite</div></div>
      <table class="tbl"><tr><th>Name</th><th>Role</th><th>Sign in</th><th>Last active</th></tr>
      ${team.map(([n, r, s, l]) => `<tr><td><div class="row g10"><div class="av" style="width:30px;height:30px;font-size:11px">${n.split(' ').map((w) => w[0]).join('')}</div><span class="w6">${n}</span></div></td><td>${badge(r, 'gray')}</td><td class="t2">${s}</td><td class="t2">${l}</td></tr>`).join('')}</table>
    </div>
    <div class="card col g10" style="flex:1"><span class="h4">Roles</span>
      ${roles.map(([r, d, c]) => `<div class="row g12" style="padding:10px 12px;border-radius:12px;background:var(--surface)"><div class="ic ${c}" style="width:32px;height:32px;border-radius:10px">${icon('key', 15)}</div><div class="col g4 grow"><span class="s w6">${r}</span><span class="xs mu">${d}</span></div></div>`).join('')}
    </div>
  </div>
  <div class="card col g10"><div class="row between"><span class="h4">Audit log</span><span class="s rd w6">Export</span></div>
    ${[['19:41', 'Bolaji Jimoh changed Kemi Adeyemi to Support'], ['19:12', 'Zainab Wahab exported the weekly email report'], ['18:55', 'Emmanuel Sawacha restarted the AI service'], ['17:30', 'Maryam Qoseem was invited as Analyst']].map(([t, s]) => `<div class="row g12"><span class="xs mu num" style="width:44px">${t}</span><span class="s">${s}</span></div>`).join('')}
  </div>`;
const teamHq = shell('05 HQ team and access', hqSide('Team and access'), 'Team and access', 'Who can see what inside NURU HQ', teamBody, '');

// 06 Console staff sign in (Partner Bank)
const signIn = web('06 Console staff sign in', th, `<div class="row" style="height:900px;align-items:stretch">
  <div class="col g24" style="width:620px;flex:none;padding:56px 72px;background:#141416;color:#fff">
    <div class="row g10"><div class="mark" style="width:36px;height:36px;font-size:20px">N</div><span class="h3" style="color:#fff">NURU Console</span></div>
    <div class="grow"></div>
    <span style="font-size:40px;line-height:46px;font-weight:800;letter-spacing:-1.4px">Customer insights for bank staff</span>
    <span class="b" style="color:#B3B3BD">Anonymised segments, campaigns and risk signals from customers who chose to share. No names, chats or full account numbers.</span>
    ${[['shieldcheck', 'Bank work accounts only'], ['key', 'Role based access, approved by a console admin'], ['eye', 'Every view and export is logged']].map(([ic, t]) => `<div class="row g10">${icon(ic, 18, '#4ADE80')}<span class="s" style="color:#E6E6EA">${t}</span></div>`).join('')}
  </div>
  <div class="col center grow" style="background:var(--bg)">
    <div class="col g16" style="width:400px">
      <span class="h1">Staff sign in</span><span class="s t2">Use your bank work account.</span>
      <div class="btn pri" style="height:52px">${icon('building', 18, '#fff')} Continue with bank SSO</div>
      <div class="row g10"><div class="div grow"></div><span class="xs mu">or</span><div class="div grow"></div></div>
      <div class="col g6"><span class="s w6">Work email</span><div class="input"><span class="s">amaka.obi@bank.example</span></div></div>
      <div class="btn sec" style="height:52px">${icon('fingerprint', 18)} Sign in with passkey</div>
      <div class="soft row g10">${icon('info', 16, 'var(--blue)')}<span class="xs t2 grow">No access yet? Ask your console admin to invite you. Personal emails cannot sign in.</span></div>
      <span class="xs mu">Demo account: staff@nuru.app · Nuru-Demo-2026 · code 000000</span>
    </div>
  </div>
</div>`, 'height:900px');

// 07 Console team and access (Partner Bank admin)
const staff = [['Amaka Obi', 'amaka.obi@bank.example', 'Console admin', 'Active'], ['Tunde Bakare', 'tunde.bakare@bank.example', 'Insights analyst', 'Active'], ['Ngozi Eze', 'ngozi.eze@bank.example', 'Campaign manager', 'Active'], ['Ibrahim Musa', 'ibrahim.musa@bank.example', 'Risk officer', 'Active'], ['Funke Ade', 'funke.ade@bank.example', 'Viewer', 'Invited']];
const csRoles = [['Viewer', 'Overview and segments'], ['Insights analyst', 'Adds customer view and CSV export'], ['Campaign manager', 'Creates campaigns, sent for approval'], ['Risk officer', 'Risk, AI safety and fraud signals'], ['Console admin', 'Invites staff and approves campaigns']];
const csTeamBody = `
  <div class="row g16" style="align-items:stretch">
    <div class="card col" style="flex:1.6;padding:0">
      <div class="row between" style="padding:16px 18px 6px"><div class="col g4"><span class="h4">Bank staff with access</span><span class="xs mu">Only @bank.example accounts can be invited</span></div><div class="btn pri sm">${icon('plus', 16, '#fff')} Invite staff</div></div>
      <table class="tbl"><tr><th>Name</th><th>Work email</th><th>Role</th><th>Status</th></tr>
      ${staff.map(([n, e, r, s]) => `<tr><td class="w6">${n}</td><td class="t2">${e}</td><td>${badge(r, 'gray')}</td><td>${badge(s, s === 'Active' ? 'green' : 'amber')}</td></tr>`).join('')}</table>
    </div>
    <div class="card col g10" style="flex:1"><span class="h4">Roles</span>
      ${csRoles.map(([r, d]) => `<div class="row g12" style="padding:10px 12px;border-radius:12px;background:var(--surface)">${icon('key', 16, 'var(--red)')}<div class="col g4 grow"><span class="s w6">${r}</span><span class="xs mu">${d}</span></div></div>`).join('')}
    </div>
  </div>
  <div class="row g16" style="align-items:stretch">
    <div class="card col g10" style="flex:1"><span class="h4">Access rules</span>
      ${['Segments under 50 customers are hidden', 'Customer view needs the customer’s consent', 'Exports are masked and expire after 7 days', 'Access ends automatically after 90 days unused'].map((t) => `<div class="row g10">${icon('check', 16, 'var(--green)')}<span class="s">${t}</span></div>`).join('')}
    </div>
    <div class="card col g10" style="flex:1"><div class="row between"><span class="h4">Audit log</span><span class="s rd w6">Export</span></div>
      ${[['19:20', 'Tunde Bakare exported segment “Japa savers”'], ['18:02', 'Ngozi Eze sent a campaign for approval'], ['16:45', 'Amaka Obi invited Funke Ade as Viewer'], ['15:10', 'Ibrahim Musa opened the AI safety log']].map(([t, s]) => `<div class="row g12"><span class="xs mu num" style="width:44px">${t}</span><span class="s">${s}</span></div>`).join('')}
    </div>
  </div>`;
const csTeam = shell('07 Console team and access', csSide('Team and access'), 'Team and access', 'Who at the bank can use the console', csTeamBody);

export default [overview, health, support, email, teamHq, signIn, csTeam];
