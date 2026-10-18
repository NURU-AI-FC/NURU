// Emits a use_figma script: node figma/call.mjs <pageId> <dir> <idx,idx> <x0> <y0> [gapX] [cols]
// Screens are packed as positional arrays (see expander X below) to keep the pasted script small.
import { readFileSync } from 'node:fs';
const [page, dir, idxs, x0 = 0, y0 = 0, gap = 120, cols = 99] = process.argv.slice(2);
const IM = JSON.parse(readFileSync(new URL('./icon-map.json', import.meta.url)));
const list = idxs.split(',').map(Number);
const screens = list.map((i) => JSON.parse(readFileSync(`${dir}/${String(i).padStart(2, '0')}.json`)));
// lay out: consecutive screens left to right, wrapping after `cols`
let x = Number(x0), y = Number(y0), rowH = 0, c = 0;
for (const s of screens) { if (c >= Number(cols)) { x = Number(x0); y += rowH + Number(gap); rowH = 0; c = 0; } s.px = x; s.py = y; x += s.w + Number(gap); rowH = Math.max(rowH, s.h); c++; }
const used = new Set(); const walk = (n) => { if (n.k === 'I') used.add(n.i); (n.ch || []).forEach(walk); }; screens.forEach(walk);
const im = Object.fromEntries([...used].map((k) => [k, IM[k]]));
const dec = readFileSync(new URL('./decoder.js', import.meta.url), 'utf8');

const WT = { Regular: 0, Medium: 5, 'Semi Bold': 6, Bold: 7, 'Extra Bold': 8 };
const trim = (a) => { while (a.length && (a[a.length - 1] === undefined || a[a.length - 1] === 0)) a.pop(); return a.map((v) => (v === undefined ? 0 : v)); };
const pack = (n) => {
  if (n.k === 'F') return trim([0, n.n, n.x, n.y, n.w, n.h, n.f, n.r, n.s, n.e, n.c, n.o, n.ch && n.ch.map(pack)]);
  if (n.k === 'T') return trim([1, n.x, n.y, n.t, n.z, n.f, WT[n.wt] || 0, n.lh, n.ls, n.al ? (n.al === 'center' ? 1 : 2) : 0, n.w, n.h, n.sg && n.sg.map(([s, e, w, col]) => [s, e, WT[w] || 0, col])]);
  if (n.k === 'I') return trim([2, n.i, n.x, n.y, n.z, n.f]);
  return [3, n.x, n.y, n.svg.replace(/ font-family="Inter"/g, '')];
};
const packed = screens.map((s) => { const p = pack(s); return [p, s.px, s.py]; });
// SVG dictionary: frequent attributes/tags become §xx codes, expanded in the script.
const svgs = []; const grab = (p) => { if (p[0] === 3) svgs.push(p); if (p[0] === 0) (p[12] || []).forEach(grab); }; packed.forEach(([p]) => grab(p));
const freq = new Map();
for (const p of svgs) for (const m of p[3].match(/ [a-z-]+="[^"]*"|<\/?[a-z]+|><\/[a-z]+>/g) || []) freq.set(m, (freq.get(m) || 0) + 1);
const dict = [...freq].filter(([m, n]) => m.length >= 6 && n >= 3).sort((a, b) => b[0].length * b[1] - a[0].length * a[1]).slice(0, 1296).map(([m]) => m);
const code = (i) => '§' + i.toString(36).padStart(2, '0');
const dIdx = new Map(dict.map((m, i) => [m, code(i)]));
for (const p of svgs) p[3] = p[3].replace(/ [a-z-]+="[^"]*"|<\/?[a-z]+|><\/[a-z]+>/g, (m) => dIdx.get(m) || m);

// Shrink further: repeated subtrees (status bar, back button, home indicator...) become shared consts.
let body = JSON.stringify(packed);
const counts = new Map();
const tally = (p) => { const ch = p[0] === 0 ? p[12] : null; for (const q of ch || []) { const j = JSON.stringify(q); if (j.length > 40) counts.set(j, (counts.get(j) || 0) + 1); tally(q); } };
packed.forEach(([p]) => tally(p));
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
const expander = `const WN={0:'Regular',5:'Medium',6:'Semi Bold',7:'Bold',8:'Extra Bold'};const X=(a)=>{const k=a[0];if(k===0){const[,n,x,y,w,h,f,r,s,e,c,o,ch]=a;return{k:'F',n,x,y,w,h,f:f||undefined,r:r||undefined,s:s||undefined,e:e||undefined,c,o:o||undefined,ch:ch?ch.map(X):undefined};}if(k===1){const[,x,y,t,z,f,wt,lh,ls,al,w,h,sg]=a;return{k:'T',x,y,t,z,f,wt:WN[wt||0],lh:lh||undefined,ls:ls||undefined,al:al?(al===1?'center':'right'):undefined,w:w||undefined,h:h||undefined,sg:sg?sg.map(([s,e,ww,col])=>[s,e,WN[ww],col]):undefined};}if(k===2){const[,i,x,y,z,f]=a;return{k:'I',i,x,y,z,f};}return{k:'S',x:a[1],y:a[2],svg:a[3].replace(/§(..)/g,(m,c)=>SD[parseInt(c,36)])};};`;
process.stdout.write(`const PAGE=${JSON.stringify(page)};const IM=${JSON.stringify(im)};const SD=${JSON.stringify(dict)};${defSrc}${expander}const SCREENS=${body}.map(([p,px,py])=>({...X(p),px,py}));\n${dec}`);
