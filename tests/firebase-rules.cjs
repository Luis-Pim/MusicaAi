const {test,before,after}=require('node:test');
const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,getDocs,updateDoc,deleteDoc,collection,query,where,writeBatch,Timestamp,serverTimestamp}=require('firebase/firestore');
let env;const now=Timestamp.now();
const profile=(role,extra={})=>({name:role,email:role+'@example.com',role,active:true,instructorId:'',groupId:'',createdAt:now,...extra});
const db=(uid,email=uid+'@example.com',verified=true)=>env.authenticatedContext(uid,{email,email_verified:verified}).firestore();
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-partitura-viva',firestore:{rules:fs.readFileSync('firestore.rules','utf8')}});await env.withSecurityRulesDisabled(async c=>{const d=c.firestore();for(const [uid,data] of Object.entries({admin:profile('admin'),encarregado:profile('encarregado'),t1:profile('instrutor'),t2:profile('instrutor'),s1:profile('aluno',{instructorId:'t1',groupId:'g1'}),s2:profile('aluno',{instructorId:'t2',groupId:'g2'}),disabled:profile('instrutor',{active:false})}))await setDoc(doc(d,'users',uid),data);await setDoc(doc(d,'groups','g1'),{name:'Grupo 1',instructorId:'t1',createdAt:now});await setDoc(doc(d,'groups','g2'),{name:'Grupo 2',instructorId:'t2',createdAt:now});});});
after(async()=>{await env?.cleanup();});
test('Sem autenticação/e-mail confirmado não há acesso aos dados',async()=>{await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'users','s1')));await assertFails(getDoc(doc(db('s1','s1@example.com',false),'users','s1')));});
test('Aluno lê apenas seu perfil; não promove nem altera grupo',async()=>{const d=db('s1');await assertSucceeds(getDoc(doc(d,'users','s1')));await assertFails(getDoc(doc(d,'users','s2')));await assertFails(updateDoc(doc(d,'users','s1'),{role:'admin'}));await assertFails(updateDoc(doc(d,'users','s1'),{instructorId:'t2'}));});
test('Instrutor consulta somente alunos vinculados',async()=>{const d=db('t1');await assertSucceeds(getDoc(doc(d,'users','s1')));await assertFails(getDoc(doc(d,'users','s2')));await assertFails(getDocs(collection(d,'users')));await assertSucceeds(getDocs(query(collection(d,'users'),where('role','==','aluno'),where('instructorId','==','t1'))));await assertFails(getDoc(doc(db('disabled'),'users','s1')));});
test('Encarregado não altera Admin/Encarregado nem promove aluno',async()=>{const d=db('encarregado');await assertFails(updateDoc(doc(d,'users','admin'),{active:false}));await assertFails(updateDoc(doc(d,'users','encarregado'),{active:false}));await assertFails(updateDoc(doc(d,'users','s1'),{role:'encarregado',instructorId:'',groupId:''}));await assertSucceeds(updateDoc(doc(d,'users','s1'),{name:'Aluno revisado'}));});
test('Somente Admin pode remover acesso de encarregado; não remove o próprio',async()=>{const d=db('admin');await assertSucceeds(updateDoc(doc(d,'users','encarregado'),{active:false}));await assertSucceeds(updateDoc(doc(d,'users','encarregado'),{active:true}));await assertFails(updateDoc(doc(d,'users','admin'),{active:false}));});
test('Grupo/vínculo exige instrutor correto e ativo',async()=>{const d=db('t1');await assertFails(updateDoc(doc(d,'users','s1'),{groupId:'g2'}));await assertFails(updateDoc(doc(d,'users','s1'),{instructorId:'t2',groupId:'g2'}));await assertSucceeds(updateDoc(doc(d,'users','s1'),{groupId:''}));await assertSucceeds(updateDoc(doc(d,'users','s1'),{groupId:'g1'}));await assertSucceeds(setDoc(doc(d,'groups','new'),{name:'Novo',instructorId:'t1',createdAt:serverTimestamp()}));await assertFails(setDoc(doc(d,'groups','stolen'),{name:'Outro',instructorId:'t2',createdAt:serverTimestamp()}));});
function invite(role,email,instructorId='',groupId='',creator='admin'){return {profile:profile(role,{email,instructorId,groupId,createdAt:serverTimestamp()}),role,instructorId,createdBy:creator,createdAt:serverTimestamp(),consumedBy:''};}
test('Convites respeitam hierarquia e não permitem adulterar papel interno',async()=>{await assertSucceeds(setDoc(doc(db('admin'),'invites','newmanager@example.com'),invite('encarregado','newmanager@example.com')));await assertFails(setDoc(doc(db('encarregado'),'invites','badmanager@example.com'),invite('encarregado','badmanager@example.com','','','encarregado')));await assertSucceeds(setDoc(doc(db('t1'),'invites','newstudent@example.com'),invite('aluno','newstudent@example.com','t1','g1','t1')));const malicious=invite('aluno','evil@example.com','t1','g1','t1');malicious.profile.role='admin';malicious.profile.instructorId='';malicious.profile.groupId='';await assertFails(setDoc(doc(db('t1'),'invites','evil@example.com'),malicious));await assertFails(setDoc(doc(db('s1'),'invites','other@example.com'),invite('aluno','other@example.com','','','s1')));});
test('Convite exige e-mail confirmado e consumo atômico; não pode ser reutilizado',async()=>{const email='newstudent@example.com',d=db('newstudent',email),ir=doc(d,'invites',email);const invitation=(await assertSucceeds(getDoc(ir))).data();await assertFails(setDoc(doc(d,'users','newstudent'),invitation.profile));const batch=writeBatch(d);batch.set(doc(d,'users','newstudent'),invitation.profile);batch.update(ir,{consumedBy:'newstudent'});await assertSucceeds(batch.commit());const another=db('attacker',email),replay=writeBatch(another);replay.set(doc(another,'users','attacker'),invitation.profile);replay.update(doc(another,'invites',email),{consumedBy:'attacker'});await assertFails(replay.commit());});
test('Histórico só pode ser inserido pelo próprio aluno; instrutor só lê o seu grupo',async()=>{const ref=doc(db('s1'),'users','s1','attempts','one');await assertSucceeds(setDoc(ref,{createdAt:serverTimestamp(),payload:'{"version":1}'}));await assertFails(updateDoc(ref,{payload:'alterado'}));await assertSucceeds(getDoc(doc(db('t1'),'users','s1','attempts','one')));await assertFails(getDoc(doc(db('t2'),'users','s1','attempts','one')));await assertFails(setDoc(doc(db('t1'),'users','s1','attempts','forged'),{createdAt:serverTimestamp(),payload:'{}'}));});
test('Remoção de acesso bloqueia imediatamente leituras/gravações',async()=>{await assertSucceeds(updateDoc(doc(db('admin'),'users','s1'),{active:false}));await assertFails(getDoc(doc(db('s1'),'users','s1','attempts','one')));await assertFails(setDoc(doc(db('s1'),'users','s1','attempts','blocked'),{createdAt:serverTimestamp(),payload:'{}'}));await assertSucceeds(updateDoc(doc(db('admin'),'users','s1'),{active:true}));});
test('Orientações são do instrutor responsável; aluno não falsifica orientação',async()=>{const f={authorId:'t1',authorName:'instrutor',text:'Estudar devagar',createdAt:serverTimestamp()};await assertSucceeds(setDoc(doc(db('t1'),'users','s1','feedback','one'),f));await assertFails(setDoc(doc(db('t2'),'users','s1','feedback','other'),{...f,authorId:'t2'}));await assertFails(setDoc(doc(db('s1'),'users','s1','feedback','fake'),{...f,authorId:'s1'}));await assertSucceeds(getDoc(doc(db('s1'),'users','s1','feedback','one')));});

