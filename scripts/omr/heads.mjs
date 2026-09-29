// uso: node heads.mjs <pagina>  -> hd/p<pg>-<i>.png (cabeças de nota rotuladas) e hd/p<pg>.json
import { createRequire } from 'module'; import { execSync } from 'child_process'; import fs from 'fs';
const require = createRequire(execSync('npm root -g').toString().trim() + '/');
const pw = require('playwright');
const pg = process.argv[2];
fs.mkdirSync('hd', { recursive: true });
const b = await pw.chromium.launch(); const p = await b.newPage();
await p.goto('http://127.0.0.1:8766/render.html');
const res = await p.evaluate(async (src) => {
  const img = new Image(); img.src = src; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const c0 = document.createElement('canvas'); c0.width = W; c0.height = H;
  const g0 = c0.getContext('2d'); g0.drawImage(img, 0, 0);
  const d = g0.getImageData(0, 0, W, H).data;
  const dark = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4] < 150;
  // --- pautas (mesma lógica de staves.mjs)
  const detect = (xa, xb) => {
    const a = Math.round(xa * W), bb = Math.round(xb * W), w = bb - a, rows = [];
    for (let y = 0; y < H; y++) { let n = 0; for (let x = a; x < bb; x++) if (dark(x, y)) n++; rows.push(n / w); }
    const lines = []; for (let y = 0; y < H; y++) if (rows[y] > 0.75) { const l = lines[lines.length - 1]; if (l && y - l.e <= 2) l.e = y; else lines.push({ s: y, e: y }); }
    const ys = lines.map(l => (l.s + l.e) / 2), out = [];
    for (let i = 0; i + 4 < ys.length; i++) {
      const gaps = [1, 2, 3, 4].map(k => ys[i + k] - ys[i + k - 1]), m = gaps.reduce((p, q) => p + q) / 4;
      if (m > 12 && m < 40 && gaps.every(x => Math.abs(x - m) < m * 0.2)) { let j = i; while (j + 5 < ys.length && Math.abs(ys[j + 5] - ys[j + 4] - m) < m * 0.2) j++; out.push({ top: ys[j], sp: m }); i = j + 4; }
    }
    return out;
  };
  const staves = detect(0.25, 0.3);
  const NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const stepName = s => { const o = Math.floor(s / 7), k = ((s % 7) + 7) % 7; return NAMES[k] + (o + 4); }; // s=0 -> C4 ... E4 = 2
  const out = [];
  staves.forEach((st, si) => {
    const sp = st.sp;
    // deslocamento local das linhas
    const pts = [];
    for (let f = 0.025; f < 1; f += 0.025) {
      const a = Math.round((f - 0.0125) * W), bb = Math.round((f + 0.0125) * W);
      const dens = y => { let n = 0; for (let x = a; x < bb; x++) if (dark(x, y)) n++; return n / (bb - a); };
      let best = 0, bs = -1;
      for (let o = -Math.round(sp * 0.8); o <= Math.round(sp * 0.8); o++) { let sc = 0; for (let k = 0; k < 5; k++) { const yy = Math.round(st.top + o + k * sp); sc += Math.max(dens(yy), dens(yy + 1), dens(yy - 1)); } if (sc > bs) { bs = sc; best = o; } }
      pts.push({ x: f * W, o: bs > 3 ? best : null });
    }
    for (let i = 0; i < pts.length; i++) if (pts[i].o == null) { const n = pts.find((q, j) => j > i && q.o != null) || [...pts].reverse().find(q => q.o != null); pts[i].o = n ? n.o : 0; }
    const off = x => { let i = pts.findIndex(q => q.x >= x); if (i <= 0) return pts[Math.max(0, i)].o; const a = pts[i - 1], c = pts[i]; return a.o + (c.o - a.o) * (x - a.x) / (c.x - a.x); };
    const lineY = (k, x) => st.top + off(x) + k * sp; // k=0 F5 ... 4 E4
    const y0 = Math.max(0, Math.round(st.top - 6 * sp)), y1 = Math.min(H, Math.round(st.top + 10 * sp)), h = y1 - y0;
    // binário da faixa, removendo linhas da pauta (e suplementares finas)
    const B = new Uint8Array(W * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) B[y * W + x] = dark(x, y + y0) ? 1 : 0;
    const lt = Math.max(2, Math.round(sp * 0.14));
    for (let x = 0; x < W; x++) for (let k = -3; k <= 7; k++) {
      const yc = Math.round(lineY(k, x)) - y0;
      for (let dy = -lt; dy <= lt; dy++) {
        const y = yc + dy; if (y < 1 || y >= h - 1) continue;
        // só apaga se acima e abaixo da linha estiver claro (não é parte de uma cabeça)
        const up = yc - lt - 2, dn = yc + lt + 2;
        if (up >= 0 && dn < h && !B[up * W + x] && !B[dn * W + x]) B[y * W + x] = 0;
      }
    }
    // preenche buracos (cabeças vazadas)
    const bg = new Uint8Array(W * h), q = [];
    for (let x = 0; x < W; x++) { q.push(x, (h - 1) * W + x); } for (let y = 0; y < h; y++) q.push(y * W, y * W + W - 1);
    while (q.length) { const i = q.pop(); if (bg[i] || B[i]) continue; bg[i] = 1; const x = i % W, y = (i / W) | 0; if (x > 0) q.push(i - 1); if (x < W - 1) q.push(i + 1); if (y > 0) q.push(i - W); if (y < h - 1) q.push(i + W); }
    // precisa redesenhar linhas originais dentro de buracos? usa original escuro OU buraco
    const F = new Uint8Array(W * h); for (let i = 0; i < W * h; i++) F[i] = (B[i] || !bg[i]) ? 1 : 0;
    // erosão com disco raio r
    const r = Math.max(3, Math.round(sp * 0.3));
    // integral image para quadrado inscrito aproximado
    const I = new Uint32Array((W + 1) * (h + 1));
    for (let y = 0; y < h; y++) { let s = 0; for (let x = 0; x < W; x++) { s += F[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + s; } }
    const box = (x0, y0_, x1, y1_) => I[y1_ * (W + 1) + x1] - I[y0_ * (W + 1) + x1] - I[y1_ * (W + 1) + x0] + I[y0_ * (W + 1) + x0];
    const E = new Uint8Array(W * h);
    const rs = Math.round(r * 0.85);
    for (let y = rs; y < h - rs; y++) for (let x = rs; x < W - rs; x++) if (box(x - rs, y - rs, x + rs + 1, y + rs + 1) === (2 * rs + 1) ** 2) E[y * W + x] = 1;
    // componentes
    const lab = new Int32Array(W * h), comps = [];
    for (let i = 0; i < W * h; i++) if (E[i] && !lab[i]) {
      const id = comps.length + 1, st2 = [i]; let n = 0, sx = 0, sy = 0, minx = 1e9, maxx = 0, miny = 1e9, maxy = 0; lab[i] = id;
      while (st2.length) { const j = st2.pop(); const x = j % W, y = (j / W) | 0; n++; sx += x; sy += y; minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y);
        for (const k of [j - 1, j + 1, j - W, j + W]) if (k >= 0 && k < W * h && E[k] && !lab[k]) { lab[k] = id; st2.push(k); } }
      comps.push({ n, cx: sx / n, cy: sy / n + y0, w: maxx - minx + 1, hh: maxy - miny + 1 });
    }
    const heads = comps.filter(c => c.w < sp * 1.6 && c.hh < sp * 1.2 && c.w > sp * 0.12 && c.cx > W * 0.1)
      .map(c => { const eY = lineY(4, c.cx); const s = Math.round((eY - c.cy) / (sp / 2)) + 2; return { x: Math.round(c.cx), y: Math.round(c.cy), n: stepName(s), wide: c.w > sp * 0.9 }; })
      .sort((a, b) => a.x - b.x);
    // imagem anotada
    const c = document.createElement('canvas'); c.width = W; c.height = h;
    const g = c.getContext('2d'); g.drawImage(c0, 0, y0, W, h, 0, 0, W, h);
    g.font = `bold ${Math.round(sp * 0.9)}px sans-serif`; g.textAlign = 'center';
    heads.forEach((hd, i) => { g.fillStyle = i % 2 ? '#d50000' : '#1565c0'; g.fillText(hd.n, hd.x, Math.round(i % 2 ? h - sp * 0.6 : sp * 1.2)); g.strokeStyle = g.fillStyle; g.lineWidth = 2; g.beginPath(); g.arc(hd.x, hd.y - y0, sp * 0.7, 0, 7); g.stroke(); });
    out.push({ si: si + 1, sp, heads, url: c.toDataURL('image/png') });
  });
  return out;
}, `http://127.0.0.1:8766/hi/p${String(pg).padStart(2, '0')}.png`);
const json = [];
res.forEach(r => { fs.writeFileSync(`hd/p${pg}-${String(r.si).padStart(2, '0')}.png`, Buffer.from(r.url.split(',')[1], 'base64')); json.push({ pauta: r.si, notas: r.heads.map(h => h.n).join(' ') }); });
fs.writeFileSync(`hd/p${pg}.json`, JSON.stringify(json, null, 1));
json.forEach(j => console.log(`p${pg} pauta ${j.pauta}: ${j.notas}`));
await b.close();
