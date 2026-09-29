import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut, setPersistence, browserSessionPersistence, connectAuthEmulator} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, limit, orderBy, serverTimestamp, runTransaction, onSnapshot, connectFirestoreEmulator} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
export async function connect(config) {
  const app=initializeApp(config), auth=getAuth(app), db=getFirestore(app);
  if (['localhost','127.0.0.1'].includes(location.hostname) && window.PV_FIREBASE_EMULATORS) {
    connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true}); connectFirestoreEmulator(db,'127.0.0.1',8080);
  }
  await setPersistence(auth,browserSessionPersistence);
  let unsubscribeProfile, sessionCallback;
  const readList = async q => (await getDocs(q)).docs.map(d=>({id:d.id,...d.data()}));
  const api={
    onSession(callback) { sessionCallback=callback; return onAuthStateChanged(auth,u=>{unsubscribeProfile?.();callback(u);}); },
    async login(email,password) {
      const previousUid=auth.currentUser?.uid;
      const result=await signInWithEmailAndPassword(auth,email,password);
      // onAuthStateChanged não dispara quando o UID continua igual após confirmar o e-mail.
      if(previousUid===result.user.uid){unsubscribeProfile?.();await sessionCallback?.(result.user);}
      return result;
    },
    async register(email,password) { const result=await createUserWithEmailAndPassword(auth,email,password);await sendEmailVerification(result.user); },
    resetPassword:email=>sendPasswordResetEmail(auth,email),
    resendVerification:()=>sendEmailVerification(auth.currentUser),
    logout:()=>signOut(auth),
    async activateProfile(user) {
      const ref=doc(db,'users',user.uid), existing=await getDoc(ref);
      if(existing.exists()) return {uid:user.uid,...existing.data()};
      const invitation=doc(db,'invites',user.email.toLowerCase());
      await runTransaction(db,async tx=>{
        const own=await tx.get(ref); if(own.exists()) return;
        const invite=await tx.get(invitation);
        if(!invite.exists()||invite.data().consumedBy) throw Error('Não há um convite disponível para este e-mail. Fale com o responsável.');
        tx.set(ref,invite.data().profile);tx.update(invitation,{consumedBy:user.uid});
      });
      return {uid:user.uid,...(await getDoc(ref)).data()};
    },
    watchProfile(uid,callback) { unsubscribeProfile?.();unsubscribeProfile=onSnapshot(doc(db,'users',uid),s=>callback(s.exists()?{uid,...s.data()}:null),()=>callback(null)); },
    async users(actor) { const q=actor.role==='instrutor'?query(collection(db,'users'),where('role','==','aluno'),where('instructorId','==',actor.uid)):collection(db,'users');return (await readList(q)).map(u=>({...u,uid:u.id})); },
    groups(actor) { return readList(actor.role==='instrutor'?query(collection(db,'groups'),where('instructorId','==',actor.uid)):collection(db,'groups')); },
    invites(actor) { return readList(actor.role==='instrutor'?query(collection(db,'invites'),where('role','==','aluno'),where('instructorId','==',actor.uid)):collection(db,'invites')); },
    async invite(actor,data) {
      const email=data.email.trim().toLowerCase();
      const profile={name:data.name.trim(),email,role:data.role,active:true,instructorId:data.instructorId||'',groupId:data.groupId||'',createdAt:serverTimestamp()};
      // Transação evita sobrescrever um convite já existente/consumido.
      await runTransaction(db,async tx=>{const ref=doc(db,'invites',email),s=await tx.get(ref);if(s.exists())throw Error('Já existe um convite para este e-mail.');tx.set(ref,{profile,role:profile.role,instructorId:profile.instructorId,createdBy:actor.uid,createdAt:serverTimestamp(),consumedBy:''});});
    },
    cancelInvite:email=>deleteDoc(doc(db,'invites',email)),
    updateUser:(uid,data)=>updateDoc(doc(db,'users',uid),data),
    async createGroup(name,instructorId) { const ref=doc(collection(db,'groups'));await setDoc(ref,{name:name.trim(),instructorId,createdAt:serverTimestamp()});return ref.id; },
    async listAttempts(uid) { const rows=await readList(query(collection(db,'users',uid,'attempts'),orderBy('createdAt','desc'),limit(50)));return rows.flatMap(row=>{try{const a=JSON.parse(row.payload);return a?.version===1&&typeof a.title==='string'&&a.result&&Array.isArray(a.result.rows)?[a]:[];}catch(_){return [];}}); },
    async saveAttempt(uid,attempt) { const payload=JSON.stringify(attempt);if(new TextEncoder().encode(payload).length>200000)throw Error('Relatório muito grande para salvar.');await setDoc(doc(db,'users',uid,'attempts',attempt.id),{createdAt:serverTimestamp(),payload}); },
    feedback:uid=>readList(query(collection(db,'users',uid,'feedback'),orderBy('createdAt','desc'),limit(30))),
    addFeedback:(uid,actor,text)=>setDoc(doc(collection(db,'users',uid,'feedback')),{authorId:actor.uid,authorName:actor.name,text:text.trim(),createdAt:serverTimestamp()})
  };
  return api;
}
