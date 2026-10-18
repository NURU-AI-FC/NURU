// Emits a use_figma script: node figma/call.mjs <pageId> <dir> <idx,idx> <x0> <y0> [gapX] [cols]
import { readFileSync } from 'node:fs';
const [page, dir, idxs, x0 = 0, y0 = 0, gap = 120, cols = 99] = process.argv.slice(2);
const IM = JSON.parse(readFileSync(new URL('./icon-map.json', import.meta.url)));
const list = idxs.split(',').map(Number);
const screens = list.map((i) => {
  const s = JSON.parse(readFileSync(`${dir}/${String(i).padStart(2, '0')}.json`));
  s.px = Number(x0); s.py = Number(y0); return s;
});
// lay out: consecutive screens left to right, wrapping after `cols`
let x = Number(x0), y = Number(y0), rowH = 0, c = 0;
for (const s of screens) { if (c >= Number(cols)) { x = Number(x0); y += rowH + Number(gap); rowH = 0; c = 0; } s.px = x; s.py = y; x += s.w + Number(gap); rowH = Math.max(rowH, s.h); c++; }
const used = new Set(); const walk = (n) => { if (n.k === 'I') used.add(n.i); (n.ch || []).forEach(walk); }; screens.forEach(walk);
const im = Object.fromEntries([...used].map((k) => [k, IM[k]]));
const dec = readFileSync(new URL('./decoder.js', import.meta.url), 'utf8');
// Shrink the payload: repeated subtrees (status bar, back button, home indicator...) become shared consts.
let body = JSON.stringify(screens);
const counts = new Map();
const tally = (n) => { for (const c of n.ch || []) { const j = JSON.stringify(c); if (j.length > 60) counts.set(j, (counts.get(j) || 0) + 1); tally(c); } };
screens.forEach(tally);
const cands = [...counts].filter(([, n]) => n >= 2).sort((a, b) => b[0].length * b[1] - a[0].length * a[1]).map(([j]) => j);
const defs = [];
for (const j of cands) {
  const n = body.split(j).length - 1 + defs.reduce((a, d) => a + d.v.split(j).length - 1, 0);
  if (n < 2) continue;
  const id = 'D' + defs.length;
  body = body.split(j).join(id);
  defs.forEach((d) => { d.v = d.v.split(j).join(id); });
  defs.push({ id, v: j });
}
const defSrc = defs.slice().reverse().map((d) => `const ${d.id}=${d.v};`).join('');
process.stdout.write(`const PAGE=${JSON.stringify(page)};const IM=${JSON.stringify(im)};${defSrc}const SCREENS=${body};\n${dec}`);
