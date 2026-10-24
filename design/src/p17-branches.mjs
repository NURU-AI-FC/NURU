import { icon, web, mobile, logo } from './lib.mjs';

const th = 'light';

// Stylised street map with branch pins; dark mode swaps the CSS variables it reads.
export const mapArt = (w, h, pins = [], me = null) => {
  const roads = [
    `M0 ${h * .32} C ${w * .3} ${h * .28}, ${w * .55} ${h * .4}, ${w} ${h * .34}`,
    `M0 ${h * .7} C ${w * .25} ${h * .66}, ${w * .6} ${h * .78}, ${w} ${h * .72}`,
    `M${w * .22} 0 C ${w * .26} ${h * .4}, ${w * .18} ${h * .7}, ${w * .24} ${h}`,
    `M${w * .62} 0 C ${w * .58} ${h * .35}, ${w * .7} ${h * .6}, ${w * .66} ${h}`,
  ];
  const minor = Array.from({ length: 9 }, (_, i) => `M0 ${(i + 1) * h / 10} L${w} ${(i + 1) * h / 10 + (i % 2 ? 14 : -10)}`).concat(
    Array.from({ length: 9 }, (_, i) => `M${(i + 1) * w / 10} 0 L${(i + 1) * w / 10 + (i % 2 ? -12 : 10)} ${h}`));
  return `<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;background:var(--surface)">
  <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position:absolute;inset:0">
    <path d="M${w * .74} ${h} C ${w * .8} ${h * .75}, ${w * .95} ${h * .7}, ${w} ${h * .62} L${w} ${h} Z" fill="#CFE3F5" opacity=".7"/>
    <rect x="${w * .3}" y="${h * .42}" width="${w * .16}" height="${h * .14}" rx="10" fill="#D9EED8" opacity=".8"/>
    ${minor.map((d) => `<path d="${d}" stroke="var(--border)" stroke-width="1.5" fill="none"/>`).join('')}
    ${roads.map((d) => `<path d="${d}" stroke="var(--surface2)" stroke-width="12" fill="none" stroke-linecap="round"/><path d="${d}" stroke="var(--bg)" stroke-width="7" fill="none" stroke-linecap="round"/>`).join('')}
  </svg>
  ${pins.map(([x, y, on]) => `<div class="row center" style="position:absolute;left:${x - 18}px;top:${y - 40}px;width:36px;height:36px;border-radius:18px 18px 18px 4px;transform:rotate(-45deg);background:${on ? 'var(--red)' : 'var(--bg)'};border:2px solid var(--red);box-shadow:0 6px 14px rgba(227,6,19,.25)"><div style="transform:rotate(45deg)" class="row center">${icon('landmark', 16, on ? '#fff' : 'var(--red)')}</div></div>`).join('')}
  ${me ? `<div style="position:absolute;left:${me[0] - 30}px;top:${me[1] - 30}px;width:60px;height:60px;border-radius:30px;background:rgba(37,99,235,.15)"></div><div style="position:absolute;left:${me[0] - 9}px;top:${me[1] - 9}px;width:18px;height:18px;border-radius:9px;background:#2563EB;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.2)"></div>` : ''}
</div>`;
};

