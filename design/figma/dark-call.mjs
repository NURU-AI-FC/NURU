// node figma/dark-call.mjs <pageId> <dx> <dy> id1 id2 ...
import { readFileSync } from 'node:fs';
const [page, dx, dy, ...ids] = process.argv.slice(2);
process.stdout.write(`const PAGE=${JSON.stringify(page)};const SRC=${JSON.stringify(ids.map((i) => [i, Number(dx), Number(dy)]))};\n` + readFileSync(new URL('./darkify.js', import.meta.url), 'utf8'));
