import { icon, mobile, topbar, naira, bars, ring, donut, legend } from './lib.mjs';

const th = 'light';
const chips = (items, on = 0) => `<div class="row g8">${items.map((t, i) => `<span class="chip ${i === on ? 'on' : ''}">${t}</span>`).join('')}</div>`;
const note = (ic, tone, title, sub, time, unread = false) => `<div class="row g12" style="padding:6px 0"><div class="ic ${tone}" style="width:40px;height:40px;border-radius:12px">${icon(ic, 18)}</div><div class="col g4 grow"><div class="row between"><span class="s w6">${title}</span><span class="xs mu">${time}</span></div><span class="xs t2">${sub}</span></div>${unread ? '<div style="width:8px;height:8px;border-radius:4px;background:var(--red);flex:none"></div>' : ''}</div>`;
const bottom = (html) => `<div class="row g10 px20" style="position:absolute;left:0;right:0;bottom:34px">${html}</div>`;
const bar = (pct, color) => `<div style="height:6px;border-radius:3px;background:var(--surface2)"><div style="width:${Math.min(100, pct)}%;height:6px;border-radius:3px;background:${color}"></div></div>`;
const sw = (on) => `<div class="toggle ${on ? 'on' : ''}"><i></i></div>`;

const inbox = mobile('01 Notifications', th, `
  ${topbar('Notifications', { right: `<div class="ib">${icon('settings')}</div>` })}
  <div class="col g12 px20" style="margin-top:8px">
    ${chips(['All', 'Alerts', 'Reminders', 'Insights'])}
    <span class="xs mu w6" style="margin-top:4px">TODAY</span>
    ${note('alert', 'red', 'Unusual spend', `${naira(86500)} at Shoprite Lekki, 3x your usual`, '9:12 am', true)}
    ${note('calendar', 'amber', 'Rent due in 3 days', `${naira(350000)} to Mr Adebayo on 21 Oct`, '8:00 am', true)}
    ${note('sparkles', 'blue', 'Your weekly money recap', 'You spent 12% less on food. Tap to see more.', '7:30 am', true)}
    <span class="xs mu w6" style="margin-top:4px">YESTERDAY</span>
    ${note('down', 'green', 'Salary received', `${naira(640000)} from Andela Nigeria`, '4:41 pm')}
    ${note('landmark', 'gray', 'Loan repayment made', `${naira(45800)} · 4 of 12 paid`, '10:02 am')}
    ${note('trendup', 'green', 'Fixed deposit matured', `${naira(512600)} moved to your main account`, '9:00 am')}
    ${note('shield', 'gray', 'New device signed in', 'iPhone 15 in Ikeja. Was this you?', '7:15 am')}
  </div>`);

const alert = mobile('02 Alert detail', th, `
  ${topbar('Alert')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="col center g8" style="padding:8px 0"><div class="ic red" style="width:56px;height:56px;border-radius:18px">${icon('alert', 26)}</div><span class="h3">Unusual spend</span><span class="xs mu">Today, 9:12 am</span></div>
    <div class="card col g10">
      <div class="row between"><span class="s t2">Merchant</span><span class="s w6">Shoprite Lekki</span></div>
      <div class="row between"><span class="s t2">Amount</span><span class="s w6 num">${naira(86500)}</span></div>
      <div class="row between"><span class="s t2">Your usual</span><span class="s w6 num">${naira(28000)}</span></div>
      <div class="row between"><span class="s t2">Card</span><span class="s w6">Debit •••• 4417</span></div>
    </div>
    <div class="col g4"><span class="s w6">Groceries in the last 6 weeks</span><span class="xs mu">This week is the red bar</span></div>
    ${bars([24, 31, 27, 22, 29, 86], { w: 350, h: 110, labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'Now'], hi: 5 })}
    <div class="soft row g10">${icon('sparkles', 18, 'var(--red)')}<span class="xs t2 grow">This puts groceries ${naira(52000)} over budget for October. NURU can move ${naira(52000)} from Fun money to cover it.</span></div>
  </div>
  ${bottom('<div class="btn sec grow">It was me</div><div class="btn pri grow">Freeze card</div>')}`);

