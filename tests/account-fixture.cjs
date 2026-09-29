// Fixture apenas para regressão musical; as permissões reais são testadas no emulador.
module.exports = async function accountFixture(page) {
  await page.route('**/firebase-config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.PV_FIREBASE_CONFIG = {projectId:"test-only"};'}));
  await page.route('**/firebase-client.js',r=>r.fulfill({contentType:'application/javascript',body:`
    export async function connect() {
      let callback;const user={uid:'test',email:'test@example.com',emailVerified:true};
      const profile={...user,name:'Teste',role:'admin',active:true};
      return {onSession(cb){callback=cb;queueMicrotask(()=>cb(sessionStorage.getItem('pv:test-session')?user:null));},
        async login(){sessionStorage.setItem('pv:test-session','1');await callback(user);},async logout(){sessionStorage.removeItem('pv:test-session');callback(null);},
        async activateProfile(){return profile;},watchProfile(){},
        async listAttempts(){return JSON.parse(localStorage.getItem('pv:test-attempts')||'[]');},
        async saveAttempt(uid,attempt){const list=JSON.parse(localStorage.getItem('pv:test-attempts')||'[]');localStorage.setItem('pv:test-attempts',JSON.stringify([attempt,...list]));}
      };
    }`}));
};
