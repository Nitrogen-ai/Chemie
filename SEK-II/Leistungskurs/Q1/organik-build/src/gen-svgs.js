const R = require('./render-core.js');
const fs = require('fs');

// (struct, rep, filename)
const jobs = [
  [R.nAlkanolFull(2,1,'Ethanol'), 'structural', 'ethanol_full'],
  [R.nAlkanolSkeletal(4,1,'Butan-1-ol'), 'skeletal', 'butan1ol_skeletal'],
  [R.nAlkanolSkeletal(5,1,'Pentan-1-ol'), 'skeletal', 'pentan1ol_skeletal'],
  [R.nAlkanolSkeletal(6,1,'Hexan-1-ol'), 'skeletal', 'hexan1ol_skeletal'],
  [R.nAlkaneSkeletal(6,'Hexan'), 'skeletal', 'hexan_skeletal'],
  [R.nAlkaneFull(4,'Butan'), 'structural', 'butan_full'],
  [R.nAldehydeFull(3,'Propanal'), 'structural', 'propanal_full'],
  [R.nKetoneSkeletal(3,2,'Propan-2-on'), 'skeletal', 'aceton_skeletal'],
  [R.nAcidFull(2,'Ethansäure'), 'structural', 'essigsaeure_full'],
  [R.nAcidSkeletal(2,'Ethansäure'), 'skeletal', 'essigsaeure_skeletal'],
  [R.esterSkeletal(2,2,'Ethylacetat'), 'skeletal', 'ethylacetat_skeletal'],
  [R.esterFull(2,2,'Ethylacetat'), 'structural', 'ethylacetat_full'],
  [R.nAlkeneFull(2,1,'Ethen'), 'structural', 'ethen_full'],
  [R.nAlkeneSkeletal(4,1,'But-1-en'), 'skeletal', 'but1en_skeletal'],
  [R.nAlkyneFull(2,1,'Ethin'), 'structural', 'ethin_full'],
  [R.benzeneSkeletal(), 'skeletal', 'benzol_skeletal'],
];

let ok=0;
for (const [st, rep, name] of jobs) {
  const svg = R.svgFor(st, rep);
  if (!svg) { console.log('FAIL', name); continue; }
  fs.writeFileSync('svg/'+name+'.svg', svg);
  ok++;
}
console.log('generated', ok, 'of', jobs.length, 'molecule SVGs');
