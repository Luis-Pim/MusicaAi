# Partitura Viva

Site para estudantes de música ouvirem as lições dos seus métodos (Bona, Pozzoli, Klosé, Arban, Suzuki, métodos de flauta doce, de violão etc.).
O estudante envia a foto ou o PDF da lição, confere a partitura reconhecida e ouve no instrumento e no andamento que escolher.

## O que o site faz

| Requisito | Como está resolvido |
|---|---|
| Escolher o instrumento | 35 opções de instrumentos e afinações, com amostras reais ou timbres aproximados identificados (piano, cordas, madeiras, metais, violão, voz, marimba, acordeão e um modo de leitura rítmica). Instrumentos transpositores (clarinete e trompete em Si♭, sax em Mi♭, trompa em Fá) tocam o som real, e isso pode ser desligado. |
| Fotos e PDFs de métodos | Envio de várias fotos ou de um PDF (até 12 páginas). O estudante pode recortar só a lição desejada, girar a imagem e realçar o contraste de fotos de celular. A leitura é feita pelo Claude (visão), com instruções específicas para lições de método. |
| Mudar o andamento | Número de pulsos por minuto e a figura que recebe o pulso: "60 colcheias por minuto", "80 semínimas", "50 semínimas pontuadas" e assim por diante. O metrônomo bate na mesma figura, com contagem de um compasso antes de começar. |
| Fórmula de compasso | Reconhecida e explicada (simples ou composto, quantos tempos, qual figura vale um tempo). |
| Intensidade | Dinâmicas `ppp` a `fff`, `sfz`, `fp`, crescendo e diminuendo (grampos ou palavras). São desenhadas na partitura, listadas com explicação e **aplicadas no som**: o volume e o timbre mudam nota a nota, inclusive dentro de notas longas. |
| Outras indicações | Staccato, acento, tenuto, marcato, fermata, ligaduras de valor, quiálteras, ritornelos, `rit.`, `accel.` e `a tempo`. |

Também dá para tocar só um trecho (compasso X a Y), repetir em loop e tocar a partir de uma nota clicando nela.

## Como funciona

A análise musical roda no navegador; contas e acompanhamento usam Firebase Authentication e Firestore: `site/index.html`, com o afinador em `site/tuner.js` e a prática guiada em `site/practice.js`, `site/practice-core.js` e `site/practice.css`.

### Professor virtual e diário de evolução (beta)

Escolha uma lição e abra **Professor virtual · Avaliar minha execução**, abaixo da partitura. Escolha o instrumento no próprio painel, os compassos e o andamento. O catálogo inclui sax soprano em Si♭, sax barítono em Mi♭ e corne inglês em Fá, além dos instrumentos anteriores. Se a lição contém notas escritas para o instrumento, mantenha essa opção para aplicar sua transposição; use Som real para partituras em notas de concerto. A escolha também atualiza o timbre do exemplo e separa o histórico por instrumento.

Abra **Ver a partitura completa da lição** para um desenho ajustado ao painel, sem limite de altura. A partitura é redesenhada ao mudar a largura da tela; o desenho cabe inteiro na largura da tela. O botão **Ampliar partitura** permite aumentar a leitura e deslizar horizontalmente.

Modos disponíveis:

- **Avaliar minha execução**: solicita o microfone, conta quatro pulsos e escuta sem reproduzir a lição. Ao terminar, compara notas, entradas e duração e apresenta os pontos para conferir por compasso. A altura comparada respeita o instrumento e a opção Som real do player.
- **Toque comigo / ouvir**: toca o trecho com contagem e acompanhamento visual, sem usar o microfone ou gerar avaliação.
- **Treinar com +5 BPM**: toca o trecho repetidamente, aumentando 5 BPM por passagem até a meta. No relatório, **Preparar treino deste compasso** seleciona o compasso e reduz o andamento para 75% do anterior.
- **Diário de evolução**: guarda as tentativas no Firestore por usuário e exibe as 50 mais recentes, com data, andamento, intervalo de compassos, métricas e resultados. O histórico acompanha a conta entre aparelhos. Falhas de armazenamento são mostradas; cancelar uma execução não salva resultados parciais.

A avaliação é experimental e monofônica: não avalia acordes, dinâmica ou interpretação. Usa Lá = 440 Hz, faixa Fá♯1–Sol6, até 3 minutos e 600 notas por tentativa. Ritornelos, ligaduras e articulações usam a linha temporal do player. Eventos com menos de 180 ms são marcados como incertos; reduza o andamento. Repetições da mesma nota sem separação, ruído e latência do aparelho podem afetar o resultado. O ajuste manual de atraso compensa entradas sistematicamente atrasadas; prefira microfone local a Bluetooth.

O detector YIN é compartilhado com o afinador; a segmentação e o alinhamento por edição de sequência ficam em `practice-core.js`. A tolerância de entrada é o maior valor entre 160 ms e 22% do pulso; duração: 220 ms ou 35%; afinação: ±25 cents. Notas não detectadas ficam como incertas. As porcentagens de notas e entradas consideram apenas os pares avaliáveis; a **cobertura** mostra a fração das notas esperadas que foi avaliada. Captação insuficiente não recebe porcentagens de acerto.

