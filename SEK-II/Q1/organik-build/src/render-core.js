/* =====================================================================
   render-core.js  —  Strukturformel-Renderer
   Portiert aus dem Chemical Communication Trainer (nitrogen-ai/training).
   Liefert exakt dieselben SVG-Grafiken wie der Trainer, damit Lernpfad,
   Übungsaufgaben und Typst-Mitschrift/Musterlösung konsistent sind.
   Reine Funktionen (kein DOM) -> in Node UND im Browser nutzbar.
   ===================================================================== */
"use strict";

const SIN60 = Math.sin(Math.PI/3);   // 0.866
const COS60 = Math.cos(Math.PI/3);   // 0.5

function sub(n){ const m="₀₁₂₃₄₅₆₇₈₉"; return String(n).split('').map(d=>m[+d]).join(''); }

/* ---------- Methan ---------- */
function methaneStruct() {
  return {
    atoms:[
      {e:"C", x:0, y:0, lp:0},
      {e:"H", x:0, y:-1, lp:0},
      {e:"H", x:1, y:0, lp:0},
      {e:"H", x:0, y:1, lp:0},
      {e:"H", x:-1, y:0, lp:0}
    ],
    bonds:[{a:0,b:1,o:1},{a:0,b:2,o:1},{a:0,b:3,o:1},{a:0,b:4,o:1}],
    name:"Methan", formula:"CH₄"
  };
}

/* ---------- Alkane ---------- */
function alkaneFormula(n) { return "C"+(n===1?"":sub(n))+"H"+sub(2*n+2); }
function nAlkaneFull(n, name) {
  if (n < 1) return null;
  const atoms = [], bonds = [];
  for (let i=0; i<n; i++) atoms.push({e:"C", x:i, y:0, lp:0});
  for (let i=0; i<n-1; i++) bonds.push({a:i, b:i+1, o:1});
  for (let i=0; i<n; i++) {
    atoms.push({e:"H", x:i, y:-1, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1});
    atoms.push({e:"H", x:i, y:1, lp:0});  bonds.push({a:i, b:atoms.length-1, o:1});
    if (i===0)   { atoms.push({e:"H", x:-1, y:0, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1}); }
    if (i===n-1) { atoms.push({e:"H", x:n,  y:0, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1}); }
  }
  return {atoms, bonds, name, formula: alkaneFormula(n)};
}
function nAlkaneSkeletal(n, name) {
  if (n < 3) return null;
  const atoms = [], bonds = [];
  for (let i=0; i<n; i++) atoms.push({e:"C", x: i*SIN60, y: (i%2===0 ? 0 : COS60), lp:0, hidden:true});
  for (let i=0; i<n-1; i++) bonds.push({a:i, b:i+1, o:1});
  return {atoms, bonds, name, formula: alkaneFormula(n)};
}

/* ---------- Alkanole ---------- */
function nAlkanolFull(n, pos, name) {
  const base = nAlkaneFull(n, "");
  const cIdx = pos - 1;
  let killIdx = -1;
  for (let i=n; i<base.atoms.length; i++) {
    if (base.atoms[i].e === "H" && base.atoms[i].x === cIdx && base.atoms[i].y === 1) { killIdx = i; break; }
  }
  if (killIdx < 0) {
    for (let i=n; i<base.atoms.length; i++) {
      if (base.atoms[i].e === "H" && base.atoms[i].x === cIdx) { killIdx = i; break; }
    }
  }
  base.bonds = base.bonds.filter(b => b.a !== killIdx && b.b !== killIdx);
  base.atoms[killIdx] = {e:"O", x:cIdx, y:1, lp:2};
  base.bonds.push({a:cIdx, b:killIdx, o:1});
  base.atoms.push({e:"H", x:cIdx, y:2, lp:0});
  base.bonds.push({a:killIdx, b:base.atoms.length-1, o:1});
  base.name = name;
  base.formula = "C"+(n===1?"":sub(n))+"H"+sub(2*n+2)+"O";
  return base;
}
function nAlkanolSkeletal(n, pos, name) {
  if (n < 3) return null;
  const sk = nAlkaneSkeletal(n, name);
  const cIdx = pos - 1;
  const cAt = sk.atoms[cIdx];
  const dy = (cIdx % 2 === 0) ? -1 : +1;
  const oxN = sk.atoms.length;
  sk.atoms.push({e:"O", x: cAt.x, y: cAt.y + dy, lp:2});
  sk.bonds.push({a: cIdx, b: oxN, o:1});
  sk.atoms.push({e:"H", x: cAt.x + SIN60, y: cAt.y + dy + dy*COS60, lp:0});
  sk.bonds.push({a: oxN, b: sk.atoms.length-1, o:1});
  sk.name = name;
  sk.formula = "C"+(n===1?"":sub(n))+"H"+sub(2*n+2)+"O";
  return sk;
}

