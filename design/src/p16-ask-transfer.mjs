// Ask NURU can move money: the assistant drafts the transfer in chat, and the
// first time it asks the customer to create a PIN and enrol their face. Later
// transfers check both against what was stored at enrolment.
import { icon, mobile, naira, logo } from './lib.mjs';

const th = 'light';
const ai = (html) => `<div class="row g8" style="align-items:flex-end"><div class="mark" style="width:28px;height:28px;font-size:15px;border-radius:9px;flex:none">N</div><div class="bubble ai">${html}</div></div>`;
const me = (t) => `<div class="bubble me">${t}</div>`;
const head = (title = 'Ask NURU', sub = 'Only answers about your money') => `<div class="row between px20" style="height:56px;flex:none"><div class="ib">${icon('menu')}</div><div class="col center g4" style="gap:2px"><span class="h4">${title}</span><span class="xs mu">${sub}</span></div><div class="ib">${icon('edit')}</div></div>`;
const thread = (inner) => `<div class="col g12 px20" style="padding-top:8px">${inner}</div>`;
const composer = `<div class="col g10" style="position:absolute;left:0;right:0;bottom:0;padding:10px 16px 30px;background:var(--bg);border-top:1px solid var(--border)"><div class="row g8"><div class="input grow" style="height:48px;border-radius:24px"><span class="ph grow">Ask about your money…</span><span class="badge gray">EN</span></div><div class="ib" style="width:48px;height:48px;border-radius:24px;background:var(--red);color:#fff">${icon('mic', 22, '#fff')}</div></div></div>`;
const sheet = (inner, h = 520) => `<div style="position:absolute;inset:0;background:rgba(13,13,15,.45)"></div><div class="col g16" style="position:absolute;left:0;right:0;bottom:0;height:${h}px;background:var(--bg);border-radius:24px 24px 0 0;padding:12px 24px 34px"><div style="width:40px;height:5px;border-radius:3px;background:var(--border);align-self:center"></div>${inner}</div>`;
const steps = (n) => `<div class="row g6">${['PIN', 'Face', 'Send'].map((t, i) => `<div class="col g6 grow"><div style="height:4px;border-radius:2px;background:${i < n ? 'var(--red)' : 'var(--surface2)'}"></div><span class="xs ${i < n ? 'w6' : 'mu'}">${t}</span></div>`).join('')}</div>`;
const pinBoxes = (filled, total = 4) => `<div class="row center g12">${Array.from({ length: total }, (_, i) => `<div class="col center" style="width:56px;height:62px;border-radius:14px;border:1.5px solid ${i === filled ? 'var(--red)' : 'var(--border)'};background:var(--bg)">${i < filled ? '<i style="display:block;width:14px;height:14px;border-radius:7px;background:var(--text)"></i>' : ''}</div>`).join('')}</div>`;
const keypad = `<div class="col g8" style="margin-top:4px">${[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', '⌫']].map((r) => `<div class="row g8">${r.map((k) => `<div class="col center grow" style="height:48px;border-radius:12px;${k ? 'background:var(--surface)' : ''};font-size:20px;font-weight:600">${k}</div>`).join('')}</div>`).join('')}</div>`;
const draftCard = (status = '') => `<div class="card col g12" style="margin-left:36px;padding:14px">
  <div class="row between"><span class="xs mu w6">TRANSFER DRAFT</span><span class="badge amber">Sandbox</span></div>
  <div class="row g12"><div class="av" style="width:40px;height:40px;background:#1D4ED8">TB</div><div class="col g4 grow"><span class="s w6">Tunde Bakare</span><span class="xs mu">GTBank •••• 6621 · name checked</span></div></div>
  <div class="row between"><span class="s t2">Amount</span><span class="h3 num">${naira(25000)}</span></div>
  <div class="row between"><span class="s t2">From</span><span class="s w6">Zenith Savings •••• 4417</span></div>
  <div class="row between"><span class="s t2">Balance after</span><span class="s w6 num">${naira(3485517)}</span></div>
  ${status || `<div class="row g8"><div class="btn pri sm grow">Confirm and send</div><div class="btn sm">Edit</div></div>`}
</div>`;

const ask = mobile('01 Ask to send money', th, `
  ${head()}
  ${thread(`${me('Send ₦25,000 to Tunde for the generator repair')}
    ${ai(`Here is the transfer. Tunde Bakare is in your recent payees. After this you will still have ${naira(3485517)} in Zenith Savings, and your DStv renewal on 20 Oct is covered.`)}
    ${draftCard()}
    <div class="row g6 xs mu" style="padding-left:36px">${icon('shieldcheck', 14)} NURU never sends money without your PIN and face check</div>`)}
  ${composer}`);

const createPin = mobile('02 First transfer: create PIN', th, `
  ${head()}
  ${thread(`${me('Send ₦25,000 to Tunde for the generator repair')}${draftCard()}`)}
  ${sheet(`
    ${steps(1)}
    <div class="col g6"><span class="h2">Create your transaction PIN</span><span class="s t2">This is your first transfer with NURU. Choose 4 digits you will use every time money leaves your account.</span></div>
    ${pinBoxes(2)}
    <span class="xs mu" style="text-align:center">Avoid 1234, your birthday or repeated digits</span>
    ${keypad}`, 600)}`);

