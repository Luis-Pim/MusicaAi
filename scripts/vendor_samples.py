#!/usr/bin/env python3
"""Copia para site/samples/ as amostras de instrumento que o site usa.

As amostras vêm do pacote npm `soundfont-for-samplers` (FluidR3_GM, licença MIT).
Para manter o site leve, copiamos só uma nota a cada terça menor (Dó, Mi♭, Sol♭, Lá)
dentro da extensão de cada instrumento; o player transpõe a amostra mais próxima.

A lista de instrumentos é lida do próprio site/index.html (bloco #instrument-data),
então o site e este script nunca divergem.

Uso:
    npm pack soundfont-for-samplers@0.0.3 && tar xzf soundfont-for-samplers-0.0.3.tgz
    python3 scripts/vendor_samples.py package/FluidR3_GM
"""
import json
import pathlib
import re
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
NOTE_FILE = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]


def sample_midis(inst):
    if inst.get("fixed"):
        return [inst["fixed"]]
    lo, hi = max(21, inst["lo"] - 2), min(108, inst["hi"] + 2)
    return [m for m in range(lo, hi + 1) if m % 3 == 0]


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = pathlib.Path(sys.argv[1])
    html = (SITE / "index.html").read_text(encoding="utf-8")
    block = re.search(r'<script type="application/json" id="instrument-data">(.*?)</script>', html, re.S)
    instruments = json.loads(block.group(1))

    out = SITE / "samples"
    if out.exists():
        shutil.rmtree(out)
    count = 0
    for inst in instruments:
        dst = out / inst["dir"]
        dst.mkdir(parents=True, exist_ok=True)
        for m in sample_midis(inst):
            name = f"{NOTE_FILE[m % 12]}{m // 12 - 1}.mp3"
            f = src / f"{inst['dir']}-mp3" / name
            if not f.exists():
                print(f"faltando: {f}", file=sys.stderr)
                continue
            shutil.copyfile(f, dst / name)
            count += 1
    print(f"{count} amostras copiadas para {out}")


if __name__ == "__main__":
    main()
