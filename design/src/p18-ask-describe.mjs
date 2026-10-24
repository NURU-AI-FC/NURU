// NURU keeps every naira explained. When money moves with no description it
// asks what it was for and saves the answer for future advice. After advice in
// Ask NURU it offers to send the money itself, collects the recipient in chat,
// and the first transfer sets up the PIN and face check (see p16).
import { icon, mobile, naira } from './lib.mjs';

const th = 'light';
const ai = (html) => `<div class="row g8" style="align-items:flex-end"><div class="mark" style="width:28px;height:28px;font-size:15px;border-radius:9px;flex:none">N</div><div class="bubble ai">${html}</div></div>`;
const me = (t) => `<div class="bubble me">${t}</div>`;
const head = `<div class="row between px20" style="height:56px;flex:none"><div class="ib">${icon('menu')}</div><div class="col center g4" style="gap:2px"><span class="h4">Ask NURU</span><span class="xs mu">Only answers about your money</span></div><div class="ib">${icon('edit')}</div></div>`;
const thread = (inner) => `<div class="col g12 px20" style="padding-top:8px">${inner}</div>`;
const composer = `<div class="col g10" style="position:absolute;left:0;right:0;bottom:0;padding:10px 16px 30px;background:var(--bg);border-top:1px solid var(--border)"><div class="row g8"><div class="input grow" style="height:48px;border-radius:24px"><span class="ph grow">Ask about your money…</span><span class="badge gray">EN</span></div><div class="ib" style="width:48px;height:48px;border-radius:24px;background:var(--red);color:#fff">${icon('mic', 22, '#fff')}</div></div></div>`;
const chips = (list, on = -1) => `<div class="row g6" style="padding-left:36px;flex-wrap:wrap">${list.map((t, i) => `<span class="chip ${i === on ? 'on' : ''}">${t}</span>`).join('')}</div>`;
const field = (label, value, ph = false) => `<div class="col g6"><span class="xs w6 t2">${label}</span><div class="input" style="height:44px"><span class="${ph ? 'ph' : ''} s grow">${value}</span></div></div>`;
const PURPOSES = ['Salary', 'Business sale', 'Family support', 'Refund', 'Loan', 'Other'];

const describeCard = (amount, from, when, picked = -1, text = '') => `<div class="card col g12" style="margin-left:36px;padding:14px">
  <div class="row between"><span class="xs mu w6">NEEDS A DESCRIPTION</span><span class="badge green">Money in</span></div>
  <div class="row g12"><div class="ic green" style="width:40px;height:40px;border-radius:12px">${icon('down', 18)}</div><div class="col g4 grow"><span class="s w6">${from}</span><span class="xs mu">${when} · no narration</span></div><span class="s w6 num" style="color:var(--green)">+${naira(amount)}</span></div>
  <div class="row g6" style="flex-wrap:wrap">${PURPOSES.map((t, i) => `<span class="chip ${i === picked ? 'on' : ''}">${t}</span>`).join('')}</div>
  <div class="input" style="height:44px"><span class="${text ? '' : 'ph'} s grow">${text || 'Describe it in your own words'}</span></div>
  <div class="btn pri sm">Save description</div>
  <span class="row g6 xs mu">${icon('lock', 12)} Encrypted. Only you and NURU can read it.</span>
</div>`;

const askIn = mobile('01 Money came in, no description', th, `
  ${head}
  ${thread(`${ai(`You received ${naira(150000)} from an OPay wallet this morning, but it came with no description. What was it for? I will remember it when I plan your month.`)}
    ${describeCard(150000, 'OPay wallet transfer', 'Today 9:12am', 1, 'Paid for 3 cartons of fabric')}`)}
  ${composer}`);

const saved = mobile('02 Description saved', th, `
  ${head}
  ${thread(`${ai(`You received ${naira(150000)} from an OPay wallet this morning, but it came with no description. What was it for?`)}
    <div class="card col g10" style="margin-left:36px;padding:14px">
      <div class="row g12"><div class="ic green" style="width:40px;height:40px;border-radius:12px">${icon('check', 18)}</div><div class="col g4 grow"><span class="s w6">Business sale</span><span class="xs mu">Paid for 3 cartons of fabric</span></div><span class="s w6 num" style="color:var(--green)">+${naira(150000)}</span></div>
    </div>
    ${ai(`Saved. I now count it as business income, so your October sales are ${naira(1240000)}. One more payment needs a description: ${naira(18500)} out to a POS on Tuesday.`)}
    ${chips(['Describe the next one', 'Later'])}`)}
  ${composer}`);

