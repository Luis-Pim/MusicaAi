// uso: node crop.mjs <pagina> <y0> <y1> <saida> [x0 x1]  (frações 0..1)
import { createRequire } from 'module'; import { execSync } from 'child_process';
const require = createRequire(execSync('npm root -g').toString().trim() + '/');
const pw = require('playwright');
const [pg, y0, y1, out, x0 = 0, x1 = 1] = process.argv.slice(2);
const b = await pw.chromium.launch(); const p = await b.newPage({ viewport: { width: 1488, height: 2106 } });
await p.goto(`http://127.0.0.1:8766/hi/p${String(pg).padStart(2, '0')}.png`);
const { w, h } = await p.evaluate(() => ({ w: document.images[0].naturalWidth, h: document.images[0].naturalHeight }));
await p.setViewportSize({ width: w, height: h });
await p.evaluate(() => { document.body.style.margin = 0; document.images[0].style.display = 'block'; });
await p.screenshot({ path: out, clip: { x: +x0 * w, y: +y0 * h, width: (+x1 - +x0) * w, height: (+y1 - +y0) * h } });
await b.close();
