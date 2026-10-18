import { icon, web } from './lib.mjs';

const pages = ['Design system', 'Landing', 'Sign up and login', 'Identity checks', 'Home', 'Analytics', 'Ask NURU', 'Transfers', 'Loans and savings', 'Business', 'Planner', 'Settings', 'Desktop web app', 'Bank console', 'Flows'];

const cover = web('00 Cover', 'light', `<div class="hero col" style="height:900px;padding:64px 80px;background:linear-gradient(135deg,#E30613,#A3000D);color:#fff">
  <div class="row between"><div class="row g12"><div style="width:48px;height:48px;border-radius:14px;background:#fff;color:#E30613;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800">N</div><span style="font-size:28px;font-weight:800;letter-spacing:-0.5px">NURU</span></div><span class="s w6" style="padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.16)">Zenith Bank Zecathon 6.0 · Semifinal</span></div>
  <div class="col g16" style="margin-top:120px;width:860px">
    <span class="s w6" style="opacity:.8">Turning Customer Financial Data into Actionable Insights</span>
    <span style="font-size:72px;font-weight:800;letter-spacing:-2px;line-height:76px">Your AI money copilot, in your own language.</span>
    <span style="font-size:20px;line-height:30px;opacity:.9">NURU reads your accounts, explains where your money goes, and helps you save, borrow and run your business. English, Yorùbá, Igbo and Hausa, by text or voice.</span>
  </div>
  <div class="grow"></div>
  <div class="row between" style="align-items:flex-end">
    <div class="row wrap" style="gap:8px;width:900px">${pages.map((p, i) => `<span class="xs w6" style="padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.14)">${String(i + 1).padStart(2, '0')} ${p}</span>`).join('')}</div>
    <div class="col g4" style="text-align:right"><span class="s w6">Light and dark · Mobile and desktop</span><span class="xs" style="opacity:.8">Team NURU · October 2026</span></div>
  </div>
</div>`, 'height:900px');

export default [cover];
