# Contas e acompanhamento no Firebase (Spark)

A hospedagem continua na AWS. Authentication (e-mail/senha) e Cloud Firestore armazenam identidades, perfis, grupos, resultados e orientações. Não há Cloud Functions nem necessidade de ativar Blaze. As franquias do Spark são limitadas: ao esgotá-las, operações podem ficar indisponíveis; não há promessa de capacidade ilimitada.

## Permissões

| Perfil | Pessoas e grupos | Acompanhamento |
| --- | --- | --- |
| Admin | Convida todos os perfis, remove/restaura acessos e vincula alunos | Todos |
| Encarregado | Convida e gerencia instrutores/alunos; não administra Admins ou outros Encarregados | Todos |
| Instrutor | Convida alunos para sua responsabilidade, cria seus grupos e vincula seus alunos | Somente seus alunos |
| Aluno | Sem gestão de pessoas ou de conteúdo compartilhado | Próprio histórico e orientações; uso das ferramentas musicais |

O editor de partituras e as escalas são ferramentas de estudo local. Editá-los não altera a biblioteca compartilhada. As regras do Firestore, e não os botões da interface, fazem cumprir a hierarquia. Nenhum usuário pode promover o próprio papel. Mudanças de perfil entre papéis não são oferecidas nesta versão.

## Configuração

1. Criar um projeto no Firebase no plano Spark, sem ativar faturamento.
2. Ativar Authentication → E-mail/senha. Incluir `d2g22phna0rmtp.cloudfront.net` nos domínios autorizados.
3. Criar Cloud Firestore **Standard**, banco `(default)`; escolher a região antes de gravar dados (a localização não é alterável).
4. Registrar um aplicativo Web e preencher `site/firebase-config.js` com a configuração pública. Ela não é uma chave privada. Não colocar credenciais Admin SDK no site.
5. Instalar dependências com `npm ci`, autenticar com `npx firebase login`, publicar regras e índices com `npx firebase deploy --only firestore --project partitura-viva`.
6. Criar o primeiro convite Admin com `node scripts/bootstrap_admin.cjs partitura-viva EMAIL "Nome"` (login Firebase CLI autorizado), ou pelo console. Documento `invites/EMAIL_EM_MINUSCULAS`, campos `role: admin`, `instructorId: ''`, `createdBy: bootstrap`, `createdAt: timestamp`, `consumedBy: ''`, `profile: {name, email, role: admin, active: true, instructorId: '', groupId: '', createdAt: timestamp}`.
7. Publicar os arquivos do site somente depois das regras e da configuração. Sem configuração válida, o novo login permanece fechado; não existe senha demo ou fallback.
8. O Admin escolhe “Recebi um convite”, define a senha, confirma seu e-mail e entra. As outras pessoas seguem o mesmo fluxo após serem convidadas pelo painel.

O cadastro cria a identidade; somente um convite válido com e-mail confirmado libera o perfil e o acesso aos dados. Contas sem convite não recebem permissões. O convite é consumido atomicamente e não pode ser reutilizado. Convites não enviam e-mail automaticamente: compartilhe o endereço do site com a pessoa. O Firebase envia confirmação de endereço e recuperação de senha.

## Exclusão e privacidade

“Remover acesso” desativa o perfil imediatamente nas regras e preserva o histórico; pode ser revertido pelo responsável autorizado. Não apaga a identidade no Authentication nem os dados históricos. Exclusão definitiva exige o console: remover a identidade e os documentos/subcoleções correspondentes. Não delete só o perfil e deixe um convite reutilizável. Remover um instrutor não remove seus alunos: Admin/Encarregado deve transferi-los para outro responsável.

O áudio continua no aparelho. Salvamos somente relatório e contexto da tentativa. As últimas 50 tentativas são exibidas; registros mais antigos continuam no banco. Resultados são enviados pelo cliente, portanto não são provas invioláveis de desempenho. O histórico demo local não é importado automaticamente, pois não é possível atribuí-lo com segurança a um aluno.

A sessão fica por aba. Nenhum resultado de aluno usa `localStorage`; acesso desativado ou logout fecha as telas privadas e interrompe a captura. Arquivos estáticos de lições continuam públicos na AWS; a proteção cobre os dados privados no Firebase.

## Testes

- `npm test`: testes de música.
- `npm run test:rules`: emulador Firestore, isolamento e hierarquia.
- `PLAYWRIGHT_PATH=/caminho/playwright npm run test:accounts`: login, perfis e acompanhamento completos no navegador com emuladores Authentication/Firestore.
- Testes musicais Playwright usam uma fixture de contas exclusivamente dentro dos testes; não existe bypass correspondente no site.
- O emulador de autenticação só pode ser selecionado na configuração de teste e em `localhost`/`127.0.0.1`.

Referências: [Firebase Authentication](https://firebase.google.com/docs/auth/web/start), [regras com autenticação](https://firebase.google.com/docs/rules/basics), [plano Spark](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).
