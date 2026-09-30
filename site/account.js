/* Login real, sem credenciais fixas e sem fallback para o modo demo. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let api = null, profile = null, mode = 'login', session = 0;
  let readyResolve;
  window.PVAccount = {
    ready:new Promise(resolve => { readyResolve = resolve; }),
    get profile() { return profile; }, get api() { return api; },
    async listAttempts(uid) { if (!api || !profile) throw Error('Entre na sua conta.'); return api.listAttempts(uid || profile.uid); },
    async saveAttempt(attempt) { if (!api || !profile) throw Error('Entre na sua conta.'); return api.saveAttempt(profile.uid, attempt); }
  };
  function notice(text) { $('login-error').textContent = text; $('login-error').hidden = !text; }
  function show(p) {
    profile = p; $('login-screen').hidden = !!p; $('study-app').hidden = !p;
    $('account-label').textContent = p ? `${p.name} · ${window.PV_ROLE_LABELS[p.role]}` : '';
    $('manage-open').hidden = !p;
    if (!p) {
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
      $('stop')?.click(); $('tuner-stop')?.click();
    }
    window.dispatchEvent(new CustomEvent('pv-account-changed', {detail:p}));
    window.dispatchEvent(new Event('resize'));
  }
  window.PV_ROLE_LABELS = {admin:'Admin',encarregado:'Encarregado',instrutor:'Instrutor',aluno:'Aluno'};
  function friendly(e) {
    const code = e?.code || '';
    if (/invalid-credential|wrong-password|user-not-found/.test(code)) return 'E-mail ou senha incorretos.';
    if (/email-already-in-use/.test(code)) return 'Este e-mail já tem conta. Entre ou use “Esqueci minha senha”.';
    if (/weak-password/.test(code)) return 'Use uma senha com pelo menos 8 caracteres.';
    if (/too-many-requests/.test(code)) return 'Muitas tentativas. Aguarde alguns minutos.';
    if (/network-request-failed|unavailable/.test(code)) return 'Não foi possível conectar. Confira sua internet.';
    return code ? 'Não foi possível concluir. Confira o acesso e tente novamente.' : e.message;
  }
  $('login-form').addEventListener('submit', async event => {
    event.preventDefault(); if (!api) return;
    const button = $('login-submit'); button.disabled = true; notice('');
    try {
      const email = $('login-user').value.trim().toLowerCase(), password = $('login-password').value;
      if (mode === 'activate') {
        if (password.length < 8) throw Error('Use uma senha com pelo menos 8 caracteres.');
        await api.register(email,password);
        setMode('login');
        notice('Conta criada. Confirme seu e-mail pelo link recebido e depois entre para ativar seu convite.');
      } else await api.login(email,password);
      $('login-password').value = '';
    } catch (e) { notice(friendly(e)); }
    finally { button.disabled = false; }
  });
  function setMode(value) {
    mode = value;
    $('login-submit').textContent = mode === 'login' ? 'Entrar' : 'Criar minha senha';
    $('login-mode').textContent = mode === 'login' ? 'Recebi um convite · Ativar conta' : 'Já tenho conta · Entrar';
    $('login-password').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    $('login-password').minLength = mode === 'login' ? 1 : 8;
  }
  $('login-mode').addEventListener('click', () => {
    setMode(mode === 'login' ? 'activate' : 'login');
    notice(mode === 'activate' ? 'Use o e-mail informado no convite. O acesso será liberado depois da confirmação do e-mail.' : '');
  });
  $('login-reset').addEventListener('click', async () => {
    if (!api) return;
    if (!$('login-user').checkValidity() || !$('login-user').value) { notice('Preencha seu e-mail para recuperar a senha.'); return; }
    try { await api.resetPassword($('login-user').value.trim().toLowerCase()); notice('Se a conta existir, você receberá um e-mail para redefinir a senha.'); }
    catch (e) { notice(friendly(e)); }
  });
  $('login-resend').addEventListener('click', async () => {
    try { await api.resendVerification(); notice('E-mail de confirmação enviado. Confira também o spam.'); }
    catch (e) { notice(friendly(e)); }
  });
  $('logout').addEventListener('click', async () => { show(null); await api?.logout(); });
  async function init() {
    $('login-submit').disabled = true; show(null);
    if (!window.PV_FIREBASE_CONFIG) {
      notice('O acesso está sendo preparado. A configuração do Firebase ainda precisa ser concluída.'); readyResolve(); return;
    }
    try {
      api = await (await import('./firebase-client.js')).connect(window.PV_FIREBASE_CONFIG);
      api.onSession(async user => {
        const request = ++session; show(null); $('login-resend').hidden = true;
        if (!user) return;
        try {
          const p = await api.activateProfile(user);
          if (request !== session) return;
          if (!user.emailVerified && p?.accessMode !== 'admin-test') { $('login-resend').hidden = false; notice('Confirme seu e-mail e entre novamente para continuar.'); return; }
          if (!p?.active) { notice('Seu acesso ainda não foi liberado ou foi desativado. Fale com o responsável.'); return; }
          notice(''); show(p);
          api.watchProfile(user.uid, next => { if (request === session) { if (next?.active) show(next); else { show(null); notice('Seu acesso foi desativado. Fale com o responsável.'); } } });
        } catch (e) { if (request === session) {
          if (!user.emailVerified && e.code === 'permission-denied') { $('login-resend').hidden = false; notice('Confirme seu e-mail e entre novamente para continuar.'); }
          else notice(friendly(e));
        } }
      });
      $('login-submit').disabled = false;
    } catch (_) { notice('Não foi possível carregar o acesso. Confira a conexão e recarregue a página.'); }
    readyResolve();
  }
  init();
})();