O áudio não é gravado ou enviado. Fechar, cancelar, ocultar a aba ou perder o microfone interrompe a sessão. O histórico usa Firebase Authentication e Firestore com regras por perfil e vínculo de instrutor. Veja [configuração e permissões](docs/FIREBASE.md).

Validação:

```bash
node --test tests/*.test.cjs
# Chrome instalado e Playwright disponível (pode indicar o caminho do pacote):
PLAYWRIGHT_PATH=/caminho/node_modules/playwright node tests/practice-browser.cjs
PLAYWRIGHT_PATH=/caminho/node_modules/playwright node tests/practice-layout.cjs
```

Os testes cobrem áudio sintético, erros de nota/ritmo, omissões, notas extras, silêncio, histórico e ciclo de vida da captura. Os testes de navegador usam Web Audio controlado; ainda é necessária validação com instrumentos e microfones reais.

### Afinador pelo microfone

Após entrar, abra **Afinador** e toque em **Ativar microfone**. Toque uma nota por vez: o painel mostra a nota real, a frequência e o desvio em cents, indicando se é preciso subir ou descer a afinação. A faixa de tolerância é ±5 cents, com Lá de referência entre 440 e 444 Hz (padrão: 440 Hz).

O afinador trabalha na faixa de 35–1600 Hz e depende da qualidade do microfone e do ambiente; não é destinado a acordes. Em instrumentos transpositores, exibe a nota que soa, não a nota escrita. O áudio é processado localmente, sem gravação ou envio. Requer permissão de microfone e HTTPS (ou localhost). Fechar o painel, sair ou ocultar a aba desliga a captura. A reprodução da lição para ao abrir o afinador.

Validação do detector: `node --test tests/tuner.test.cjs`.

### Leitura e reprodução das lições

1. **Reconhecimento**: as imagens (ou páginas do PDF, desenhadas com pdf.js) são recortadas e enviadas ao Claude pela capacidade `sample` dos Artifacts do claude.ai. O Claude devolve um JSON com fórmula de compasso, tonalidade, clave, andamento, a lição num formato de texto simples e uma lista das indicações de expressão.
2. **Texto da lição**: a lição vira um texto editável (ex.: `!p G4/4 B4/8 A4/8 | < C5/8 D5/8 …`). Se a leitura errar, o estudante corrige ali, ou pede ao Claude para corrigir. A sintaxe está no próprio site, em "Como escrever".
3. **Partitura**: desenhada com VexFlow 4.2.5.
4. **Som**: Web Audio com amostras FluidR3_GM (licença MIT) em `site/samples/`. Se as amostras não carregarem, um sintetizador simples entra no lugar.

### Formato do texto da lição

```
titulo: Valsa em Sol
compasso: 3/4
tonalidade: G
clave: sol
andamento: 96 seminima

!p G4/4 B4/8 A4/8 G4/4 | D5/2 B4/4 | < C5/8 B4/8 A4/8 B4/8 C5/8 D5/8 | !f E5/2. |
> D5/4' C5/4' B4/4' | A4/8 G4/8 F#4/4 A4/4 | !p G4/4 {3 B4/8 C5/8 D5/8} G4/4 | rit G4/2.@ |.
```

## Ambientes

- **Homologação**: publicado como Artifact privado no claude.ai. É lá que o reconhecimento por foto funciona, porque usa a conta do Claude de quem abre a página.
- **Local**: `cd site && python3 -m http.server 8000` e abra `http://localhost:8000`. Partitura, editor e reprodução funcionam; o reconhecimento automático aparece como indisponível.

## Publicar na AWS (MVP para professores)

Ambiente de teste: https://d2g22phna0rmtp.cloudfront.net

- Perfil local: `investai`; região: `us-east-1`.
- Bucket exclusivo: `partitura-viva-teste-954903081730`.
- Distribuição CloudFront: `E4VCCTIG942C3`.

Para atualizar esse ambiente:

```bash
# Caso a sessão tenha expirado:
aws login --profile investai --region us-east-1
AWS_PROFILE=investai ./scripts/deploy_aws.sh partitura-viva-teste-954903081730 us-east-1
```

Site estático em S3 privado + CloudFront (HTTPS). A cobrança depende do uso e das condições da conta AWS; não há garantia de gratuidade.

```
aws configure            # chave de um usuário IAM com permissão de S3 e CloudFront
./scripts/deploy_aws.sh partitura-viva-mvp us-east-1
```

O script imprime o endereço `https://xxxx.cloudfront.net` para enviar aos professores. Para atualizar depois, rode de novo.
O endereço e os arquivos estáticos das lições são públicos. O acesso às contas e aos dados privados usa Firebase Authentication e regras Firestore. A senha demo foi removida. O primeiro acesso acontece por convite, senha própria e confirmação do e-mail.
Use um bucket exclusivo deste projeto: a sincronização remove arquivos remotos que não existem mais em `site/`.
Instaladores Python (`.whl`), arquivos ZIP e arquivos `.env` não são enviados.

Para usar um perfil AWS já configurado:

