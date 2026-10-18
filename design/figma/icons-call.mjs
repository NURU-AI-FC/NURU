// Prints use_figma code that builds the icon component library on the Design System page.
import { iconPaths } from '../src/lib.mjs';
const icons = Object.fromEntries(Object.entries(iconPaths).map(([k, v]) => [k, v]));
console.log(`const P=${JSON.stringify(icons)};
const page=await figma.getNodeByIdAsync("3:2");await figma.setCurrentPageAsync(page);
const holder=figma.createFrame();holder.name="Icon Library (components)";holder.layoutMode="HORIZONTAL";holder.layoutWrap="WRAP";holder.itemSpacing=16;holder.counterAxisSpacing=16;holder.paddingLeft=holder.paddingRight=holder.paddingTop=holder.paddingBottom=32;holder.resize(1440,100);holder.primaryAxisSizingMode="FIXED";holder.counterAxisSizingMode="AUTO";holder.x=0;holder.y=-1200;holder.cornerRadius=24;
const map={};
for(const [k,d] of Object.entries(P)){const n=figma.createNodeFromSvg('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#141416" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">'+d+'</svg>');const c=figma.createComponentFromNode(n);c.name="icon/"+k;c.description="NURU icon "+k+" (Lucide, 24px, 2px stroke). Recolor via stroke override.";holder.appendChild(c);map[k]=c.id;}
return map;`);
