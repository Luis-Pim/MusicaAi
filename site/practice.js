(function () {
  'use strict';
  const core = window.PracticeCore, bridge = window.PracticeBridge;
  const dialog = document.createElement('dialog');
  dialog.className = 'practice'; dialog.id = 'practice-dialog'; dialog.setAttribute('aria-labelledby', 'practice-title');
  dialog.innerHTML = `
    <header><div><span class="step">Prática guiada · Beta</span><h2 id="practice-title">Professor virtual</h2></div><button class="btn" id="practice-close" type="button">Fechar</button></header>
    <p id="practice-lesson"></p>
    <p class="hint">Escolha a lição na biblioteca antes de abrir. Toque uma nota por vez. Na avaliação, o site fica em silêncio após a contagem e compara sua execução com a lição.</p>
    <details id="practice-score-details"><summary>Ver a partitura completa da lição</summary><p class="hint">A partitura cabe na largura da tela. Para ver as notas maiores, amplie e deslize para os lados.</p><button class="btn small" type="button" id="practice-score-zoom" aria-pressed="false">Ampliar partitura</button><div class="paper practice-score-preview" id="practice-score"></div></details>
    <fieldset class="practice-settings" id="practice-settings">
      <label class="practice-instrument-field">Meu instrumento<select id="practice-instrument-select"></select></label>
      <label class="practice-instrument-field">A partitura está em<select id="practice-notation"><option value="written">Notas escritas para meu instrumento</option><option value="concert">Som real (notas de concerto)</option></select></label>
      <label>Do compasso<input type="number" id="practice-from" min="1" value="1"></label>
      <label>Até o compasso<input type="number" id="practice-to" min="1" value="1"></label>
      <label>Andamento (BPM)<input type="number" id="practice-bpm" min="20" max="240" value="60"></label>
      <details class="practice-advanced"><summary>Ajustes de treino e microfone</summary><div>
        <label>Meta do treino (BPM)<input type="number" id="practice-target" min="20" max="240" value="80"></label>
        <label>Ajuste de atraso do microfone<select id="practice-latency"><option value="0">0 ms (padrão)</option><option value="50">50 ms</option><option value="100">100 ms</option><option value="150">150 ms</option><option value="200">200 ms</option><option value="300">300 ms</option></select></label>
      </div></details>
    </fieldset>
    <p class="hint" id="practice-instrument"></p>
    <div class="practice-actions">
      <button class="btn primary" id="practice-record" type="button">Avaliar minha execução</button>
      <button class="btn" id="practice-listen" type="button">Toque comigo / ouvir</button>
      <button class="btn" id="practice-train" type="button">Treinar com +5 BPM</button>
      <button class="btn" id="practice-stop" type="button" disabled>Cancelar</button>
    </div>
    <p id="practice-error" role="alert" hidden></p>
    <div class="practice-monitor">
      <p id="practice-status" role="status">Pronto para praticar.</p>
      <div id="practice-current">Escolha como começar</div>
      <p class="hint" id="practice-heard">A referência de afinação da avaliação é Lá = 440 Hz.</p>
      <progress id="practice-progress" max="1" value="0" aria-label="Progresso da execução"></progress>
      <div class="practice-notes" id="practice-notes" aria-label="Sequência de notas esperadas"></div>
    </div>
    <p class="hint">Use um ambiente silencioso. Prefira o microfone do aparelho e evite Bluetooth. Notas rápidas, ruído e repetições sem separação podem não ser reconhecidos. Se todas as entradas parecerem atrasadas, ajuste o atraso do microfone e repita.</p>
    <section id="practice-report" hidden aria-labelledby="practice-report-title">
      <h3 id="practice-report-title">Sua avaliação</h3><p id="practice-summary"></p>
      <div class="practice-scores" id="practice-scores"></div>
      <p class="hint" id="practice-comparison"></p>
      <div class="practice-results" id="practice-results"></div>
    </section>
    <section class="practice-history"><h3>Diário de evolução</h3>
      <p class="hint">Últimas 50 tentativas neste navegador. Não são contas individuais; limpar os dados do navegador apaga o histórico. O áudio não é gravado nem enviado.</p>
      <p id="practice-storage" class="hint"></p><div id="practice-chart"></div><ol id="practice-history"></ol>
    </section>`;
  document.body.append(dialog);
  const $ = id => document.getElementById('practice-' + id);
  bridge.instruments().forEach(instrument => {
    const option = document.createElement('option'); option.value = instrument.id; option.textContent = instrument.name;
    $('instrument-select').append(option);
  });
  const repository = {
    list: () => window.PVAccount.listAttempts(),
    save: attempt => window.PVAccount.saveAttempt(attempt)
  };
  let token = 0, timer, stream, context, source, countdownNodes = [], lesson, plan, settings, frames = [], busy = false, currentIndex = -1;
  function message(text) { if ($('status').textContent !== text) $('status').textContent = text; }
  function lock(value) {
    busy = value; $('settings').disabled = value;
    ['record', 'listen', 'train'].forEach(id => $(id).disabled = value);
    $('stop').disabled = !value;
    document.querySelectorAll('.practice-review-button').forEach(button => button.disabled = value);
  }
  function release() {
    token++; clearTimeout(timer); bridge.stop();
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (source) source.disconnect();
    countdownNodes.forEach(node => { try { node.stop(); } catch (_) {} }); countdownNodes = [];
    if (context) context.close().catch(() => {});
    stream = source = context = null; lock(false);
    bridge.mark(null);
  }
  function cancel(text = 'Tentativa cancelada. Nenhuma avaliação foi salva.') {
    release(); frames = []; $('current').textContent = 'Pronto para recomeçar'; message(text);
  }
  function error(text) { $('error').hidden = false; $('error').textContent = text; }
  function readSettings() {
    const from = Number($('from').value), to = Number($('to').value), bpm = Number($('bpm').value), target = Number($('target').value);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to > lesson.measures) throw new Error('Escolha um intervalo válido de compassos.');
    if (!Number.isFinite(bpm) || bpm < 20 || bpm > 240 || !Number.isFinite(target) || target < 20 || target > 240) throw new Error('Use um andamento de 20 a 240 BPM.');
    return { from, to, bpm, target, latency: Number($('latency').value) / 1000 };
  }
  function prepare() {
    $('error').hidden = true; settings = readSettings(); plan = bridge.plan(settings);
    if (!plan.notes.length) throw new Error('O trecho escolhido não contém notas.');
    if (plan.notes.length > 600 || plan.end > 180) throw new Error('Escolha um trecho menor: até 3 minutos e 600 notas por tentativa.');
    if (plan.notes.some(n => n.midi < 30 || n.midi > 91)) throw new Error('Este trecho ultrapassa a faixa de notas do microfone nesta versão (Fá♯1 a Sol6).');
    $('progress').max = plan.end; $('progress').value = 0; $('notes').replaceChildren(); currentIndex = -1;
    plan.notes.forEach(n => {
      const element = document.createElement('span'); element.className = 'practice-note';
      element.textContent = `${core.noteName(n.midi)} · c.${n.measure}`; $('notes').append(element);
    });
    $('report').hidden = true;
  }
  function progress(time, sequence = plan) {
    $('progress').value = Math.max(0, Math.min(plan.end, time));
    let index = -1;
    for (let i = 0; i < sequence.notes.length; i++) if (sequence.notes[i].t <= time) index = i;
    const note = sequence.notes[index];
    $('current').textContent = note && time < note.end ? `Compasso ${note.measure} · ${core.noteName(note.midi)}` : time < 0 ? 'Prepare-se…' : 'Pausa';
    if (index !== currentIndex) {
      if (currentIndex >= 0) $('notes').children[currentIndex]?.classList.remove('active');
      $('notes').children[index]?.classList.add('active'); currentIndex = index;
      const child = $('notes').children[index];
      if (child) $('notes').scrollLeft = child.offsetLeft - $('notes').offsetLeft - 30;
    }
  }
  function click(ctx, time, strong) {
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.frequency.value = strong ? 1000 : 700;
    gain.gain.setValueAtTime(0.12, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(time); oscillator.stop(time + 0.07); countdownNodes.push(oscillator);
  }
  async function record() {
    if (busy) return;
    try { prepare(); } catch (e) { error(e.message); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) { error('Abra o site em HTTPS em um navegador com suporte a microfone.'); return; }
    release(); lock(true); frames = [];
    const request = token;
    message('Autorize o microfone. Depois haverá uma contagem de quatro pulsos.');
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)(); context = ctx;
      const resume = ctx.resume();
      resume.catch(() => {}); // A permissão pode ser negada antes de aguardarmos o áudio.
      // Inicia ambos no gesto do usuário, sem esperar o áudio para pedir permissão.
      const captured = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
      if (request !== token) { captured.getTracks().forEach(t => t.stop()); return; }
      stream = captured; await resume;
      if (request !== token) return;
      source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser(); analyser.fftSize = 4096; source.connect(analyser);
      const buffer = new Float32Array(analyser.fftSize), beat = 60 / settings.bpm;
      const firstClick = ctx.currentTime + 0.3, start = firstClick + 4 * beat;
      $('status').scrollIntoView({ block: 'center' });
      for (let i = 0; i < 4; i++) click(ctx, firstClick + i * beat, i === 0);
      stream.getTracks().forEach(track => track.addEventListener('ended', () => { if (request === token) cancel('Microfone desconectado. Tente novamente.'); }));
      let loudFrames = 0, sampled = 0, slowFrames = 0, lastTime = 0;
      function tick() {
        if (request !== token) return;
        if (ctx.state !== 'running') { cancel('O áudio foi interrompido. Ative o microfone e tente novamente.'); return; }
        const now = ctx.currentTime - start;
        if (now < 0) { message(`Contagem: ${Math.max(1, Math.ceil(-now / beat))}`); progress(now); }
        else {
          message('Sua vez — toque seguindo o andamento.'); progress(now);
          analyser.getFloatTimeDomainData(buffer);
          const frequency = window.PitchDetector.detectPitch(buffer, ctx.sampleRate);
          let energy = 0; for (const value of buffer) energy += value * value;
          const rms = Math.sqrt(energy / buffer.length); sampled++; if (rms > 0.008) loudFrames++;
          if (lastTime && now - lastTime > 0.15) slowFrames++; lastTime = now;
          const pitch = frequency ? 69 + 12 * Math.log2(frequency / 440) : null;
          const timestamp = now - buffer.length / (2 * ctx.sampleRate) - settings.latency;
          if (timestamp >= 0) frames.push({ t: timestamp, pitch });
          $('heard').textContent = frequency ? `Microfone: ${core.noteName(pitch)} · ${frequency.toFixed(1)} Hz` : 'Microfone: sem nota estável';
          if (now >= plan.end + 0.35) { finish({ loudFrames, sampled, slowFrames }); return; }
        }
        timer = setTimeout(tick, 35);
      }
      tick();
    } catch (e) {
      if (request !== token) return;
      release();
      const messages = { NotAllowedError: 'Permissão negada. Libere o microfone no navegador e tente novamente.', NotFoundError: 'Nenhum microfone encontrado.', NotReadableError: 'Microfone indisponível. Verifique se outro aplicativo está usando ele.' };
      error(messages[e.name] || 'Não foi possível iniciar a avaliação. Tente novamente.'); message('Avaliação não iniciada.');
    }
  }
  async function finish(quality) {
    const capturedFrames = frames; frames = [];
    const snapshot = { ...settings }, expected = plan.notes.map(n => ({ ...n }));
    release(); $('progress').value = plan.end;
    const played = core.segmentFrames(capturedFrames);
    let result;
    try { result = core.evaluate(expected, played, { beat: 60 / snapshot.bpm }); }
    catch (e) { error(e.message); return; }
    if (quality.slowFrames > Math.max(3, quality.sampled * 0.1)) { result.usable = false; result.pitchScore = result.rhythmScore = null; }
    result.quality = quality;
    const attempt = { version: 1, id: crypto.randomUUID(), createdAt: new Date().toISOString(), title: lesson.title,
      lessonText: lesson.text, instrumentId: lesson.instrumentId, instrument: lesson.instrument, transpose: lesson.transpose, unit: lesson.unit, settings: snapshot, result };
    message(result.usable ? 'Avaliação concluída. Confira os compassos abaixo.' : 'Captação insuficiente para uma avaliação confiável.');
    $('current').textContent = 'Tentativa concluída';
    renderReport(attempt);
    $('report-title').scrollIntoView({ block: 'center' });
    const owner = window.PVAccount.profile?.uid;
    try { await repository.save(attempt); if (window.PVAccount.profile?.uid !== owner) return; $('storage').textContent = 'Tentativa salva no seu acompanhamento.'; }
    catch (_) { if (window.PVAccount.profile?.uid !== owner) return; $('storage').textContent = 'Não foi possível sincronizar a tentativa. Confira a conexão. O resultado continua disponível abaixo.'; }
    await renderHistory();
  }
  async function listen(increasing = false) {
    if (busy) return;
    try { prepare(); if (increasing && settings.target < settings.bpm) throw new Error('A meta precisa ser igual ou maior que o andamento inicial.'); }
    catch (e) { error(e.message); return; }
    release(); lock(true); const request = token;
    let bpm = settings.bpm, pass = 1;
    $('heard').textContent = 'Microfone desligado. Toque junto com o exemplo; este modo não avalia.';
    async function cycle() {
      message(`Carregando exemplo a ${bpm} BPM…`);
      try {
        plan = bridge.plan({ ...settings, bpm });
        $('notes').querySelectorAll('.active').forEach(element => element.classList.remove('active'));
        currentIndex = -1;
        $('progress').max = plan.end;
        const playback = await bridge.listen({ ...settings, bpm });
        if (request !== token) return;
        if (!playback.playing) { cancel('Não foi possível iniciar o exemplo. Tente novamente.'); return; }
        $('status').scrollIntoView({ block: 'center' });
        message(increasing ? `Treino ${pass} · ${bpm} BPM · próximo passo +5 BPM` : `Toque comigo · ${bpm} BPM`);
        function tick() {
          if (request !== token) return;
          const lead = playback.timeline?.marks[0]?.t || 0;
          progress(playback.time - lead);
          if (!playback.playing) {
            if (increasing && bpm < settings.target) { bpm = Math.min(settings.target, bpm + 5); pass++; currentIndex = -1; timer = setTimeout(cycle, 700); }
            else { release(); message(increasing ? `Treino concluído a ${bpm} BPM. Agora tente avaliar sua execução.` : 'Exemplo concluído. Agora tente tocar sozinho.'); $('bpm').value = bpm; }
            return;
          }
          timer = setTimeout(tick, 60);
        }
        tick();
      } catch (_) { if (request === token) { release(); error('Não foi possível reproduzir o exemplo. Tente novamente.'); } }
    }
    cycle();
  }
  function renderReport(attempt) {
    const r = attempt.result; $('report').hidden = false;
    $('summary').textContent = r.usable
      ? `${r.detectedCount} notas detectadas; ${r.expectedCount} esperadas. A avaliação é aproximada. Notas não confirmadas ficam fora das porcentagens; confira também a cobertura.`
      : 'Não foi possível avaliar com confiança. Confira o microfone, toque mais perto e tente um trecho lento. Não interprete os itens abaixo como erros confirmados.';
    $('scores').replaceChildren();
    for (const [label, value] of [['Notas corretas', r.pitchScore], ['Entradas no tempo', r.rhythmScore], ['Cobertura avaliada', r.coverage]]) {
      const card = document.createElement('div'), number = document.createElement('strong'), caption = document.createElement('span');
      number.textContent = value == null ? '—' : `${value}%`; caption.textContent = label; card.append(number, caption); $('scores').append(card);
    }
    $('results').replaceChildren();
    const measures = [...new Set(r.rows.map(row => row.measure))].sort((a, b) => a - b);
    for (const measure of measures) {
      const rows = r.rows.filter(row => row.measure === measure), issues = rows.filter(row => row.kind !== 'good').length;
      const details = document.createElement('details'); details.className = 'practice-measure'; details.open = issues > 0;
      const summary = document.createElement('summary'); summary.textContent = `Compasso ${measure} · ${issues ? `${issues} ponto(s) para conferir` : 'Dentro da tolerância'}`;
      const list = document.createElement('ul');
      rows.forEach(row => {
        const item = document.createElement('li'); item.dataset.kind = row.kind;
        item.textContent = `${row.expected == null ? 'Extra' : core.noteName(row.expected)}: ${row.messages.join(' · ')}`; list.append(item);
      });
      const train = document.createElement('button'); train.type = 'button'; train.className = 'btn small practice-review-button'; train.textContent = 'Preparar treino deste compasso';
      train.addEventListener('click', () => {
        if (busy) return;
        $('from').value = $('to').value = measure; $('bpm').value = Math.max(20, Math.round(attempt.settings.bpm * 0.75)); $('target').value = attempt.settings.bpm;
        message(`Compasso ${measure} selecionado. Ouça, treine com +5 BPM ou avalie novamente.`);
        $('settings').scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
      details.append(summary, list, train); $('results').append(details);
    }
  }
  async function renderHistory() {
    const owner = window.PVAccount.profile?.uid;
    let list;
    try { list = await repository.list(); }
    catch (_) { $('storage').textContent = 'Não foi possível carregar seu histórico. Confira a conexão.'; $('history').replaceChildren(); $('chart').replaceChildren(); return; }
    if (window.PVAccount.profile?.uid !== owner) return;
    const matching = list.filter(x => x.lessonText === lesson.text && (x.instrumentId ? x.instrumentId === lesson.instrumentId : x.instrument === lesson.instrument) && x.transpose === lesson.transpose && x.unit === lesson.unit);
    $('history').replaceChildren(); $('chart').replaceChildren(); $('comparison').textContent = '';
    if (!matching.length) { const item = document.createElement('li'); item.textContent = 'Ainda não há tentativas desta lição.'; $('history').append(item); return; }
    const recent = matching.slice(0, 10);
    const chart = document.createElement('div'); chart.className = 'practice-chart'; chart.setAttribute('role', 'img');
    chart.setAttribute('aria-label', 'Notas corretas nas últimas tentativas, da mais antiga para a mais recente; detalhes na lista abaixo.');
    recent.slice().reverse().forEach(a => { const bar = document.createElement('span'); bar.style.height = `${Math.max(3, a.result.pitchScore || 0)}%`; bar.title = `${a.settings.bpm} BPM: ${a.result.pitchScore ?? 'sem avaliação'}${a.result.pitchScore == null ? '' : '%'}`; chart.append(bar); });
    $('chart').append(chart);
    recent.forEach(a => {
      const item = document.createElement('li');
      item.textContent = `${new Date(a.createdAt).toLocaleString('pt-BR')} · c.${a.settings.from}–${a.settings.to} · ${a.settings.bpm} BPM · notas ${a.result.pitchScore == null ? '—' : a.result.pitchScore + '%'} · entradas ${a.result.rhythmScore == null ? '—' : a.result.rhythmScore + '%'} · cobertura ${a.result.coverage}%`;
      $('history').append(item);
    });
    const latest = matching[0], previous = matching.slice(1).find(a => a.settings.from === latest.settings.from && a.settings.to === latest.settings.to && a.settings.bpm === latest.settings.bpm && a.settings.latency === latest.settings.latency);
    if (previous && latest.result.pitchScore != null && previous.result.pitchScore != null) {
      const delta = latest.result.pitchScore - previous.result.pitchScore;
      $('comparison').textContent = `Comparado à tentativa anterior no mesmo trecho e andamento: ${delta > 0 ? '+' : ''}${delta} pontos percentuais em notas corretas. Confira a cobertura das duas tentativas no diário.`;
    }
  }
  window.addEventListener('pv-account-changed', () => {
    release(); dialog.close(); $('report').hidden = true; $('results').replaceChildren(); $('history').replaceChildren(); $('chart').replaceChildren();
  });
  document.getElementById('practice-open').addEventListener('click', () => {
    bridge.stop(); lesson = bridge.current();
    $('lesson').textContent = lesson.title;
    $('from').value = 1; $('to').value = lesson.measures; $('from').max = $('to').max = lesson.measures;
    $('bpm').value = Math.min(240, Math.max(20, lesson.bpm)); $('target').value = Math.min(240, Math.max(20, lesson.bpm + 20));
    $('instrument-select').value = lesson.instrumentId;
    if (!$('instrument-select').value) lesson = bridge.selectInstrument('piano', true);
    $('instrument-select').value = lesson.instrumentId;
    refreshNotationOptions(lesson.notation);
    describeInstrument();
    $('report').hidden = true; $('error').hidden = true; $('storage').textContent = ''; $('notes').replaceChildren(); $('progress').value = 0;
    $('score').replaceChildren();
    message('Pronto para praticar.'); $('current').textContent = 'Escolha como começar';
    dialog.showModal(); renderPracticeScore(); renderHistory();
  });
  function describeInstrument() {
    const written = $('notation').value !== 'concert';
    $('instrument').textContent = `${lesson.instrument} · ${written ? 'a avaliação considera a transposição do instrumento' : 'comparação em som real, sem transposição'}. A partitura permanece escrita; os indicadores e o relatório mostram as notas em som real. ${lesson.notationNote} ${lesson.sampleNote}`;
  }
  function refreshNotationOptions(value) {
    const inst = bridge.instruments().find(item => item.id === $('instrument-select').value);
    const select = $('notation'); select.querySelector('[value="alternate"]')?.remove();
    if (inst?.alternateLabel) {
      const option = document.createElement('option'); option.value = 'alternate'; option.textContent = inst.alternateLabel; select.append(option);
    }
    select.value = value === 'alternate' && !inst?.alternateLabel ? 'written' : value;
  }
  function changeInstrument(event) {
    if (busy) return;
    if (event?.target === $('instrument-select')) refreshNotationOptions($('notation').value);
    try {
      lesson = bridge.selectInstrument($('instrument-select').value, $('notation').value !== 'concert', $('notation').value === 'alternate');
    } catch (e) {
      $('instrument-select').value = lesson.instrumentId; refreshNotationOptions(lesson.notation); error(e.message); return;
    }
    $('error').hidden = true; $('lesson').textContent = lesson.title; renderPracticeScore();
    describeInstrument(); $('report').hidden = true; $('notes').replaceChildren(); $('progress').value = 0;
    $('current').textContent = 'Escolha como começar'; $('heard').textContent = 'A referência de afinação da avaliação é Lá = 440 Hz.';
    message('Instrumento atualizado para a avaliação e o exemplo sonoro.'); renderHistory();
  }
  $('instrument-select').addEventListener('change', changeInstrument);
  $('notation').addEventListener('change', changeInstrument);
  let scoreWidth = 0;
  function renderPracticeScore() {
    if (!dialog.open || !$('score-details').open || !$('score').clientWidth) return;
    scoreWidth = $('score').clientWidth;
    bridge.renderScore($('score'));
  }
  $('score-details').addEventListener('toggle', renderPracticeScore);
  $('score-zoom').addEventListener('click', () => {
    const zoomed = $('score').classList.toggle('is-zoomed');
    $('score-zoom').setAttribute('aria-pressed', String(zoomed));
    $('score-zoom').textContent = zoomed ? 'Ajustar à tela' : 'Ampliar partitura';
  });
  new ResizeObserver(() => {
    if (Math.abs($('score').clientWidth - scoreWidth) > 2) renderPracticeScore();
  }).observe($('score'));
  $('close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => cancel());
  $('stop').addEventListener('click', () => cancel());
  $('record').addEventListener('click', record);
  $('bpm').addEventListener('change', () => {
    if (+$('target').value < +$('bpm').value) $('target').value = Math.min(240, +$('bpm').value + 20);
  });
  $('listen').addEventListener('click', () => listen(false));
  $('train').addEventListener('click', () => listen(true));
  document.getElementById('logout').addEventListener('click', () => { cancel(); dialog.close(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && busy) cancel('Prática interrompida ao sair da aba. Nenhum resultado parcial foi salvo.'); });
  window.addEventListener('pagehide', () => { if (busy) release(); });
})();
