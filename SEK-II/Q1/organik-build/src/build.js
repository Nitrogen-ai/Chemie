const fs = require('fs');
const F = require('./figures.js');

// 1) renderer core (strip the Node export block)
let core = fs.readFileSync('render-core.js','utf8');
core = core.split('/* ---------- Export (Node) ---------- */')[0];

// 2) app code
const app = fs.readFileSync('app.js','utf8');

// 3) figures (generated fresh from figures.js)
const figs = {
  '<!--FIG_PARTIAL-->': F.legendPartial(),
  '<!--FIG_DIPOL-->':   F.dipoleDipole(),
  '<!--FIG_OHSOLV-->':  F.ohSolvation(),
  '<!--FIG_LOCKKEY-->': F.lockKey()
};

let html = fs.readFileSync('lernpfad-03-organik.html','utf8');
html = html.replace('/*__RENDER_CORE__*/', () => core);
html = html.replace('/*__APP_JS__*/', () => app);
for (const [marker, svg] of Object.entries(figs)) html = html.replace(marker, () => svg);

// sanity: no leftover markers
['/*__RENDER_CORE__*/','/*__APP_JS__*/','<!--FIG_PARTIAL-->','<!--FIG_DIPOL-->','<!--FIG_OHSOLV-->','<!--FIG_LOCKKEY-->']
  .forEach(m => { if (html.includes(m)) console.log('WARN leftover marker:', m); });

fs.writeFileSync('lernpfad-03-organik.final.html', html);
console.log('built final HTML:', html.length, 'bytes');
