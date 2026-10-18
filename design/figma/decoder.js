const C=(h)=>({r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255});
const A=(h)=>h.length>6?parseInt(h.slice(6,8),16)/255:1;
const SP=(h)=>({type:'SOLID',color:C(h),opacity:A(h)});
const PT=(f)=>{if(typeof f==='string')return SP(f);const[a,st]=f.g;const r=(a-90)*Math.PI/180,c=Math.cos(r),s=Math.sin(r);return{type:'GRADIENT_LINEAR',gradientTransform:[[c,s,.5-c/2-s/2],[-s,c,.5+s/2-c/2]],gradientStops:st.map(([p,h])=>({position:p,color:{...C(h),a:A(h)}}))};};
const fonts=new Set();const scan=(n)=>{if(n.k==='T'){fonts.add(n.wt||'Regular');(n.sg||[]).forEach(s=>fonts.add(s[2]));}(n.ch||[]).forEach(scan);};
const comps={};
async function icon(n){if(!comps[n])comps[n]=await figma.getNodeByIdAsync(IM[n]);return comps[n];}
async function build(n,parent){
 if(n.k==='F'){const f=figma.createFrame();f.name=n.n;parent.appendChild(f);f.x=n.x;f.y=n.y;f.resize(Math.max(1,n.w),Math.max(1,n.h));f.fills=n.f?[PT(n.f)]:[];
  if(n.r!==undefined){if(Array.isArray(n.r)){[f.topLeftRadius,f.topRightRadius,f.bottomRightRadius,f.bottomLeftRadius]=n.r;}else f.cornerRadius=n.r;}
  if(n.s){f.strokes=[SP(n.s[0])];f.strokeWeight=n.s[1];f.strokeAlign='INSIDE';}
  if(n.e)f.effects=n.e.map(([h,x,y,b,sp])=>({type:'DROP_SHADOW',color:{...C(h),a:A(h)},offset:{x,y},radius:b,spread:sp,visible:true,blendMode:'NORMAL'}));
  f.clipsContent=!!n.c;if(n.o!==undefined)f.opacity=n.o;
  for(const c of n.ch||[])await build(c,f);return f;}
 if(n.k==='T'){const t=figma.createText();parent.appendChild(t);t.fontName={family:'Inter',style:n.wt||'Regular'};t.characters=n.t;t.fontSize=n.z;t.fills=[SP(n.f||'000000')];
  if(n.lh)t.lineHeight={unit:'PIXELS',value:n.lh};if(n.ls)t.letterSpacing={unit:'PIXELS',value:n.ls};if(n.al)t.textAlignHorizontal=n.al==='center'?'CENTER':'RIGHT';
  for(const[s,e,w,c]of n.sg||[]){t.setRangeFontName(s,e,{family:'Inter',style:w});if(c)t.setRangeFills(s,e,[SP(c)]);}
  if(n.w){t.textAutoResize='HEIGHT';t.resize(n.w,Math.max(1,n.h));}else t.textAutoResize='WIDTH_AND_HEIGHT';
  t.x=n.x;t.y=n.y;t.name=n.t.slice(0,40);return t;}
 if(n.k==='I'){const comp=await icon(n.i);if(!comp)return;const i=comp.createInstance();parent.appendChild(i);i.x=n.x;i.y=n.y;i.resize(n.z,n.z);
  const col=SP(n.f);for(const v of i.findAll(x=>'strokes' in x&&x.strokes.length))v.strokes=[col];return i;}
 if(n.k==='S'){const s=figma.createNodeFromSvg(n.svg);parent.appendChild(s);s.x=n.x;s.y=n.y;s.name='chart';s.fills=[];return s;}
}
const page=await figma.getNodeByIdAsync(PAGE);await figma.setCurrentPageAsync(page);
for(const s of SCREENS)scan(s);
await Promise.all([...fonts].map(st=>figma.loadFontAsync({family:'Inter',style:st})));
const out=[];
for(const s of SCREENS){const f=await build(s,page);f.x=s.px;f.y=s.py;out.push([f.name,f.id]);}
return out;
