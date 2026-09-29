// Uso: node scripts/bootstrap_admin.cjs PROJETO EMAIL NOME
// Usa o login local do Firebase CLI; nenhuma credencial é gravada no repositório.
process.env.DEBUG='';
const {getGlobalDefaultAccount,getAccessToken}=require('firebase-tools/lib/auth');
(async()=>{
 const [project,emailInput,name]=process.argv.slice(2),email=emailInput?.trim().toLowerCase();
 if(!project||!email||!name||!/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(email))throw Error('Informe projeto, e-mail válido e nome.');
 const account=getGlobalDefaultAccount();if(!account)throw Error('Execute npx firebase login antes.');
 const token=await getAccessToken(account.tokens.refresh_token,[]);
 const base=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
 const request=async(url,method,body)=>{const r=await fetch(url,{method,headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error?.message||'Falha no Firebase');return data;};
 const existing=await request(base+':runQuery','POST',{structuredQuery:{from:[{collectionId:'users'}],where:{fieldFilter:{field:{fieldPath:'role'},op:'EQUAL',value:{stringValue:'admin'}}},limit:1}});
 if(existing.some(r=>r.document))throw Error('Já existe um Admin. Use o painel para gerenciar acessos.');
 const stamp={timestampValue:new Date().toISOString()},str=v=>({stringValue:v});
 const fields={name:str(name),email:str(email),role:str('admin'),active:{booleanValue:true},instructorId:str(''),groupId:str(''),createdAt:stamp};
 await request(base+'/invites/'+encodeURIComponent(email)+'?currentDocument.exists=false','PATCH',{fields:{profile:{mapValue:{fields}},role:str('admin'),instructorId:str(''),createdBy:str('bootstrap'),createdAt:stamp,consumedBy:str('')}});
 console.log('Convite inicial de Admin criado. Ative a conta pelo site e confirme o e-mail.');
})().catch(e=>{console.error(e.message);process.exit(1)});
