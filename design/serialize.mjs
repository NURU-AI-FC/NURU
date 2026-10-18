// Renders out/<name>.html in Chromium and serialises every .screen into a
// compact JSON tree (frames, text, icon refs, raw SVG for charts) that the
// Figma decoder in figma/decoder.js turns back into editable layers.
// Usage: node serialize.mjs <name>
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const name = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await p.goto(`file://${process.cwd()}/out/${name}.html`);
await p.evaluate(() => document.fonts.ready);

const screens = await p.evaluate(() => {
  const R = Math.round;
  const hex = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const [r, g, bl, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    if (a === 0) return null;
    const h = [r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('');
    return a < 1 ? h + R(a * 255).toString(16).padStart(2, '0') : h;
  };
  const shadows = (s) => {
    if (!s || s === 'none') return null;
    return s.split(/,(?![^(]*\))/).map((part) => {
      const col = part.match(/rgba?\([^)]+\)/)[0];
      const nums = part.replace(col, '').trim().split(/\s+/).map(parseFloat);
      return [hex(col), nums[0], nums[1], nums[2], nums[3] || 0];
    }).filter((x) => x[0]);
  };
  const grad = (bgImg) => {
    const m = bgImg.match(/linear-gradient\((?:(\d+)deg,\s*)?(.+)\)$/); if (!m) return null; if (!m[1]) m[1] = 180;
    const stops = m[2].split(/,(?![^(]*\))/).map((s) => { const col = s.match(/rgba?\([^)]+\)/)[0]; const pos = parseFloat(s.replace(col, '')) / 100; return [isNaN(pos) ? null : pos, hex(col)]; });
    stops.forEach((s, i) => { if (s[0] === null) s[0] = i / (stops.length - 1); });
    return { g: [Number(m[1]), stops] };
  };
  const WT = { 100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black' };

  const resolveSvg = (svg) => {
    const c = svg.cloneNode(true);
    const src = [svg, ...svg.querySelectorAll('*')], dst = [c, ...c.querySelectorAll('*')];
    src.forEach((el, i) => {
      const cs = getComputedStyle(el), d = dst[i];
      if (['rect', 'circle', 'path', 'line', 'ellipse', 'text', 'polyline', 'polygon'].includes(el.tagName)) {
        const f = cs.fill, s = cs.stroke;
        d.setAttribute('fill', f.startsWith('url') ? f.replace(/url\("?#?([^")]*)"?\)/, (_, id) => 'url(#' + id.split('#').pop() + ')') : (f === 'none' ? 'none' : '#' + (hex(f) || '000000').slice(0, 6)));
        const fo = f.match(/rgba\([^)]*,\s*([\d.]+)\)/); if (fo) d.setAttribute('fill-opacity', fo[1]);
        if (s && s !== 'none') d.setAttribute('stroke', '#' + (hex(s) || '000000').slice(0, 6));
        d.removeAttribute('style');
      }
    });
    c.removeAttribute('style'); c.removeAttribute('data-i');
    return c.outerHTML.replace(/\s+/g, ' ');
  };

  const isInlineOnly = (el) => [...el.childNodes].every((n) => n.nodeType === 3 || (n.nodeType === 1 && ['B', 'STRONG', 'EM', 'I', 'SPAN'].includes(n.tagName) && getComputedStyle(n).display === 'inline' && !n.querySelector('svg') && isInlineOnly(n)));

  function textNode(el, rect, origin, chars, segs) {
    const cs = getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25;
    const multi = rect.height > lh * 1.5;
    const o = { k: 'T', x: R(rect.left - origin.left), y: R(rect.top - origin.top), t: chars, z: parseFloat(cs.fontSize), f: hex(cs.color) };
    const wt = WT[cs.fontWeight] || 'Regular'; if (wt !== 'Regular') o.wt = wt;
    if (multi) { o.w = Math.ceil(rect.width) + 2; o.h = R(rect.height); }
    if (Math.abs(lh - parseFloat(cs.fontSize) * 1.2) > 1) o.lh = R(lh * 10) / 10;
    if (cs.textAlign === 'center' || cs.textAlign === 'right') o.al = cs.textAlign;
    const ls = parseFloat(cs.letterSpacing); if (ls) o.ls = ls;
    if (segs && segs.length) o.sg = segs;
    return o;
  }

  function walk(el, origin) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return [];
    const rect = el.getBoundingClientRect();
    if (el.tagName.toLowerCase() === 'svg') {
      const col = getComputedStyle(el).stroke;
      if (el.dataset.i) return [{ k: 'I', i: el.dataset.i, x: R(rect.left - origin.left), y: R(rect.top - origin.top), z: R(rect.width), f: hex(el.getAttribute('stroke') === 'currentColor' ? cs.color : (col && col !== 'none' ? col : cs.color)) || '000000', sw: parseFloat(el.getAttribute('stroke-width')) || 2 }];
      return [{ k: 'S', x: R(rect.left - origin.left), y: R(rect.top - origin.top), w: R(rect.width), h: R(rect.height), svg: resolveSvg(el) }];
    }
    const bg = hex(cs.backgroundColor), gr = cs.backgroundImage !== 'none' ? grad(cs.backgroundImage) : null;
    const bw = parseFloat(cs.borderTopWidth), bwb = parseFloat(cs.borderBottomWidth), bwl = parseFloat(cs.borderLeftWidth);
    const uniform = bw > 0 && bw === bwb && bw === bwl && bw === parseFloat(cs.borderRightWidth);
    const sh = shadows(cs.boxShadow);
    const rad = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map((v) => Math.min(parseFloat(v) || 0, Math.min(rect.width, rect.height) / 2));
    const op = parseFloat(cs.opacity);
    const visual = bg || gr || uniform || sh || el.classList.contains('screen');
    const clip = cs.overflow === 'hidden' && visual;
    const kids = [];
    const me = visual ? { k: 'F', n: el.dataset.name || el.className.split(' ')[0] || el.tagName.toLowerCase(), x: R(rect.left - origin.left), y: R(rect.top - origin.top), w: R(rect.width), h: R(rect.height) } : null;
    const childOrigin = me ? rect : origin;
    if (me) {
      if (gr) me.f = gr; else if (bg) me.f = bg;
      if (rad.some((r) => r > 0)) me.r = rad.every((r) => r === rad[0]) ? R(rad[0]) : rad.map(R);
      if (uniform && hex(cs.borderTopColor)) me.s = [hex(cs.borderTopColor), bw];
      if (sh) me.e = sh;
      if (clip) me.c = 1;
      if (op < 1) me.o = op;
    }
    // single-side borders (e.g. tab bar top rule) become hairline rectangles
    if (!uniform) {
      const add = (w, col, x, y, ww, hh) => { if (w > 0 && hex(col)) kids.push({ k: 'F', n: 'rule', x: R(x), y: R(y), w: R(ww), h: R(hh), f: hex(col) }); };
      const ox = rect.left - childOrigin.left, oy = rect.top - childOrigin.top;
      add(bw, cs.borderTopColor, ox, oy, rect.width, bw);
      add(bwb, cs.borderBottomColor, ox, oy + rect.height - bwb, rect.width, bwb);
    }
    if (el.childNodes.length && isInlineOnly(el) && el.textContent.trim()) {
      // rich text leaf: one text node with styled ranges for <b>/<span>
      let chars = '', segs = [];
      const collect = (node, inherited) => node.childNodes.forEach((n) => {
        if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, ' '); const start = chars.length; chars += t; if (inherited) segs.push([start, chars.length, ...inherited]); }
        else { const c2 = getComputedStyle(n); collect(n, [WT[c2.fontWeight] || 'Regular', hex(c2.color)]); }
      });
      collect(el, null);
      const lead = chars.length - chars.trimStart().length; chars = chars.trim();
      segs = segs.map(([s, e, w, c]) => [Math.max(0, s - lead), Math.min(chars.length, e - lead), w, c]).filter(([s, e]) => e > s);
      const range = document.createRange(); range.selectNodeContents(el);
      kids.push(textNode(el, range.getBoundingClientRect(), childOrigin, chars, segs));
    } else {
      el.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          const t = n.textContent.replace(/\s+/g, ' ').trim(); if (!t) return;
          const range = document.createRange(); range.selectNodeContents(n);
          kids.push(textNode(el, range.getBoundingClientRect(), childOrigin, t));
        } else if (n.nodeType === 1) kids.push(...walk(n, childOrigin));
      });
    }
    if (me) { if (kids.length) me.ch = kids; return [me]; }
    return kids;
  }

  return [...document.querySelectorAll('.screen')].map((s) => {
    const [node] = walk(s, s.getBoundingClientRect());
    node.n = s.dataset.name; node.x = 0; node.y = 0;
    return node;
  });
});
await b.close();
mkdirSync(`out/${name}`, { recursive: true });
screens.forEach((s, i) => writeFileSync(`out/${name}/${String(i).padStart(2, '0')}.json`, JSON.stringify(s)));
console.log(screens.map((s, i) => `${i} ${s.n} ${JSON.stringify(s).length}B`).join('\n'));
