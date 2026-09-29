#!/usr/bin/env python3
"""Cruza referencia/catalogo_completo.json com as lições transcritas (linha "# id:" de cada arquivo).

Uso: python3 scripts/status_catalogo.py [pagina_limite]   (padrão: 55)
"""
import json, pathlib, re, sys, collections
ROOT = pathlib.Path(__file__).resolve().parent.parent
lim = int(sys.argv[1]) if len(sys.argv) > 1 else 55
cat = json.loads((ROOT / "referencia/catalogo_completo.json").read_text())["registros"]
feitos = {}
for f in (ROOT / "site/licoes").glob("*/*.txt"):
    m = re.match(r"# id: (\S+)", f.read_text())
    if m: feitos[m.group(1)] = f.name
alvo = [r for r in cat if r["pagina"] and r["pagina"] <= lim and r["tipo"] not in ("exemplo", "referencia", "trecho_incompleto")]
ok = [r for r in alvo if r["id"] in feitos]
print(f"Até a página {lim}: {len(ok)} de {len(alvo)} lições transcritas ({100*len(ok)//len(alvo)}%)")
pend = collections.OrderedDict()
for r in alvo:
    if r["id"] not in feitos: pend.setdefault(r["pagina"], []).append(f'{r["secao"]} {r["titulo"]}')
print("Próximas pendentes:")
for p, l in list(pend.items())[:6]: print(f"  p. {p}: " + "; ".join(l))