const advice = mobile('03 NURU offers to send after advice', th, `
  ${head}
  ${thread(`${me('How much should I put aside for rent this month?')}
    ${ai(`Your rent of ${naira(450000)} is due on 1 Dec. If you move ${naira(75000)} now and the same each payday, you will have it with ${naira(25000)} to spare. Should I send the ${naira(75000)} for you?`)}
    ${chips(['Yes, send it for me', 'Not now'], 0)}
    ${me('Yes, send it to my landlord')}
    ${ai('Sure. Mr Adewale is not in your saved payees yet. Give me his bank and account number and tell me what the payment is for.')}`)}
  ${composer}`);

const recipient = mobile('04 New recipient in chat', th, `
  ${head}
  ${thread(`${ai('Give me his bank and account number and tell me what the payment is for.')}
    <div class="card col g12" style="margin-left:36px;padding:14px">
      <div class="row between"><span class="xs mu w6">NEW RECIPIENT</span><span class="badge amber">Sandbox</span></div>
      ${field('Bank', 'Access Bank')}
      ${field('Account number', '0123 456 789')}
      ${field('Account name', 'Adewale Johnson')}
      ${field('What is it for?', 'December rent, part 1 of 6')}
      <div class="row between"><span class="s t2">Amount</span><span class="h3 num">${naira(75000)}</span></div>
      <div class="row g8"><span class="chip on">${icon('check', 14)}Save as payee</span></div>
      <div class="btn pri sm">${icon('shieldcheck', 16, '#fff')}Review transfer</div>
    </div>
    <div class="row g6 xs mu" style="padding-left:36px">${icon('shieldcheck', 14)} Your first transfer sets up a PIN and face check</div>`)}
  ${composer}`);

const outNoNote = mobile('05 Money went out, no description', th, `
  ${head}
  ${thread(`${ai(`${naira(18500)} left your Main Current account at a POS on Tuesday with no description. What was it for?`)}
    <div class="card col g12" style="margin-left:36px;padding:14px">
      <div class="row between"><span class="xs mu w6">NEEDS A DESCRIPTION</span><span class="badge red">Money out</span></div>
      <div class="row g12"><div class="ic red" style="width:40px;height:40px;border-radius:12px">${icon('up', 18)}</div><div class="col g4 grow"><span class="s w6">POS purchase</span><span class="xs mu">Tue 14 Oct · no narration</span></div><span class="s w6 num">-${naira(18500)}</span></div>
      <div class="row g6" style="flex-wrap:wrap">${['Food', 'Transport', 'Shopping', 'Bills', 'Family', 'Other'].map((t, i) => `<span class="chip ${i === 2 ? 'on' : ''}">${t}</span>`).join('')}</div>
      <div class="input" style="height:44px"><span class="ph s grow">Describe it in your own words</span></div>
      <div class="row g8"><div class="btn pri sm grow">Save description</div><div class="btn sm">I don't know this</div></div>
    </div>`)}
  ${composer}`);

const detail = mobile('06 Transaction detail with description', th, `
  <div class="row between px20" style="height:56px;flex:none"><div class="ib">${icon('chevl')}</div><span class="h4">Transaction</span><div class="ib">${icon('more')}</div></div>
  <div class="col center g8" style="padding:12px 20px 20px">
    <div class="ic green" style="width:56px;height:56px;border-radius:18px">${icon('down', 24)}</div>
    <span class="h1 num" style="color:var(--green)">+${naira(150000)}</span>
    <span class="s t2">OPay wallet transfer · Today 9:12am</span>
  </div>
  <div class="col g12 px20">
    <div class="soft col g10">
      <div class="row between"><span class="s t2">Category</span><span class="s w6">Business sale</span></div>
      <div class="row between"><span class="s t2">Account</span><span class="s w6">Kemi Foods Ltd •••• 2290</span></div>
      <div class="row between"><span class="s t2">Bank narration</span><span class="s mu">None</span></div>
    </div>
    <div class="card col g10" style="padding:14px">
      <div class="row between"><span class="s w6">Your description</span><span class="row g4 xs" style="color:var(--red);font-weight:600">${icon('edit', 14, 'var(--red)')}Edit</span></div>
      <span class="s">Paid for 3 cartons of fabric</span>
      <span class="row g6 xs mu">${icon('lock', 12)} Encrypted · NURU uses it for advice</span>
    </div>
    <div class="row g8"><div class="btn sm grow">${icon('message', 16)}Ask NURU about this</div><div class="btn sm grow">${icon('flag', 16)}Report</div></div>
  </div>`);

export default [askIn, saved, advice, recipient, outNoNote, detail];
