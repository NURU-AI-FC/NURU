const FR={ffffff:'17171a',f7f7f8:'1d1d21',efeff2:'26262b',e6e6ea:'2b2b31',fff1f2:'2a1013',ffe1e3:'3d1418',ecfdf3:'0f2a1a',fff7e6:'2b220c',eef4ff:'121c33',141416:'f5f5f7','55555f':'b3b3bd',d9d9de:'1d1d21',e9e9ee:'26262b',d3d3da:'2b2b31',b8b8c2:'1d1d21'};
const TX={141416:'f5f5f7','55555f':'b3b3bd','8c8c97':'7b7b87',e30613:'ff2e3e','15803d':'4ade80',b45309:'fbbf24','1d4ed8':'7aa2ff'};
const ST={e6e6ea:'2b2b31',efeff2:'2b2b31',f7f7f8:'1d1d21',141416:'f5f5f7','55555f':'b3b3bd','8c8c97':'7b7b87',e30613:'ff2e3e','15803d':'4ade80',b45309:'fbbf24','1d4ed8':'7aa2ff'};
const VF={efeff2:'26262b',ffffff:'0d0d0f',e6e6ea:'2b2b31',141416:'f5f5f7','8c8c97':'7b7b87','55555f':'b3b3bd'};
const hx=(c)=>[c.r,c.g,c.b].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');
const C=(h)=>({r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255});
const remap=(paints,M)=>paints.map(p=>{if(p.type==='GRADIENT_LINEAR')return{...p,gradientStops:p.gradientStops.map(s=>{const k=hx(s.color);return M[k]?{...s,color:{...C(M[k]),a:s.color.a}}:s;})};if(p.type!=='SOLID')return p;const k=hx(p.color);if(k==='ffffff'&&p.opacity<1)return p;return M[k]?{...p,color:C(M[k])}:p;});
const pg=await figma.getNodeByIdAsync(PAGE);await figma.setCurrentPageAsync(pg);
await Promise.all(['Regular','Medium','Semi Bold','Bold','Extra Bold'].map(st=>figma.loadFontAsync({family:'Inter',style:st})));
const walk=(node,inInst)=>{if(inInst&&'strokes' in node&&Array.isArray(node.strokes)&&node.strokes.length)node.strokes=remap(node.strokes,ST);
 if('children' in node)for(const c of node.children)walk(c,inInst||node.type==='INSTANCE');};
const inHero=(n)=>{for(let p=n.parent;p;p=p.parent){if(p.name==='hero')return true;if(p.type==='FRAME'&&/ dark$/.test(p.name))return false;}return false;};
const out=[];
for(const [id,dx,dy] of SRC){const src=await figma.getNodeByIdAsync(id);const d=src.clone();d.name=src.name.replace('/ light','/ dark');d.x=src.x+dx;d.y=src.y+dy;
 d.fills=remap(d.fills,{ffffff:'0d0d0f'});
 for(const n of d.findAll(()=>true)){
  const vec=n.type==='VECTOR'||n.type==='ELLIPSE'||n.type==='RECTANGLE'||n.type==='LINE'||n.type==='BOOLEAN_OPERATION';
  if(inHero(n))continue;
  if(n.type==='TEXT'){if(n.parent&&n.parent.name==='av')continue;if(n.fills===figma.mixed){for(const s of n.getStyledTextSegments(['fills']))n.setRangeFills(s.start,s.end,remap(s.fills,TX));}else n.fills=remap(n.fills,TX);continue;}
  if(n.name==='toggle'){n.fills=remap(n.fills,{efeff2:'3a3a42'});continue;}
  if(n.parent&&n.parent.name==='toggle')continue;
  if(n.name==='av'&&n.fills.length&&n.fills[0].type==='SOLID'&&hx(n.fills[0].color)==='141416'){n.fills=[{type:'SOLID',color:C('3a3a42')}];continue;}
  if(n.name==='hero'){n.fills=remap(n.fills,{e30613:'c2000f',a3000d:'5c0008'});continue;}
  if('fills' in n&&Array.isArray(n.fills)&&n.fills.length)n.fills=remap(n.fills,vec?VF:FR);
  if('strokes' in n&&Array.isArray(n.strokes)&&n.strokes.length)n.strokes=remap(n.strokes,ST);
  if('effects' in n&&n.effects.length)n.effects=n.effects.map(e=>e.type==='DROP_SHADOW'?{...e,color:{...e.color,a:Math.min(.5,e.color.a*5)}}:e);
 }
 walk(d,false);
 out.push([d.name,d.id]);}
return out;