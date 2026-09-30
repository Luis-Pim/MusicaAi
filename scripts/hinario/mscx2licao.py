#!/usr/bin/env python3
"""Converte os hinos do Hinário 5 (arquivos .mscx do MuseScore 2) em lições da biblioteca.

Fonte: https://github.com/eneiasramos/ccb-hinario-5-do (pasta do/musescore/xml), usada com autorização.
Cada hino tem 2 pautas (I e II; III e IV). Esta rotina separa as 4 vozes e gera uma lição por voz.

Uso: python3 scripts/hinario/mscx2licao.py <pasta com hino-N.mscx e coro-N.mscx> [site/licoes]
"""
import json
import pathlib
import re
import sys
import xml.etree.ElementTree as ET
from fractions import Fraction as F

DIV = 480  # ticks por semínima no MuseScore 2
DUR = {"whole": F(1), "half": F(1, 2), "quarter": F(1, 4), "eighth": F(1, 8), "16th": F(1, 16), "32nd": F(1, 32), "64th": F(1, 64)}
CODE = {F(1): "1", F(1, 2): "2", F(1, 4): "4", F(1, 8): "8", F(1, 16): "16", F(1, 32): "32"}
MAJOR = {0: "C", 1: "G", 2: "D", 3: "A", 4: "E", 5: "B", 6: "F#", 7: "C#", -1: "F", -2: "Bb", -3: "Eb", -4: "Ab", -5: "Db", -6: "Gb", -7: "Cb"}
# hinos que ainda não convertem bem (mudança de fórmula de compasso no meio, quiálteras irregulares):
# ficam de fora até serem ajustados à mão.
EXCLUIR = {94, 238, 275, 280, 296, 302, 320, 342, 346, 348, 350, 352, 359, 368, 415, 422, 459, 462, 464}
VOZES = [
    ("hinario5-1-soprano", "Hinário 5 CCB – 1ª voz (soprano)", 0, "top", "sol"),
    ("hinario5-2-contralto", "Hinário 5 CCB – 2ª voz (contralto)", 0, "bottom", "sol"),
    ("hinario5-3-tenor", "Hinário 5 CCB – 3ª voz (tenor)", 1, "top", "fa"),
    ("hinario5-4-baixo", "Hinário 5 CCB – 4ª voz (baixo)", 1, "bottom", "fa"),
]


def spell(pitch, tpc):
    step = "FCGDAEB"[(tpc - 13) % 7]
    alter = (tpc + 1) // 7 - 2
    natural = pitch - alter
    return f"{step}{'#' * alter if alter > 0 else 'b' * -alter}{natural // 12 - 1}"


FIGURA = [("unicodeNoteQuarterUp.*unicodeAugmentationDot", "seminima pontuada", F(3, 8)),
          ("unicodeNoteHalfUp", "minima", F(1, 2)), ("unicodeNote8thUp", "colcheia", F(1, 8)),
          ("unicodeNoteQuarterUp", "seminima", F(1, 4))]


def tempo_mark(xml, playback):
    """Indicação do hinário, ex. "(♪ = 132 - 144) Com humildade": usa o menor valor e a figura escrita."""
    fig, valor = "seminima", F(1, 4)
    for pat, nome, v in FIGURA:
        if re.search(pat, xml):
            fig, valor = nome, v
            break
    texto = texto_limpo(xml)
    nums = [int(x) for x in re.findall(r"\d+", texto)]
    palavras = re.sub(r"[()=\d\-–\s]+", " ", texto).strip()
    if nums:
        return (min(nums), fig, texto_limpo(xml), palavras)
    bpm = round(float(playback) * 60) if playback else 60
    return (bpm, "seminima", "", palavras)


def texto_limpo(xml):
    t = re.sub(r"<sym>unicodeNoteQuarterUp</sym>(<sym>space</sym>)?<sym>unicodeAugmentationDot</sym>", "semínima pontuada", xml)
    t = t.replace("<sym>unicodeNoteQuarterUp</sym>", "semínima").replace("<sym>unicodeNote8thUp</sym>", "colcheia").replace("<sym>unicodeNoteHalfUp</sym>", "mínima")
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", t)).strip()


def split_value(v):
    """Valor (fração da semibreve) -> lista de figuras com pontos, ligadas."""
    out = []
    for base in sorted(CODE, reverse=True):
        for dots in (2, 1, 0):
            val = base * (2 - F(1, 2 ** dots))
            while v >= val and (dots == 0 or base * 2 <= 1):
                out.append(CODE[base] + "." * dots)
                v -= val
    return out if v == 0 else None


