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
