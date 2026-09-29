// uso: node lines.mjs <png> [passo]  -> linhas da pauta (y) em faixas de x
import { createRequire } from 'module'; import { execSync } from 'child_process';
const require = createRequire(execSync('npm root -g').toString().trim() + '/');
const pw = require('playwright');
const [src, step = 100] = process.argv.slice(2);
const b = await pw.chromium.launch(); const p = await b.newPage();
await p.goto('http://127.0.0.1:8766/render.html');
const r = await p.evaluate(async ([src, step]) => {
  const img = new Image(); img.src = src; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, W, H).data;
  const out = [];
  for (let x0 = 0; x0 + step <= W; x0 += step) {
    const prof = [];
    for (let y = 0; y < H; y++) { let n = 0; for (let x = x0; x < x0 + step; x++) { const i = (y * W + x) * 4; if (d[i] < 128) n++; } prof.push(n / step); }
    const ys = []; for (let y = 1; y < H - 1; y++) if (prof[y] > 0.6 && prof[y] >= prof[y - 1] && prof[y] >= prof[y + 1] && (!ys.length || y - ys[ys.length - 1] > 5)) ys.push(y);
    out.push(`${x0 + step / 2}: ${ys.join(' ')}`);
  }
  return out.join('\n');
}, ['http://127.0.0.1:8766/' + src, +step]);
console.log(r); await b.close();