const confirmPin = mobile('03 Confirm PIN', th, `
  ${head()}
  ${thread(`${me('Send ₦25,000 to Tunde for the generator repair')}${draftCard()}`)}
  ${sheet(`
    ${steps(1)}
    <div class="col g6"><span class="h2">Enter it again</span><span class="s t2">So we know you remember it. It is stored hashed, never as the digits.</span></div>
    ${pinBoxes(4)}
    <div class="soft row g10">${icon('check', 18, 'var(--green)')}<span class="s">PINs match</span></div>
    <div class="btn pri" style="height:50px">Continue to face check</div>`, 470)}`);

const enrol = mobile('04 Enrol face', th, `
  <div class="row between px20" style="height:56px;flex:none"><div class="ib">${icon('x')}</div><span class="h4">Face check</span><div style="width:40px"></div></div>
  <div class="col g16 px20" style="padding-top:4px">${steps(2)}</div>
  <div class="col center g16" style="flex:1;padding:0 28px 120px">
    <div style="position:relative;width:240px;height:300px">
      <div style="position:absolute;inset:0;border-radius:120px/150px;background:linear-gradient(160deg,#3a3a40,#1d1d21);overflow:hidden" class="col center">
        <svg width="150" height="190" viewBox="0 0 150 190" fill="none"><ellipse cx="75" cy="80" rx="46" ry="56" fill="#55555f"/><path d="M10 190c6-44 32-62 65-62s59 18 65 62" fill="#55555f"/></svg>
      </div>
      <div style="position:absolute;inset:-8px;border-radius:128px/158px;border:4px solid var(--red)"></div>
      <div style="position:absolute;left:20px;right:20px;top:140px;height:3px;background:var(--red);box-shadow:0 0 18px var(--red)"></div>
    </div>
    <span class="h3" style="text-align:center">Hold still and look at the camera</span>
    <span class="s t2" style="text-align:center">We save a face template, not a photo, encrypted on Zenith servers. It is only used to confirm it is you before money moves.</span>
    <div class="row g8">${['Look ahead', 'Turn left', 'Blink'].map((t, i) => `<span class="chip ${i === 0 ? 'on' : ''}">${i === 0 ? icon('check', 14) : ''}${t}</span>`).join('')}</div>
  </div>`);

const verify = mobile('05 Next transfer: face and PIN', th, `
  ${head()}
  ${thread(`${me('Pay Mile 12 Market ₦60,000 for supplies')}${ai('Ready. This one is over ₦50,000, so I will check your face and PIN.')}`)}
  ${sheet(`
    <div class="row g12"><div class="col center" style="width:72px;height:72px;border-radius:36px;border:3px solid var(--green);background:var(--surface)">${icon('scanface', 34, 'var(--green)')}</div><div class="col g4"><span class="h3">Face matches</span><span class="xs mu">98% match with your enrolment on 18 Oct</span></div></div>
    <div class="div"></div>
    <div class="col g6"><span class="h3">Enter your PIN</span><span class="s t2">Sending ${naira(60000)} to Mile 12 Market, Kemi Foods Ltd account</span></div>
    ${pinBoxes(3)}
    ${keypad}`, 640)}`);

const sent = mobile('06 Sent, receipt in chat', th, `
  ${head()}
  ${thread(`${me('Send ₦25,000 to Tunde for the generator repair')}
    ${draftCard(`<div class="row g8" style="padding:10px 12px;border-radius:12px;background:var(--green50)">${icon('check', 18, 'var(--green)')}<span class="s w6 grow" style="color:var(--green)">Sent · Ref NURU-8F2A91C0</span></div>`)}
    ${ai(`Done. ${naira(25000)} is on its way to Tunde. Want me to add "Generator repair" to your house costs so it shows in next month's budget?`)}
    <div class="row g6" style="padding-left:36px"><span class="chip">Yes, add it</span><span class="chip">Share receipt</span><span class="chip">No thanks</span></div>`)}
  ${composer}`);

const locked = mobile('07 Face did not match', th, `
  ${head()}
  ${thread(`${me('Send ₦400,000 to Musa')}${ai('I could not confirm it is you, so nothing was sent.')}`)}
  ${sheet(`
    <div class="col center g12" style="text-align:center;padding-top:8px">
      <div class="col center" style="width:72px;height:72px;border-radius:36px;background:var(--red50)">${icon('shield', 34, 'var(--red)')}</div>
      <span class="h2">Transfer stopped</span>
      <span class="s t2">The face did not match your enrolment. After 3 tries transfers pause for 30 minutes and we alert you by SMS.</span>
    </div>
    <div class="soft col g6"><span class="row between s"><span class="t2">Tries left</span><b>2 of 3</b></span><span class="row between s"><span class="t2">Logged as</span><b>Security event</b></span></div>
    <div class="btn pri" style="height:50px">Try again</div>
    <div class="btn" style="height:50px">Call Zenith support</div>`, 500)}`);

export default [ask, createPin, confirmPin, enrol, verify, sent, locked];