```bash
aws sts get-caller-identity --profile SEU_PERFIL
AWS_PROFILE=SEU_PERFIL ./scripts/deploy_aws.sh NOME_UNICO_DO_BUCKET us-east-1
```

Fora do claude.ai funcionam a biblioteca, a partitura, o player e o editor; a leitura automática de fotos não (use a "Leitura pelo chat do Claude").

## Amostras de instrumento

`site/samples/` guarda uma nota a cada terça menor da extensão de cada instrumento (369 arquivos, cerca de 9 MB). Para regenerar depois de mudar a lista de instrumentos (bloco `#instrument-data` no `index.html`):

```
npm pack soundfont-for-samplers@0.0.3 && tar xzf soundfont-for-samplers-0.0.3.tgz
python3 scripts/vendor_samples.py package/FluidR3_GM
```

## Próximos passos sugeridos

- Backend próprio com a API do Claude, para o reconhecimento funcionar fora do claude.ai.
- Partituras com mais de uma pauta (piano com duas mãos, duetos).
- Exportar MIDI/MusicXML da lição reconhecida.
- Biblioteca de lições salvas por estudante.

## Catálogo de instrumentos solicitado

Além das opções anteriores, foram incluídos oboé d’amore em Lá, clarinete alto em Mi♭, clarinete baixo em Si♭, trompete em Dó, cornet e flugelhorn em Si♭, trompa em Si♭, eufônio em Si♭ e tubas em Dó, Mi♭ e Fá. Trombone e a tuba já existentes foram identificados como instrumentos em Si♭, mantendo os mesmos IDs. Não foram duplicados os instrumentos existentes.

A afinação física dos metais graves não implica transposição na notação usual em clave de fá. Trombone, eufônio e tubas usam som real por padrão; o professor oferece explicitamente a notação de clave de sol transposta em Si♭ (trombone/eufônio −14 semitons, tuba −26) e Mi♭ (tuba −21). Na trompa dupla Fá/Si♭, a escolha segue a afinação da **parte escrita**, não o uso da válvula; a opção Fá permanece apropriada para partes em Fá.

O catálogo FluidR3 General MIDI não possui timbres próprios de oboé d’amore, clarinetes alto/baixo, cornet, flugelhorn e eufônio. O exemplo usa, respectivamente, amostras de oboé, clarinete, trompete e trombone, com aviso na interface. Isso não altera a altura esperada na avaliação. As tubas e trompetes compartilham o timbre da família. A faixa de detecção do professor permanece Fá♯1–Sol6; notas abaixo dessa faixa exigem outro trecho.

Referências de notação: [tuba — VSL](https://www.vsl.co.at/academy/brass/bass-tuba), [trompa — VSL](https://www.vsl.co.at/academy/brass/horn-f), [clarinete baixo — VSL](https://www.vsl.co.at/academy/woodwinds/bass-clarinet).

## Exercícios de escalas

Abra **Escalas · Círculo das quintas**, escolha o instrumento e a tonalidade em **som real**. A partitura e a avaliação usam a transposição escolhida: Dó maior em som real vira Ré maior (dois sustenidos) nos instrumentos em Si♭, Lá maior nos instrumentos em Mi♭ e Sol maior nos instrumentos em Fá. Os metais graves conservam a convenção de notação descrita acima; é possível escolher explicitamente a escrita transposta em clave de sol.

O círculo oferece as 12 tonalidades maiores e suas menores naturais relativas, com opção enarmônica Fá♯/Sol♭. Há exercícios de subida, descida ou ambos, uma ou duas oitavas e andamento ajustável. A região é escolhida dentro da extensão do instrumento, priorizando a faixa detectável pelo professor. Quando não há uma região avaliável, a reprodução continua disponível e a avaliação é desabilitada com aviso.

**Praticar com professor** carrega a escala diretamente para avaliação. Trocar o instrumento de uma escala gerada recalcula a escrita conservando a tonalidade em som real. A lição anterior pode ser restaurada enquanto a página permanece aberta. A escala atual e sua notação são conservadas ao recarregar a página.

Validação: `node --test tests/*.test.cjs`. Os testes de navegador `tests/practice-browser.cjs`, `tests/practice-layout.cjs` e `tests/scales-browser.cjs` usam Playwright com Chrome instalado (`PLAYWRIGHT_PATH` pode apontar para o módulo Playwright).

## Pessoas, grupos e acompanhamento

O painel **Pessoas e grupos** permite convidar usuários e organizar alunos, conforme o perfil: Admin, Encarregado, Instrutor e Aluno. Cada instrutor acompanha somente seus próprios alunos; alunos veem suas tentativas e as orientações recebidas. O projeto `partitura-viva` usa Firestore Standard em `southamerica-east1`, no plano Spark, sem Cloud Functions.

O responsável cria o convite e compartilha o endereço do site. A pessoa ativa a conta usando o e-mail convidado. “Remover acesso” bloqueia o perfil e preserva o histórico; a exclusão definitiva da identidade é feita no console Firebase.

Configuração, bootstrap do Admin, limites do plano gratuito e matriz de permissões: [docs/FIREBASE.md](docs/FIREBASE.md).
