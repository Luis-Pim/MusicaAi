const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const instruments=JSON.parse(html.match(/id="instrument-data">([\s\S]*?)<\/script>/)[1]);
test('Novos instrumentos têm transposição de nota e oitava corretas',()=>{
 for(const [id,transpose] of [['saxsoprano',-2],['saxbaritono',-21],['corneingles',-7],['oboedamore',-3],['clarinetealto',-9],['clarinetebaixo',-14],['trompetedo',0],['cornet',-2],['flugelhorn',-2],['trompa',-7],['trompasib',-2],['trombone',0],['eufonio',0],['tuba',0],['tubado',0],['tubamib',0],['tubafa',0]]) {
  const inst=instruments.find(i=>i.id===id);assert(inst);assert.equal(inst.transp,transpose);
 }
 assert.equal(new Set(instruments.map(i=>i.id)).size,instruments.length);
});
test('Todos os instrumentos têm as amostras requeridas pelo player',()=>{
 const names=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
 for(const inst of instruments){
  const midis=inst.fixed?[inst.fixed]:Array.from({length:88},(_,i)=>i+21).filter(m=>m>=inst.lo-2&&m<=inst.hi+2&&m%3===0);
  for(const m of midis){const file=path.join(__dirname,'../site/samples',inst.dir,`${names[m%12]}${Math.floor(m/12)-1}.mp3`);assert(fs.existsSync(file),file);assert(fs.statSync(file).size>0);}
 }
});

test('Metais graves têm notação alternativa explícita, sem transpor a parte em som real',()=>{
 for(const [id,shift] of [['trombone',-14],['eufonio',-14],['tuba',-26],['tubamib',-21]]){
  const inst=instruments.find(i=>i.id===id);assert.equal(inst.transp,0);assert.equal(inst.alternateTransp,shift);assert(inst.alternateLabel);
 }
});