const reminders = mobile('03 Reminders', th, `
  ${topbar('Reminders', { right: `<div class="ib">${icon('plus')}</div>` })}
  <div class="col g12 px20" style="margin-top:8px">
    <div class="seg"><span class="on">Upcoming</span><span>Repeating</span><span>Done</span></div>
    ${[['home', 'red', 'Rent', 'Mr Adebayo · yearly', naira(350000), '21 Oct', 'amber'],
       ['landmark', 'blue', 'Loan repayment', 'Personal loan · 5 of 12', naira(45800), '25 Oct', 'gray'],
       ['users', 'green', 'Staff salaries', 'Kemi Foods · 5 staff', naira(590450), '28 Oct', 'gray'],
       ['tv', 'gray', 'DStv Compact', 'Auto-pay on', naira(15700), '2 Nov', 'gray'],
       ['calendar', 'amber', 'Investor meeting', 'Femi O. · Ventures Platform', '2:00 pm', '22 Oct', 'gray'],
       ['umbrella', 'green', 'Insurance renewal', 'AXA Mansard health', naira(84000), '14 Nov', 'gray']]
      .map(([ic, tone, t, s, amt, d, b]) => `<div class="row g12" style="padding:4px 0"><div class="ic ${tone}" style="width:40px;height:40px;border-radius:12px">${icon(ic, 18)}</div><div class="col g4 grow"><span class="s w6">${t}</span><span class="xs mu">${s}</span></div><div class="col g4" style="align-items:flex-end"><span class="s w6 num">${amt}</span><span class="badge ${b}">${d}</span></div></div>`).join('')}
  </div>`);

const newReminder = mobile('04 New reminder', th, `
  ${topbar('New reminder')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="field"><span class="label">What is it for?</span><div class="input"><span>School fees for Tolu</span></div></div>
    <div class="row g12"><div class="field grow"><span class="label">Amount</span><div class="input"><span class="num">${naira(420000)}</span></div></div><div class="field grow"><span class="label">Date</span><div class="input"><span class="grow">6 Jan 2027</span>${icon('calendar', 18, 'var(--muted)')}</div></div></div>
    <span class="label">Repeat</span>
    ${chips(['Once', 'Monthly', 'Every term', 'Yearly'], 2)}
    <span class="label">Remind me by</span>
    <div class="card col g12">
      ${[['bell', 'Push notification', 1], ['message', 'WhatsApp', 1], ['phone', 'SMS', 0], ['volume', 'Voice call in Yorùbá', 0]].map(([ic, t, on]) => `<div class="row g12">${icon(ic, 18, 'var(--text2)')}<span class="s grow">${t}</span>${sw(on)}</div>`).join('')}
    </div>
    <div class="soft row g10">${icon('sparkles', 18, 'var(--red)')}<span class="xs t2 grow">Save ${naira(140000)} a month from now and the fees are ready by January.</span></div>
  </div>
  ${bottom('<div class="btn pri grow">Save reminder</div>')}`);

