// PLAYWRIGHT_PATH=/path/to/playwright node tests/practice-browser.cjs
// Chrome instalado; áudio controlado para testes reproduzíveis, sem microfone real.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-proxy-server'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('http://localhost:8765/**', route => route.fulfill({ path: path.join(__dirname, '../site', new URL(route.request().url()).pathname === '/' ? 'index.html' : new URL(route.request().url()).pathname) }));
    await page.addInitScript(() => {
      window.testTracks = []; window.testSilent = false;
      navigator.mediaDevices.getUserMedia = async () => {
        const track = { stopped: false, stop() { this.stopped = true; }, addEventListener() {} }; window.testTracks.push(track);
        return { getTracks: () => [track] };
      };
      const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
      const node = () => ({ connect() {}, disconnect() {}, start() {}, stop() {}, gain: param(), frequency: param(), playbackRate: param(), threshold: param(), ratio: param() });
      window.AudioContext = class {
        constructor() { this.base = performance.now(); this.sampleRate = 48000; this.state = 'running'; this.destination = {}; this.starts = []; }
        get currentTime() { return (performance.now() - this.base) / 1000; }
        async resume() { this.state = 'running'; } async close() { this.state = 'closed'; }
        createMediaStreamSource() { return node(); } createGain() { return node(); } createDynamicsCompressor() { return node(); }
        createBiquadFilter() { return node(); } createBufferSource() { return node(); } async decodeAudioData() { return { duration: 1 }; }
        createOscillator() { const n = node(); n.start = t => this.starts.push(t); return n; }
        createAnalyser() {
          const ctx = this;
          return { fftSize: 4096, getFloatTimeDomainData(buffer) {
            const beat = 0.5, start = (ctx.starts[0] || 0) + 4 * beat;
            const capturedAt = ctx.currentTime;
            for (let i = 0; i < buffer.length; i++) {
              const time = capturedAt - start - (buffer.length - i) / ctx.sampleRate;
              const index = Math.floor(time / beat), midi = [69, 71, 72, 74][index];
              buffer[i] = !window.testSilent && midi && time % beat < 0.44 ? 0.2 * Math.sin(2 * Math.PI * 440 * 2 ** ((midi - 69) / 12) * time) : 0;
            }
          } };
        }
      };
    });
    await page.goto('http://localhost:8765/', { waitUntil: 'domcontentloaded' });
    await page.locator('#login-user').fill('admin'); await page.locator('#login-password').fill('ccb123'); await page.locator('#login-form button').click();
    const text = 'titulo: Teste de avaliação\ncompasso: 4/4\ninstrumento: piano\nandamento: 120 seminima\nA4/4 B4/4 C5/4 D5/4 |';
    await page.evaluate(text => { const src = document.getElementById('src'); src.value = text; src.dispatchEvent(new Event('input')); }, text);
    await page.waitForFunction(() => window.PracticeBridge.current().title === 'Teste de avaliação');
    // O editor mantém o instrumento escolhido anteriormente; selecione piano explicitamente.
    await page.locator('#more-toggle').click();
    await page.selectOption('#inst', 'piano');
    await page.locator('#more-toggle').click();
    await page.locator('#practice-open').click();
    await page.locator('#practice-bpm').fill('120');
    await page.locator('#practice-record').click();
    await page.waitForFunction(() => !document.getElementById('practice-report').hidden, null, { timeout: 15000 });
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('pv:practice:v1') || '[]').length === 1);
    const first = await page.evaluate(() => JSON.parse(localStorage.getItem('pv:practice:v1'))[0]);
    assert.equal(first.result.pitchScore, 100); assert.equal(first.result.rhythmScore, 100); assert.equal(first.result.coverage, 100);
    assert(first.result.rows.every(row => row.kind === 'good'), JSON.stringify(first.result.rows));
    assert(await page.evaluate(() => window.testTracks.every(t => t.stopped)));
    await page.screenshot({ path: '/tmp/pv-practice-mobile.png' });
    assert(await page.locator('#practice-dialog').evaluate(e => e.scrollWidth <= e.clientWidth));
    await page.locator('.practice-measure > summary').first().click();
    await page.locator('.practice-review-button').first().click(); assert.equal(await page.locator('#practice-bpm').inputValue(), '90');
    // Cancelamento não gera uma tentativa no diário.
    await page.locator('#practice-record').click(); await page.locator('#practice-stop').click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('pv:practice:v1')).length), 1);
    await page.locator('#practice-bpm').fill('120');
    await page.evaluate(() => { window.testSilent = true; });
    await page.locator('#practice-record').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('pv:practice:v1')).length === 2, null, { timeout: 15000 });
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('pv:practice:v1'))[0].result.pitchScore), null);
    // Toque comigo e aumento progressivo terminam sem ativar o microfone.
    const tracks = await page.evaluate(() => window.testTracks.length);
    await page.locator('.practice-advanced > summary').click();
    await page.locator('#practice-target').fill('125'); await page.locator('#practice-train').click();
    await page.waitForFunction(() => document.getElementById('practice-status').textContent.includes('Treino concluído a 125'), null, { timeout: 18000 });
    assert.equal(await page.evaluate(() => window.testTracks.length), tracks);
    await page.locator('#practice-close').click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#practice-open').click(); assert.equal(await page.locator('#practice-history li').count(), 2);
    // Permissão negada e fechamento com solicitação pendente.
    await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('denied', 'NotAllowedError'); }; });
    await page.locator('#practice-record').click(); await page.waitForFunction(() => document.getElementById('practice-error').textContent.includes('Permissão negada'));
    await page.evaluate(() => { navigator.mediaDevices.getUserMedia = () => new Promise(resolve => { window.resolveMic = resolve; }); });
    await page.locator('#practice-record').click(); await page.waitForFunction(() => !!window.resolveMic);
    await page.keyboard.press('Escape');
    await page.evaluate(() => { window.lateTrack = { stopped: false, stop() { this.stopped = true; } }; window.resolveMic({ getTracks: () => [window.lateTrack] }); });
    await page.waitForFunction(() => window.lateTrack.stopped);
    assert.deepEqual(errors, []);
    console.log('Professor: áudio controlado, relatório, silêncio, treino progressivo, cancelamento, histórico persistido, permissão negada e captura tardia: OK');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
