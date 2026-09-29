# Partitura Viva

Site para estudantes de música ouvirem as lições dos seus métodos (Bona, Pozzoli, Klosé, Arban, Suzuki, métodos de flauta doce, de violão etc.).
O estudante envia a foto ou o PDF da lição, confere a partitura reconhecida e ouve no instrumento e no andamento que escolher.

## O que o site faz

| Requisito | Como está resolvido |
|---|---|
| Escolher o instrumento | 21 instrumentos com amostras reais (piano, cordas, madeiras, metais, violão, voz, marimba, acordeão e um modo de leitura rítmica). Instrumentos transpositores (clarinete e trompete em Si♭, sax em Mi♭, trompa em Fá) tocam o som real, e isso pode ser desligado. |
| Fotos e PDFs de métodos | Envio de várias fotos ou de um PDF (até 12 páginas). O estudante pode recortar só a lição desejada, girar a imagem e realçar o contraste de fotos de celular. A leitura é feita pelo Claude (visão), com instruções específicas para lições de método. |
| Mudar o andamento | Número de pulsos por minuto e a figura que recebe o pulso: "60 colcheias por minuto", "80 semínimas", "50 semínimas pontuadas" e assim por diante. O metrônomo bate na mesma figura, com contagem de um compasso antes de começar. |
| Fórmula de compasso | Reconhecida e explicada (simples ou composto, quantos tempos, qual figura vale um tempo). |
| Intensidade | Dinâmicas `ppp` a `fff`, `sfz`, `fp`, crescendo e diminuendo (grampos ou palavras). São desenhadas na partitura, listadas com explicação e **aplicadas no som**: o volume e o timbre mudam nota a nota, inclusive dentro de notas longas. |
| Outras indicações | Staccato, acento, tenuto, marcato, fermata, ligaduras de valor, quiálteras, ritornelos, `rit.`, `accel.` e `a tempo`. |

Também dá para tocar só um trecho (compasso X a Y), repetir em loop e tocar a partir de uma nota clicando nela.

## Como funciona

Tudo roda no navegador, num único arquivo: `site/index.html`.

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

Site estático em S3 + CloudFront (HTTPS), custo praticamente zero no nível gratuito da AWS:

```
aws configure            # chave de um usuário IAM com permissão de S3 e CloudFront
./scripts/deploy_aws.sh partitura-viva-mvp us-east-1
```

O script imprime o endereço `https://xxxx.cloudfront.net` para enviar aos professores. Para atualizar depois, rode de novo.
Fora do claude.ai funcionam a biblioteca, a partitura, o player e o editor; a leitura automática de fotos não (use a "Leitura pelo chat do Claude").

## Amostras de instrumento

`site/samples/` guarda uma nota a cada terça menor da extensão de cada instrumento (319 arquivos, ~8 MB). Para regenerar depois de mudar a lista de instrumentos (bloco `#instrument-data` no `index.html`):

```
npm pack soundfont-for-samplers@0.0.3 && tar xzf soundfont-for-samplers-0.0.3.tgz
python3 scripts/vendor_samples.py package/FluidR3_GM
```

## Próximos passos sugeridos

- Backend próprio com a API do Claude, para o reconhecimento funcionar fora do claude.ai.
- Partituras com mais de uma pauta (piano com duas mãos, duetos).
- Exportar MIDI/MusicXML da lição reconhecida.
- Biblioteca de lições salvas por estudante.