class Ev:
    __slots__ = ("start", "dur", "notes", "tie", "fermata", "visible", "tuplet")

    def __init__(self, start, dur, notes, tie=False, fermata=False, visible=True, tuplet=None):
        self.start, self.dur, self.notes, self.tie, self.fermata, self.visible, self.tuplet = start, dur, notes, tie, fermata, visible, tuplet


def parse(path):
    root = ET.parse(path).getroot()
    score = root.find("Score")
    meta = {"titulo": "", "compositor": ""}
    staves = score.findall("Staff")
    measures = []  # por compasso: {start, len, repeat_start, repeat_end, volta, tracks: {track: [Ev]}}
    for si, staff in enumerate(staves):
        for box in staff.iter("Text"):
            st, tx = box.findtext("style"), box.findtext("text") or ""
            if st == "Title" and not meta["titulo"]:
                meta["titulo"] = re.sub(r"<[^>]+>", "", tx).strip()
            if st == "Composer" and not meta["compositor"]:
                meta["compositor"] = re.sub(r"<[^>]+>", "", tx).strip()
        tick = 0
        mi = 0
        tuplets = {}
        cur_time = (4, 4)
        for m in staff.findall("Measure"):
            if si == 0:
                measures.append({"tracks": {}, "start": tick, "len": None, "rs": False, "re": 0, "volta": None, "key": None, "time": None, "tempo": None})
            rec = measures[mi]
            if m.get("len"):
                rec["len"] = F(m.get("len"))
            if m.find("startRepeat") is not None:
                rec["rs"] = True
            if m.find("endRepeat") is not None:
                rec["re"] = int(m.findtext("endRepeat") or 2)
            pos = {}  # track -> tick corrente
            cur = tick
            base_track = si * 4
            track = base_track
            for el in m:
                if el.tag == "tick":
                    cur = int(el.text)
                elif el.tag == "KeySig" and si == 0 and rec["key"] is None:
                    rec["key"] = int(el.findtext("accidental") or 0)
                elif el.tag == "TimeSig" and si == 0 and rec["time"] is None:
                    rec["time"] = (int(el.findtext("sigN")), int(el.findtext("sigD")))
                elif el.tag == "Tempo" and rec["tempo"] is None:
                    rec["tempo"] = tempo_mark(ET.tostring(el.find("text"), encoding="unicode") if el.find("text") is not None else "", el.findtext("tempo"))
                elif el.tag == "Tuplet":
                    tuplets[el.get("id")] = (int(el.findtext("actualNotes")), int(el.findtext("normalNotes")))
                elif el.tag == "Volta" and si == 0:
                    label = (el.findtext("beginText/text") or el.findtext("text") or "").strip()
                    rec["volta"] = label or (el.findtext("endings") or "")
                    if not rec["volta"].strip():
                        rec["volta"] = "?"
                elif el.tag in ("Chord", "Rest"):
                    if el.find("acciaccatura") is not None or el.find("appoggiatura") is not None or el.find("grace4") is not None:
                        continue
                    tr = int(el.findtext("track") or base_track)
                    dt = el.findtext("durationType")
                    if dt == "measure":
                        dur = F(el.findtext("duration") or "1") if el.findtext("duration") else None
                        d = F(el.findtext("duration")) if el.findtext("duration") else None
                        dur = d
                    else:
                        dur = DUR[dt] * (2 - F(1, 2 ** int(el.findtext("dots") or 0)))
                    tup = el.findtext("Tuplet")
                    if tup is not None and tup in tuplets:
                        a, n = tuplets[tup]
                        dur = dur * n / a
                    notes, tie = [], False
                    if el.tag == "Chord":
                        for n in el.findall("Note"):
                            notes.append((int(n.findtext("pitch")), int(n.findtext("tpc"))))
                            if n.find("Tie") is not None:
                                tie = True
                    ferm = any((a.findtext("subtype") or "").startswith("fermata") for a in el.findall("Articulation"))
                    vis = el.findtext("visible") != "0"
                    start = cur
                    rec["tracks"].setdefault(tr, []).append(Ev(start, dur, sorted(notes), tie, ferm, vis, tuplets.get(tup) if tup else None))
                    if dur is None:
                        dur = F(0)
                    cur = start + int(dur * 4 * DIV)
            ts = m.find("TimeSig")
            if ts is not None:
                cur_time = (int(ts.findtext("sigN")), int(ts.findtext("sigD")))
            mlen = F(m.get("len")) if m.get("len") else F(cur_time[0], cur_time[1])
            rec["start"] = tick
            tick += int(mlen * 4 * DIV)
            mi += 1
            # duração do compasso: o maior avanço em qualquer voz
        # próximo compasso começa depois do mais longo
        # (recalculado abaixo a partir da fórmula)
    # marca o início real de cada compasso pela fórmula corrente
    return meta, measures