const days = Array.from({ length: 35 }, (_, i) => i - 3);
const marks = { 21: 'var(--amber)', 22: 'var(--blue)', 25: 'var(--red)', 28: 'var(--red)', 2: 'var(--muted)', 31: 'var(--green)' };
const calendar = mobile('05 Money calendar', th, `
  ${topbar('Money calendar')}
  <div class="col g12 px20" style="margin-top:8px">
    <div class="row between"><div class="ib">${icon('chevl')}</div><span class="h4">October 2026</span><div class="ib">${icon('chevr')}</div></div>
    <div class="row between">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<span class="xs mu w6" style="width:44px;text-align:center">${d}</span>`).join('')}</div>
    ${[0, 1, 2, 3, 4].map((w) => `<div class="row between">${days.slice(w * 7, w * 7 + 7).map((d) => {
      const n = d < 1 ? '' : d > 31 ? '' : d;
      const today = d === 18;
      return `<div class="col center" style="width:44px;height:44px;border-radius:12px;gap:3px;${today ? 'background:var(--red);color:#fff' : ''}"><span class="s ${today ? 'w6' : ''}">${n}</span>${marks[d] && n ? `<div style="width:5px;height:5px;border-radius:3px;background:${today ? '#fff' : marks[d]}"></div>` : '<div style="width:5px;height:5px"></div>'}</div>`;
    }).join('')}</div>`).join('')}
    <div class="div"></div>
    <span class="h4">Next 7 days</span>
    <div class="row g12"><div style="width:4px;height:36px;border-radius:2px;background:var(--amber)"></div><div class="col g4 grow"><span class="s w6">Rent</span><span class="xs mu">Wed 21 Oct</span></div><span class="s w6 num">-${naira(350000)}</span></div>
    <div class="row g12"><div style="width:4px;height:36px;border-radius:2px;background:var(--blue)"></div><div class="col g4 grow"><span class="s w6">Investor meeting</span><span class="xs mu">Thu 22 Oct · 2:00 pm</span></div><span class="s w6">Meet</span></div>
    <div class="row g12"><div style="width:4px;height:36px;border-radius:2px;background:var(--red)"></div><div class="col g4 grow"><span class="s w6">Loan repayment</span><span class="xs mu">Sun 25 Oct</span></div><span class="s w6 num">-${naira(45800)}</span></div>
  </div>`);

const budgets = [['food', 'Food and groceries', 132000, 120000, 'var(--red)'], ['car', 'Transport', 41000, 60000, 'var(--blue)'], ['zap', 'Power and data', 38500, 45000, 'var(--amber)'], ['smile', 'Fun money', 22000, 50000, 'var(--green)'], ['heart', 'Family support', 60000, 60000, '#7C3AED']];
const budget = mobile('06 Budget', th, `
  ${topbar('October budget', { right: `<div class="ib">${icon('edit')}</div>` })}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="card row g16">
      ${ring(76, { size: 84, sw: 9, label: '76%' })}
      <div class="col g4 grow"><span class="xs mu">Spent of ${naira(385000)}</span><span class="h3 num">${naira(293500)}</span><span class="xs gr w6">${naira(91500)} left · 13 days to go</span></div>
    </div>
    ${budgets.map(([ic, t, spent, cap, c]) => `<div class="col g8"><div class="row g10">${icon(ic, 18, 'var(--text2)')}<span class="s w6 grow">${t}</span><span class="xs ${spent > cap ? 'rd w6' : 't2'} num">${naira(spent)} / ${naira(cap)}</span></div>${bar(spent / cap * 100, spent > cap ? 'var(--red)' : c)}</div>`).join('')}
    <div class="soft row g10">${icon('bulb', 18, 'var(--amber)')}<span class="xs t2 grow">Food is ${naira(12000)} over. Cooking at home twice more a week would bring it back.</span></div>
  </div>`);

const goal = mobile('07 Savings goal', th, `
  ${topbar('Goal', { right: `<div class="ib">${icon('more')}</div>` })}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="hero col g10">
      <div class="row between"><div class="col g4"><span class="xs" style="opacity:.8">Japa fund · Canada</span><span class="h1 num">${naira(4860000)}</span><span class="xs" style="opacity:.8">of ${naira(9000000)} by Dec 2027</span></div>${ring(54, { size: 72, sw: 8, color: '#fff', label: '54%' })}</div>
      <div style="height:6px;border-radius:3px;background:rgba(255,255,255,.3)"><div style="width:54%;height:6px;border-radius:3px;background:#fff"></div></div>
    </div>
    <div class="row g12">
      <div class="card col g4 grow" style="padding:14px"><span class="xs mu">Auto-save</span><span class="h4 num">${naira(230000)}</span><span class="xs t2">every 26th</span></div>
      <div class="card col g4 grow" style="padding:14px"><span class="xs mu">In dollars today</span><span class="h4 num">$3,190</span><span class="xs t2">at ₦1,523.50</span></div>
    </div>
    <span class="h4">Milestones</span>
    ${[['check', 'green', 'IELTS fees paid', 'Mar 2026', 1], ['check', 'green', 'Proof of funds half way', 'Sep 2026', 1], ['flag', 'gray', 'Visa application', 'Jun 2027', 0], ['flag', 'gray', 'Flight and first rent', 'Dec 2027', 0]].map(([ic, tone, t, d, done]) => `<div class="row g12"><div class="ic ${tone}" style="width:32px;height:32px;border-radius:10px">${icon(ic, 16)}</div><span class="s grow ${done ? '' : 't2'}">${t}</span><span class="xs mu">${d}</span></div>`).join('')}
    <div class="soft row g10">${icon('sparkles', 18, 'var(--red)')}<span class="xs t2 grow">At this pace you finish 3 months early. Adding ${naira(20000)} a month covers a weaker naira too.</span></div>
  </div>`);

const plan = mobile('08 Monthly plan', th, `
  ${topbar('November plan')}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="soft col g4"><span class="xs mu">Expected income</span><span class="h3 num">${naira(640000)}</span><span class="xs t2">Salary on 25 Nov, based on the last 6 months</span></div>
    <div class="card row g16">
      ${donut([50, 25, 20, 5], { size: 120, sw: 16, colors: ['#E30613', '#1D4ED8', '#15803D', '#94A3B8'], center: '₦640k', sub: 'Nov' })}
      <div class="col g10 grow">${[['Needs', 50, 320000, '#E30613'], ['Wants', 25, 160000, '#1D4ED8'], ['Savings', 20, 128000, '#15803D'], ['Buffer', 5, 32000, '#94A3B8']].map(([t, p, v, c]) => `<div class="row g8"><div style="width:10px;height:10px;border-radius:3px;background:${c}"></div><span class="s grow">${t}</span><span class="xs t2 num">${naira(v)}</span></div>`).join('')}</div>
    </div>
    <span class="h4">Why NURU suggests this</span>
    ${['Rent is paid till next October, so needs drop by ₦30,000', 'Your Japa fund needs ₦230,000 a month to stay on track', 'December spending was 40% higher last year, so a buffer helps'].map((t) => `<div class="row g10" style="align-items:flex-start">${icon('check', 16, 'var(--green)')}<span class="s grow">${t}</span></div>`).join('')}
  </div>
  ${bottom('<div class="btn sec grow">Adjust</div><div class="btn pri grow">Use this plan</div>')}`);

const recap = mobile('09 Weekly recap', th, `
  ${topbar('Your week', { right: `<div class="ib">${icon('volume')}</div>` })}
  <div class="col g14 px20" style="margin-top:8px;gap:14px">
    <div class="col g4"><span class="xs mu">12 to 18 October</span><span class="h2">A good week, Adaeze</span></div>
    <div class="row g12">
      <div class="card col g4 grow" style="padding:14px"><span class="xs mu">Spent</span><span class="h4 num">${naira(84200)}</span><span class="xs gr w6">12% less</span></div>
      <div class="card col g4 grow" style="padding:14px"><span class="xs mu">Saved</span><span class="h4 num">${naira(57500)}</span><span class="xs gr w6">On target</span></div>
    </div>
    <div class="card col g10">
      <span class="s w6">Daily spending</span>
      ${bars([9.2, 14.1, 6.8, 18.4, 11.0, 16.3, 8.4], { w: 316, h: 100, labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], hi: 3 })}
    </div>
    ${[['trenddown', 'green', 'Food down 12%', 'You ordered Chowdeck 2 times, not 5'], ['trendup', 'red', 'Transport up 18%', 'Bolt rides on Thursday cost ₦9,400'], ['star', 'amber', 'Tip for next week', 'Buy data as a monthly bundle and save ₦2,500']].map(([ic, tone, t, s]) => `<div class="row g12"><div class="ic ${tone}" style="width:36px;height:36px;border-radius:11px">${icon(ic, 16)}</div><div class="col g4 grow"><span class="s w6">${t}</span><span class="xs mu">${s}</span></div></div>`).join('')}
  </div>`);

const settings = mobile('10 Notification settings', th, `
  ${topbar('Notification settings')}
  <div class="col g12 px20" style="margin-top:8px">
    <span class="xs mu w6">ALERTS</span>
    <div class="card col g12">
      ${[['Every debit and credit', 1], ['Unusual spending', 1], ['Low balance under ₦20,000', 1], ['New device sign-in', 1]].map(([t, on]) => `<div class="row g12"><span class="s grow">${t}</span>${sw(on)}</div>`).join('')}
    </div>
    <span class="xs mu w6" style="margin-top:4px">INSIGHTS</span>
    <div class="card col g12">
      ${[['Weekly recap on Sunday', 1], ['Monthly plan suggestions', 1], ['Price changes on my bills', 0]].map(([t, on]) => `<div class="row g12"><span class="s grow">${t}</span>${sw(on)}</div>`).join('')}
    </div>
    <span class="xs mu w6" style="margin-top:4px">QUIET HOURS</span>
    <div class="card col g12">
      <div class="row g12"><span class="s grow">Do not disturb</span>${sw(1)}</div>
      <div class="row between"><span class="s t2">From 10:00 pm to 7:00 am</span><span class="rd s w6">Change</span></div>
      <span class="xs mu">Security alerts still come through.</span>
    </div>
  </div>`);

export default [inbox, alert, reminders, newReminder, calendar, budget, goal, plan, recap, settings];