export const branches = [
  ['Partner Bank Victoria Island', 'Ajose Adeogun St, Victoria Island', '1.2 km', 'Open · closes 4pm', true],
  ['Partner Bank Adeola Odeku', 'Adeola Odeku St, Victoria Island', '1.9 km', 'Open · closes 4pm', true],
  ['Partner Bank Awolowo Road', 'Awolowo Rd, Ikoyi', '3.4 km', 'Open · closes 4pm', true],
  ['Partner Bank Lekki Phase 1', 'Admiralty Way, Lekki', '6.8 km', 'Opens 8am Monday', false],
];
const row = ([n, a, d, o, open], on = false) => `<div class="row g12" style="padding:14px;border-radius:16px;${on ? 'background:var(--red50);border:1px solid var(--red100)' : 'border:1px solid var(--border)'}">
  <div class="ic red" style="width:40px;height:40px;border-radius:12px">${icon('landmark', 18)}</div>
  <div class="col g4 grow"><span class="s w6">${n}</span><span class="xs t2">${a}</span><span class="xs" style="color:${open ? 'var(--green)' : 'var(--muted)'};font-weight:600">${o}</span></div>
  <div class="col g4" style="align-items:flex-end"><span class="s w6 num">${d}</span>${icon('chevr', 16, 'var(--muted)')}</div>
</div>`;
const search = `<div class="row g10" style="height:48px;padding:0 14px;border-radius:14px;background:var(--bg);box-shadow:0 6px 20px rgba(0,0,0,.08);border:1px solid var(--border)">${icon('search', 18, 'var(--muted)')}<span class="s mu grow">Search area or branch</span>${icon('filter', 18, 'var(--text2)')}</div>`;
const chips = `<div class="row g8" style="overflow:hidden;flex:none">${['Open now', 'ATM', 'Cash deposit', 'Account opening'].map((t, i) => `<span class="chip ${i === 0 ? 'on' : ''}">${t}</span>`).join('')}</div>`;

const finder = mobile('01 Branch finder', th, `
  <div style="position:absolute;left:0;top:0">${mapArt(390, 520, [[120, 210, true], [250, 170], [300, 330], [90, 380]], [190, 280])}</div>
  <div class="col g10" style="position:absolute;left:16px;right:16px;top:56px">
    <div class="row g10"><div class="ib" style="background:var(--bg);box-shadow:0 6px 20px rgba(0,0,0,.08)">${icon('chevl')}</div><div class="grow">${search}</div></div>
    ${chips}
  </div>
  <div class="ib" style="position:absolute;right:16px;top:430px;background:var(--bg);box-shadow:0 6px 20px rgba(0,0,0,.1)">${icon('target', 20, '#2563EB')}</div>
  <div class="col g12" style="position:absolute;left:0;right:0;bottom:0;top:480px;background:var(--bg);border-radius:28px 28px 0 0;padding:10px 16px;box-shadow:0 -10px 30px rgba(0,0,0,.08)">
    <div style="width:40px;height:5px;border-radius:3px;background:var(--border);align-self:center"></div>
    <div class="row between"><span class="h3">4 branches near you</span><span class="xs mu">Victoria Island</span></div>
    ${row(branches[0], true)}${row(branches[1])}${row(branches[2])}
  </div>`);

const detail = mobile('02 Branch detail', th, `
  <div style="position:absolute;left:0;top:0">${mapArt(390, 300, [[195, 170, true]], [110, 240])}</div>
  <div class="ib" style="position:absolute;left:16px;top:56px;background:var(--bg);box-shadow:0 6px 20px rgba(0,0,0,.08)">${icon('chevl')}</div>
  <div class="col g16" style="position:absolute;left:0;right:0;bottom:0;top:270px;background:var(--bg);border-radius:28px 28px 0 0;padding:22px 20px">
    <div class="col g6"><span class="badge green" style="align-self:flex-start">Open now · closes 4pm</span><span class="h2">Partner Bank Victoria Island</span><span class="s t2">Ajose Adeogun Street, Victoria Island, Lagos</span></div>
    <div class="row g10">${[['car', 'Directions', true], ['phone', 'Call'], ['send', 'Share']].map(([i, t, p]) => `<div class="btn ${p ? 'pri' : 'sec'} grow" style="height:48px">${icon(i, 18, p ? '#fff' : 'currentColor')} ${t}</div>`).join('')}</div>
    <div class="row g12">${[['clock', '1.2 km', '6 min drive'], ['users', 'Quiet', 'Usual wait 10 min']].map(([i, v, s]) => `<div class="soft col g6 grow"><div class="row g8">${icon(i, 16, 'var(--red)')}<span class="s w6">${v}</span></div><span class="xs t2">${s}</span></div>`).join('')}</div>
    <div class="col g8"><span class="s w6">Opening hours</span>${[['Monday to Friday', '8:00am to 4:00pm'], ['Saturday', 'ATM and self-service only'], ['Sunday', 'ATM only']].map(([d, h]) => `<div class="row between"><span class="s t2">${d}</span><span class="s w5">${h}</span></div>`).join('')}</div>
    <div class="col g8"><span class="s w6">Services</span><div class="row wrap g8">${['ATM 24/7', 'Cash deposit', 'Account opening', 'Card collection', 'Business banking', 'FX desk'].map((t) => `<span class="chip">${t}</span>`).join('')}</div></div>
  </div>`);