def voice_events(measure, staff, which, mlen, mstart):
    """Eventos de uma voz num compasso: lista de (dur, nota|None, tie, fermata, tuplet).

    Junta todas as vozes da pauta (o arquivo mistura acordes de duas vozes e vozes separadas)
    e, a cada ataque, fica com a nota mais aguda (voz de cima) ou mais grave (voz de baixo).
    """
    end = mstart + int(mlen * 4 * DIV)
    evs = []
    for tr in range(staff * 4, staff * 4 + 4):
        for e in measure["tracks"].get(tr, []):
            if e.dur is None:
                e.dur = mlen
            if e.start >= end or e.start < mstart:
                continue
            if e.notes or e.visible:
                evs.append(e)
    by_start = {}
    for e in evs:
        by_start.setdefault(e.start, []).append(e)
    out, cur = [], mstart
    for t in sorted(by_start):
        if t < cur:
            continue
        group = by_start[t]
        chords = [e for e in group if e.notes]
        if chords:
            e = max(chords, key=lambda c: c.notes[-1][0]) if which == "top" else min(chords, key=lambda c: c.notes[0][0])
            n = e.notes[-1] if which == "top" else e.notes[0]
        else:
            e, n = group[0], None
        if t > cur:
            out.append((F(t - cur, 4 * DIV), None, False, False, None))
        dur = min(e.dur, F(end - t, 4 * DIV))
        out.append((dur, n, e.tie and dur == e.dur, e.fermata, e.tuplet if dur == e.dur else None))
        cur = t + int(dur * 4 * DIV)
    if cur < end and out:
        out.append((F(end - cur, 4 * DIV), None, False, False, None))
    return out


def fmt_events(evs):
    toks = []
    i = 0
    while i < len(evs):
        dur, n, tie, ferm, tup = evs[i]
        if tup:
            a, nn = tup
            group = []
            total = F(0)
            while i < len(evs) and evs[i][4] == tup and len(group) < a:
                d, n2, t2, f2, _ = evs[i]
                base = d * a / nn
                code = split_value(base)
                name = spell(*n2) if n2 else "R"
                group.append(f"{name}/{code[0]}" + ("@" if f2 else "") + ("~" if t2 and n2 else ""))
                i += 1
            toks.append("{%d " % a + " ".join(group) + " }")
            continue
        parts = split_value(dur)
        if parts is None:
            raise ValueError(f"duração {dur}")
        name = spell(*n) if n else "R"
        for k, p in enumerate(parts):
            last = k == len(parts) - 1
            tok = f"{name}/{p}"
            if n and (not last or tie):
                tok += "~"
            if ferm and last:
                tok = tok.replace("~", "") + "@" + ("~" if n and tie else "")
            toks.append(tok)
        i += 1
    return " ".join(toks)


def convert(path, voz):
    _, _, staff, which, clave = voz
    meta, measures = parse(path)
    key = next((m["key"] for m in measures if m["key"] is not None), 0)
    time = next((m["time"] for m in measures if m["time"] is not None), (4, 4))
    tempo = next((m["tempo"] for m in measures if m["tempo"]), None)
    bars = []
    tick = 0
    cur_time = time
    pend = None
    for i, m in enumerate(measures):
        if m["time"]:
            cur_time = m["time"]
        mlen = m["len"] or F(cur_time[0], cur_time[1])
        evs = voice_events(m, staff, which, mlen, tick)
        body = fmt_events(evs) if evs else f"R/1"
        pre = "|: " if m["rs"] else ""
        full = F(cur_time[0], cur_time[1])
        # compassos partidos na troca de linha do hinário (len < fórmula) são unidos de novo
        if bars and pend is not None and pend < full and i > 0 and not m["rs"] and not m["volta"]:
            p0, b0, r0, v0 = bars[-1]
            bars[-1] = (p0, b0 + " " + body, m["re"], v0)
            pend += mlen
            if pend >= full:
                pend = None
        else:
            bars.append((pre, body, m["re"], m["volta"]))
            pend = mlen if (mlen < full and i > 0) else None
        tick += int(mlen * 4 * DIV)
    return meta, key, time, tempo, bars


