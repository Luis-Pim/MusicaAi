// uso: node zoom.mjs <png> <x0> <x1> <saida>  amplia 2x um trecho horizontal de um recorte de pauta
import { createRequire } from 'module'; import { execSync } from 'child_process'; import fs from 'fs';
const require = createRequire(execSync('npm root -g').toString().trim() + '/');
const pw = require('playwright');
const [src, x0, x1, out] = process.argv.slice(2);
const b = await pw.chromium.launch(); const p = await b.newPage();
await p.goto('http://127.0.0.1:8766/render.html');
const u = await p.evaluate(async ([src, x0, x1]) => {
  const img = new Image(); img.src = src; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight, sx = x0 * W, sw = (x1 - x0) * W;
  const c = document.createElement('canvas'); c.width = sw * 2; c.height = H * 2;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.drawImage(img, sx, 0, sw, H, 0, 0, sw * 2, H * 2);
  return c.toDataURL('image/png');
}, ['http://127.0.0.1:8766/' + src, +x0, +x1]);
fs.writeFileSync(out, Buffer.from(u.split(',')[1], 'base64')); await b.close();
