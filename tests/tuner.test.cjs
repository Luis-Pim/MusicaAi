const { test } = require('node:test');
const assert = require('node:assert/strict');
const { detectPitch, describePitch } = require('../site/tuner.js');
function tone(f, rate, harmonics = [1]) {
  return Float32Array.from({length:8192}, (_, i) => harmonics.reduce((v, a, h) => v + a * Math.sin(2 * Math.PI * f * (h + 1) * i / rate), 0) * 0.15);
}
for (const rate of [44100, 48000]) {
  test(`Notas graves, médias e agudas a ${rate} Hz`, () => {
    for (const f of [41.203, 55, 82.407, 130.813, 261.626, 440, 880, 1318.51, 1567.98]) {
      const result = detectPitch(tone(f, rate), rate);
      assert(result, `Sem detecção para ${f}`);
      assert(Math.abs(1200 * Math.log2(result / f)) < 5, `${f}: ${result}`);
    }
  });
  test(`Timbre com harmônicos a ${rate} Hz`, () => {
    for (const f of [82.407, 220, 440]) {
      const result = detectPitch(tone(f, rate, [0.6, 1, 0.3]), rate);
      assert(result && Math.abs(1200 * Math.log2(result / f)) < 5);
    }
  });
}
test('Silêncio, sinal fraco e ruído não geram uma nota', () => {
  assert.equal(detectPitch(new Float32Array(8192), 48000), null);
  assert.equal(detectPitch(tone(440,48000).map(v=>v*0.001),48000),null);
  let seed = 123;
  const noise = Float32Array.from({length:8192}, () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed / 2**32 - 0.5) * 0.4; });
  assert.equal(detectPitch(noise,48000),null);
});
test('Diagnóstico distingue acima, abaixo e afinado; referência ajustável', () => {
  assert.equal(describePitch(440).diagnosis,'Afinado');
  assert.equal(describePitch(440).name,'Lá / A');
  assert.equal(describePitch(440).octave,4);
  assert.match(describePitch(440 * 2**(-20/1200)).diagnosis,/Abaixo/);
  assert.match(describePitch(440 * 2**(20/1200)).diagnosis,/Acima/);
  assert.equal(describePitch(442,442).diagnosis,'Afinado');
});
