/* ============================ UNLOCK / PASSWORD ============================ */
(function(){
  const UNLOCK_ISO = "2026-09-26T07:00:00+02:00";
  const PASSWORD = "Chemieist\u00fcberall.";
  const unlockDate = new Date(UNLOCK_ISO);
  const now = new Date();
  const isUnlocked = now >= unlockDate;
  const statusEl = document.getElementById('status-text');
  const pwZone = document.getElementById('pw-zone');
  const lernpfadEl = document.getElementById('lernpfad');
  document.getElementById('unlock-date').textContent =
    unlockDate.toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'2-digit', year:'numeric'});
  const storageKey = 'lp_unlock_' + window.location.pathname;
  function ssGet(k){ try { return sessionStorage.getItem(k); } catch(e){ return null; } }
  function ssSet(k,v){ try { sessionStorage.setItem(k,v); } catch(e){} }
  const pwUnlocked = ssGet(storageKey) === '1';

  function reveal(prefix){
    lernpfadEl.classList.add('show');
    pwZone.style.display = 'none';
    statusEl.textContent = prefix || 'Verf\u00fcgbar';
    initLernpfad();
  }
  if (isUnlocked) reveal('Verf\u00fcgbar');
  else if (pwUnlocked) reveal('Vorab freigeschaltet');
  else {
    const days = Math.ceil((unlockDate - now) / 86400000);
    statusEl.textContent = days > 0 ? 'Noch ' + days + ' Tag' + (days===1?'':'e') : 'Heute';
  }
  const form = document.getElementById('pw-form');
  const input = document.getElementById('pw-input');
  const feedback = document.getElementById('pw-feedback');
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (input.value === PASSWORD) {
      feedback.textContent = 'Korrekt — Inhalte werden geladen \u2026';
      ssSet(storageKey, '1');
      setTimeout(() => reveal('Vorab freigeschaltet'), 500);
    } else {
      feedback.textContent = 'Passwort nicht korrekt.';
      input.value = ''; input.focus();
      form.animate([{transform:'translateX(0)'},{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}], {duration:280});
    }
  });
})();

/* ============================ INIT ============================ */
function initLernpfad(){
  if (window.__lpInit) return; window.__lpInit = true;
  wireReveals();
  drawAllMolecules();
  drawAllSugars();
  wireSteppers();
  drawPolyene();
  drawAromaten();
}

function wireReveals(){
  document.querySelectorAll('[data-reveal]').forEach(card => {
    const head = card.querySelector('.reveal-head');
    head.addEventListener('click', () => card.classList.toggle('open'));
  });
}

/* ============================ MOLECULES (ported trainer engine) ============================ */
const MOLS = {
  ethanol_full:      () => svgFor(nAlkanolFull(2,1,'Ethanol'), 'structural'),
  butan1ol_skeletal: () => svgFor(nAlkanolSkeletal(4,1,'Butan-1-ol'), 'skeletal'),
  pentan1ol_skeletal:() => svgFor(nAlkanolSkeletal(5,1,'Pentan-1-ol'), 'skeletal'),
  hexan1ol_skeletal: () => svgFor(nAlkanolSkeletal(6,1,'Hexan-1-ol'), 'skeletal'),
  hexan_skeletal:    () => svgFor(nAlkaneSkeletal(6,'Hexan'), 'skeletal'),
  butan_full:        () => svgFor(nAlkaneFull(4,'Butan'), 'structural'),
  propanal_full:     () => svgFor(nAldehydeFull(3,'Propanal'), 'structural'),
  essigsaeure_full:  () => svgFor(nAcidFull(2,'Ethans\u00e4ure'), 'structural'),
  essigsaeure_skeletal: () => svgFor(nAcidSkeletal(2,'Ethans\u00e4ure'), 'skeletal'),
  ethylacetat_skeletal: () => svgFor(esterSkeletal(2,2,'Ethylacetat'), 'skeletal'),
  but1en_skeletal:   () => svgFor(nAlkeneSkeletal(4,1,'But-1-en'), 'skeletal')
};
function drawAllMolecules(){
  document.querySelectorAll('.mol[data-mol]').forEach(el => {
    const fn = MOLS[el.dataset.mol];
    if (fn) { const svg = fn(); if (svg) el.innerHTML = svg; }
  });
}