test('Admin ainda consegue bloquear aluno cujo instrutor foi desativado',async()=>{const d=db('admin');await assertSucceeds(updateDoc(doc(d,'users','t1'),{active:false}));await assertSucceeds(updateDoc(doc(d,'users','s1'),{active:false}));await assertSucceeds(updateDoc(doc(d,'users','t1'),{active:true}));await assertSucceeds(updateDoc(doc(d,'users','s1'),{active:true}));});

test('Só Admin cria perfil de teste com autoria e dados válidos',async()=>{
 const data=profile('aluno',{email:'test@example.com',createdAt:serverTimestamp(),accessMode:'admin-test',createdBy:'admin'});
 await assertSucceeds(setDoc(doc(db('admin'),'users','teststudent'),data));
 for(const actor of ['encarregado','t1','s1'])await assertFails(setDoc(doc(db(actor),'users','blocked-'+actor),{...data,createdBy:actor}));
 await assertFails(setDoc(doc(db('admin'),'users','bad-audit'),{...data,createdBy:'t1'}));
 await assertFails(setDoc(doc(db('admin'),'users','with-password'),{...data,password:'never-store-passwords'}));
 await assertFails(setDoc(doc(db('rogue','rogue@example.com',false),'users','rogue'),{...data,email:'rogue@example.com',createdBy:'rogue',role:'admin'}));
});
test('Conta de teste não verificada entra só no próprio escopo e pode ser bloqueada',async()=>{
 const d=db('teststudent','test@example.com',false);
 await assertSucceeds(getDoc(doc(d,'users','teststudent')));
 await assertSucceeds(setDoc(doc(d,'users','teststudent','attempts','one'),{createdAt:serverTimestamp(),payload:'{}'}));
 await assertFails(getDoc(doc(d,'users','s1')));
 await assertFails(updateDoc(doc(d,'users','teststudent'),{role:'admin'}));
 await assertSucceeds(updateDoc(doc(db('admin'),'users','teststudent'),{active:false}));
 await assertFails(getDoc(doc(d,'users','teststudent','attempts','one')));
});
test('Marcador de teste não pode ser adicionado/alterado nem inserido por convite',async()=>{
 await assertFails(updateDoc(doc(db('admin'),'users','s1'),{accessMode:'admin-test',createdBy:'admin'}));
 await assertFails(updateDoc(doc(db('encarregado'),'users','teststudent'),{createdBy:'encarregado'}));
 const data=invite('aluno','bypass@example.com','t1','g1','t1');data.profile.accessMode='admin-test';data.profile.createdBy='t1';
 await assertFails(setDoc(doc(db('t1'),'invites','bypass@example.com'),data));
 await assertFails(getDoc(doc(db('s1','s1@example.com',false),'users','s1')));
});
