const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {doc,setDoc,Timestamp}=require('firebase/firestore');
const project='demo-partitura-viva';
async function authRequest(method,body){const r=await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/${method}?key=fake-key`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(JSON.stringify(data));return data;}
(async()=>{
 const env=await initializeTestEnvironment({projectId:project,firestore:{rules:fs.readFileSync('firestore.rules','utf8')}});
 await env.clearFirestore();
 const ids={};for(const role of ['admin','encarregado','instrutor','aluno','outsider']){const u=await authRequest('accounts:signUp',{email:`${role}@example.com`,password:'test-password',returnSecureToken:true});ids[role]=u.localId;await authRequest(`projects/${project}/accounts:update`,{localId:u.localId,emailVerified:true});}
 await env.withSecurityRulesDisabled(async context=>{const db=context.firestore();for(const role of ['admin','encarregado','instrutor','aluno'])await setDoc(doc(db,'users',ids[role]),{name:role,email:`${role}@example.com`,role,active:true,instructorId:role==='aluno'?ids.instrutor:'',groupId:'',createdAt:Timestamp.now()});});
 const server=require('node:http').createServer((req,res)=>{const url=new URL(req.url,'http://localhost');const file=path.join(__dirname,'../site',url.pathname==='/'?'index.html':url.pathname);const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).on('error',()=>{res.statusCode=404;res.end();}).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/firebase-config.js',r=>r.fulfill({contentType:'application/javascript',body:`window.PV_FIREBASE_CONFIG={apiKey:'fake-key',authDomain:'${project}.firebaseapp.com',projectId:'${project}'};window.PV_FIREBASE_EMULATORS=true;`}));
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
 async function login(role){await page.locator('#login-user').fill(`${role}@example.com`);await page.locator('#login-password').fill('test-password');await page.locator('#login-submit').click();try{await page.waitForFunction(()=>!!window.PVAccount?.profile);}catch(e){console.log('Falha no login',role,await page.locator('#login-error').textContent(),errors);throw e;}}
 async function logout(){await page.locator('#management-close').click();await page.locator('#logout').click();await page.waitForFunction(()=>!window.PVAccount.profile);}
 await login('admin');await page.locator('#manage-open').click();await page.waitForFunction(()=>document.querySelectorAll('#management-role option').length===4);
 assert.equal(await page.locator('#management-users .management-person').count(),4);
 await logout();await login('encarregado');await page.locator('#manage-open').click();await page.waitForFunction(()=>document.querySelectorAll('#management-role option').length===2);assert.deepEqual(await page.locator('#management-role option').evaluateAll(es=>es.map(e=>e.value)),['instrutor','aluno']);
 await logout();await login('instrutor');await page.locator('#manage-open').click();await page.waitForFunction(()=>document.querySelectorAll('#management-role option').length===1);assert.equal(await page.locator('#management-users .management-person').count(),1);
 await page.locator('details').filter({has:page.locator('#management-group-form')}).locator('summary').click();
 await page.locator('#management-group-form input').fill('Sax iniciantes');await page.locator('#management-group-form button').click();await page.waitForFunction(()=>document.querySelector('#management-status').textContent.includes('Grupo criado'));
 await page.locator('details').filter({has:page.locator('#management-invite')}).locator('summary').click();await page.locator('#management-invite [name="name"]').fill('Novo aluno');await page.locator('#management-invite [name="email"]').fill('convidado@example.com');await page.locator('#management-invite button').click();await page.waitForFunction(()=>document.querySelector('#management-status').textContent.includes('Convite criado'));
 await page.getByRole('button',{name:'Acompanhar evolução'}).click();await page.locator('#management-feedback-form textarea').fill('Praticar Dó maior a 60 BPM.');await page.locator('#management-feedback-form button').click();await page.waitForFunction(()=>document.querySelector('#management-status').textContent.includes('Orientação salva'));
 await logout();await login('aluno');await page.locator('#manage-open').click();await page.waitForFunction(()=>document.querySelector('#management-feedback').textContent.includes('Praticar Dó maior'));
 assert(await page.locator('#management-staff').isHidden());assert(await page.locator('#management-feedback-form').isHidden());
 await page.evaluate(async()=>{await PVAccount.saveAttempt({id:'browser-one',version:1,createdAt:new Date().toISOString(),title:'Escala de Dó',instrument:'Clarinete',settings:{bpm:60},result:{rows:[],pitchScore:95,rhythmScore:90,coverage:100}})});
 await page.locator('#management-close').click();await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.PVAccount?.profile);await page.locator('#manage-open').click();await page.waitForFunction(()=>document.querySelector('#management-attempts').textContent.includes('Escala de Dó'));
 await page.screenshot({path:'/tmp/pv-aluno-mobile.png'});
 await logout();await login('instrutor');await page.locator('#manage-open').click();await page.getByRole('button',{name:'Acompanhar evolução'}).click();await page.waitForFunction(()=>document.querySelector('#management-attempts').textContent.includes('95%'));
 await page.locator('#management-back').click();await page.waitForFunction(()=>!document.querySelector('#management-staff').hidden);
 for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:844});assert(await page.locator('#management-dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1));}
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Remover acesso'}).click();await page.waitForFunction(()=>document.querySelector('#management-status').textContent==='Acesso removido.');
 await logout();await page.locator('#login-user').fill('aluno@example.com');await page.locator('#login-password').fill('test-password');await page.locator('#login-submit').click();await page.waitForFunction(()=>document.querySelector('#login-error').textContent.includes('desativado'));assert(await page.locator('#study-app').isHidden());
 await page.evaluate(()=>PVAccount.api.logout());
 await page.locator('#login-mode').click();await page.locator('#login-user').fill('convidado@example.com');await page.locator('#login-password').fill('new-password');await page.locator('#login-submit').click();
 await page.waitForFunction(()=>document.querySelector('#login-error').textContent.includes('Conta criada'));
 const records=await authRequest(`projects/${project}/accounts:lookup`,{email:['convidado@example.com']});
 const invited=records.users.find(u=>u.email==='convidado@example.com');assert(invited);
 assert(await page.locator('#study-app').isHidden());
 await authRequest(`projects/${project}/accounts:update`,{localId:invited.localId,emailVerified:true});
 // A mesma aba mantém a sessão criada no cadastro: não fazer logout antes de entrar.
 assert.equal(await page.locator('#login-submit').textContent(),'Entrar');
 await page.locator('#login-password').fill('new-password');await page.locator('#login-submit').click();await page.waitForFunction(()=>PVAccount.profile?.name==='Novo aluno');
 assert.equal(await page.evaluate(()=>PVAccount.profile.role),'aluno');
 assert.deepEqual(errors,[]);console.log('Login real no emulador: quatro perfis, grupos, convites, orientação, histórico persistente, isolamento e remoção de acesso OK');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));await env.cleanup();}
})().catch(e=>{console.error(e);process.exit(1)});
