/* Funções puras: segmentação, alinhamento de sequências e avaliação aproximada. */
(function (root) {
  'use strict';
  const median = values => { const a = [...values].sort((a, b) => a - b); return a.length ? a[Math.floor(a.length / 2)] : 0; };
  function noteName(midi) {
    const names = ['Dó', 'Dó♯', 'Ré', 'Mi♭', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Lá♭', 'Lá', 'Si♭', 'Si'];
    return `${names[((Math.round(midi) % 12) + 12) % 12]}${Math.floor(Math.round(midi) / 12) - 1}`;
  }
  function segmentFrames(frames) {
    const notes = []; let current = null;
    const finish = () => {
      if (current && current.values.length >= 2 && current.end - current.t >= 0.075) {
        notes.push({ t: current.t, end: current.end, dur: current.end - current.t,
          midi: Math.round(median(current.values)), pitch: median(current.values), samples: current.values.length });
      }
      current = null;
    };
    for (const f of frames) {
      if (!Number.isFinite(f.pitch)) { if (current && f.t - current.end > 0.085) finish(); continue; }
      const midi = Math.round(f.pitch);
      if (current && (midi !== current.midi || f.t - current.end > 0.11)) finish();
      if (!current) current = { t: Math.max(0, f.t), end: f.t, midi, values: [] };
      current.values.push(f.pitch); current.end = f.t + 0.025;
    }
    finish();
    return notes;
  }
  // Edição de sequência: uma nota pulada ou extra não desloca todo o restante.
  function align(expected, played, beat) {
    const n = expected.length, m = played.length;
    if (n > 600 || m > 1200) throw new Error('Trecho longo demais. Avalie até 600 notas por tentativa.');
    const cost = Array.from({ length: n + 1 }, () => new Float32Array(m + 1));
    const move = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
    for (let i = 1; i <= n; i++) { cost[i][0] = i; move[i][0] = 1; }
    for (let j = 1; j <= m; j++) { cost[0][j] = j; move[0][j] = 2; }
    for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
      const e = expected[i - 1], p = played[j - 1];
      const distance = Math.abs(e.midi - p.midi);
      const pitchCost = distance === 0 ? 0 : Math.min(1.05, 0.8 + distance * 0.025);
      const timeCost = Math.min(1.5, Math.abs(p.t - e.t) / Math.max(beat, 0.25) * 0.3);
      const match = cost[i - 1][j - 1] + pitchCost + timeCost;
      const skip = cost[i - 1][j] + 1, extra = cost[i][j - 1] + 1;
      if (match <= skip && match <= extra) { cost[i][j] = match; move[i][j] = 0; }
      else if (skip <= extra) { cost[i][j] = skip; move[i][j] = 1; }
      else { cost[i][j] = extra; move[i][j] = 2; }
    }
    const pairs = []; let i = n, j = m;
    while (i || j) {
      const direction = move[i][j];
      if (i && j && direction === 0) pairs.push({ expected: --i, played: --j });
      else if (i && (!j || direction === 1)) pairs.push({ expected: --i, played: null });
      else pairs.push({ expected: null, played: --j });
    }
    return pairs.reverse();
  }
  function evaluate(expected, played, options = {}) {
    const beat = options.beat || 0.6;
    const timingTolerance = Math.max(0.16, beat * 0.22);
    const signalUsable = played.length >= Math.min(3, Math.max(1, Math.ceil(expected.length * 0.15)));
    const rows = align(expected, played, beat).map(pair => {
      const e = expected[pair.expected], p = played[pair.played];
      if (!e) {
        const nearest = expected.reduce((best, note) => Math.abs(note.t - p.t) < Math.abs(best.t - p.t) ? note : best, expected[0]);
        return { measure: nearest?.measure || 1, expected: null, played: p.midi, kind: 'extra', messages: ['Nota extra detectada'], t: p.t };
      }
      const row = { measure: e.measure, event: e.event, expected: e.midi, played: p?.midi ?? null, t: e.t, messages: [] };
      if (!p) return { ...row, kind: 'unknown', messages: ['Nota não detectada — pode ter faltado ou a captação falhou'] };
      row.pitchOK = p.midi === e.midi;
      row.onsetMs = Math.round((p.t - e.t) * 1000);
      row.durationMs = Math.round((p.dur - e.dur) * 1000);
      row.cents = Math.round((p.pitch - e.midi) * 100);
      row.rhythmOK = Math.abs(row.onsetMs) <= timingTolerance * 1000;
      row.durationOK = Math.abs(p.dur - e.dur) <= Math.max(0.22, e.dur * 0.35);
      if (!row.pitchOK) row.messages.push(`Nota diferente: esperado ${noteName(e.midi)}, detectado ${noteName(p.midi)}`);
      else if (Math.abs(row.cents) > 25) row.messages.push(`Nota certa, afinação ${row.cents > 0 ? 'acima' : 'abaixo'} (${Math.abs(row.cents)} cents)`);
      if (!row.rhythmOK) row.messages.push(`Entrada ${row.onsetMs > 0 ? 'atrasada' : 'adiantada'} em ${Math.abs(row.onsetMs)} ms`);
      if (!row.durationOK) row.messages.push(`Duração ${row.durationMs > 0 ? 'longa' : 'curta'} em ${Math.abs(row.durationMs)} ms`);
      if (!row.messages.length) row.messages.push('Nota e ritmo dentro da tolerância');
      row.kind = !row.pitchOK || !row.rhythmOK || !row.durationOK || Math.abs(row.cents) > 25 ? 'review' : 'good';
      // Notas rápidas não oferecem resolução temporal suficiente nesta versão.
      if (e.dur < 0.18) { row.kind = 'unknown'; row.messages = ['Nota muito curta para avaliar com confiança. Reduza o andamento.']; }
      return row;
    });
    const matched = rows.filter(r => r.expected !== null && r.played !== null && r.kind !== 'unknown');
    const usable = signalUsable && matched.length >= Math.min(3, expected.length) && matched.length / expected.length >= 0.25;
    const percent = key => usable && matched.length ? Math.round(matched.filter(r => r[key]).length / matched.length * 100) : null;
    return { version: 1, usable, rows, expectedCount: expected.length, detectedCount: played.length,
      coverage: expected.length ? Math.round(matched.length / expected.length * 100) : 0,
      pitchScore: percent('pitchOK'), rhythmScore: percent('rhythmOK'),
      reviewMeasures: [...new Set(rows.filter(r => r.kind !== 'good').map(r => r.measure))],
      timingToleranceMs: Math.round(timingTolerance * 1000) };
  }
  const api = { segmentFrames, align, evaluate, noteName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PracticeCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
