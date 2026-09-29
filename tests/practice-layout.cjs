const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');const assert=require('node:assert/strict');const path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});try{
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('http://localhost:8765/**',r=>r.fulfill({path:path.join(__dirname,'../site',new URL(r.request().url()).pathname==='/'?'index.html':new URL(r.request().url()).pathname)}));
await require('./account-fixture.cjs')(page);
await page.goto('http://localhost:8765/',{waitUntil:'domcontentloaded'});await page.locator('#login-user').fill('test@example.com');await page.locator('#login-password').fill('test-password');await page.locator('#login-submit').click();
await page.locator('#practice-open').click();await page.locator('#practice-score-details > summary').click();
for(const width of [1440,768,390,320]){
 await page.setViewportSize({width,height:844});await page.waitForTimeout(350);
 const result=await page.evaluate(()=>{
  const host=document.getElementById('practice-score'),svg=host.querySelector('svg'),rect=svg.getBoundingClientRect();
  const notes=[...host.querySelectorAll('[data-ev]')];
  return {height:host.clientHeight,scroll:host.scrollHeight,width:host.clientWidth,scrollWidth:host.scrollWidth,count:notes.length,mainCount:document.querySelectorAll('#score [data-ev]').length,clipped:notes.some(n=>{const r=n.getBoundingClientRect();return r.right>rect.right+2||r.bottom>rect.bottom+2||r.left<rect.left-2}),modalOverflow:document.getElementById('practice-dialog').scrollWidth>document.getElementById('practice-dialog').clientWidth};
 });
 assert.equal(result.count,result.mainCount);assert(result.count>0);assert(result.height>=result.scroll-1);assert(result.scrollWidth<=result.width+1);assert(!result.clipped,JSON.stringify(result));assert(!result.modalOverflow);
 console.log(width+'px: todas as notas desenhadas, sem corte vertical nem overflow do modal');
}
await page.screenshot({path:'/tmp/pv-professor-score-fixed.png'});await page.locator('#practice-score-zoom').click();assert.equal(await page.locator('#practice-score-zoom').getAttribute('aria-pressed'),'true');await page.locator('#practice-score-zoom').click();
await page.locator('#practice-score-details > summary').click();
const original=await page.evaluate(()=>window.PracticeBridge.plan({from:1,to:1,bpm:60}).notes[0].midi-window.PracticeBridge.current().transpose);
for(const [id,shift] of [['saxsoprano',-2],['saxbaritono',-21],['corneingles',-7],['oboedamore',-3],['clarinetealto',-9],['clarinetebaixo',-14],['trompetedo',0],['cornet',-2],['flugelhorn',-2],['trompa',-7],['trompasib',-2],['trombone',0],['eufonio',0],['tuba',0],['tubado',0],['tubamib',0],['tubafa',0]]){
 await page.selectOption('#practice-instrument-select',id);await page.selectOption('#practice-notation','written');
 assert.equal(await page.evaluate(()=>window.PracticeBridge.plan({from:1,to:1,bpm:60}).notes[0].midi),original+shift);
 assert.equal(await page.locator('#inst').inputValue(),id);
 await page.selectOption('#practice-notation','concert');assert.equal(await page.evaluate(()=>window.PracticeBridge.plan({from:1,to:1,bpm:60}).notes[0].midi),original);
}
for(const [id,shift] of [['trombone',-14],['eufonio',-14],['tuba',-26],['tubamib',-21]]){
 await page.selectOption('#practice-instrument-select',id);await page.selectOption('#practice-notation','alternate');
 assert.equal(await page.evaluate(()=>window.PracticeBridge.plan({from:1,to:1,bpm:60}).notes[0].midi),original+shift);
 assert.equal(await page.evaluate(()=>window.PracticeBridge.current().transpose),shift);
}
await page.selectOption('#practice-instrument-select','tubado');
assert.equal(await page.locator('#practice-notation').inputValue(),'written');
assert.equal(await page.evaluate(()=>window.PracticeBridge.current().transpose),0);
assert.equal(await page.locator('#practice-instrument-select option').count(),34);
await page.locator('#practice-close').click();await page.waitForTimeout(250);await page.evaluate(()=>window.PracticeBridge.mark({ev:0,measure:0}));assert(await page.locator('#score [data-ev="0"]').evaluate(e=>e.classList.contains('is-playing')));await page.evaluate(()=>window.PracticeBridge.mark(null));
assert.deepEqual(errors,[]);console.log('Seleção de instrumentos e comparação escrita/concerto: OK');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
