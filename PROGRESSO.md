# Progresso da transcrição – Amadeu Russo, Método Completo de Saxofone

Programa escolar: até a **página 55 do livro** (= página 59 do PDF).
A numeração impressa não acompanha o PDF de forma constante (PDF 17 = livro 9, PDF 45 = livro 39, PDF 59 = livro 55).
Nos arquivos de lição, `pagina:` é a página **impressa no livro**; o nome do arquivo usa a mesma página (`pNNN-<nº>.txt`).

## Regras combinadas

- Lições sem número: a contagem recomeça em cada página, a menos que a lição seja continuação da página anterior.
- Estudos melódicos têm índice próprio (`tipo: estudo`, título "Estudo melódico N · nº X").
- Exercícios: `tipo: exercicio`.
- Instrumento padrão das lições: `saxalto`.

## Feito

| PDF | Livro | Lições | Situação |
|---|---|---|---|
| 13–17 | 5–9 | nº 1–23 (estudos melódicos 1–8) | publicado |
| 17–18 | 9–10 | nº 24–25 | no repositório |
| 19–20 | 11–12 | Intervalos de 2ª; 3ª nº 1–3; estudo melódico 9; 4ª nº 1 | no repositório |
| 21 | 13 | 4ª nº 2–3; estudo melódico 10 (Andante) | no repositório |
| 22–24 | 14–16 | 5ª nº 1–3; estudo melódico 11; 6ª nº 1–2; 6ª em 3/4 (sem número); estudo melódico 12 | no repositório |
| 25–26 | 17–18 | 7ª nº 1–4; 8ª nº 1 | no repositório |
| 27–28 | 19–20 | 8ª nº 2–4 | no repositório |
| 28–29 | 20–21 | intervalos mistos; progressivos nº 1–2 | no repositório |
| 30 | 22 | progressivos nº 3–9 | revisado com ampliação 3x (18 notas corrigidas) |
| 31 | 23 | progressivos nº 10–14 | no repositório |
| 32 | 24 | cromática (exercícios); progressivos nº 15 | nº 15 em RASCUNHO |
| 32–33 | 24–25 | exercícios cromáticos (completos) e escala cromática | no repositório |
| 36–37 | 30–31 | escalas em Dó maior nº 1–3; arpejos em Dó maior nº 1–5 | no repositório |
| 42 | 36 | escalas em Sol maior nº 2–3; arpejos em Sol maior nº 1–5 | no repositório |
| 47 | 41 | escalas e arpejos nº 1–3 em Fá maior | no repositório (7ª/9ª na p. 42 pendentes) |
| 53–54 | 47–48 | escalas nº 1–3 e arpejos nº 1–5 em Ré maior | no repositório |
| 44–45 | 38–39 | escalas e arpejos em Mi menor (nº 1–3, 1–5) | no repositório |
| 49–51 | 43–45 | escalas e arpejos em Ré menor (nº 1–3, 1–5) | no repositório |
| 56–57 | 50–51 | escalas e arpejos em Si menor (nº 1–3, 1–3) | no repositório |
| 39–40 | 33–34 | escalas em Lá menor nº 1–3; arpejos em Lá menor nº 1–2 | no repositório (arpejos nº 3–5 pendentes: leitura incerta) |

## Catálogo de referência

`referencia/catalogo_completo.json` (164 registros) e `referencia/indice_estudos_melodicos.json` (21 estudos melódicos) listam todas as lições do método com seção, número e páginas.
Cada lição transcrita tem `# id: <id do catálogo>` na primeira linha. Para ver o andamento: `python3 scripts/status_catalogo.py`.
A numeração dos estudos melódicos segue `indice_melodico` do catálogo.

## Próximo passo

