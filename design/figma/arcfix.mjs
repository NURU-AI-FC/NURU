// Emits a use_figma script that swaps dashed-circle rings/donuts for arc-path versions on a page.
// node figma/arcfix.mjs <pageId> <dir>
import { readFileSync, readdirSync } from 'node:fs';
const [page, dir] = process.argv.slice(2);
const map = {};
for (const f of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const s = JSON.parse(readFileSync(`${dir}/${f}`));
  const svgs = []; const walk = (n) => { if (n.k === 'S' && / d="M[\d.]+ [\d.]+ A/.test(n.svg)) svgs.push(n.svg.replace(/ font-family="Inter"/g, '')); (n.ch || []).forEach(walk); }; walk(s);
  if (svgs.length) map[s.n.replace(/ \/ (light|dark)$/, '')] = svgs;
}
process.stdout.write(`const PAGE=${JSON.stringify(page)};const M=${JSON.stringify(map)};
const ST={e6e6ea:'2b2b31',efeff2:'2b2b31',141416:'f5f5f7','55555f':'b3b3bd','8c8c97':'7b7b87',e30613:'ff2e3e','15803d':'4ade80',b45309:'fbbf24','1d4ed8':'7aa2ff'};
const TX={141416:'f5f5f7','55555f':'b3b3bd','8c8c97':'7b7b87'};
const hx=(c)=>[c.r,c.g,c.b].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');
const C=(h)=>({r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255});
const remap=(ps,T)=>ps.map(p=>p.type==='SOLID'&&T[hx(p.color)]?{...p,color:C(T[hx(p.color)])}:p);
const pg=await figma.getNodeByIdAsync(PAGE);await figma.setCurrentPageAsync(pg);
await Promise.all(['Regular','Bold'].map(st=>figma.loadFontAsync({family:'Inter',style:st})));
const out=[];
for(const fr of pg.children){const base=fr.name.replace(/ \\/ (light|dark)$/,'');const list=M[base];if(!list)continue;const dark=/ \\/ dark$/.test(fr.name);
 const olds=fr.findAll(n=>n.name==='chart'&&n.findAll(e=>e.dashPattern&&e.dashPattern.length===2&&e.dashPattern[1]>40).length>0);
 if(olds.length!==list.length){out.push([fr.name,'mismatch',olds.length,list.length]);continue;}
 olds.forEach((o,i)=>{const s=figma.createNodeFromSvg(list[i]);const par=o.parent;par.insertChild(par.children.indexOf(o),s);s.x=o.x;s.y=o.y;s.name='chart';s.fills=[];
  if(dark)for(const n of s.findAll(()=>true)){if('strokes' in n&&n.strokes.length)n.strokes=remap(n.strokes,ST);if(n.type==='TEXT'||n.type==='VECTOR')n.fills=remap(n.fills,n.type==='TEXT'?TX:{141416:'f5f5f7','8c8c97':'7b7b87'});}
  o.remove();});
 out.push([fr.name,olds.length]);}
return out;`);