/* ---------- Alkansäuren ---------- */
function acidFormula(n) { return "C"+(n===1?"":sub(n))+"H"+sub(2*n)+"O₂"; }
function nAcidFull(n, name) {
  if (n < 1) return null;
  const atoms = [], bonds = [];
  for (let i=0; i<n; i++) atoms.push({e:"C", x:i, y:0, lp:0});
  for (let i=0; i<n-1; i++) bonds.push({a:i, b:i+1, o:1});
  for (let i=0; i<n-1; i++) {
    atoms.push({e:"H", x:i, y:-1, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1});
    atoms.push({e:"H", x:i, y:1, lp:0});  bonds.push({a:i, b:atoms.length-1, o:1});
    if (i===0) { atoms.push({e:"H", x:-1, y:0, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1}); }
  }
  const cc = n-1;
  const iOdb = atoms.length;
  atoms.push({e:"O", x: cc + COS60, y: -SIN60, lp:2});
  bonds.push({a:cc, b:iOdb, o:2});
  const iOH = atoms.length;
  atoms.push({e:"O", x: cc + COS60, y: SIN60, lp:2});
  bonds.push({a:cc, b:iOH, o:1});
  atoms.push({e:"H", x: cc + 2*COS60, y: 2*SIN60, lp:0});
  bonds.push({a:iOH, b:atoms.length-1, o:1});
  if (n===1) {
    atoms.push({e:"H", x:-1, y:0, lp:0});
    bonds.push({a:0, b:atoms.length-1, o:1});
  }
  return {atoms, bonds, name, formula: acidFormula(n)};
}
function nAcidSkeletal(n, name) {
  if (n < 1) return null;
  const atoms = [], bonds = [];
  for (let i=0; i<n; i++) atoms.push({e:"C", x: i*SIN60, y: (i%2===0 ? 0 : COS60), lp:0, hidden:true});
  for (let i=0; i<n-1; i++) bonds.push({a:i, b:i+1, o:1});
  const last = atoms[n-1];
  let base;
  if (n >= 2) { const prev = atoms[n-2]; base = Math.atan2(last.y - prev.y, last.x - prev.x); }
  else { base = 0; }
  const angA = base + Math.PI/3, angB = base - Math.PI/3;
  let dbAng, ohAng;
  if (Math.sin(angA) < Math.sin(angB)) { dbAng = angA; ohAng = angB; }
  else { dbAng = angB; ohAng = angA; }
  const oDb = atoms.length;
  atoms.push({e:"O", x: last.x + Math.cos(dbAng), y: last.y + Math.sin(dbAng), lp:2});
  bonds.push({a: n-1, b: oDb, o:2});
  const oH = atoms.length;
  atoms.push({e:"O", x: last.x + Math.cos(ohAng), y: last.y + Math.sin(ohAng), lp:2});
  bonds.push({a: n-1, b: oH, o:1});
  const oxAt = atoms[oH];
  atoms.push({e:"H", x: oxAt.x + Math.cos(ohAng), y: oxAt.y + Math.sin(ohAng), lp:0});
  bonds.push({a: oH, b: atoms.length-1, o:1});
  if (n === 1) {
    atoms.push({e:"H", x: atoms[0].x - 1, y: atoms[0].y, lp:0});
    bonds.push({a: 0, b: atoms.length-1, o:1});
  }
  return {atoms, bonds, name, formula: acidFormula(n)};
}

