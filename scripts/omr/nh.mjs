// uso: node nh.mjs <png> [minW=18]  -> cabeças de nota (x, y, altura) numa faixa de pauta
import { createRequire } from 'module'; import { execSync } from 'child_process';
const require = createRequire(execSync('npm root -g').toString().trim() + '/');
const pw = require('playwright');
const [src, minW = 26, thr = 150] = process.argv.slice(2); const BLUR = process.env.BLUR || 3;
const b = await pw.chromium.launch(); const p = await b.newPage();
await p.goto('http://127.0.0.1:8766/render.html');
const r = await p.evaluate(async ([src, minW, process_thr, BLUR]) => {
  const img = new Image(); img.src = src; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, W, H).data;
  const B = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) B[i] = d[i * 4] < 140 ? 1 : 0;
  const c2 = document.createElement('canvas'); c2.width = W; c2.height = H; const g2 = c2.getContext('2d');
  g2.fillStyle = '#fff'; g2.fillRect(0, 0, W, H); g2.filter = 'blur(' + BLUR + 'px)'; g2.drawImage(img, 0, 0); const d2 = g2.getImageData(0, 0, W, H).data;
  const Bb = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) Bb[i] = d2[i * 4] < (+process_thr) ? 1 : 0;
  // linhas por faixa
  const step = 100, bands = [];
  for (let x0 = 0; x0 + step <= W; x0 += step) {
    const prof = []; for (let y = 0; y < H; y++) { let n = 0; for (let x = x0; x < x0 + step; x++) n += B[y * W + x]; prof.push(n / step); }
    const ys = []; for (let y = 1; y < H - 1; y++) if (prof[y] > 0.6 && prof[y] >= prof[y - 1] && prof[y] >= prof[y + 1] && (!ys.length || y - ys[ys.length - 1] > 5)) ys.push(y);
    // escolher 5 linhas com espaçamento regular
    let best = null;
    for (let i = 0; i + 4 < ys.length; i++) for (let j = i + 4; j < ys.length; j++) {
      const sp = (ys[j] - ys[i]) / 4; if (sp < 25 || sp > 50) continue;
      let ok = 0; for (let k = 0; k < 5; k++) if (ys.some(y => Math.abs(y - (ys[i] + k * sp)) < 5)) ok++;
      if (ok === 5 && (!best || Math.abs(sp - 36) < Math.abs(best[1] - 36))) best = [ys[i], sp];
    }
    bands.push(best);
  }
  const lineAt = x => { const i = Math.min(bands.length - 1, Math.floor(x / step)); for (let k = 0; k < bands.length; k++) { for (const s of [i - k, i + k]) if (bands[s]) return bands[s]; } return null; };
  // opening: erosão por retângulo w x h e dilatação
  const ew = 15, eh = 15;
  const hor = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) { let run = 0; for (let x = 0; x < W; x++) { run = Bb[y * W + x] ? run + 1 : 0; if (run >= ew) hor[y * W + x - (ew >> 1)] = 1; } }
  const E = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) { let run = 0; for (let y = 0; y < H; y++) { run = hor[y * W + x] ? run + 1 : 0; if (run >= eh) E[(y - (eh >> 1)) * W + x] = 1; } }
  // componentes da erosão
  const lab = new Int32Array(W * H), out = []; let L = 0;
  for (let i = 0; i < W * H; i++) if (E[i] && !lab[i]) {
    L++; const st = [i]; lab[i] = L; let n = 0, sx = 0, sy = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    while (st.length) { const j = st.pop(); const x = j % W, y = (j / W) | 0; n++; sx += x; sy += y; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const k of [j - 1, j + 1, j - W, j + W]) if (k >= 0 && k < W * H && E[k] && !lab[k]) { lab[k] = L; st.push(k); } }
    const w = x1 - x0 + 1 + ew - 1, h = y1 - y0 + 1 + eh - 1;
    if (w < +minW || w > 60 || h < 22 || h > 50) continue;
    const cx = sx / n, cy = sy / n, ln = lineAt(cx); if (!ln) continue;
    const [top, sp] = ln, e4 = top + 4 * sp; const steps = Math.round((e4 - cy) / (sp / 2));
    const names = 'CDEFGAB'; const idx = 2 + steps; const oct = 4 + Math.floor(idx / 7); const nm = names[((idx % 7) + 7) % 7] + oct;
    out.push([Math.round(cx), Math.round(cy), w, h, nm, ((e4 - cy) / (sp / 2)).toFixed(2)]);
  }
  out.sort((a, b) => a[0] - b[0]);
  return out.map(o => o.join(' ')).join('\n');
}, ['http://127.0.0.1:8766/' + src, +minW, +thr, +BLUR]);
console.log(r); await b.close();
