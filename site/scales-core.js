/* Escalas em som real -> escrita do instrumento. Sem dependências de interface. */
(function (root) {
  'use strict';
  const fifths = {C:0,G:1,D:2,A:3,E:4,B:5,'F#':6,'C#':7,F:-1,Bb:-2,Eb:-3,Ab:-4,Db:-5,Gb:-6,Cb:-7,Am:0,Em:1,Bm:2,'F#m':3,'C#m':4,'G#m':5,'D#m':6,'A#m':7,Dm:-1,Gm:-2,Cm:-3,Fm:-4,Bbm:-5,Ebm:-6,Abm:-7};
  const circle = [ ['C','Am'],['G','Em'],['D','Bm'],['A','F#m'],['E','C#m'],['B','G#m'],['F#','D#m'],['Db','Bbm'],['Ab','Fm'],['Eb','Cm'],['Bb','Gm'],['F','Dm'] ];
  const letters = ['C','D','E','F','G','A','B'], natural = [0,2,4,5,7,9,11], names = ['Dó','Ré','Mi','Fá','Sol','Lá','Si'];
  const mod = n => (n % 12 + 12) % 12;
  function tonic(key) { return mod(natural[letters.indexOf(key[0])] + (key[1] === '#' ? 1 : key[1] === 'b' ? -1 : 0)); }
  function label(key) { return names[letters.indexOf(key[0])] + (key[1] === '#' ? '♯' : key[1] === 'b' ? '♭' : '') + (key.endsWith('m') ? ' menor natural' : ' maior'); }
  function transposeKey(key, transpose) {
    if (!(key in fifths) || !Number.isInteger(transpose)) throw new Error('Tonalidade ou transposição inválida.');
    if (mod(transpose) === 0) return key;
    const minor = key.endsWith('m'), target = mod(tonic(key) - transpose);
    const candidates = Object.keys(fifths).filter(k => k.endsWith('m') === minor && tonic(k) === target);
    candidates.sort((a,b) => Math.abs(fifths[a]) - Math.abs(fifths[b]) || (Math.sign(fifths[a]) === Math.sign(fifths[key]) ? -1 : 1));
    return candidates[0];
  }
  function signature(key) {
    const count = fifths[key];
    const order = count >= 0 ? ['Fá','Dó','Sol','Ré','Lá','Mi','Si'] : ['Si','Mi','Lá','Ré','Sol','Dó','Fá'];
    return { count, description: count === 0 ? 'Sem acidentes na armadura' : `${Math.abs(count)} ${count > 0 ? (count === 1 ? 'sustenido' : 'sustenidos') : (count === -1 ? 'bemol' : 'bemóis')}: ${order.slice(0, Math.abs(count)).map(n => n + (count > 0 ? '♯' : '♭')).join(', ')}` };
  }
  function generate({concertKey, instrument, notation = 'written', octaves = 1, direction = 'both', bpm = 60}) {
    if (!(concertKey in fifths) || !instrument || instrument.fixed) throw new Error('Escolha uma tonalidade e um instrumento melódico.');
    if (![1,2].includes(octaves) || !['both','up','down'].includes(direction) || !Number.isFinite(bpm) || bpm < 20 || bpm > 240) throw new Error('Configuração de escala inválida.');
    if (!['written','concert','alternate'].includes(notation) || notation === 'alternate' && instrument.alternateTransp == null) throw new Error('Notação indisponível para este instrumento.');
    const transpose = notation === 'concert' ? 0 : notation === 'alternate' ? instrument.alternateTransp : instrument.transp;
    const writtenKey = transposeKey(concertKey, transpose), span = octaves * 12;
    const starts = [];
    for (let n = instrument.lo; n + span <= instrument.hi; n++) if (mod(n) === tonic(concertKey)) starts.push(n);
    if (!starts.length) throw new Error('Essa extensão não cabe neste instrumento. Escolha uma oitava.');
    const evaluable = starts.filter(n => n >= 30 && n + span <= 91);
    const preferred = Math.min(instrument.lo + 12, (instrument.lo + instrument.hi - span) / 2);
    const candidates = evaluable.length ? evaluable : starts;
    candidates.sort((a,b) => Math.abs(a - preferred) - Math.abs(b - preferred));
    const concertStart = candidates[0], writtenStart = concertStart - transpose;
    const rootIndex = letters.indexOf(writtenKey[0]), rootAlter = writtenKey[1] === '#' ? 1 : writtenKey[1] === 'b' ? -1 : 0;
    const octave = (writtenStart - natural[rootIndex] - rootAlter) / 12 - 1;
    const pattern = concertKey.endsWith('m') ? [0,2,3,5,7,8,10] : [0,2,4,5,7,9,11];
    const ascending = [];
    for (let degree = 0; degree <= octaves * 7; degree++) {
      const midi = writtenStart + pattern[degree % 7] + Math.floor(degree / 7) * 12;
      const letterIndex = (rootIndex + degree) % 7, oct = octave + Math.floor((rootIndex + degree) / 7);
      const alteration = midi - ((oct + 1) * 12 + natural[letterIndex]);
      const accidental = alteration > 0 ? '#'.repeat(alteration) : 'b'.repeat(-alteration);
      ascending.push({midi, concertMidi: midi + transpose, token: `${letters[letterIndex]}${accidental}${oct}`});
    }
    const sequence = direction === 'up' ? ascending : direction === 'down' ? [...ascending].reverse() : [...ascending, ...ascending.slice(0,-1).reverse()];
    const notes = sequence.map(note => ({ ...note }));
    const durations = {1:'4',2:'2',3:'2.',4:'1'};
    const lines = [], bar = []; let beats = 0;
    notes.forEach((note,index) => {
      const length = index === notes.length - 1 ? 4 - beats : 1;
      note.beats = length; bar.push(`${note.token}/${durations[length]}`); beats += length;
      if (beats === 4) { lines.push(bar.join(' ') + (index === notes.length - 1 ? ' |.' : ' |')); bar.length = 0; beats = 0; }
    });
    const bass = ['violoncelo','contrabaixo','fagote','trombone','eufonio','tuba','tubado','tubamib','tubafa'].includes(instrument.id);
    const clef = instrument.id === 'viola' ? 'alto' : bass && notation !== 'alternate' ? 'bass' : 'treble';
    const title = `Escala de ${label(concertKey)} (som real) · ${instrument.nome}`;
    const text = [`titulo: ${title}`, 'compasso: 4/4', `tonalidade: ${writtenKey}`, `clave: ${clef}`, `instrumento: ${instrument.id}`, `andamento: ${bpm} seminima`, `# escala: som real ${concertKey}; escrita ${writtenKey}; notação ${notation}; transposição ${transpose}`, `# scale-config: ${JSON.stringify({concertKey,notation,octaves,direction,bpm})}`, '', ...lines].join('\n');
    return {text,title,concertKey,writtenKey,transpose,notes,clef,signature:signature(writtenKey),evaluable:notes.every(n=>n.concertMidi>=30&&n.concertMidi<=91)};
  }
  const api = {circle,fifths,tonic,label,transposeKey,signature,generate};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ScalesCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