/* ---------- Alkanale ---------- */
function aldehydeFormula(n) { return "C"+(n===1?"":sub(n))+"H"+sub(2*n)+"O"; }
function nAldehydeFull(n, name) {
  if (n < 1) return null;
  const atoms = [], bonds = [];
  for (let i=0; i<n; i++) atoms.push({e:"C", x:i, y:0, lp:0});
  for (let i=0; i<n-1; i++) bonds.push({a:i, b:i+1, o:1});
  for (let i=0; i<n-1; i++) {
    atoms.push({e:"H", x:i, y:-1, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1});
    atoms.push({e:"H", x:i, y:1, lp:0});  bonds.push({a:i, b:atoms.length-1, o:1});
    if (i===0) { atoms.push({e:"H", x:-1, y:0, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1}); }
  }
  const cc = n-1;
  atoms.push({e:"O", x: cc + COS60, y: -SIN60, lp:2});
  bonds.push({a:cc, b:atoms.length-1, o:2});
  atoms.push({e:"H", x: cc + COS60, y: SIN60, lp:0});
  bonds.push({a:cc, b:atoms.length-1, o:1});
  if (n===1) { atoms.push({e:"H", x:-1, y:0, lp:0}); bonds.push({a:0, b:atoms.length-1, o:1}); }
  return {atoms, bonds, name, formula: aldehydeFormula(n)};
}
function nAldehydeSkeletal(n, name) {
  if (n < 1) return null;
  const atoms = [], bonds = [];
  for (let i=0; i<n; i++) atoms.push({e:"C", x: i*SIN60, y: (i%2===0 ? 0 : COS60), lp:0, hidden:true});
  for (let i=0; i<n-1; i++) bonds.push({a:i, b:i+1, o:1});
  const lastIdx = n - 1, last = atoms[lastIdx];
  const dy = (lastIdx % 2 === 0) ? -1 : +1;
  const oDb = atoms.length;
  atoms.push({e:"O", x: last.x + COS60, y: last.y + dy*SIN60, lp:2});
  bonds.push({a: lastIdx, b: oDb, o:2});
  atoms.push({e:"H", x: last.x + COS60, y: last.y - dy*SIN60, lp:0});
  bonds.push({a: lastIdx, b: atoms.length-1, o:1});
  if (n === 1) { atoms.push({e:"H", x: last.x - 1, y: last.y, lp:0}); bonds.push({a: lastIdx, b: atoms.length-1, o:1}); }
  return {atoms, bonds, name, formula: aldehydeFormula(n)};
}

/* ---------- Alkanone ---------- */
function ketoneFormula(n) { return "C"+sub(n)+"H"+sub(2*n)+"O"; }
function nKetoneFull(n, pos, name) {
  if (n < 3 || pos < 2 || pos > n-1) return null;
  const atoms = [], bonds = [];
  for (let i=0; i<n; i++) atoms.push({e:"C", x:i, y:0, lp:0});
  for (let i=0; i<n-1; i++) bonds.push({a:i, b:i+1, o:1});
  const cc = pos - 1;
  for (let i=0; i<n; i++) {
    if (i === cc) continue;
    atoms.push({e:"H", x:i, y:-1, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1});
    atoms.push({e:"H", x:i, y:1, lp:0});  bonds.push({a:i, b:atoms.length-1, o:1});
    if (i===0)   { atoms.push({e:"H", x:-1, y:0, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1}); }
    if (i===n-1) { atoms.push({e:"H", x:n,  y:0, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1}); }
  }
  atoms.push({e:"O", x:cc, y:-1, lp:2});
  bonds.push({a:cc, b:atoms.length-1, o:2});
  return {atoms, bonds, name, formula: ketoneFormula(n)};
}
function nKetoneSkeletal(n, pos, name) {
  if (n < 3) return null;
  const sk = nAlkaneSkeletal(n, name);
  const cc = pos - 1;
  const cAt = sk.atoms[cc];
  const dy = (cc % 2 === 0) ? -1 : +1;
  sk.atoms.push({e:"O", x: cAt.x, y: cAt.y + dy, lp:2});
  sk.bonds.push({a: cc, b: sk.atoms.length-1, o:2});
  sk.name = name; sk.formula = ketoneFormula(n);
  return sk;
}

