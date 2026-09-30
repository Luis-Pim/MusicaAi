/* Partituras originais do Hinário 5; o treino continua monofônico. */
(function () {
  'use strict';
  const host = document.createElement('section');
  host.id = 'hymn-original'; host.hidden = true;
  host.innerHTML = `<div class="row"><button class="btn small" id="hymn-zoom" type="button" aria-pressed="false">Ampliar partitura</button><a class="btn small" id="hymn-pdf" target="_blank" rel="noopener">Abrir PDF</a></div><p class="hint" id="hymn-message" role="status"></p><div id="hymn-pages" aria-label="Partitura completa do hinário"></div><p class="hint">Partitura original em Dó, com as quatro vozes e letras. O áudio e o professor virtual usam a melodia principal (soprano).</p><button class="btn small" id="hymn-melody" type="button" aria-expanded="false">Ver melodia para praticar</button>`;
  const score = document.getElementById('score'); score.before(host);
  const pages = document.getElementById('hymn-pages'), message = document.getElementById('hymn-message');
  const practiceParts = [document.getElementById('chips'), score, document.querySelector('.score-foot'), document.getElementById('reading'), document.getElementById('editor')];
  let revision = 0, loading, doc, manifest;
  function melody(show) {
    practiceParts.forEach(el => { el.hidden = !show; });
    document.getElementById('hymn-melody').setAttribute('aria-expanded', String(show));
    document.getElementById('hymn-melody').textContent = show ? 'Ocultar melodia de prática' : 'Ver melodia para praticar';
  }
  document.getElementById('hymn-melody').onclick = () => melody(score.hidden);
  document.getElementById('hymn-zoom').onclick = e => {
    const zoom = pages.classList.toggle('zoomed'); e.target.setAttribute('aria-pressed', String(zoom));
    e.target.textContent = zoom ? 'Ajustar à tela' : 'Ampliar partitura';
  };
  function clear() {
    revision++; host.hidden = true; pages.replaceChildren(); pages.classList.remove('zoomed'); melody(true);
    document.getElementById('hymn-zoom').setAttribute('aria-pressed','false');
    document.getElementById('hymn-zoom').textContent = 'Ampliar partitura';
    if (loading) { loading.destroy().catch(() => {}); loading = null; }
    if (doc) { doc.destroy().catch(() => {}); doc = null; }
  }
  async function show(file) {
    clear();
    const match = /^hinario5-1-soprano\/(h\d+|k\d+)\.txt$/.exec(file || '');
    if (!match) return;
    const run = revision; host.hidden = false; melody(false); message.textContent = 'Carregando partitura completa…';
    const link = document.getElementById('hymn-pdf'); link.hidden = true;
    try {
      if (!manifest) manifest = fetch('hinario/index.json').then(r => { if (!r.ok) throw Error(); return r.json(); }).catch(e => {manifest=null;throw e;});
      const entry = (await manifest)[match[1]];
      if (run !== revision) return;
      if (!entry) throw Error('Partitura indisponível');
      link.href = 'hinario/' + entry.pdfs[0]; link.hidden = false;
      for (const filename of entry.pdfs) {
      const url = 'hinario/' + filename;
      loading = pdfjsLib.getDocument({url, isEvalSupported:false});
      const pdf = await loading.promise;
      if (run !== revision) { await pdf.destroy(); return; }
      doc = pdf; loading = null;
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n); if (run !== revision) return;
        const viewport = page.getViewport({scale:2});
        const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        canvas.setAttribute('role','img'); canvas.setAttribute('aria-label', `Partitura completa, página ${n}`);
        await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
        if (run !== revision) return;
        pages.append(canvas);
      }
      await pdf.destroy(); doc = null;
      }
      message.textContent = entry.shared ? 'Esta página do hinário contém também o hino vizinho.' : '';
    } catch (e) {
      if (run === revision) message.textContent = 'Não foi possível exibir a partitura. Use “Abrir PDF” ou selecione o hino novamente.';
    }
  }
  window.HymnScore = {show,clear};
})();
