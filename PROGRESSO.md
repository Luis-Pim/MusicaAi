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

## Catálogo de referência

`referencia/catalogo_completo.json` (164 registros) e `referencia/indice_estudos_melodicos.json` (21 estudos melódicos) listam todas as lições do método com seção, número e páginas.
Cada lição transcrita tem `# id: <id do catálogo>` na primeira linha. Para ver o andamento: `python3 scripts/status_catalogo.py`.
A numeração dos estudos melódicos segue `indice_melodico` do catálogo.

## Próximo passo

- Seguir em ordem a partir do PDF 31 (livro 23): progressivos nº 10 até o PDF 59 (livro 55).
- Páginas de escalas, intervalos e arpejos: gerar as notas pelo padrão com `scripts/omr/gen.py` e conferir com a imagem e com `heads.mjs`.
- Leitura de melodias: `bash q.sh <pdf> <pauta>` gera 4 recortes ampliados 3x por pauta (usar sempre em trechos sem padrão).
- Atenção: as linhas rotuladas de `staves.mjs` às vezes se desviam perto da barra final; nesses trechos, ler pelas linhas reais da pauta.

## Registro de tempo

| Início (UTC) | Fim (UTC) | Páginas do PDF |
|---|---|---|
| 05:01 | 05:12 | 18–21 (11 lições) |
| 05:19 | 05:31 | 22–30 (25 lições, 7 em rascunho) |
| 13:32 | 13:40 | revisão dos 7 rascunhos da p. 22 |

## Para o professor conferir
- Livro p. 16: exercício de 6ª em 3/4 sem número (o catálogo não o lista separado; recebeu id próprio `AR-INTERVALOS_6-P016-EX-003`).
- Estudo melódico 12 (Allegretto), compasso 15: conferir as três colcheias (lidas Si–Lá–Ré).
- Intervalos de 8ª nº 2, compasso 10 (antes do Dó6 longo): a leitura dava 7/8; usei Ré6 semínima pontuada. Conferir no livro.
- Intervalos mistos (livro p. 20–21): o exercício longo da p. 21 foi lido numa imagem pequena; conferir nota a nota.
- Progressivos nº 12, compasso 8: última semicolcheia lida como Mi4 (o padrão sugeriria Fá4).