/* ---------- Alkene ---------- */
function nAlkeneFull(n, pos, name) {
  if (n < 2 || pos < 1 || pos > n-1) return null;
  const dbA = pos - 1, dbB = pos;
  const atoms = [], bonds = [];
  for (let i=0; i<n; i++) atoms.push({e:"C", x:i, y:0, lp:0});
  for (let i=0; i<n-1; i++) bonds.push({a:i, b:i+1, o: (i===dbA ? 2 : 1)});
  for (let i=0; i<n; i++) {
    const isLeft = (i===0), isRight = (i===n-1);
    const isSp2 = (i===dbA || i===dbB);
    if (isSp2) {
      const isTerminal = (i===dbA && isLeft) || (i===dbB && isRight);
      if (isTerminal) {
        const dx = (i===dbA) ? -COS60 : +COS60;
        atoms.push({e:"H", x: i + dx, y: -SIN60, lp:0}); bonds.push({a:i, b: atoms.length-1, o:1});
        atoms.push({e:"H", x: i + dx, y:  SIN60, lp:0}); bonds.push({a:i, b: atoms.length-1, o:1});
      } else {
        atoms.push({e:"H", x: i, y: -1, lp:0}); bonds.push({a:i, b: atoms.length-1, o:1});
      }
    } else {
      atoms.push({e:"H", x:i, y:-1, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1});
      atoms.push({e:"H", x:i, y: 1, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1});
      if (isLeft)  { atoms.push({e:"H", x:i-1, y:0, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1}); }
      if (isRight) { atoms.push({e:"H", x:i+1, y:0, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1}); }
    }
  }
  return {atoms, bonds, name, formula: "C"+(n===1?"":sub(n))+"H"+sub(2*n)};
}
function nAlkeneSkeletal(n, pos, name) {
  if (n < 4) return null;
  const sk = nAlkaneSkeletal(n, name);
  for (const b of sk.bonds) {
    if ((b.a === pos-1 && b.b === pos) || (b.a === pos && b.b === pos-1)) { b.o = 2; break; }
  }
  sk.formula = "C"+(n===1?"":sub(n))+"H"+sub(2*n);
  return sk;
}

/* ---------- Alkine ---------- */
function nAlkyneFull(n, pos, name) {
  if (n < 2 || pos < 1 || pos > n-1) return null;
  const dbA = pos - 1, dbB = pos;
  const atoms = [], bonds = [];
  for (let i=0; i<n; i++) atoms.push({e:"C", x:i, y:0, lp:0});
  for (let i=0; i<n-1; i++) bonds.push({a:i, b:i+1, o: (i===dbA ? 3 : 1)});
  for (let i=0; i<n; i++) {
    const isLeft = (i===0), isRight = (i===n-1);
    const isSp = (i===dbA || i===dbB);
    if (isSp) {
      if (i===dbA && isLeft)  { atoms.push({e:"H", x:-1, y:0, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1}); }
      if (i===dbB && isRight) { atoms.push({e:"H", x:n,  y:0, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1}); }
    } else {
      atoms.push({e:"H", x:i, y:-1, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1});
      atoms.push({e:"H", x:i, y:1, lp:0});  bonds.push({a:i, b:atoms.length-1, o:1});
      if (isLeft)  { atoms.push({e:"H", x:-1, y:0, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1}); }
      if (isRight) { atoms.push({e:"H", x:n,  y:0, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1}); }
    }
  }
  return {atoms, bonds, name, formula: "C"+(n===1?"":sub(n))+"H"+sub(2*n-2)};
}
function nAlkyneSkeletal(n, pos, name) {
  if (n < 4) return null;
  const atoms = [], bonds = [];
  let x = 0, y = 0;
  atoms.push({e:"C", x, y, lp:0, hidden:true});
  let dirUp = true;
  for (let i = 1; i < n; i++) {
    const bondIdxA = i-1, bondIdxB = i;
    const isTripleBond = (bondIdxA === pos-1 && bondIdxB === pos);
    const prevWasTriple = (i-1 === pos);
    const nextIsTriple = (i === pos-1);
    let dx, dy;
    if (isTripleBond || prevWasTriple || nextIsTriple) { dx = 1; dy = 0; }
    else { dx = SIN60; dy = dirUp ? -COS60 : COS60; dirUp = !dirUp; }
    x += dx; y += dy;
    atoms.push({e:"C", x, y, lp:0, hidden:true});
    bonds.push({a: bondIdxA, b: bondIdxB, o: isTripleBond ? 3 : 1});
  }
  return {atoms, bonds, name, formula: "C"+(n===1?"":sub(n))+"H"+sub(2*n-2)};
}

