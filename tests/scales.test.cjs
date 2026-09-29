const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const core=require('../site/scales-core.js');
const instruments=JSON.parse(fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8').match(/id="instrument-data">([\s\S]*?)<\/script>/)[1]).filter(i=>!i.fixed);
const inst=id=>instruments.find(i=>i.id===id);
test('Círculo segue quintas e menores relativas',()=>{
 assert.equal(core.circle.length,12);
 core.circle.forEach(([major,minor],i)=>{
  assert.equal((core.tonic(core.circle[(i+1)%12][0])-core.tonic(major)+12)%12,7);
  assert.equal((core.tonic(major)-core.tonic(minor)+12)%12,3);
  assert.equal(core.fifths[major],core.fifths[minor]);
 });
});
test('Dó em som real vira Ré para Si♭, Lá para Mi♭ e Sol para Fá',()=>{
 for(const id of ['clarinete','clarinetebaixo','saxsoprano','saxtenor','trompete','cornet','flugelhorn']) {
  const s=core.generate({concertKey:'C',instrument:inst(id)});assert.equal(s.writtenKey,'D');assert.equal(s.signature.count,2);assert.match(s.signature.description,/Fá♯, Dó♯/);
 }
 for(const id of ['saxalto','saxbaritono','clarinetealto'])assert.equal(core.generate({concertKey:'C',instrument:inst(id)}).writtenKey,'A');
 assert.equal(core.generate({concertKey:'C',instrument:inst('trompa')}).writtenKey,'G');
 assert.equal(core.generate({concertKey:'C',instrument:inst('oboedamore')}).writtenKey,'Eb');
});
test('Todas as tonalidades e instrumentos preservam a escala em som real',()=>{
 for(const instrument of instruments)for(const keys of core.circle)for(const concertKey of keys){
  for(const notation of instrument.alternateLabel?['written','concert','alternate']:['written','concert']) {
   const s=core.generate({concertKey,instrument,notation});
   assert.equal((s.notes[0].concertMidi%12+12)%12,core.tonic(concertKey));
   assert(s.notes.every(n=>n.concertMidi===n.midi+s.transpose&&n.concertMidi>=instrument.lo&&n.concertMidi<=instrument.hi));
   const intervals=s.notes.slice(0,8).map(n=>n.concertMidi-s.notes[0].concertMidi);
   assert.deepEqual(intervals,concertKey.endsWith('m')?[0,2,3,5,7,8,10,12]:[0,2,4,5,7,9,11,12]);
   assert.equal(s.notes.reduce((sum,n)=>sum+n.beats,0)%4,0);
  }
 }
});
test('Grafia enarmônica, oitavas e armaduras têm nomes corretos',()=>{
 const sharp=core.generate({concertKey:'F#',instrument:inst('piano')});assert(sharp.notes.some(n=>/^E#/.test(n.token)));
 const flat=core.generate({concertKey:'Gb',instrument:inst('piano')});assert(flat.notes.some(n=>/^Cb/.test(n.token)));assert.equal(flat.signature.count,-6);
 const minor=core.generate({concertKey:'Am',instrument:inst('clarinete')});assert.equal(minor.writtenKey,'Bm');
});
test('Duas oitavas e direções geram compassos completos',()=>{
 for(const octaves of [1,2])for(const direction of ['up','down','both']){
  const s=core.generate({concertKey:'C',instrument:inst('piano'),octaves,direction});
  assert.equal(Math.max(...s.notes.map(n=>n.midi))-Math.min(...s.notes.map(n=>n.midi)),12*octaves);
  assert.equal(s.notes.reduce((a,n)=>a+n.beats,0)%4,0);
  if(direction==='both')assert.equal(s.notes[0].midi,s.notes.at(-1).midi);
 }
});
test('Graves em som real e partes transpostas são explícitos',()=>{
 assert.equal(core.generate({concertKey:'C',instrument:inst('tuba')}).writtenKey,'C');
 assert.equal(core.generate({concertKey:'C',instrument:inst('tuba'),notation:'alternate'}).writtenKey,'D');
 assert.equal(core.generate({concertKey:'C',instrument:inst('tubamib'),notation:'alternate'}).writtenKey,'A');
 assert.equal(core.generate({concertKey:'C',instrument:inst('viola')}).clef,'alto');
 assert.equal(core.generate({concertKey:'C',instrument:inst('eufonio')}).clef,'bass');
 assert.equal(core.generate({concertKey:'C',instrument:inst('eufonio'),notation:'alternate'}).clef,'treble');
});
test('Configurações inválidas e extensão impossível produzem mensagem',()=>{
 assert.throws(()=>core.generate({concertKey:'Z',instrument:inst('piano')}));
 assert.throws(()=>core.generate({concertKey:'C',instrument:inst('piano'),bpm:0}));
 assert.throws(()=>core.generate({concertKey:'C',instrument:inst('piano'),notation:'alternate'}));
 assert.throws(()=>core.generate({concertKey:'C',instrument:{...inst('piano'),lo:60,hi:66}}),/oitava/);
});