def lesson_text(num, label, meta, key, time, tempo, bars, voz, secao):
    mid, mnome, _, _, clave = voz
    FULL[0] = F(time[0], time[1])
    lines = [
        f"# id: CCB-H5-{label}-{mid.split('-')[1]}",
        f"titulo: {label.replace('H', 'Hino ').replace('C', 'Coro ')} · {meta['titulo']}" if meta["titulo"] else f"titulo: {label}",
        f"secao: {secao}",
        "tipo: exercicio",
        f"compasso: {time[0]}/{time[1]}",
        f"tonalidade: {MAJOR.get(key, 'C')}",
        f"clave: {clave}",
        f"andamento: {tempo[0]} {tempo[1]}" if tempo else "andamento: 60 seminima",
        f"# Hinário 5 CCB, {mnome.split('– ')[1]}. Fonte: projeto ccb-hinario-5-do (Enéias Ramos de Melo), usado com autorização.",
    ]
    if tempo and tempo[2]:
        lines.append(f"# indicação do hinário: {tempo[2]} (usado o andamento mínimo)")
    if meta["compositor"]:
        lines.append(f"# autor: {meta['compositor']}")
    if any(b[2] for b in bars):
        lines.append("# as repetições (ritornelos e 1ª/2ª casas) foram escritas por extenso.")
    lines.append("")
    # expande casas de 1ª/2ª vez: |: A [1: X] :| [2: Y] -> A X A Y
    out = expand(bars)
    for i in range(0, len(out), 4):
        chunk = out[i:i + 4]
        txt = ""
        for j, (b, sep) in enumerate(chunk):
            last = i + j == len(out) - 1
            txt += b + " " + ("|." if last else sep) + ("" if j == len(chunk) - 1 else " ")
        lines.append(txt)
    return "\n".join(lines) + "\n"


def expand(bars):
    """Lista de (compasso, barra). Sem casas: usa |: :|. Com casas: escreve a repetição por extenso."""
    res, i, start = [], 0, 0
    while i < len(bars):
        pre, body, rep, volta = bars[i]
        if pre:
            start = len(res)
        if volta and volta.strip().startswith("1"):
            section = res[start:]
            while i < len(bars):
                res.append(bars[i][1])
                if bars[i][2]:
                    break
                i += 1
            res.extend(section)
            i += 1
            while i < len(bars) and bars[i][3] and not bars[i][3].strip().startswith("1"):
                res.append(bars[i][1])
                i += 1
            continue
        res.append(body)
        if rep:
            res.extend(res[start:])
        i += 1
    return [(r, "|") for r in merge_partial(res, FULL[0])]


FULL = [F(1)]
TOK = re.compile(r"/(32|16|8|4|2|1)(\.*)")


def bar_len(text):
    total, trip = F(0), False
    for tok in text.split():
        if tok.startswith("{"):
            trip = True
            continue
        if tok == "}":
            trip = False
            continue
        m = TOK.search(tok)
        if not m:
            continue
        v = F(1, int(m.group(1))) * (2 - F(1, 2 ** len(m.group(2))))
        total += v * F(2, 3) if trip else v
    return total


def merge_partial(bars, full):
    """Une compassos incompletos consecutivos (quebras de linha e repetições com anacruse)."""
    out = []
    for i, b in enumerate(bars):
        if out and i > 1 and bar_len(out[-1]) < full and bar_len(out[-1]) + bar_len(b) <= full:
            out[-1] = out[-1] + " " + b
        else:
            out.append(b)
    return out


def main():
    src = pathlib.Path(sys.argv[1])
    dst = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "site/licoes")
    files = []
    for f in src.glob("*.mscx"):
        m = re.match(r"(hino|coro)-(\d+)\.mscx", f.name)
        if m and not (m.group(1) == "hino" and (int(m.group(2)) in EXCLUIR or int(m.group(2)) == 0)):
            files.append((m.group(1), int(m.group(2)), f))
    files.sort(key=lambda x: (x[0] != "hino", x[1]))
    erros = []
    for ordem, voz in enumerate(VOZES, start=2):
        d = dst / voz[0]
        d.mkdir(parents=True, exist_ok=True)
        (d / "metodo.json").write_text(json.dumps({"id": voz[0], "nome": voz[1], "instrumento": "", "ordem": ordem}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        for kind, n, f in files:
            try:
                meta, key, time, tempo, bars = convert(f, voz)
            except Exception as e:  # noqa: BLE001
                erros.append(f"{f.name} ({voz[0]}): {e}")
                continue
            if kind == "hino":
                label = f"H{n}"
                secao = "Hinos de jovens e menores (431–480)" if n > 430 else f"Hinos {((n - 1) // 50) * 50 + 1}–{min(((n - 1) // 50 + 1) * 50, 430)}"
                name = f"h{n:03d}.txt"
            else:
                label = f"C{n}"
                secao = "Coros"
                name = f"k{n:03d}.txt"
            (d / name).write_text(lesson_text(n, label, meta, key, time, tempo, bars, voz, secao), encoding="utf-8")
    print(f"{len(files)} hinos x {len(VOZES)} vozes; {len(erros)} erros")
    for e in erros[:30]:
        print(" ", e)


if __name__ == "__main__":
    main()
