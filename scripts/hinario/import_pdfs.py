"""Importa PDFs completos do hinário já utilizado nas lições; preserva páginas compartilhadas."""
import json
import pathlib
import re
import shutil
import sys

root = pathlib.Path(__file__).resolve().parents[2]
source = pathlib.Path(sys.argv[1])
target = root / 'site/hinario'
target.mkdir(exist_ok=True)
entries = {}
for pdf in sorted(source.glob('*.pdf')):
    match = re.fullmatch(r'(hino|coro)-([\d-]+)\.pdf', pdf.name)
    if not match:
        continue
    numbers = [int(n) for n in match[2].split('-')]
    if 0 in numbers or (len(numbers) > 1 and (len(numbers) != 2 or numbers[1] != numbers[0] + 1)):
        continue
    for number in numbers:
        key = ('h' if match[1] == 'hino' else 'k') + f'{number:03}'
        entry = entries.setdefault(key, {'pdfs': [], 'shared': False})
        entry['pdfs'].append(pdf.name)
        entry['shared'] |= len(numbers) > 1
catalog = json.loads((root / 'site/licoes/index.json').read_text())
method = next(m for m in catalog['metodos'] if m['id'] == 'hinario5-1-soprano')
manifest = {}
for section in method['secoes']:
    for lesson in section['licoes']:
        key = pathlib.Path(lesson['arquivo']).stem
        manifest[key] = entries[key]  # Falha antes de publicar se faltar algum hino.
for filename in sorted({f for entry in manifest.values() for f in entry['pdfs']}):
    assert (source / filename).read_bytes().startswith(b'%PDF'), filename
    shutil.copyfile(source / filename, target / filename)
(target / 'index.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(f'{len(manifest)} hinos e coros com partitura completa')
