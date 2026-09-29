(function () {
  'use strict';
  const core = window.ScalesCore, bridge = window.PracticeBridge;
  const instruments = JSON.parse(document.getElementById('instrument-data').textContent).filter(i => !i.fixed);
  const dialog = document.createElement('dialog'); dialog.id = 'scales-dialog'; dialog.className = 'practice scales'; dialog.setAttribute('aria-labelledby','scales-title');
  dialog.innerHTML = `
    <header><div><span class="step">Exercícios por instrumento</span><h2 id="scales-title">Círculo das quintas</h2></div><button class="btn" type="button" id="scales-close">Fechar</button></header>
    <p class="hint">Escolha a tonalidade em <strong>som real</strong>. A partitura será escrita para o seu instrumento. Exemplo: Dó maior em som real → Ré maior para instrumentos em Si♭.</p>
    <div class="scales-layout"><div>
      <div class="scales-circle" id="scales-circle" role="group" aria-label="Tonalidades no círculo das quintas"><div class="scales-center">Som real<br><strong id="scales-center-name">Dó maior</strong></div></div>
      <div class="practice-actions"><button class="btn" type="button" id="scales-previous">← Quinta anterior</button><button class="btn" type="button" id="scales-next">Próxima quinta →</button></div>
    </div><div>
      <div class="practice-settings">
        <label class="practice-instrument-field">Instrumento<select id="scales-instrument"></select></label>
        <label class="practice-instrument-field">Notação da partitura<select id="scales-notation"><option value="written">Escrita para meu instrumento</option><option value="concert">Som real (concerto)</option></select></label>
        <label>Escala<select id="scales-mode"><option value="major">Maior</option><option value="minor">Menor natural</option></select></label>
        <label>Extensão<select id="scales-octaves"><option value="1">Uma oitava</option><option value="2">Duas oitavas</option></select></label>
        <label>Direção<select id="scales-direction"><option value="both">Subir e descer</option><option value="up">Subir</option><option value="down">Descer</option></select></label>
        <label>Andamento (BPM)<input id="scales-bpm" type="number" min="20" max="240" value="60"></label>
        <label class="practice-instrument-field" id="scales-spelling-wrap" hidden>Grafia enarmônica<select id="scales-spelling"><option value="sharp">Fá♯ maior / Ré♯ menor</option><option value="flat">Sol♭ maior / Mi♭ menor</option></select></label>
      </div>
    </div></div>
    <div class="scales-summary" aria-live="polite"><p id="scales-summary"></p><p class="hint" id="scales-signature"></p><p class="hint" id="scales-instrument-note"></p></div>
    <p id="scales-error" role="alert" hidden></p><p class="hint" id="scales-warning"></p>
    <div class="paper practice-score-preview" id="scales-preview" aria-label="Partitura do exercício gerado"></div>
    <p class="hint">As notas usam a região disponível do instrumento. Ao abrir, este exercício substitui a lição atual no editor; você pode restaurar a anterior pelo botão abaixo.</p>
    <div class="practice-actions"><button class="btn" type="button" id="scales-load">Abrir na partitura</button><button class="btn primary" type="button" id="scales-practice">Praticar com professor</button><button class="btn" type="button" id="scales-restore" hidden>Restaurar lição anterior</button></div>`;
  document.body.append(dialog);
  const $ = id => document.getElementById('scales-' + id);
  let index = 0, exercise = null, previousLesson = null, previewWidth = 0;
  const short = key => core.label(key).replace(' maior','').replace(' menor natural','m');
  instruments.forEach(inst => { const option = document.createElement('option'); option.value = inst.id; option.textContent = inst.nome; $('instrument').append(option); });
  core.circle.forEach((keys, i) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'scales-key';
    const angle = i * Math.PI / 6;
    button.style.left = `${50 + Math.sin(angle) * 40}%`; button.style.top = `${50 - Math.cos(angle) * 40}%`;
    button.setAttribute('aria-label', `${core.label(keys[0])} / ${core.label(keys[1])}`);
    const major = document.createElement('strong'), minor = document.createElement('small');
    major.textContent = i === 6 ? 'Fá♯/Sol♭' : short(keys[0]); minor.textContent = i === 6 ? 'Ré♯m/Mi♭m' : short(keys[1]);
    button.append(major,minor); button.addEventListener('click', () => { index = i; update(); }); $('circle').append(button);
  });
  function refreshNotations(value = $('notation').value) {
    const inst = instruments.find(i => i.id === $('instrument').value);
    $('notation').querySelector('[value="alternate"]')?.remove();
    if (inst.alternateLabel) { const option = document.createElement('option'); option.value = 'alternate'; option.textContent = inst.alternateLabel; $('notation').append(option); }
    $('notation').value = value === 'alternate' && !inst.alternateLabel ? 'written' : value;
  }
  function update() {
    const minor = $('mode').value === 'minor';
    const key = index === 6 && $('spelling').value === 'flat' ? (minor ? 'Ebm' : 'Gb') : core.circle[index][minor ? 1 : 0];
    $('spelling-wrap').hidden = index !== 6; $('center-name').textContent = core.label(key);
    [...$('circle').querySelectorAll('button')].forEach((button,i) => button.setAttribute('aria-pressed',String(i === index)));
    $('error').hidden = true; $('warning').textContent = '';
    try {
      const inst = instruments.find(i => i.id === $('instrument').value);
      exercise = core.generate({concertKey:key,instrument:inst,notation:$('notation').value,octaves:Number($('octaves').value),direction:$('direction').value,bpm:Number($('bpm').value)});
      $('summary').textContent = `Som real: ${core.label(key)} → Partitura: ${core.label(exercise.writtenKey)}`;
      $('signature').textContent = exercise.signature.description;
      $('instrument-note').textContent = [inst.notationNote, inst.sampleNote].filter(Boolean).join(' ');
      $('warning').textContent = exercise.evaluable ? '' : 'Você pode ouvir esta escala, mas algumas notas estão fora da faixa atual do professor virtual. Tente uma oitava ou outra tonalidade para avaliar.';
      $('load').disabled = false; $('practice').disabled = !exercise.evaluable;
      renderPreview();
    } catch (e) {
      exercise = null; $('error').hidden = false; $('error').textContent = e.message;
      $('load').disabled = $('practice').disabled = true; $('preview').replaceChildren();
      $('summary').textContent = ''; $('signature').textContent = '';
    }
  }
  function renderPreview() {
    if (!dialog.open || !exercise || !$('preview').clientWidth) return;
    previewWidth = $('preview').clientWidth; bridge.previewExercise(exercise.text,$('preview'));
  }
  $('instrument').addEventListener('change', () => { refreshNotations(); update(); });
  ['notation','mode','octaves','direction','bpm','spelling'].forEach(id => $(id).addEventListener('change', update));
  $('previous').addEventListener('click', () => { index = (index + 11) % 12; update(); });
  $('next').addEventListener('click', () => { index = (index + 1) % 12; update(); });
  function load(practice) {
    update(); if (!exercise || practice && !exercise.evaluable) return;
    const current = bridge.current();
    if (!current.text.includes('# escala:')) previousLesson = current;
    bridge.loadExercise(exercise.text,$('instrument').value,$('notation').value);
    dialog.close();
    if (practice) document.getElementById('practice-open').click();
    else document.getElementById('score').scrollIntoView({block:'start'});
  }
  $('load').addEventListener('click', () => load(false)); $('practice').addEventListener('click', () => load(true));
  $('restore').addEventListener('click', () => {
    if (!previousLesson) return;
    bridge.loadExercise(previousLesson.text,previousLesson.instrumentId,previousLesson.notation);
    previousLesson = null; dialog.close(); document.getElementById('score').scrollIntoView({block:'start'});
  });
  $('close').addEventListener('click', () => dialog.close());
  document.getElementById('scales-open').addEventListener('click', () => {
    bridge.stop(); const current = bridge.current();
    $('instrument').value = current.instrumentId;
    if (!$('instrument').value) $('instrument').value = 'piano';
    refreshNotations(current.notation); $('restore').hidden = !previousLesson;
    dialog.showModal(); update();
  });
  new ResizeObserver(() => { if (Math.abs($('preview').clientWidth - previewWidth) > 2) renderPreview(); }).observe($('preview'));
})();
