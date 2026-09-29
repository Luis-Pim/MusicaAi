(function () {
  'use strict';
  const account=window.PVAccount, policy=window.PVAccess, labels=window.PV_ROLE_LABELS;
  const dialog=document.createElement('dialog');dialog.id='management-dialog';dialog.className='practice management';dialog.setAttribute('aria-labelledby','management-title');
  dialog.innerHTML=`<header><div><span class="step">Partitura Viva</span><h2 id="management-title">Pessoas e acompanhamento</h2></div><button class="btn" id="management-close" type="button">Fechar</button></header>
  <p id="management-status" role="status" aria-live="polite"></p>
  <div id="management-staff" hidden>
    <div class="management-cards" id="management-counts"></div>
    <details><summary>Convidar uma pessoa</summary><form id="management-invite" class="management-form">
      <label>Nome<input name="name" required maxlength="100" autocomplete="name"></label>
      <label>E-mail<input name="email" type="email" required maxlength="254" autocomplete="email"></label>
      <label>Perfil<select name="role" id="management-role"></select></label>
      <label id="management-instructor-wrap">Instrutor<select name="instructorId" id="management-instructor"></select></label>
      <label id="management-group-wrap">Grupo<select name="groupId" id="management-group"></select></label>
      <button class="btn primary" type="submit">Criar convite</button>
      <p class="hint">Depois de criar, compartilhe o endereço do site. A pessoa escolhe “Recebi um convite”, usa este e-mail e confirma o endereço para entrar. Nenhuma senha é compartilhada.</p>
    </form></details>
    <details><summary>Criar grupo de alunos</summary><form id="management-group-form" class="management-form"><label>Nome do grupo<input name="name" required maxlength="100"></label><label>Instrutor responsável<select name="instructorId" id="management-group-instructor" required></select></label><button class="btn primary" type="submit">Criar grupo</button></form></details>
    <h3>Grupos</h3><ul id="management-groups" class="management-list"></ul>
    <h3>Pessoas</h3><label>Buscar por nome ou e-mail<input id="management-search" type="search" placeholder="Buscar pessoa"></label><div id="management-users" class="management-list"></div>
    <h3>Convites pendentes</h3><ul id="management-invites" class="management-list"></ul>
  </div>
  <section id="management-progress" hidden><button class="btn" id="management-back" type="button">← Voltar para pessoas</button><h3 id="management-student"></h3><p id="management-progress-hint" class="hint">Resultados aproximados, enviados pelo aparelho do aluno. Compare a mesma lição, instrumento e andamento; não são uma certificação de desempenho.</p><div id="management-attempts"></div>
    <h3>Orientações do instrutor</h3><form id="management-feedback-form"><label>Nova orientação<textarea name="text" required maxlength="2000" rows="3"></textarea></label><button class="btn primary" type="submit">Salvar orientação</button></form><ol id="management-feedback"></ol>
  </section>`;
  document.body.append(dialog);
  const $=id=>document.getElementById('management-'+id);
  let users=[],groups=[],invites=[],selected=null,revision=0;
  const text=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el;};
  function message(value){$('status').textContent=value;}
  function action(label,fn){const b=text('button',label);b.type='button';b.className='btn small';b.addEventListener('click',()=>run(b,fn));return b;}
  async function run(button,fn){button.disabled=true;message('');try{await fn();}catch(e){message(e.code?'Não foi possível concluir. Confira suas permissões e a conexão.':e.message);}finally{button.disabled=false;}}
  function options(select,list,empty){select.replaceChildren();if(empty!==undefined){const o=text('option',empty);o.value='';select.append(o);}list.forEach(([value,label])=>{const o=text('option',label);o.value=value;select.append(o);});}
  function instructors(){return account.profile.role==='instrutor'?[account.profile]:users.filter(u=>u.role==='instrutor'&&u.active);}
  function refreshGroups(){const role=$('role').value,teacher=$('instructor').value;$('instructor-wrap').hidden=$('group-wrap').hidden=role!=='aluno';options($('group'),groups.filter(g=>g.instructorId===teacher).map(g=>[g.id,g.name]),'Sem grupo');}
  async function refresh(){
    const version=++revision,p=account.profile;if(!p)return;
    $('title').textContent=p.role==='aluno'?'Minha evolução':'Pessoas e acompanhamento';
    $('staff').hidden=p.role==='aluno';$('progress').hidden=true;
    if(p.role==='aluno'){await progress(p);return;}
    const result=await Promise.all([account.api.users(p),account.api.groups(p),account.api.invites(p)]);
    if(version!==revision)return;
    [users,groups,invites]=result;
    options($('role'),policy.roles.filter(r=>policy.canCreate(p,r)).map(r=>[r,labels[r]]));
    const list=instructors().map(u=>[u.uid,u.name]);options($('instructor'),list,p.role==='instrutor'?undefined:'Sem instrutor');options($('group-instructor'),list);refreshGroups();
    $('counts').replaceChildren(...[['Alunos',users.filter(u=>u.role==='aluno'&&u.active).length],['Grupos',groups.length],['Convites',invites.filter(i=>!i.consumedBy).length]].map(([label,n])=>{const el=document.createElement('div');el.append(text('strong',n),text('span',label));return el;}));
    $('groups').replaceChildren(...groups.map(g=>text('li',`${g.name} · ${instructors().find(u=>u.uid===g.instructorId)?.name||'Instrutor indisponível'}`)));
    renderUsers();$('invites').replaceChildren();
    invites.filter(i=>!i.consumedBy).forEach(i=>{const li=text('li',`${i.profile.name} · ${i.id} · ${labels[i.role]}`);if(policy.manages(p,i))li.append(action('Cancelar convite',async()=>{await account.api.cancelInvite(i.id);await refresh();message('Convite cancelado.');}));$('invites').append(li);});
    if(!$('invites').children.length)$('invites').append(text('li','Nenhum convite pendente.'));
  }
  function renderUsers(){
    const p=account.profile,term=$('search').value.toLocaleLowerCase();$('users').replaceChildren();
    users.filter(u=>`${u.name} ${u.email}`.toLocaleLowerCase().includes(term)).sort((a,b)=>a.name.localeCompare(b.name)).forEach(u=>{
      const card=document.createElement('article');card.className='management-person';card.append(text('h4',u.name),text('p',`${labels[u.role]} · ${u.email} · ${u.active?'Ativo':'Acesso removido'}`));
      if(u.role==='aluno'){
        card.append(text('p',`Grupo: ${groups.find(g=>g.id===u.groupId)?.name||'Sem grupo'}`));
        card.append(action('Acompanhar evolução',()=>progress(u)));
      }
      if(u.uid!==p.uid&&policy.manages(p,u)){
        card.append(action(u.active?'Remover acesso':'Restaurar acesso',async()=>{
          if(u.active&&!window.confirm(`Remover o acesso de ${u.name}? O histórico será preservado e a pessoa não poderá mais usar a conta no sistema.`))return;
          await account.api.updateUser(u.uid,{active:!u.active});await refresh();message(u.active?'Acesso removido.':'Acesso restaurado.');
        }));
        if(u.role==='aluno'){
          const form=document.createElement('form');form.className='management-assignment';
          const ti=document.createElement('select'),gr=document.createElement('select');ti.setAttribute('aria-label','Instrutor de '+u.name);gr.setAttribute('aria-label','Grupo de '+u.name);
          options(ti,instructors().map(i=>[i.uid,i.name]),p.role==='instrutor'?undefined:'Sem instrutor');ti.value=u.instructorId;
          const fill=()=>options(gr,groups.filter(g=>g.instructorId===ti.value).map(g=>[g.id,g.name]),'Sem grupo');fill();gr.value=u.groupId;ti.addEventListener('change',fill);
          const save=text('button','Salvar vínculo');save.className='btn small';save.type='submit';form.append(ti,gr,save);form.addEventListener('submit',e=>{e.preventDefault();run(save,async()=>{await account.api.updateUser(u.uid,{instructorId:ti.value,groupId:gr.value});await refresh();message('Vínculo atualizado.');});});card.append(form);
        }
      }
      $('users').append(card);
    });
  }
  async function progress(student){
    const version=++revision;selected=student;
    $('staff').hidden=true;$('progress').hidden=false;$('back').hidden=account.profile.role==='aluno';$('feedback-form').hidden=account.profile.role==='aluno';$('student').textContent=student.uid===account.profile.uid?'Meu acompanhamento':`Acompanhamento · ${student.name}`;
    $('attempts').replaceChildren(text('p','Carregando avaliações…'));$('feedback').replaceChildren();
    const [attempts,feedback]=await Promise.all([account.listAttempts(student.uid),account.api.feedback(student.uid)]);
    if(version!==revision)return;
    $('attempts').replaceChildren();
    if(!attempts.length)$('attempts').append(text('p','Nenhuma avaliação registrada ainda. Use o professor virtual para começar.'));
    attempts.forEach(a=>{const d=document.createElement('details');const r=a.result;d.append(text('summary',`${new Date(a.createdAt).toLocaleString('pt-BR')} · ${a.title}`),text('p',`${a.instrument} · ${a.settings.bpm} BPM · Notas: ${r.pitchScore??'—'}${r.pitchScore==null?'':'%'} · Tempo: ${r.rhythmScore??'—'}${r.rhythmScore==null?'':'%'} · Cobertura: ${r.coverage??'—'}%`));const list=document.createElement('ul');r.rows.filter(row=>row.kind!=='good').slice(0,100).forEach(row=>list.append(text('li',`Compasso ${row.measure}: ${(row.messages||[]).join(' · ')}`)));d.append(list);$('attempts').append(d);});
    feedback.forEach(f=>$('feedback').append(text('li',`${f.authorName} · ${f.createdAt?.toDate().toLocaleString('pt-BR')||''}: ${f.text}`)));
    if(!feedback.length)$('feedback').append(text('li','Nenhuma orientação registrada.'));
  }
  $('invite').addEventListener('submit',e=>{e.preventDefault();const form=e.currentTarget;run(form.querySelector('button'),async()=>{const data=Object.fromEntries(new FormData(form));if(data.role!=='aluno'){data.instructorId='';data.groupId='';}await account.api.invite(account.profile,data);form.reset();await refresh();message('Convite criado. Compartilhe o endereço do site e peça à pessoa para ativar a conta com o e-mail cadastrado.');});});
  $('group-form').addEventListener('submit',e=>{e.preventDefault();const form=e.currentTarget;run(form.querySelector('button'),async()=>{const data=Object.fromEntries(new FormData(form));await account.api.createGroup(data.name,data.instructorId);form.reset();await refresh();message('Grupo criado. Você já pode vincular alunos.');});});
  $('feedback-form').addEventListener('submit',e=>{e.preventDefault();const form=e.currentTarget;run(form.querySelector('button'),async()=>{await account.api.addFeedback(selected.uid,account.profile,new FormData(form).get('text'));form.reset();await progress(selected);message('Orientação salva.');});});
  $('role').addEventListener('change',refreshGroups);$('instructor').addEventListener('change',refreshGroups);$('search').addEventListener('input',renderUsers);
  $('back').addEventListener('click',()=>run($('back'),refresh));$('close').addEventListener('click',()=>dialog.close());
  document.getElementById('manage-open').addEventListener('click',()=>{dialog.showModal();run(document.getElementById('manage-open'),refresh);});
  window.addEventListener('pv-account-changed',()=>{revision++;dialog.close();users=[];groups=[];invites=[];selected=null;$('users').replaceChildren();$('attempts').replaceChildren();$('feedback').replaceChildren();document.getElementById('manage-open').textContent=account.profile?.role==='aluno'?'Meu acompanhamento':'Pessoas e grupos';});
})();
