/* Afinador monofônico: YIN com diferença normalizada e interpolação parabólica. */
(function (root) {
  'use strict';
  function detectPitch(input, sampleRate) {
    // Reduz o custo mantendo cerca de 24 kHz para a faixa de 35–1600 Hz.
    const stride = Math.max(1, Math.floor(sampleRate / 24000));
    const rate = sampleRate / stride;
    const n = Math.floor(input.length / stride);
    const data = new Float32Array(n);
    let mean = 0, energy = 0;
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < stride; j++) sum += input[i * stride + j];
      data[i] = sum / stride; mean += data[i];
    }
    mean /= n;
    for (let i = 0; i < n; i++) { data[i] -= mean; energy += data[i] ** 2; }
    if (Math.sqrt(energy / n) < 0.008) return null;
    const max = Math.min(Math.ceil(rate / 35), Math.floor(n / 2) - 1);
    const min = Math.max(2, Math.floor(rate / 1600));
    const size = n - max;
    const diff = new Float32Array(max + 1);
    let sum = 0;
    diff[0] = 1;
    for (let tau = 1; tau <= max; tau++) {
      let d = 0;
      for (let i = 0; i < size; i++) d += (data[i] - data[i + tau]) ** 2;
      sum += d; diff[tau] = sum ? d * tau / sum : 1;
    }
    for (let tau = min; tau < max; tau++) {
      if (diff[tau] >= 0.12) continue;
      while (tau + 1 < max && diff[tau + 1] < diff[tau]) tau++;
      const a = diff[tau - 1], b = diff[tau], c = diff[tau + 1];
      const denominator = a - 2 * b + c;
      const refined = tau + (denominator ? 0.5 * (a - c) / denominator : 0);
      const frequency = rate / refined;
      return frequency >= 35 && frequency <= 1600 ? frequency : null;
    }
    return null;
  }
  function describePitch(frequency, reference = 440) {
    const midi = Math.round(69 + 12 * Math.log2(frequency / reference));
    const target = reference * 2 ** ((midi - 69) / 12);
    const cents = 1200 * Math.log2(frequency / target);
    const names = ['Dó / C', 'Dó♯ / C♯', 'Ré / D', 'Mi♭ / E♭', 'Mi / E', 'Fá / F', 'Fá♯ / F♯', 'Sol / G', 'Lá♭ / A♭', 'Lá / A', 'Si♭ / B♭', 'Si / B'];
    return { midi, name: names[((midi % 12) + 12) % 12], octave: Math.floor(midi / 12) - 1, cents,
      diagnosis: Math.abs(cents) <= 5 ? 'Afinado' : cents < 0 ? 'Abaixo — suba a afinação' : 'Acima — desça a afinação' };
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { detectPitch, describePitch }; return; }
  root.PitchDetector = { detectPitch, describePitch };
  const $ = id => document.getElementById(id);
  const dialog = $('tuner-dialog');
  let stream, context, source, timer, generation = 0, running = false, history = [], lastSignal = 0;
  function status(message) { if ($('tuner-status').textContent !== message) $('tuner-status').textContent = message; }
  function clearReading() {
    $('tuner-note').textContent = '—'; $('tuner-detail').textContent = 'Toque uma nota longa e estável.';
    $('tuner-needle').hidden = true; dialog.dataset.tuning = ''; history = [];
  }
  function stop(message = 'Microfone desligado.') {
    generation++; running = false; clearTimeout(timer);
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (source) source.disconnect();
    if (context) context.close().catch(() => {});
    stream = context = source = null;
    $('tuner-start').disabled = false; $('tuner-start').textContent = 'Ativar microfone';
    $('tuner-stop').disabled = true; clearReading(); status(message);
  }
  $('tuner-open').addEventListener('click', () => {
    $('stop').click(); dialog.showModal();
  });
  $('tuner-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => stop());
  $('tuner-stop').addEventListener('click', () => stop());
  $('logout').addEventListener('click', () => { stop(); dialog.close(); });
  window.addEventListener('pagehide', () => stop());
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  $('tuner-reference').addEventListener('change', () => { history = []; clearReading(); });
  $('tuner-start').addEventListener('click', async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      status('O microfone precisa de HTTPS e de um navegador compatível.'); return;
    }
    const token = ++generation;
    $('tuner-start').disabled = true; $('tuner-stop').disabled = false;
    status('Autorize o uso do microfone no navegador.');
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const currentContext = new AudioContext(); context = currentContext;
      await currentContext.resume();
      if (token !== generation) return;
      const captured = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
      if (token !== generation) { captured.getTracks().forEach(track => track.stop()); return; }
      stream = captured;
      source = currentContext.createMediaStreamSource(stream);
      const analyser = currentContext.createAnalyser(); analyser.fftSize = 8192;
      source.connect(analyser); // Sem saída para os alto-falantes e sem gravação.
      const buffer = new Float32Array(analyser.fftSize);
      running = true; lastSignal = performance.now();
      $('tuner-start').textContent = 'Microfone ativo'; status('Ouvindo… toque uma nota por vez.');
      stream.getTracks().forEach(track => track.addEventListener('ended', () => { if (token === generation) stop('O microfone foi desconectado. Tente ativá-lo novamente.'); }));
      function tick() {
        if (!running || token !== generation) return;
        analyser.getFloatTimeDomainData(buffer);
        const frequency = detectPitch(buffer, currentContext.sampleRate);
        if (frequency) {
          lastSignal = performance.now();
          if (history.length && Math.abs(1200 * Math.log2(frequency / history[history.length - 1])) > 80) history = [];
          history.push(frequency); if (history.length > 5) history.shift();
          if (history.length >= 3) {
            const stable = [...history].sort((a, b) => a - b)[Math.floor(history.length / 2)];
            const pitch = describePitch(stable, Number($('tuner-reference').value));
            $('tuner-note').textContent = pitch.name;
            $('tuner-detail').textContent = `Oitava ${pitch.octave} · ${stable.toFixed(1)} Hz · ${pitch.cents >= 0 ? '+' : ''}${pitch.cents.toFixed(0)} cents`;
            $('tuner-needle').hidden = false;
            $('tuner-needle').style.left = `${50 + Math.max(-50, Math.min(50, pitch.cents))}%`;
            dialog.dataset.tuning = Math.abs(pitch.cents) <= 5 ? 'good' : 'adjust';
            status(pitch.diagnosis);
          }
        } else if (performance.now() - lastSignal > 650) {
          clearReading(); status('Sem nota estável. Toque uma nota por vez, perto do microfone.');
        }
        timer = setTimeout(tick, 100);
      }
      tick();
    } catch (error) {
      if (token !== generation) return;
      const messages = { NotAllowedError: 'Permissão negada. Libere o microfone nas configurações do navegador e tente novamente.', NotFoundError: 'Nenhum microfone encontrado.', NotReadableError: 'Não foi possível acessar o microfone. Verifique se outro aplicativo está usando ele.' };
      stop(messages[error.name] || 'Não foi possível iniciar o microfone. Tente novamente.');
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
