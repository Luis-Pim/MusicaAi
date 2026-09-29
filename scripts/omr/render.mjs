import { createRequire } from 'module'; import { execSync } from 'child_process'; import fs from 'fs';
const require = createRequire(execSync('npm root -g').toString().trim() + '/');
const pw = require('playwright');
const b = await pw.chromium.launch(); const pg = await b.newPage();
await pg.goto('http://127.0.0.1:8766/render.html');
const [from, to, scale] = process.argv.slice(2).map(Number);
for (let n = from; n <= to; n++) {
  const d = await pg.evaluate(([n, s]) => window.renderPage(n, s), [n, scale]);
  fs.writeFileSync(`hi/p${String(n).padStart(2, '0')}.png`, Buffer.from(d.split(',')[1], 'base64'));
}
await b.close();
