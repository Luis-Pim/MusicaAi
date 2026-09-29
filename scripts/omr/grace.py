# converte notação compacta com apogiaturas em texto de lição.
#   [A4]G4          -> apogiatura simples numa colcheia (padrão): A4/32 G4/16.>
#   [B4,D5]C5/4>    -> apogiatura dupla numa semínima: B4/32 D5/32 C5/8.>
# cada nota pequena vale uma fusa, descontada da nota principal; tokens sem "/" recebem a figura padrão.
import re, sys, os
ACC = os.environ.get('GRACE_ACC', '>')  # articulação padrão da nota principal
from fractions import Fraction as F
CODES = {}
for d in (1, 2, 4, 8, 16, 32):
    for dots in range(3):
        v = F(1, d) * (2 - F(1, 2 ** dots))
        CODES.setdefault(v, f"{d}{'.' * dots}")
def val(code):
    m = re.match(r"(\d+)(\.*)$", code); return F(1, int(m.group(1))) * (2 - F(1, 2 ** len(m.group(2))))
def split(v):  # valor restante -> lista de figuras ligadas
    out = []
    for cand in sorted(CODES, reverse=True):
        while v >= cand: out.append(CODES[cand]); v -= cand
    return out
def conv(src, base='8'):
    out = []
    for tok in src.split():
        m = re.match(r"^\[([^\]]+)\]([^/\s>'^_@~]+)(?:/([\d.]+))?([>'^_@~]*)$", tok)
        if m:
            gs, n, d, a = m.groups(); gs = gs.split(','); d = d or base
            rest = val(d) - F(len(gs), 32); figs = split(rest)
            out += [f"{g}/32" for g in gs]
            out += [f"{n}/{f}{(a or ACC) if i == 0 else ''}{'~' if i < len(figs) - 1 else ''}" for i, f in enumerate(figs)]
        elif tok.startswith(('|', '!', '<', '>', '=')) or '/' in tok or tok in ('{3', '}', 'rit', 'rall', 'accel', 'atempo') or tok.startswith('R'):
            out.append(tok)
        else:
            m = re.match(r"^(\S+?)([>'^_@~]*)$", tok); out.append(f"{m.group(1)}/{base}{m.group(2)}")
    return ' '.join(out)
if __name__ == '__main__':
    for line in sys.stdin.read().strip().split('\n'):
        print(conv(line) if line.strip() and not line.startswith('#') else line)
