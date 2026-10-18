import { tokens, cat, icon, iconNames, web, logo, bars, line, donut, ring, stacked, legend, txn, naira } from './lib.mjs';

const swatch = (name, hex, label) => `<div class="col g8" style="width:150px"><div style="height:84px;border-radius:16px;background:${hex};border:1px solid var(--border)"></div><div class="s w6">${name}</div><div class="xs mu">${label} · ${hex}</div></div>`;

const foundations = (th) => {
  const t = tokens[th];
  const brand = [['Zenith Red', t.red, 'Primary'], ['Red 600', t.red600, 'Pressed'], ['Red 100', t.red100, 'Tint'], ['Red 50', t.red50, 'Soft bg']];
  const neutral = [['Background', t.bg, 'bg'], ['Surface', t.surface, 'surface'], ['Surface 2', t.surface2, 'surface2'], ['Border', t.border, 'border'], ['Text', t.text, 'text'], ['Text 2', t.text2, 'text2'], ['Muted', t.muted, 'muted']];
  const status = [['Success', t.green, 'Inflow'], ['Warning', t.amber, 'Due soon'], ['Info', t.blue, 'Tips']];
  return web('DS / Foundations', th, `
  <div class="col g40" style="padding:64px">
    <div class="row between"><div class="col g8">${logo(44)}<div class="h1" style="font-size:44px;line-height:52px">Design System</div><div class="b t2">Zenith red and white. Light and dark. Inter type. 8-pt spacing. Built for trust, clarity and speed.</div></div><div class="badge red" style="height:30px;font-size:13px;padding:0 14px">${th === 'light' ? 'Light theme' : 'Dark theme'}</div></div>
    <div class="col g16"><div class="h3">Brand</div><div class="row g20">${brand.map(b => swatch(...b)).join('')}</div></div>
    <div class="col g16"><div class="h3">Neutrals</div><div class="row g20 wrap">${neutral.map(b => swatch(...b)).join('')}</div></div>
    <div class="row g40">
      <div class="col g16"><div class="h3">Status</div><div class="row g20">${status.map(b => swatch(...b)).join('')}</div></div>
      <div class="col g16"><div class="h3">Chart categories</div><div class="row g8">${cat.map(c => `<div style="width:56px;height:84px;border-radius:14px;background:${c}"></div>`).join('')}</div></div>
    </div>
    <div class="row g40" style="align-items:flex-start">
      <div class="col g16 card" style="width:640px;padding:28px">
        <div class="h3">Type scale · Inter</div>
        <div class="row between"><span style="font-size:44px;font-weight:700;letter-spacing:-1px">Display 44</span><span class="xs mu">Bold / -1</span></div>
        <div class="row between"><span class="h1">Heading 1 · 28</span><span class="xs mu">Bold / 34</span></div>
        <div class="row between"><span class="h2">Heading 2 · 22</span><span class="xs mu">Bold / 28</span></div>
        <div class="row between"><span class="h3">Heading 3 · 17</span><span class="xs mu">Semibold / 22</span></div>
        <div class="row between"><span class="h4">Title · 15</span><span class="xs mu">Semibold / 20</span></div>
        <div class="row between"><span class="b">Body · 15 regular for reading</span><span class="xs mu">Regular / 22</span></div>
        <div class="row between"><span class="s">Small · 13 for captions</span><span class="xs mu">Regular / 18</span></div>
        <div class="row between"><span class="xs">Micro · 11 for labels</span><span class="xs mu">Regular / 14</span></div>
        <div class="row between"><span class="num" style="font-size:34px;font-weight:700">${naira(2847350.75, 2)}</span><span class="xs mu">Tabular figures</span></div>
      </div>
      <div class="col g16 card" style="width:600px;padding:28px">
        <div class="h3">Spacing, radius, elevation</div>
        <div class="row g12" style="align-items:flex-end">${[4, 8, 12, 16, 20, 24, 32, 40, 48].map(n => `<div class="col g6" style="align-items:center"><div style="width:${n}px;height:${n}px;background:var(--red);border-radius:3px"></div><span class="xs mu">${n}</span></div>`).join('')}</div>
        <div class="row g16">${[8, 12, 14, 20, 28, 999].map(r => `<div class="col g6" style="align-items:center"><div style="width:64px;height:64px;border:2px solid var(--red);border-radius:${r === 999 ? 32 : r}px"></div><span class="xs mu">${r === 999 ? 'full' : r}</span></div>`).join('')}</div>
        <div class="row g20"><div class="card col center" style="width:160px;height:90px"><span class="s w6">Card</span><span class="xs mu">r20 · shadow</span></div><div class="soft col center" style="width:160px;height:90px"><span class="s w6">Soft</span><span class="xs mu">r16 · surface</span></div><div class="hero col center" style="width:160px;height:90px"><span class="s w6">Hero</span><span class="xs" style="opacity:.8">red gradient</span></div></div>
      </div>
    </div>
  </div>`);
};

