"""Gera o corpo de exercícios de padrão regular (escalas, intervalos) em Dó maior."""
L = "CDEFGAB"
def n(i):  # índice diatônico: 0 = C4
    return f"{L[i % 7]}{4 + i // 7}"
def D(i, d): return f"{n(i)}/{d}"
def lines(ms, per=8):
    return "\n".join(" | ".join(ms[k:k + per]) + " |" for k in range(0, len(ms), per))