const permission = mobile('03 Location permission', th, `
  <div style="position:absolute;left:0;top:0;opacity:.5">${mapArt(390, 844, [[120, 300], [260, 420], [300, 620]])}</div>
  <div class="col g16 center" style="position:absolute;left:24px;right:24px;top:230px;background:var(--bg);border-radius:28px;padding:28px;box-shadow:0 20px 50px rgba(0,0,0,.15);text-align:center">
    <div class="ic red" style="width:64px;height:64px;border-radius:20px">${icon('pin', 30)}</div>
    <span class="h2">Find a branch near you</span>
    <span class="s t2">NURU uses your location once to show the closest branches and ATMs. It is never stored or shared.</span>
    <div class="btn pri block" style="width:100%">Use my location</div>
    <div class="btn ghost" style="width:100%">Search by area instead</div>
  </div>`);

const side = (on) => `<div class="col g4" style="width:240px;padding:20px 14px;border-right:1px solid var(--border);background:var(--surface)">${logo(30)}<div style="height:16px"></div>${[['home', 'Home'], ['chart', 'Insights'], ['sparkles', 'Ask NURU'], ['send', 'Pay and transfer'], ['landmark', 'Loans and savings'], ['briefcase', 'Business'], ['calendar', 'Planner'], ['pin', 'Branches']].map(([i, t]) => `<div class="row g12" style="height:40px;padding:0 10px;border-radius:10px;${t === on ? 'background:var(--red50);color:var(--red);font-weight:600' : 'color:var(--text2)'}">${icon(i, 18)}<span class="s">${t}</span></div>`).join('')}</div>`;
const desk = web('04 Branch finder desktop', th, `<div class="row" style="height:900px;align-items:stretch">${side('Branches')}
  <div class="col grow">
    <div class="row between" style="height:72px;padding:0 32px;border-bottom:1px solid var(--border)"><div class="col g4"><span class="h2">Branches near you</span><span class="xs mu">Using your location · Victoria Island, Lagos</span></div><div class="row g12"><div style="width:320px">${search}</div><div class="ib">${icon('sun')}</div></div></div>
    <div class="row grow" style="align-items:stretch">
      <div class="col g12" style="width:420px;padding:20px 24px;overflow:hidden;justify-content:flex-start">${chips}${branches.map((b, i) => row(b, i === 0)).join('')}<div class="soft row g10">${icon('info', 16, 'var(--text2)')}<span class="xs t2">Branch data comes from OpenStreetMap. Hours can change on public holidays.</span></div></div>
      <div style="position:relative">${mapArt(780, 828, [[260, 330, true], [420, 260], [520, 470], [180, 560], [640, 640]], [380, 420])}
        <div class="card col g10" style="position:absolute;left:300px;top:150px;width:300px;padding:16px"><span class="s w6">Partner Bank Victoria Island</span><span class="xs t2">Ajose Adeogun St · 1.2 km</span><div class="row g8"><div class="btn pri sm grow">${icon('car', 16, '#fff')} Directions</div><div class="btn sec sm">${icon('phone', 16)}</div></div></div>
      </div>
    </div>
  </div></div>`, 'width:1440px;height:900px');

export default [finder, detail, permission, desk];