Estratégia combinada (priorizar técnica):
1. **Escalas e arpejos até o livro p. 55** (PDF ~36–59): Dó maior, Lá menor, Sol maior, Mi menor, Fá maior, Ré menor, Ré maior, Si menor e escala cromática. Gerar pelo padrão com `scripts/omr/gen.py` e conferir com a imagem.
2. Depois, **estudos e estudos melódicos** em ordem a partir do livro p. 25, sempre com leitura ampliada (`q.sh`).
3. Revisar o rascunho do progressivos nº 15 (PDF 32, linhas 3–6).

Detalhes:

- Seguir em ordem a partir do PDF 33 (livro 25). Revisar o rascunho do progressivos nº 15 (PDF 32, linhas 3–6) até o PDF 59 (livro 55).
- Páginas de escalas, intervalos e arpejos: gerar as notas pelo padrão com `scripts/omr/gen.py` e conferir com a imagem e com `heads.mjs`.
- Leitura de melodias: `bash q.sh <pdf> <pauta>` gera 4 recortes ampliados 3x por pauta (usar sempre em trechos sem padrão).
- Atenção: as linhas rotuladas de `staves.mjs` às vezes se desviam perto da barra final; nesses trechos, ler pelas linhas reais da pauta.

## Registro de tempo

| Início (UTC) | Fim (UTC) | Páginas do PDF |
|---|---|---|
| 05:01 | 05:12 | 18–21 (11 lições) |
| 05:19 | 05:31 | 22–30 (25 lições, 7 em rascunho) |
| 13:32 | 13:40 | revisão dos 7 rascunhos da p. 22 |
| 13:40 | 13:55 | 31–32 (7 lições, 1 em rascunho) |

## Para o professor conferir
- Livro p. 16: exercício de 6ª em 3/4 sem número (o catálogo não o lista separado; recebeu id próprio `AR-INTERVALOS_6-P016-EX-003`).
- Estudo melódico 12 (Allegretto), compasso 15: conferir as três colcheias (lidas Si–Lá–Ré).
- Intervalos de 8ª nº 2, compasso 10 (antes do Dó6 longo): a leitura dava 7/8; usei Ré6 semínima pontuada. Conferir no livro.
- Intervalos mistos (livro p. 20–21): o exercício longo da p. 21 foi lido numa imagem pequena; conferir nota a nota.
- Progressivos nº 12, compasso 8: última semicolcheia lida como Mi4 (o padrão sugeriria Fá4).
- Progressivos nº 14, compassos 4 e 9: a 4ª nota (Dó5 / Fá5) salta uma terça; conferir se não é grau conjunto.
- `staves.mjs` não detecta algumas pautas de páginas mais claras (ex.: PDF 32 detectou 7 de 13); usar `crop.mjs` direto nesses casos.
- Escala em Dó maior nº 3 (livro p. 30), compasso 5: a mínima após a subida foi lida como Dó5 (sem linhas suplementares visíveis); conferir se não é Dó6.
- Arpejos em Lá menor nº 2, último grupo: lido como Dó5–Sol♯4–Mi4–Dó4; conferir a última nota.
- Arpejos em Fá maior nº 3 e Sol maior nº 3/5: compassos finais gerados pelo padrão; conferir os graus graves.
- O catálogo não lista as escalas em Sol maior (livro p. 35–36); receberam ids próprios `AR-ESCALAS_SOL_MAIOR-P036-SC-00x`. A escala nº 1 fica no PDF 41 (não transcrita ainda).
- Escalas em Mi menor nº 1–3 (livro p. 38): geradas como menor melódica (sobe Dó♯/Ré♯, desce natural); conferir o fim das descidas (Ré♯ final) no livro.
- Escalas em Ré menor nº 1–3 (livro p. 43–44): menor melódica gerada pelo padrão; na nº 3 a descida foi montada como Si♭5→Dó♯4 contínua; conferir as quebras de compasso.
- Escalas menores (Mi, Ré, Si): geradas como menor melódica; arpejos com a sensível (menor harmônica). Conferir os finais das descidas e as quebras de compasso no livro.