/* ---------- Ester ---------- */
function esterFull(nA, nB, name) {
  if (nA < 1 || nB < 1) return null;
  const atoms = [], bonds = [];
  for (let i=0; i<nA; i++) atoms.push({e:"C", x:i, y:0, lp:0});
  for (let i=0; i<nA-1; i++) bonds.push({a:i, b:i+1, o:1});
  for (let i=0; i<nA-1; i++) {
    atoms.push({e:"H", x:i, y:-1, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1});
    atoms.push({e:"H", x:i, y:1, lp:0});  bonds.push({a:i, b:atoms.length-1, o:1});
    if (i===0) { atoms.push({e:"H", x:-1, y:0, lp:0}); bonds.push({a:i, b:atoms.length-1, o:1}); }
  }
  if (nA === 1) { atoms.push({e:"H", x:-1, y:0, lp:0}); bonds.push({a:0, b:atoms.length-1, o:1}); }
  const cc = nA - 1;
  const iOdb = atoms.length;
  atoms.push({e:"O", x: cc, y: -1, lp:2});
  bonds.push({a:cc, b:iOdb, o:2});
  const iOe = atoms.length;
  atoms.push({e:"O", x: cc + 1, y: 0, lp:2});
  bonds.push({a:cc, b:iOe, o:1});
  const offsetX = cc + 2;
  const cRStart = atoms.length;
  for (let j=0; j<nB; j++) atoms.push({e:"C", x: offsetX + j, y:0, lp:0});
  bonds.push({a:iOe, b:cRStart, o:1});
  for (let j=0; j<nB-1; j++) bonds.push({a:cRStart+j, b:cRStart+j+1, o:1});
  for (let j=0; j<nB; j++) {
    const idx = cRStart + j;
    atoms.push({e:"H", x: offsetX + j, y:-1, lp:0}); bonds.push({a:idx, b:atoms.length-1, o:1});
    atoms.push({e:"H", x: offsetX + j, y:1, lp:0});  bonds.push({a:idx, b:atoms.length-1, o:1});
    if (j===nB-1) { atoms.push({e:"H", x: offsetX + j + 1, y:0, lp:0}); bonds.push({a:idx, b:atoms.length-1, o:1}); }
  }
  const totalC = nA + nB, totalH = 2*nA + 2*nB;
  return {atoms, bonds, name, formula: "C"+sub(totalC)+"H"+sub(totalH)+"O₂"};
}
function esterSkeletal(nA, nB, name) {
  if (nA < 1 || nB < 1) return null;
  const atoms = [], bonds = [];
  for (let i=0; i<nA; i++) atoms.push({e:"C", x: i*SIN60, y: (i%2===0 ? 0 : COS60), lp:0, hidden:true});
  for (let i=0; i<nA-1; i++) bonds.push({a:i, b:i+1, o:1});
  const ccIdx = nA - 1, ccAt = atoms[ccIdx];
  const dyO = (ccIdx % 2 === 0) ? -1 : +1;
  atoms.push({e:"O", x: ccAt.x, y: ccAt.y + dyO, lp:2});
  bonds.push({a: ccIdx, b: atoms.length-1, o:2});
  const nextY = (nA % 2 === 0) ? 0 : COS60;
  const oeAt = {e:"O", x: nA * SIN60, y: nextY, lp:2};
  const oeIdx = atoms.length;
  atoms.push(oeAt);
  bonds.push({a: ccIdx, b: oeIdx, o:1});
  for (let j=0; j<nB; j++) {
    const totalI = nA + 1 + j;
    atoms.push({e:"C", x: totalI * SIN60, y: (totalI % 2 === 0) ? 0 : COS60, lp:0, hidden:true});
    bonds.push({a: (j===0 ? oeIdx : atoms.length-2), b: atoms.length-1, o:1});
  }
  const totalC = nA + nB, totalH = 2*nA + 2*nB;
  if (nA === 1) { atoms.push({e:"H", x: ccAt.x - 1, y: ccAt.y, lp:0}); bonds.push({a: ccIdx, b: atoms.length-1, o:1}); }
  return {atoms, bonds, name, formula: "C"+sub(totalC)+"H"+sub(totalH)+"O₂"};
}

/* ---------- Benzol ---------- */
function benzeneStruct() {
  const atoms=[], bonds=[]; const r = 1;
  for (let i=0; i<6; i++) { const ang = -Math.PI/2 + i*Math.PI/3; atoms.push({e:"C", x: r*Math.cos(ang), y: r*Math.sin(ang), lp:0}); }
  for (let i=0; i<6; i++) bonds.push({a:i, b:(i+1)%6, o: (i%2===0?2:1)});
  for (let i=0; i<6; i++) {
    const ang = -Math.PI/2 + i*Math.PI/3; const hr = r+1;
    atoms.push({e:"H", x: hr*Math.cos(ang), y: hr*Math.sin(ang), lp:0});
    bonds.push({a:i, b:atoms.length-1, o:1});
  }
  return {atoms, bonds, name:"Benzol", formula:"C₆H₆"};
}
function benzeneSkeletal() {
  const atoms=[], bonds=[]; const r = 1;
  for (let i=0; i<6; i++) { const ang = -Math.PI/2 + i*Math.PI/3; atoms.push({e:"C", x: r*Math.cos(ang), y: r*Math.sin(ang), lp:0, hidden:true}); }
  for (let i=0; i<6; i++) bonds.push({a:i, b:(i+1)%6, o: (i%2===0?2:1)});
  return {atoms, bonds, name:"Benzol", formula:"C₆H₆"};
}

