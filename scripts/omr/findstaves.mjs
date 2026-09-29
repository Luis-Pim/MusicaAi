// uso: node findstaves.mjs <pagina>  -> centros das pautas (fração da altura)
import { createRequire } from 'module'; import { execSync } from 'child_process';
const require = createRequire(execSync('npm root -g').toString().trim() + '/');
const pw = require('playwright');
const [pg] = process.argv.slice(2);
const b = await pw.chromium.launch(); const p = await b.newPage();
await p.goto('http://127.0.0.1:8766/render.html');
const r = await p.evaluate(async ([src, process_t]) => {
  const img = new Image(); img.src = src; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const x0 = Math.round(W * 0.3), x1 = Math.round(W * 0.7);
  const d = g.getImageData(x0, 0, x1 - x0, H).data, w = x1 - x0;
  const prof = []; for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < w; x++) if (d[(y * w + x) * 4] < 128) n++; prof.push(n / w); }
  const ys = []; for (let y = 1; y < H - 1; y++) if (prof[y] > (+process_t) && prof[y] >= prof[y - 1] && prof[y] >= prof[y + 1] && (!ys.length || y - ys[ys.length - 1] > 8)) ys.push(y);
  const out = []; let last = -1;
  for (let i = 0; i < ys.length; i++) {
    if (ys[i] <= last) continue;
    for (let j = i + 1; j < Math.min(i + 4, ys.length); j++) {
      const sp = ys[j] - ys[i]; if (sp < 20 || sp > 60) continue;
      if ([2, 3, 4].every(k => ys.some(y => Math.abs(y - ys[i] - k * sp) < 6))) { out.push(((ys[i] + 2 * sp) / H).toFixed(4)); last = ys[i] + 4 * sp + 6; break; }
    }
  }
  return out.join(' ');
}, [`http://127.0.0.1:8766/hi/p${String(pg).padStart(2, "0")}.png`, +(process.env.T || 0.2)]);
console.log(r); await b.close();
