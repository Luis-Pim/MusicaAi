"""Notas diatônicas numa tonalidade: grau 0 = tônica na oitava dada."""
L = "CDEFGAB"
SHARPS = {"G": "F", "D": "FC", "A": "FCG", "E": "FCGD"}
FLATS = {"F": "B", "Bb": "BE"}
def maker(tonic, octave, key):
    base = L.index(tonic[0]) + 7 * (octave - 4)
    sh, fl = SHARPS.get(key, ""), FLATS.get(key, "")
    def N(i, d):
        k = base + i; s = L[k % 7]
        acc = "#" if s in sh else ("b" if s in fl else "")
        return f"{s}{acc}{4 + k // 7}/{d}"
    return N

def minor_maker(tonic, octave, key):
    """Menor melódica: up=True eleva 6º e 7º graus (em semitom), up=False natural."""
    base_N = maker(tonic, octave, key)
    def raise_(n):
        p, d = n.split("/")
        s, rest = p[0], p[1:]
        if rest.startswith("b"): rest = rest[1:]
        elif rest.startswith("#"): return n
        else: rest = "#" + rest
        return f"{s}{rest}/{d}"
    def N(i, d, up=False):
        n = base_N(i, d)
        return raise_(n) if up and i % 7 in (5, 6) else n
    return N