/* =====================================================================
   RENDERER
   ===================================================================== */
const VB = 1000, MARGIN = 90, BOND_MIN = 60, BOND_MAX = 180;

function render(struct, opts) {
  if (!struct) return null;
  let {atoms, bonds} = struct;
  const showLP = !!opts.showLP, showH = !!opts.showH;
  const lpLine = (opts.lpStyle === "lines");
  const isSkel = (opts.mode === "skeletal");
  const visible = atoms.map(a => {
    if (a.hidden) return false;
    if (a.e === "H" && !showH && !isSkel) return false;
    return true;
  });
  let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
  for (let i=0; i<atoms.length; i++) {
    if (!visible[i] && atoms[i].e === "H" && !isSkel) continue;
    const a = atoms[i];
    if (a.x < minX) minX = a.x; if (a.x > maxX) maxX = a.x;
    if (a.y < minY) minY = a.y; if (a.y > maxY) maxY = a.y;
  }
  const w = maxX - minX, h = maxY - minY, inner = VB - 2*MARGIN;
  let scale;
  if (w < 0.01 && h < 0.01) scale = BOND_MAX;
  else scale = Math.min(inner / Math.max(w, 0.01), inner / Math.max(h, 0.01));
  scale = Math.max(BOND_MIN, Math.min(BOND_MAX, scale));
  const bondLen = scale;
  const stroke = Math.max(3.5, bondLen * 0.055);
  const fontSize = Math.max(24, bondLen * 0.40);
  const lpDot = Math.max(3, bondLen * 0.05);
  const lpSep = bondLen * 0.18, lpDist = bondLen * 0.34, labelPad = bondLen * 0.22;
  const dbOff = bondLen * 0.13, tbOff = bondLen * 0.16;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const toX = x => VB/2 + (x - cx) * scale;
  const toY = y => VB/2 + (y - cy) * scale;

  const bondParts = [];
  const line = (x1,y1,x2,y2) =>
    `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#1c1712" stroke-width="${stroke.toFixed(2)}" stroke-linecap="round"/>`;
  for (const b of bonds) {
    const A = atoms[b.a], B = atoms[b.b];
    if (A.e === "H" && !visible[b.a]) continue;
    if (B.e === "H" && !visible[b.b]) continue;
    const x1 = toX(A.x), y1 = toY(A.y), x2 = toX(B.x), y2 = toY(B.y);
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    const ux = dx/len, uy = dy/len;
    const padA = visible[b.a] ? labelPad : 0, padB = visible[b.b] ? labelPad : 0;
    const a0x = x1 + ux*padA, a0y = y1 + uy*padA, b0x = x2 - ux*padB, b0y = y2 - uy*padB;
    const px = -uy, py = ux;
    if (b.o === 1) { bondParts.push(line(a0x, a0y, b0x, b0y)); }
    else if (b.o === 2) {
      const off = dbOff;
      bondParts.push(line(a0x - px*off, a0y - py*off, b0x - px*off, b0y - py*off));
      bondParts.push(line(a0x + px*off, a0y + py*off, b0x + px*off, b0y + py*off));
    } else if (b.o === 3) {
      const off = tbOff;
      bondParts.push(line(a0x, a0y, b0x, b0y));
      bondParts.push(line(a0x - px*off, a0y - py*off, b0x - px*off, b0y - py*off));
      bondParts.push(line(a0x + px*off, a0y + py*off, b0x + px*off, b0y + py*off));
    }
  }

  const atomParts = [];
  for (let i=0; i<atoms.length; i++) {
    const a = atoms[i]; if (!visible[i]) continue;
    const x = toX(a.x), y = toY(a.y);
    const r = Math.max(fontSize * 0.55, fontSize * 0.30 * a.e.length);
    atomParts.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="#ffffff"/>`);
    atomParts.push(
      `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-size="${fontSize.toFixed(2)}" `+
      `font-family="'Helvetica Neue',Helvetica,Arial,sans-serif" font-weight="500" `+
      `text-anchor="middle" dominant-baseline="central" fill="#1c1712">${a.e}</text>`);
  }

  const lpParts = [], chargeParts = [];
  for (let i=0; i<atoms.length; i++) {
    const a = atoms[i]; if (!visible[i]) continue;
    const hasLP = !!(a.lp && a.lp > 0), hasUnpaired = !!a.unpaired, hasCharge = !!a.charge;
    if (!hasLP && !hasUnpaired && !hasCharge) continue;
    const bondAng = [];
    for (const b of bonds) {
      if (b.a === i) bondAng.push(Math.atan2(atoms[b.b].y - a.y, atoms[b.b].x - a.x));
      else if (b.b === i) bondAng.push(Math.atan2(atoms[b.a].y - a.y, atoms[b.a].x - a.x));
    }
    let maxO = 1;
    for (const b of bonds) { if ((b.a===i||b.b===i) && b.o>maxO) maxO=b.o; }
    let nOrb; if (maxO === 3) nOrb = 2; else if (maxO === 2) nOrb = 3; else nOrb = 4;
    const nLp = a.lp || 0;
    const lpAngles = (showLP && nLp > 0) ? computeLPAngles(bondAng, nOrb, nLp) : [];
    const ax = toX(a.x), ay = toY(a.y);
    if (showLP) for (const ang of lpAngles) drawLP(lpParts, ax, ay, ang, lpDist, lpSep, lpDot, stroke, lpLine);
    const unpairedAngs = [];
    if (hasUnpaired && showLP) {
      const nUnpaired = (typeof a.unpaired === "number") ? a.unpaired : 1;
      for (let u=0; u<nUnpaired; u++) {
        const occ = bondAng.concat(lpAngles, unpairedAngs);
        const ang = findFreeAngle(occ); unpairedAngs.push(ang);
        const cxL = ax + Math.cos(ang)*lpDist, cyL = ay + Math.sin(ang)*lpDist;
        lpParts.push(`<circle cx="${cxL.toFixed(2)}" cy="${cyL.toFixed(2)}" r="${lpDot.toFixed(2)}" fill="#1c1712"/>`);
      }
    }
    if (hasCharge) {
      const occupied = bondAng.concat(lpAngles, unpairedAngs);
      const ang = findFreeAngle(occupied);
      const chDist = (showLP && (nLp > 0 || hasUnpaired)) ? lpDist + lpSep * 1.4 + bondLen * 0.10 : bondLen * 0.42;
      const supSize = fontSize * 0.50;
      const cxC = ax + Math.cos(ang) * chDist, cyC = ay + Math.sin(ang) * chDist;
      chargeParts.push(
        `<text x="${cxC.toFixed(2)}" y="${cyC.toFixed(2)}" font-size="${supSize.toFixed(2)}" `+
        `font-family="'Helvetica Neue',sans-serif" font-weight="500" text-anchor="middle" `+
        `dominant-baseline="central" fill="#1c1712">${a.charge}</text>`);
    }
  }

  return {
    svg:
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}" width="${VB}" height="${VB}" preserveAspectRatio="xMidYMid meet">
  <rect width="${VB}" height="${VB}" fill="#ffffff"/>
  ${bondParts.join("\n  ")}
  ${atomParts.join("\n  ")}
  ${lpParts.join("\n  ")}
  ${chargeParts.join("\n  ")}
</svg>`,
    bondLen, atomCount: atoms.length
  };
}

