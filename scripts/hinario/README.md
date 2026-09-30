# Hinário 5 CCB na biblioteca

As lições em `site/licoes/hinario5-*` são geradas automaticamente a partir dos arquivos do MuseScore do projeto
[ccb-hinario-5-do](https://github.com/eneiasramos/ccb-hinario-5-do) (Enéias Ramos de Melo), usado com autorização.

A aba Hinos mostra uma única entrada por hino/coro e abre o PDF original, com as quatro vozes e letras. Não há seleção de voz. O áudio e a avaliação usam a melodia principal (soprano), informada na tela; a transcrição dessa melodia pode ser aberta para praticar. O PDF permanece em Dó, sem transposição visual.

Os arquivos de prática continuam separados internamente em quatro vozes:

| Método | Voz | Clave |
|---|---|---|
| `hinario5-1-soprano` | 1ª voz (soprano) | sol |
| `hinario5-2-contralto` | 2ª voz (contralto) | sol |
| `hinario5-3-tenor` | 3ª voz (tenor) | fá |
| `hinario5-4-baixo` | 4ª voz (baixo) | fá |

As notas estão em som real (hinário em Dó). A transposição para sax, clarinete, trompete etc. é feita pelo seletor de instrumento do site.

## Como gerar de novo

```
git clone --depth 1 https://github.com/eneiasramos/ccb-hinario-5-do /tmp/h5
python3 scripts/hinario/mscx2licao.py /tmp/h5/do/musescore/xml site/licoes
python3 scripts/build_index.py
node scripts/validate_lessons.mjs hinario5   # com `cd site && python3 -m http.server 8765` rodando
```

## Regras da conversão

- A voz de cima de cada pauta (soprano, tenor) é a nota mais aguda de cada ataque; a de baixo (contralto, baixo), a mais grave.
- Compassos partidos na troca de linha do hinário são unidos de novo.
- Ritornelos e 1ª/2ª casas são escritos por extenso (a música toca uma vez com cada final).
- Andamento: a indicação do hinário (ex.: "colcheia = 132 - 144") vira `andamento: 132 colcheia` — sempre o valor mínimo e a figura escrita; o texto original fica num comentário.
- Fermatas e ligaduras de valor são mantidas; letra, dinâmicas e respirações não.
- Ficam de fora (lista `EXCLUIR` no script) 19 hinos com mudança de fórmula de compasso no meio ou quiálteras
  irregulares: 94, 238, 275, 280, 296, 302, 320, 342, 346, 348, 350, 352, 359, 368, 415, 422, 459, 462, 464.

## Partitura original

Os PDFs em `site/hinario/` são cópias dos arquivos de `do/pdf` da mesma fonte. `site/hinario/index.json` relaciona cada hino/coro ao PDF. Páginas compartilhadas preservam o hino vizinho e exibem um aviso. O visualizador usa PDF.js, já utilizado pelo site, e oferece zoom e abertura do PDF.

Para atualizar os PDFs a partir de uma cópia local da fonte:

```
python3 scripts/hinario/import_pdfs.py /tmp/h5/do/pdf
```
