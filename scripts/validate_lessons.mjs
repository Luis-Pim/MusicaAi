// Confere todas as lições da biblioteca com o mesmo leitor do site.
// Uso: (cd site && python3 -m http.server 8765) e depois: node scripts/validate_lessons.mjs [filtro]
// Requer o pacote playwright instalado globalmente.
import { createRequire } from 'module';
import { execSync } from 'child_process';
const require = createRequire(execSync('npm root -g').toString().trim() + '/');
const pw = require('playwright');
const base = process.env.SITE_URL || 'http://127.0.0.1:8765/';
const filtro = process.argv[2] || '';
const b = await pw.chromium.launch();
const page = await b.newPage();
await page.route(/cdn\.jsdelivr|fonts\.googleapis/, r => r.fulfill({ body: '', contentType: 'application/javascript' }));
await page.goto(base + 'index.html');
const res = await page.evaluate(async (filtro) => {
  const idx = await (await fetch('licoes/index.json', { cache: 'no-cache' })).json();
  const out = [];
  for (const m of idx.metodos) for (const s of m.secoes) for (const l of s.licoes) {
    if (filtro && !l.arquivo.includes(filtro)) continue;
    const t = await (await fetch('licoes/' + l.arquivo, { cache: 'no-cache' })).text();
    const model = parseLesson(t);
    out.push({ arquivo: l.arquivo, compassos: model.measures.length, notas: model.events.length, erros: model.errors, avisos: model.warnings });
  }
  return out;
}, filtro);
let ruins = 0;
for (const r of res) {
  const ok = !r.erros.length && !r.avisos.length;
  if (!ok) ruins++;
  console.log(`${ok ? 'OK ' : 'ERR'} ${r.arquivo}  (${r.compassos} comp., ${r.notas} notas)`);
  for (const e of [...r.erros, ...r.avisos]) console.log(`     ${e.line ? 'linha ' + e.line + ': ' : ''}${e.msg}`);
}
console.log(`\n${res.length} lições, ${ruins} com problemas`);
await b.close();
process.exit(ruins ? 1 : 0);
