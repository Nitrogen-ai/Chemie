const F = require('./figures.js');
const fs = require('fs');
const out = {
  'fig_partialladung': F.legendPartial(),
  'fig_dipol_dipol': F.dipoleDipole(),
  'fig_oh_solvatation': F.ohSolvation(),
  'fig_schluessel_schloss': F.lockKey(),
};
for (const [k,v] of Object.entries(out)) fs.writeFileSync('svg/'+k+'.svg', v);
console.log('wrote', Object.keys(out).length, 'figures');
