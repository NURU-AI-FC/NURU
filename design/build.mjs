// Usage: node build.mjs <page-module> [out-name]
// Renders the page's screens into design/out/<name>.html for html_to_figma.
import { writeFileSync } from 'node:fs';
import { doc } from './src/lib.mjs';
const mod = process.argv[2];
const screens = (await import(`./src/${mod}.mjs`)).default;
const name = process.argv[3] || mod;
writeFileSync(`out/${name}.html`, doc(name, screens));
console.log(`out/${name}.html`, screens.length, 'screens');