const components = (th) => web('DS / Components', th, `
  <div class="col g40" style="padding:64px">
    <div class="h1" style="font-size:36px;line-height:44px">Components</div>
    <div class="row g40" style="align-items:flex-start">
      <div class="col g16" style="width:400px">
        <div class="h3">Buttons</div>
        <div class="btn pri">${icon('send', 18)} Send money</div>
        <div class="btn sec">Secondary action</div>
        <div class="btn out">${icon('scanface', 18)} Verify with Face ID</div>
        <div class="btn ghost">Text button</div>
        <div class="row g8"><div class="btn pri sm">Small</div><div class="btn sec sm">Small</div><div class="btn out sm">Small</div></div>
        <div class="btn pri" style="opacity:.4">Disabled</div>
      </div>
      <div class="col g16" style="width:400px">
        <div class="h3">Inputs</div>
        <div class="field"><span class="label">Email or phone</span><div class="input">${icon('mail', 18, 'var(--muted)')}<span class="ph">you@example.com</span></div></div>
        <div class="field"><span class="label">Password</span><div class="input focus">${icon('lock', 18, 'var(--muted)')}<span class="grow">••••••••••</span>${icon('eye', 18, 'var(--muted)')}</div></div>
        <div class="field"><span class="label">Amount</span><div class="input"><span class="w7">₦</span><span class="grow num w6">25,000.00</span><span class="badge gray">NGN</span></div></div>
        <div class="field"><span class="label">BVN</span><div class="input" style="border-color:var(--red)"><span class="grow">2234 5678</span></div><span class="xs rd">BVN must be 11 digits</span></div>
        <div class="row g8">${[1, 2, 3, 4, 5, 6].map((d, i) => `<div class="pinbox ${i === 3 ? 'on' : ''}">${i < 3 ? '•' : ''}</div>`).join('')}</div>
      </div>
      <div class="col g16" style="width:440px">
        <div class="h3">Chips, badges, toggles</div>
        <div class="row g8 wrap"><span class="chip on">This month</span><span class="chip">Week</span><span class="chip">6 months</span><span class="chip">Year</span><span class="chip ink">Custom</span></div>
        <div class="row g8 wrap"><span class="badge green">${icon('up', 12)} 12.4%</span><span class="badge red">${icon('down', 12)} 8.1%</span><span class="badge amber">Due in 3 days</span><span class="badge gray">Recurring</span><span class="badge blue">AI insight</span></div>
        <div class="row g16"><div class="toggle on"><i></i></div><div class="toggle"><i></i></div><div class="seg" style="width:260px"><span class="on">${icon('sun', 14)}&nbsp;Light</span><span>${icon('moon', 14)}&nbsp;Dark</span><span>${icon('monitor', 14)}&nbsp;Auto</span></div></div>
        <div class="row g8">${['English', 'Yorùbá', 'Igbo', 'Hausa'].map((l, i) => `<span class="chip ${i === 1 ? 'on' : ''}">${l}</span>`).join('')}</div>
        <div class="h3" style="margin-top:8px">Progress</div>
        <div class="bar"><i style="width:68%"></i></div>
        <div class="row g16">${ring(72, { label: '72' })}${ring(45, { color: 'var(--amber)' })}${ring(90, { color: 'var(--green)' })}</div>
      </div>
    </div>
    <div class="row g40" style="align-items:flex-start">
      <div class="card col g16" style="width:400px">
        <div class="h3">Transaction rows</div>
        ${txn('food', 'Chicken Republic', 'Food · Today, 1:24 PM', naira(6500), { tone: 'red' })}
        ${txn('down', 'Salary · Kemi Foods Ltd', 'Income · Oct 25', naira(450000), { credit: true, tone: 'green' })}
        ${txn('zap', 'IKEDC Prepaid', 'Bills · Recurring', naira(15000), { badge: '<span class="badge gray">Recurring</span>' })}
      </div>
      <div class="card col g12" style="width:400px">
        <div class="h3">AI insight card</div>
        <div class="row g10"><div class="ic red">${icon('sparkles', 20)}</div><div class="col g4"><div class="h4">Transport is up 32%</div><div class="s t2">You spent ${naira(48200)} on rides this month, ${naira(11700)} more than September. Mostly Bolt trips after 9 PM.</div></div></div>
        <div class="row g8"><span class="chip">See 14 rides</span><span class="chip">Set a cap</span><span class="chip">${icon('volume', 14)} Listen</span></div>
        <div class="xs mu">Based on 42 transactions · verified calculation</div>
      </div>
      <div class="card col g12" style="width:440px">
        <div class="h3">Chat bubbles</div>
        <div class="bubble me">Where did most of my money go this month?</div>
        <div class="bubble ai">Food took the biggest share: <b>${naira(126400)}</b> (31%). Rides came next at ${naira(48200)}. Want a breakdown by merchant?</div>
        <div class="bubble ai" style="background:var(--red50);color:var(--text)">${icon('shield', 14)} I can only help with your money and NURU. Ask me about spending, bills, loans or savings.</div>
      </div>
    </div>
  </div>`);

