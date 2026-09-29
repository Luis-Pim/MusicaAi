const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:8765/**',r=>r.fulfill({path:path.join(__dirname,'../site',new URL(r.request().url()).pathname==='/'?'index.html':new URL(r.request().url()).pathname)}));
 await require('./account-fixture.cjs')(page);
await page.goto('http://localhost:8765/',{waitUntil:'domcontentloaded'});
 await page.locator('#login-user').fill('test@example.com');await page.locator('#login-password').fill('test-password');await page.locator('#login-submit').click();
 const original=await page.evaluate(()=>PracticeBridge.current().text);
 await page.locator('#scales-open').click();
 for(const [id,key] of [['clarinete','Ré maior'],['saxalto','Lá maior'],['trompa','Sol maior'],['oboedamore','Mi♭ maior']]){
  await page.selectOption('#scales-instrument',id);assert((await page.locator('#scales-summary').textContent()).endsWith(key));assert(await page.locator('#scales-error').isHidden());
 }
 await page.selectOption('#scales-instrument','clarinete');await page.locator('#scales-next').click();assert((await page.locator('#scales-summary').textContent()).endsWith('Lá maior'));await page.locator('#scales-previous').click();
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:844});await page.waitForTimeout(150);
  assert(await page.evaluate(()=>{const d=document.querySelector('#scales-dialog'),s=document.querySelector('#scales-preview');return d.scrollWidth<=d.clientWidth+1&&s.scrollWidth<=s.clientWidth+1&&s.querySelectorAll('[data-ev]').length===15}));
 }
 await page.screenshot({path:'/tmp/pv-scales-mobile.png'});
 await page.locator('#scales-practice').click();assert(await page.locator('#practice-dialog').isVisible());
 for(const id of ['clarinete','saxalto','trompa']){
  await page.selectOption('#practice-instrument-select',id);
  const result=await page.evaluate(()=>{const c=PracticeBridge.current();return {text:c.text,notes:PracticeBridge.plan({from:1,to:c.measures,bpm:60}).notes.map(n=>n.midi%12)}});
  assert.deepEqual(result.notes,[0,2,4,5,7,9,11,0,11,9,7,5,4,2,0]);
 }
 await page.locator('#practice-close').click();await page.locator('#scales-open').click();await page.locator('#scales-restore').click();assert.equal(await page.evaluate(()=>PracticeBridge.current().text),original);
 await page.locator('#scales-open').click();await page.selectOption('#scales-instrument','tuba');await page.selectOption('#scales-notation','alternate');await page.locator('#scales-load').click();await page.reload({waitUntil:'domcontentloaded'});
 assert.equal(await page.evaluate(()=>PracticeBridge.current().transpose),-26);
 await page.locator('#more-toggle').click();
 await page.selectOption('#inst','clarinete');
 assert((await page.evaluate(()=>PracticeBridge.current().text)).includes('tonalidade: D'));
 await page.locator('#transp').uncheck();
 assert((await page.evaluate(()=>PracticeBridge.current().text)).includes('tonalidade: C'));
 assert.equal(await page.evaluate(()=>PracticeBridge.current().transpose),0);

 assert.deepEqual(errors,[]);console.log('Escalas: círculo, transposição real no player/professor, restauração, persistência e layout 320–1440px OK');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
