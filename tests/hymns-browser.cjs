const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
  try {
    const page = await browser.newPage();
    await page.route('http://localhost:8765/**', r => r.fulfill({path:path.join(__dirname,'../site',new URL(r.request().url()).pathname === '/' ? 'index.html' : new URL(r.request().url()).pathname)}));
    await require('./account-fixture.cjs')(page);
    await page.goto('http://localhost:8765/');
    await page.locator('#login-user').fill('test@example.com');
    await page.locator('#login-password').fill('test-password');
    await page.locator('#login-submit').click();
    await page.locator('[data-tipo="hinos"]').click();
    assert(await page.locator('#lib-method').isHidden());
    assert.equal(await page.locator('#lib-list .lib-item').count(),467);
    await page.locator('#lib-search').fill('Cristo, meu Mestre');
    await page.locator('#lib-list .lib-item').first().click();
    await page.locator('#hymn-pages canvas').first().waitFor();
    assert(await page.locator('#score').isHidden());
    assert.equal(await page.locator('#hymn-pdf').getAttribute('href'),'hinario/hino-1.pdf');
    await page.locator('#hymn-melody').click();
    assert(await page.locator('#score').isVisible());
    assert((await page.evaluate(() => PracticeBridge.current().measures)) > 0);
    await page.reload();
    await page.locator('#hymn-pages canvas').first().waitFor();
    assert.equal(await page.locator('[data-tipo="hinos"]').getAttribute('aria-selected'),'true');
    assert(await page.locator('#score').isHidden());
    await page.locator('[data-tipo="exercicio"]').click();
    assert.equal(await page.locator('#lib-method option').count(),1);
    assert(!(await page.locator('#lib-list').textContent()).includes('Hino 1'));
    await page.locator('[data-tipo="estudo"]').click();
    assert(await page.locator('#lib-list .lib-item').count() > 0);
    await page.locator('[data-tipo="hinos"]').click();
    assert(await page.locator('#lib-method').isHidden());
    for (const width of [1440,390,320]) {
      await page.setViewportSize({width,height:844});
      assert(await page.evaluate(() => {const e=document.querySelector('#library');return e.scrollWidth <= e.clientWidth+1;}));
    }
    await page.locator('#hymn-zoom').click();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('#hymn-zoom').click();
    await page.screenshot({path:'/tmp/pv-hymn-complete-mobile.png',fullPage:true});
    await page.locator('[data-tipo="exercicio"]').click();
    await page.locator('#lib-list .lib-item').first().click();
    await page.waitForFunction(() => document.getElementById('hymn-original').hidden);
    assert(await page.locator('#score').isVisible());
    console.log('Hinos: partitura original completa, sem seletor de voz, melodia de prática, persistência e layout OK');
  } finally { await browser.close(); }
})().catch(e => {console.error(e);process.exit(1);});