const iconsCharts = (th) => web('DS / Icons & Charts', th, `
  <div class="col g40" style="padding:64px">
    <div class="h1" style="font-size:36px;line-height:44px">Icons & data visuals</div>
    <div class="card col g16" style="padding:28px"><div class="row between"><div class="h3">Icon set · 24px grid · 2px stroke (Lucide)</div><span class="xs mu">${iconNames.length} icons</span></div>
      <div class="row wrap g16">${iconNames.map(n => `<div class="col g6" style="width:72px;align-items:center"><div class="ib" style="width:48px;height:48px">${icon(n, 22)}</div><span class="xs mu">${n}</span></div>`).join('')}</div></div>
    <div class="row g24" style="align-items:flex-start">
      <div class="card col g12" style="width:420px"><div class="h4">Bar · spend per day</div>${bars([12, 18, 9, 22, 30, 14, 26], { w: 380, labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], hi: 4 })}</div>
      <div class="card col g12" style="width:420px"><div class="h4">Area · balance trend vs last period</div>${line([40, 52, 47, 61, 58, 72, 69, 84], { w: 380, compare: [38, 41, 45, 44, 50, 49, 55, 57], labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'] })}</div>
      <div class="card col g12" style="width:440px"><div class="h4">Donut · categories</div><div class="row g20">${donut([31, 18, 14, 12, 9, 16], { center: naira(405000), sub: 'Oct spend' })}${legend([['Food', '31%'], ['Transport', '18%'], ['Bills', '14%'], ['Shopping', '12%'], ['Data', '9%'], ['Other', '16%']])}</div></div>
    </div>
    <div class="row g24" style="align-items:flex-start">
      <div class="card col g12" style="width:420px"><div class="h4">Stacked · 3-month comparison</div>${stacked([[120, 140, 126], [40, 36, 48], [55, 58, 57], [60, 30, 49]], { w: 380, labels: ['Aug', 'Sep', 'Oct'] })}</div>
      <div class="card col g12" style="width:420px"><div class="h4">Gauge · financial health</div><div class="row g20">${ring(74, { size: 120, sw: 12, label: '74' })}<div class="col g6"><span class="h3">Good</span><span class="s t2">Up 6 points since August. Your savings rate drove most of it.</span></div></div></div>
      <div class="card col g12" style="width:440px"><div class="h4">Sparkline KPIs</div>${[['Income', '₦612k', [3, 4, 4, 5, 6, 6]], ['Spend', '₦405k', [6, 5, 7, 6, 5, 4]], ['Saved', '₦207k', [1, 2, 2, 3, 4, 5]]].map(([l, v, d]) => `<div class="row g12"><span class="s grow">${l}</span><span class="h4 num">${v}</span>${line(d, { w: 110, h: 30, fill: false, sw: 2 })}</div>`).join('')}</div>
    </div>
  </div>`);

export default [foundations('light'), foundations('dark'), components('light'), components('dark'), iconsCharts('light'), iconsCharts('dark')];
