// uso: node staves.mjs <pagina>  -> st/p<pg>-<i>.png, um recorte rotulado por pauta
import { createRequire } from 'module'; import { execSync } from 'child_process'; import fs from 'fs';
const require = createRequire(execSync('npm root -g').toString().trim() + '/');
const pw = require('playwright');
const pg = process.argv[2];
fs.mkdirSync('st', { recursive: true });
const b = await pw.chromium.launch(); const p = await b.newPage();
await p.goto('http://127.0.0.1:8766/render.html');
const outs = await p.evaluate(async (src) => {
  const img = new Image(); img.src = src; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const c0 = document.createElement('canvas'); c0.width = W; c0.height = H;
  const g0 = c0.getContext('2d'); g0.drawImage(img, 0, 0);
  const d = g0.getImageData(0, 0, W, H).data;
  const detect = (xa, xb) => {
    const a = Math.round(xa * W), bb = Math.round(xb * W), w = bb - a;
    const rows = [];
    for (let y = 0; y < H; y++) { let n = 0; for (let x = a; x < bb; x++) if (d[(y * W + x) * 4] < 150) n++; rows.push(n / w); }
    const lines = []; for (let y = 0; y < H; y++) if (rows[y] > 0.75) { const l = lines[lines.length - 1]; if (l && y - l.e <= 2) l.e = y; else lines.push({ s: y, e: y }); }
    const ys = lines.map(l => (l.s + l.e) / 2);
    const out = [];
    for (let i = 0; i + 4 < ys.length; i++) {
      const gaps = [1, 2, 3, 4].map(k => ys[i + k] - ys[i + k - 1]);
      const m = gaps.reduce((p, q) => p + q) / 4;
      if (m > 12 && m < 40 && gaps.every(x => Math.abs(x - m) < m * 0.2)) {
        // uma ligadura logo acima da pauta pode parecer uma 6ª linha: se houver linha a +1 espaço depois do grupo, desloca
        let j = i;
        while (j + 5 < ys.length && Math.abs(ys[j + 5] - ys[j + 4] - m) < m * 0.2) j++;
        out.push({ top: ys[j], sp: m }); i = j + 4;
      }
    }
    return out;
  };
  const L = detect(0.25, 0.3), R = detect(0.7, 0.75);
  const staves = [];
  L.forEach(l => { const r = R.find(r => Math.abs(r.top - l.top) < l.sp * 0.6); if (r) staves.push({ top: l.top, sp: (l.sp + r.sp) / 2, slope: (r.top - l.top) / (0.46 * W) }); else staves.push({ top: l.top, sp: l.sp, slope: 0 }); });
  const names = ['F5', 'D5', 'B4', 'G4', 'E4'], colors = ['#8e24aa', '#1e88e5', '#43a047', '#fb8c00', '#e53935'];
  return staves.map(st => {
    const y0 = Math.max(0, Math.round(st.top - 5.5 * st.sp)), y1 = Math.min(H, Math.round(st.top + 10 * st.sp));
    const c = document.createElement('canvas'); c.width = W; c.height = y1 - y0;
    const g = c.getContext('2d'); g.drawImage(c0, 0, y0, W, y1 - y0, 0, 0, W, y1 - y0);
    g.lineWidth = 1.5; g.font = 'bold 17px sans-serif';
    // ajuste local: em cada faixa de 5% da largura, encontra o deslocamento que melhor casa as 5 linhas
    const pts = [];
    for (let f = 0.025; f < 1; f += 0.05) {
      const a = Math.round((f - 0.025) * W), bb = Math.round((f + 0.025) * W);
      const dens = y => { if (y < 0 || y >= H) return 0; let n = 0; for (let x = a; x < bb; x++) if (d[(y * W + x) * 4] < 150) n++; return n / (bb - a); };
      let best = null, bs = -1;
      for (let o = -Math.round(st.sp * 0.8); o <= Math.round(st.sp * 0.8); o++) {
        let sc = 0; for (let k = 0; k < 5; k++) sc += Math.max(dens(Math.round(st.top + o + k * st.sp)), dens(Math.round(st.top + o + k * st.sp) + 1));
        if (sc > bs) { bs = sc; best = o; }
      }
      pts.push({ x: f * W, o: bs > 2.5 ? best : null });
    }
    // preenche faixas sem linhas visíveis com o vizinho
    for (let i = 0; i < pts.length; i++) if (pts[i].o == null) { const n = pts.find((p, j) => j > i && p.o != null) || [...pts].reverse().find(p => p.o != null); pts[i].o = n ? n.o : 0; }
    const yAt = (y, x) => { let i = pts.findIndex(p => p.x >= x); if (i <= 0) return y + pts[Math.max(0, i)].o; const p = pts[i - 1], q = pts[i]; return y + p.o + (q.o - p.o) * (x - p.x) / (q.x - p.x); };
    const lab = (n, y, col, dash) => {
      g.setLineDash(dash ? [6, 6] : []); g.strokeStyle = col; g.globalAlpha = 0.5; g.beginPath();
      for (let x = 0; x <= W; x += 20) { const yy = yAt(y, x); x ? g.lineTo(x, yy) : g.moveTo(x, yy); }
      g.stroke(); g.setLineDash([]); g.globalAlpha = 1; g.fillStyle = col; [2, W * 0.34, W * 0.67, W - 34].forEach(x => g.fillText(n, x, yAt(y, x) - 2));
    };
    names.forEach((n, k) => lab(n, st.top - y0 + k * st.sp, colors[k]));
    [['A5', -1], ['C6', -2], ['E6', -3], ['C4', 5], ['A3', 6]].forEach(([n, k]) => lab(n, st.top - y0 + k * st.sp, '#666', true));
    return c.toDataURL('image/png');
  });
}, `http://127.0.0.1:8766/hi/p${String(pg).padStart(2, '0')}.png`);
outs.forEach((u, i) => fs.writeFileSync(`st/p${pg}-${String(i + 1).padStart(2, '0')}.png`, Buffer.from(u.split(',')[1], 'base64')));
console.log(`página ${pg}: ${outs.length} pautas`);
await b.close();
