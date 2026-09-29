# converte uma notação compacta com apogiaturas em texto de lição
# "[A4]G4 F#4' | ..." -> apogiatura = fusa + semicolcheia pontuada (soma = colcheia)
import re, sys
def conv(src, base='8'):
    out = []
    for tok in src.split():
        m = re.match(r"^\[([^\]]+)\](\S+?)([>'^_@~]*)$", tok)
        if m:
            g, n, a = m.groups()
            out.append(f"{g}/32 {n}/16.{a or '>'}")
        elif tok.startswith(('|', '!', '<', '>', '=')) or '/' in tok or tok.startswith('{') or tok == '}':
            out.append(tok)
        else:
            m = re.match(r"^(\S+?)([>'^_@~]*)$", tok); out.append(f"{m.group(1)}/{base}{m.group(2)}")
    return ' '.join(out)
if __name__ == '__main__':
    for line in sys.stdin.read().strip().split('\n'):
        print(conv(line) if line.strip() and not line.startswith('#') else line)
