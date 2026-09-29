// junta verticalmente PNGs: node stack2.mjs out a.png b.png ...
import { createRequire } from 'module'; import { execSync } from 'child_process'; import fs from 'fs';
const require = createRequire(execSync('npm root -g').toString().trim() + '/');
const pw = require('playwright');
const [out, ...fs_] = process.argv.slice(2);
const b = await pw.chromium.launch(); const p = await b.newPage();
await p.goto('http://127.0.0.1:8766/render.html');
const u = await p.evaluate(async (srcs) => {
  const imgs = []; for (const s of srcs) { const i = new Image(); i.src = s; await i.decode(); imgs.push(i); }
  const W = Math.max(...imgs.map(i => i.naturalWidth)), H = imgs.reduce((a, i) => a + i.naturalHeight, 0);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  let y = 0; for (const i of imgs) { g.drawImage(i, 0, y); g.fillStyle = '#c00'; g.fillRect(0, y, W, 2); y += i.naturalHeight; }
  return c.toDataURL('image/png');
}, fs_.map(f => 'http://127.0.0.1:8766/' + f));
fs.writeFileSync(out, Buffer.from(u.split(',')[1], 'base64')); await b.close();
