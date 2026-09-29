# Ferramentas de leitura do método (OMR assistido)

Usadas para transcrever as páginas do PDF em lições da biblioteca (`site/licoes/`).
Todas rodam com Node + Playwright (Chromium) e leem as páginas por um servidor local.

## Preparação

```
mkdir -p /tmp/omr && cd /tmp/omr
cp <repo>/scripts/omr/* .
cp <caminho>/metodo.pdf metodo.pdf
npm pack pdfjs-dist@3.11.174 && tar xzf pdfjs-dist-3.11.174.tgz
cp package/build/pdf.min.js package/build/pdf.worker.min.js .
python3 -m http.server 8766 --bind 127.0.0.1 &
```

## Scripts

| Script | Uso | O que faz |
|---|---|---|
| `render.mjs` | `node render.mjs 13 60 4` | Renderiza páginas do PDF em `hi/pNN.png` (escala 4). |
| `staves.mjs` | `node staves.mjs 18` | Um recorte por pauta em `st/`, com as linhas rotuladas (F5 D5 B4 G4 E4 e suplementares), corrigindo a inclinação do escaneamento. |
| `zoom.mjs` | `node zoom.mjs st/p18-01.png 0.04 0.5 z.png` | Amplia 2x um trecho de um recorte. |
| `crop.mjs` | `node crop.mjs 18 0.1 0.4 c.png` | Recorte livre de uma página (frações da altura/largura). |
| `heads.mjs` | `node heads.mjs 18` | Detector experimental de cabeças de nota com altura calculada. Ainda erra parte das notas: usar só como apoio. |

Depois de escrever as lições: `python3 scripts/build_index.py` e `node scripts/validate_lessons.mjs`
(com `cd site && python3 -m http.server 8765` rodando).