/* ============================ SUGAR SCHEMATICS ============================ */
const SUG_INK = "#1c1712", SUG_TEAL = "#1e5d52", SUG_RUST = "#a83610", SUG_GOLD = "#c9a961";
function sBond(x1,y1,x2,y2,w){ w=w||5; return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+SUG_INK+'" stroke-width="'+w+'" stroke-linecap="round"/>'; }
function sText(x,y,t,col,fs,bg){ col=col||SUG_INK; fs=fs||21;
  var bgc = bg===false ? '' : '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(fs*0.66*Math.max(1,t.length*0.42)).toFixed(1)+'" fill="#fff"/>';
  return bgc + '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" font-size="'+fs+'" font-family="Helvetica,Arial,sans-serif" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="'+col+'">'+t+'</text>';
}

/* Ring + radiale Substituenten. spec:{cx,cy,r,n,startDeg,oxygenIdx,subs:{idx:[{t,oh,angDeg,L}]},linkIdx,linkTo} */
function buildRing(spec){
  const verts = [];
  for (let i=0;i<spec.n;i++){
    const a = (spec.startDeg + i*360/spec.n) * Math.PI/180;
    verts.push([spec.cx + spec.r*Math.cos(a), spec.cy + spec.r*Math.sin(a), a]);
  }
  const ringBonds = [];
  for (let i=0;i<spec.n;i++){ const A=verts[i], B=verts[(i+1)%spec.n]; ringBonds.push([A[0],A[1],B[0],B[1]]); }
  const subBonds = [], labels = [], ohs = [];
  labels.push({x:verts[spec.oxygenIdx][0], y:verts[spec.oxygenIdx][1], t:"O", col:SUG_INK, fs:22});
  for (const idxStr in (spec.subs||{})){
    const idx = +idxStr; const V = verts[idx];
    for (const s of spec.subs[idxStr]){
      const a = (s.angDeg!=null) ? s.angDeg*Math.PI/180 : V[2];
      const L = s.L || (spec.r*0.72);
      const ex = V[0] + L*Math.cos(a), ey = V[1] + L*Math.sin(a);
      subBonds.push([V[0],V[1],ex,ey]);
      labels.push({x:ex, y:ey, t:s.t, col: s.oh?SUG_RUST:SUG_INK, fs: s.t.length>2?17:20});
      if (s.oh) ohs.push({x:ex, y:ey, ang:a, w:s.t.length});
    }
  }
  if (spec.linkIdx!=null && spec.linkTo){ subBonds.push([verts[spec.linkIdx][0], verts[spec.linkIdx][1], spec.linkTo[0], spec.linkTo[1]]); }
  return {ringBonds, subBonds, labels, ohs, verts};
}

const SUGARS = {
  glucose: () => {
    const r = buildRing({cx:160,cy:172,r:70,n:6,startDeg:-90,oxygenIdx:0,
      subs:{1:[{t:"OH",oh:true}],2:[{t:"OH",oh:true}],3:[{t:"OH",oh:true}],4:[{t:"OH",oh:true}],5:[{t:"CH\u2082OH",oh:true,L:64}]}});
    return {W:320,H:320,parts:[r]};
  },
  fructose: () => {
    const r = buildRing({cx:160,cy:182,r:64,n:5,startDeg:-90,oxygenIdx:0,
      subs:{1:[{t:"OH",oh:true},{t:"CH\u2082OH",oh:true,angDeg:-56,L:78}],2:[{t:"OH",oh:true}],3:[{t:"OH",oh:true}],4:[{t:"CH\u2082OH",oh:true,L:66}]}});
    return {W:320,H:320,parts:[r]};
  },
  maltose: () => {
    const bridge=[300,180];
    const left = buildRing({cx:150,cy:180,r:64,n:6,startDeg:-90,oxygenIdx:0,
      subs:{2:[{t:"OH",oh:true}],3:[{t:"OH",oh:true}],4:[{t:"OH",oh:true}],5:[{t:"CH\u2082OH",oh:true,L:58}]}, linkIdx:1, linkTo:bridge});
    const right = buildRing({cx:450,cy:180,r:64,n:6,startDeg:-90,oxygenIdx:0,
      subs:{1:[{t:"OH",oh:true}],2:[{t:"OH",oh:true}],3:[{t:"OH",oh:true}],5:[{t:"CH\u2082OH",oh:true,L:58}]}, linkIdx:4, linkTo:bridge});
    return {W:600,H:340,parts:[left,right], bridgeO:bridge};
  },
  saccharose: () => {
    const bridge=[302,162];
    const glc = buildRing({cx:150,cy:180,r:64,n:6,startDeg:-90,oxygenIdx:0,
      subs:{2:[{t:"OH",oh:true}],3:[{t:"OH",oh:true}],4:[{t:"OH",oh:true}],5:[{t:"CH\u2082OH",oh:true,L:58}]}, linkIdx:1, linkTo:bridge});
    const frc = buildRing({cx:460,cy:188,r:62,n:5,startDeg:-90,oxygenIdx:0,
      subs:{1:[{t:"CH\u2082OH",oh:true,L:62}],2:[{t:"OH",oh:true}],3:[{t:"OH",oh:true}],4:[{t:"CH\u2082OH",oh:true,angDeg:150,L:76}]}, linkIdx:4, linkTo:bridge});
    return {W:620,H:340,parts:[glc,frc], bridgeO:bridge};
  }
};

