const {test} = require('node:test');
const assert = require('node:assert/strict');
const {segmentFrames,evaluate,noteName} = require('../site/practice-core.js');
const {detectPitch}=require('../site/tuner.js');
const expected = [60,62,64,65,67,69].map((midi,i)=>({midi,t:i*0.6,dur:0.54,end:i*0.6+0.6,measure:i<3?1:2,event:i}));
const perfect = ()=>expected.map(n=>({...n,pitch:n.midi}));
test('Execução correta: notas, tempo e duração',()=>{
 const r=evaluate(expected,perfect(),{beat:0.6});
 assert.equal(r.pitchScore,100);assert.equal(r.rhythmScore,100);assert.equal(r.coverage,100);
 assert(r.rows.every(n=>n.kind==='good'));
});
test('Nota diferente identificada no compasso certo',()=>{
 const notes=perfect();notes[3].midi=notes[3].pitch=66;
 const r=evaluate(expected,notes);assert.equal(r.rows[3].measure,2);assert.equal(r.rows[3].pitchOK,false);assert.match(r.rows[3].messages.join(),/Nota diferente/);
 assert.equal(r.rows.filter(n=>n.kind==='review').length,1);
});
test('Nota pulada não desloca o alinhamento das seguintes',()=>{
 const notes=perfect();notes.splice(1,1);const r=evaluate(expected,notes);
 assert.equal(r.rows[1].kind,'unknown');assert.equal(r.rows.filter(n=>n.kind==='good').length,5);
});
test('Nota extra não desloca o restante',()=>{
 const notes=perfect();notes.splice(2,0,{t:0.9,dur:0.14,midi:63,pitch:63});
 const r=evaluate(expected,notes);assert.equal(r.rows.filter(n=>n.kind==='extra').length,1);assert.equal(r.rows.filter(n=>n.kind==='good').length,6);
});
test('Entradas adiantadas e atrasadas, duração curta e longa',()=>{
 const notes=perfect();notes[1].t-=0.2;notes[3].t+=0.24;notes[4].dur=0.2;notes[5].dur=0.95;
 const r=evaluate(expected,notes);
 assert.match(r.rows[1].messages.join(),/adiantada/);assert.match(r.rows[3].messages.join(),/atrasada/);
 assert.match(r.rows[4].messages.join(),/curta/);assert.match(r.rows[5].messages.join(),/longa/);
});
test('Afinação é separada de nota errada',()=>{
 const notes=perfect();notes[1].pitch+=0.35;const r=evaluate(expected,notes);
 assert.equal(r.rows[1].pitchOK,true);assert.match(r.rows[1].messages.join(),/afinação acima/);assert.equal(r.pitchScore,100);
});
test('Silêncio não acusa todos os eventos como notas erradas',()=>{
 const r=evaluate(expected,[]);assert.equal(r.usable,false);assert.equal(r.pitchScore,null);assert(r.rows.every(n=>n.kind==='unknown'));
});
test('Notas muito curtas ficam sem avaliação',()=>{
 const short=[{midi:60,t:0,dur:0.1,measure:1}];const r=evaluate(short,[{midi:60,pitch:60,t:0,dur:0.1}]);assert.equal(r.rows[0].kind,'unknown');assert.equal(r.pitchScore,null);
});
test('Segmentação separa mudança de nota e notas repetidas com silêncio',()=>{
 const frames=[];
 for(let t=0;t<1.8;t+=0.04)frames.push({t,pitch:t<0.4?60:t<0.56?null:t<1?60:t<1.12?null:62});
 const notes=segmentFrames(frames);assert.deepEqual(notes.map(n=>n.midi),[60,60,62]);
 assert(Math.abs(notes[1].t-0.56)<0.05);
});
test('Ruído curto não vira evento; valores nulos não viram Dó',()=>{
 assert.deepEqual(segmentFrames([{t:0,pitch:null},{t:0.04,pitch:60},{t:0.08,pitch:null},{t:0.2,pitch:null}]),[]);
});
test('Fluxo completo: formas de onda -> altura -> notas -> avaliação',()=>{
 const frames=[];const rate=48000;
 for(let t=0;t<3.6;t+=0.04){
  const n=expected.find(n=>t>=n.t&&t<n.t+n.dur);
  const freq=n?440*2**((n.midi-69)/12):0;
  const data=Float32Array.from({length:4096},(_,i)=>freq?0.2*Math.sin(2*Math.PI*freq*i/rate):0);
  const f=detectPitch(data,rate);frames.push({t,pitch:f?69+12*Math.log2(f/440):null});
 }
 const r=evaluate(expected,segmentFrames(frames));assert.equal(r.pitchScore,100);assert.equal(r.rhythmScore,100);assert.equal(r.coverage,100);
});
test('Faixa e nomes incluem oitava e sustenidos',()=>{assert.equal(noteName(69),'Lá4');assert.equal(noteName(60),'Dó4');});
test('Limites protegem contra trechos excessivos',()=>{assert.throws(()=>evaluate(Array(601).fill(expected[0]),[]),/longo/);});