function findFreeAngle(occupied) {
  if (occupied.length === 0) return -Math.PI/2;
  const sorted = occupied.slice().sort((u,v)=>u-v);
  let bestAng = 0, bestGap = -1;
  for (let k=0; k<sorted.length; k++) {
    const a1 = sorted[k];
    const a2 = sorted[(k+1) % sorted.length] + ((k+1) >= sorted.length ? 2*Math.PI : 0);
    const gap = a2 - a1;
    if (gap > bestGap) { bestGap = gap; bestAng = (a1 + a2) / 2; }
  }
  return bestAng;
}
function drawLP(out, ax, ay, ang, dist, sep, dotR, stroke, asLine) {
  const cxL = ax + Math.cos(ang)*dist, cyL = ay + Math.sin(ang)*dist;
  const px = -Math.sin(ang), py = Math.cos(ang);
  if (asLine) {
    const half = (sep + 2*dotR) / 2;
    out.push(`<line x1="${(cxL+px*half).toFixed(2)}" y1="${(cyL+py*half).toFixed(2)}" x2="${(cxL-px*half).toFixed(2)}" y2="${(cyL-py*half).toFixed(2)}" stroke="#1c1712" stroke-width="${stroke.toFixed(2)}" stroke-linecap="round"/>`);
  } else {
    out.push(`<circle cx="${(cxL+px*sep/2).toFixed(2)}" cy="${(cyL+py*sep/2).toFixed(2)}" r="${dotR.toFixed(2)}" fill="#1c1712"/>`);
    out.push(`<circle cx="${(cxL-px*sep/2).toFixed(2)}" cy="${(cyL-py*sep/2).toFixed(2)}" r="${dotR.toFixed(2)}" fill="#1c1712"/>`);
  }
}
function computeLPAngles(bondAng, nOrb, nLp) {
  if (nLp <= 0) return [];
  const k = bondAng.length;
  if (k === 0) { const out = []; for (let i=0; i<nLp; i++) out.push(2*Math.PI * i / nLp - Math.PI/2); return out; }
  if (k === 2) {
    const d = Math.abs(wrapPi(bondAng[0] - bondAng[1]));
    if (Math.abs(d - Math.PI) < 0.15) {
      const axis = bondAng[0], perp1 = axis + Math.PI/2, perp2 = axis - Math.PI/2;
      if (nLp === 2) return [perp1, perp2];
      if (nLp === 1) return [perp1];
      const out = []; for (let i=0; i<nLp; i++) out.push(perp1 + (i - (nLp-1)/2) * 0.5); return out;
    }
  }
  const sorted = bondAng.slice().sort((u,v)=>u-v);
  const gaps = [];
  for (let i=0; i<sorted.length; i++) {
    const a1 = sorted[i];
    const a2 = sorted[(i+1) % sorted.length] + ((i+1) >= sorted.length ? 2*Math.PI : 0);
    gaps.push({mid: (a1 + a2)/2, size: a2 - a1, a1, a2, count: 0});
  }
  for (let n=0; n<nLp; n++) {
    let best = gaps[0];
    for (const g of gaps) if (g.size / (g.count+1) > best.size / (best.count+1)) best = g;
    best.count++;
  }
  const lps = [];
  for (const g of gaps) for (let j=1; j<=g.count; j++) { const t = j / (g.count + 1); lps.push(g.a1 + t * g.size); }
  while (lps.length < nLp) lps.push(gaps[0].mid);
  const FIXED = bondAng, STEP = 0.05, ITERS = 240;
  for (let iter=0; iter<ITERS; iter++) {
    for (let i=0; i<lps.length; i++) {
      let force = 0;
      for (const b of FIXED) { const d = wrapPi(lps[i] - b); if (Math.abs(d) > 1e-6) force += Math.sign(d) / (d*d); }
      for (let j=0; j<lps.length; j++) { if (j === i) continue; const d = wrapPi(lps[i] - lps[j]); if (Math.abs(d) > 1e-6) force += Math.sign(d) / (d*d); }
      if (force > 50) force = 50; if (force < -50) force = -50;
      lps[i] += STEP * force * 0.01;
    }
  }
  return lps.map(a => { while (a > Math.PI) a -= 2*Math.PI; while (a <= -Math.PI) a += 2*Math.PI; return a; });
}
function wrapPi(d) { while (d > Math.PI) d -= 2*Math.PI; while (d <= -Math.PI) d += 2*Math.PI; return d; }

/* ---------- Komfort-Wrapper: SVG für (Generator, Darstellung) ---------- */
function svgFor(struct, rep) {
  if (!struct) return null;
  if (rep === "skeletal") {
    const r = render(struct, { showLP:false, showH:false, lpStyle:"lines", mode:"skeletal" });
    return r ? r.svg : null;
  }
  // structural / lewis: vollständige Strukturformel mit freien Elektronenpaaren als Striche
  const r = render(struct, { showLP:true, showH:true, lpStyle:"lines", mode:"lewis" });
  return r ? r.svg : null;
}

/* ---------- Export (Node) ---------- */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SIN60, COS60, sub,
    methaneStruct, nAlkaneFull, nAlkaneSkeletal,
    nAlkanolFull, nAlkanolSkeletal,
    nAcidFull, nAcidSkeletal,
    nAldehydeFull, nAldehydeSkeletal,
    nKetoneFull, nKetoneSkeletal,
    nAlkeneFull, nAlkeneSkeletal,
    nAlkyneFull, nAlkyneSkeletal,
    esterFull, esterSkeletal,
    benzeneStruct, benzeneSkeletal,
    render, svgFor
  };
}