function renderSugar(key, stage){
  if (stage < 1){
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">'+
      '<rect x="6" y="6" width="308" height="188" rx="12" fill="#faf7f0" stroke="#cdc6b5" stroke-width="2" stroke-dasharray="7 7"/>'+
      '<text x="160" y="96" font-size="17" font-family="Helvetica,Arial,sans-serif" text-anchor="middle" fill="#8a8275">Strukturformel \u00fcber \u2460 aufdecken</text>'+
      '<text x="160" y="124" font-size="34" text-anchor="middle">\uD83E\uDDEA</text></svg>';
  }
  const data = SUGARS[key](); if (!data) return "";
  let body = "";
  // 1) ring + substituent bonds
  for (const p of data.parts){
    for (const b of p.ringBonds) body += sBond(b[0],b[1],b[2],b[3],5.5);
    for (const b of p.subBonds)  body += sBond(b[0],b[1],b[2],b[3],4.5);
  }
  // 2) hydrogen bonds (stage>=3): dashed line + small H2O tag per OH
  if (stage>=3){
    for (const p of data.parts){
      for (const oh of p.ohs){
        const a = oh.ang;
        const sx = oh.x + 22*Math.cos(a), sy = oh.y + 22*Math.sin(a);
        const wx = oh.x + 50*Math.cos(a), wy = oh.y + 50*Math.sin(a);
        body += '<line x1="'+sx.toFixed(1)+'" y1="'+sy.toFixed(1)+'" x2="'+(wx-6*Math.cos(a)).toFixed(1)+'" y2="'+(wy-6*Math.sin(a)).toFixed(1)+'" stroke="'+SUG_TEAL+'" stroke-width="3" stroke-dasharray="2 6" stroke-linecap="round"/>';
        body += sText(wx, wy, "H\u2082O", SUG_TEAL, 14);
      }
    }
  }
  // 3) labels (ring O, substituents)
  for (const p of data.parts){
    for (const l of p.labels) body += sText(l.x, l.y, l.t, l.col, l.fs);
  }
  // 4) bridge oxygen label (disaccharides)
  if (data.bridgeO) body += sText(data.bridgeO[0], data.bridgeO[1], "O", SUG_INK, 22);
  // 5) OH highlight rings (stage>=2): on top, stroke only
  if (stage>=2){
    for (const p of data.parts){
      for (const oh of p.ohs){
        const rx = (oh.w>2? 44 : 25), ry = 21;
        body += '<ellipse cx="'+oh.x.toFixed(1)+'" cy="'+oh.y.toFixed(1)+'" rx="'+rx+'" ry="'+ry+'" fill="none" stroke="'+SUG_RUST+'" stroke-width="3"/>';
      }
    }
  }
  const PX=34, PT=30, PB=46, VW=data.W+2*PX, VH=data.H+PT+PB;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+(-PX)+' '+(-PT)+' '+VW+' '+VH+'" width="'+VW+'" height="'+VH+'" preserveAspectRatio="xMidYMid meet"><rect x="'+(-PX)+'" y="'+(-PT)+'" width="'+VW+'" height="'+VH+'" fill="#fff"/>'+body+'</svg>';
}

function drawAllSugars(){
  document.querySelectorAll('.sugar-fig[data-sugar]').forEach(el => {
    const stage = parseInt(el.dataset.stage || '1', 10);
    el.innerHTML = renderSugar(el.dataset.sugar, stage);
  });
}

function wireSteppers(){
  document.querySelectorAll('[data-stepper]').forEach(row => {
    const fig = row.parentElement.querySelector('.sugar-fig');
    const btns = Array.from(row.querySelectorAll('[data-step]'));
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const step = parseInt(btn.dataset.step, 10);
        fig.dataset.stage = String(step);
        fig.innerHTML = renderSugar(fig.dataset.sugar, step);
        btns.forEach(b => b.classList.toggle('on', parseInt(b.dataset.step,10) <= step));
      });
    });
  });
}

