#!/usr/bin/env python3
"""Gera site/licoes/index.json a partir dos arquivos de lição.

Cada método é uma pasta em site/licoes/ com um metodo.json ({id, nome, instrumento, ordem})
e um arquivo .txt por lição. O nome do arquivo define a ordem (ex.: p005-01.txt).
O cabeçalho de cada lição define titulo, secao, tipo (exercicio | estudo) e pagina.

Uso: python3 scripts/build_index.py
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent / "site" / "licoes"
HEADER = re.compile(r"^\s*([a-z]+)\s*:\s*(.*)$")


def read_header(path):
    meta = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        m = HEADER.match(line)
        if m:
            meta[m.group(1)] = m.group(2).strip()
        elif line.strip() and not line.startswith("#"):
            break
    return meta


def main():
    metodos = []
    for d in sorted(p for p in ROOT.iterdir() if p.is_dir()):
        info = json.loads((d / "metodo.json").read_text(encoding="utf-8"))
        secoes = []
        for f in sorted(d.glob("*.txt")):
            h = read_header(f)
            sec = h.get("secao", "Lições")
            if not secoes or secoes[-1]["titulo"] != sec:
                secoes.append({"titulo": sec, "licoes": []})
            secoes[-1]["licoes"].append({
                "arquivo": f"{d.name}/{f.name}",
                "titulo": h.get("titulo", f.stem),
                "tipo": h.get("tipo", "exercicio"),
                "pagina": h.get("pagina", ""),
            })
        total = sum(len(s["licoes"]) for s in secoes)
        metodos.append({**info, "total": total, "secoes": secoes})
        print(f"{info['nome']}: {total} lições")
    metodos.sort(key=lambda m: m.get("ordem", 99))
    (ROOT / "index.json").write_text(json.dumps({"metodos": metodos}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