/* ============================ CONJUGATED POLYENE (A5) ============================ */
function drawPolyene(){
  const el = document.getElementById('polyene-fig'); if (!el) return;
  const n = 9, L = 70, dx = L*Math.sin(Math.PI/3), dy = L*Math.cos(Math.PI/3);
  const pts = [];
  let x = 40, y = 120;
  for (let i=0;i<n;i++){ pts.push([x,y]); x += dx; y = (i%2===0) ? 120+dy : 120; }
  let body = '';
  for (let i=0;i<n-1;i++){
    const A=pts[i], B=pts[i+1];
    const dbl = (i%2===0); // alternierend Doppel-/Einfachbindung
    if (dbl){
      const mx=-(B[1]-A[1]), my=(B[0]-A[0]); const ml=Math.hypot(mx,my); const ox=mx/ml*6, oy=my/ml*6;
      body += '<line x1="'+(A[0]+ox)+'" y1="'+(A[1]+oy)+'" x2="'+(B[0]+ox)+'" y2="'+(B[1]+oy)+'" stroke="#1c1712" stroke-width="5" stroke-linecap="round"/>';
      body += '<line x1="'+(A[0]-ox)+'" y1="'+(A[1]-oy)+'" x2="'+(B[0]-ox)+'" y2="'+(B[1]-oy)+'" stroke="#1c1712" stroke-width="5" stroke-linecap="round"/>';
    } else {
      body += '<line x1="'+A[0]+'" y1="'+A[1]+'" x2="'+B[0]+'" y2="'+B[1]+'" stroke="#1c1712" stroke-width="5" stroke-linecap="round"/>';
    }
  }
  const W = pts[n-1][0]+40, H = 200;
  body += '<text x="'+(W/2)+'" y="185" font-size="17" font-family="Helvetica,Arial,sans-serif" text-anchor="middle" fill="#a83610">konjugiert: \u03C0-Elektronen \u00fcber die ganze Kette delokalisiert</text>';
  el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" preserveAspectRatio="xMidYMid meet"><rect width="'+W+'" height="'+H+'" fill="#fff"/>'+body+'</svg>';
}

/* ============================ AROMATEN ============================ */
function hexRing(cx, cy, r, withCircle){
  let pts = [];
  for (let i=0;i<6;i++){ const a=(-90+i*60)*Math.PI/180; pts.push([cx+r*Math.cos(a), cy+r*Math.sin(a)]); }
  let s = '';
  for (let i=0;i<6;i++){ const A=pts[i],B=pts[(i+1)%6]; s += '<line x1="'+A[0].toFixed(1)+'" y1="'+A[1].toFixed(1)+'" x2="'+B[0].toFixed(1)+'" y2="'+B[1].toFixed(1)+'" stroke="#1c1712" stroke-width="5" stroke-linecap="round"/>'; }
  if (withCircle) s += '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r*0.56)+'" fill="none" stroke="#1c1712" stroke-width="4"/>';
  return s;
}
function drawAromaten(){
  const el = document.getElementById('aromaten-fig'); if (!el) return;
  const r = 46, step = r*Math.sqrt(3), W = 700, H = 230, cy = 120;
  let body = '';
  // Benzol
  let bx = 70; body += hexRing(bx, cy, r, true);
  body += '<text x="'+bx+'" y="'+(cy+r+34)+'" font-size="16" font-family="Helvetica,Arial,sans-serif" text-anchor="middle" fill="#6c6358">Benzol</text>';
  // Naphthalin (2 fused)
  let nx = 250; body += hexRing(nx, cy, r, true) + hexRing(nx+step, cy, r, true);
  body += '<text x="'+(nx+step/2)+'" y="'+(cy+r+34)+'" font-size="16" font-family="Helvetica,Arial,sans-serif" text-anchor="middle" fill="#6c6358">Naphthalin</text>';
  // Anthracen (3 fused)
  let ax = 470; body += hexRing(ax, cy, r, true) + hexRing(ax+step, cy, r, true) + hexRing(ax+2*step, cy, r, true);
  body += '<text x="'+(ax+step)+'" y="'+(cy+r+34)+'" font-size="16" font-family="Helvetica,Arial,sans-serif" text-anchor="middle" fill="#6c6358">Anthracen</text>';
  el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" preserveAspectRatio="xMidYMid meet"><rect width="'+W+'" height="'+H+'" fill="#fff"/>'+body+'</svg>';
}
