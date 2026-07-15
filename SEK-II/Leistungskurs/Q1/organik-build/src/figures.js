/* =====================================================================
   figures.js — didaktische SVG-Abbildungen (zwischenmolekulare Kräfte)
   Eine Quelle für Lernpfad-HTML (inline) und Typst-Dokumente (.svg-Datei).
   ===================================================================== */
"use strict";

const INK = "#1c1712", TEAL = "#1e5d52", RUST = "#a83610";
const DPLUS = "#b3341a";   // δ+  (rot/warm)
const DMINUS = "#1f5fb0";  // δ−  (blau/kalt)
const PAPER = "#ffffff";

function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function atom(x,y,t,col,fs){ col=col||INK; fs=fs||30;
  return `<circle cx="${x}" cy="${y}" r="${fs*0.62}" fill="${PAPER}"/>`+
         `<text x="${x}" y="${y}" font-size="${fs}" font-family="Helvetica,Arial,sans-serif" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="${col}">${esc(t)}</text>`; }
function bond(x1,y1,x2,y2,sw){ sw=sw||5; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="${sw}" stroke-linecap="round"/>`; }
function hbond(x1,y1,x2,y2){ return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${TEAL}" stroke-width="4" stroke-linecap="round" stroke-dasharray="3 9"/>`; }
function delta(x,y,sign){ const c = sign==="+"?DPLUS:DMINUS;
  return `<text x="${x}" y="${y}" font-size="22" font-family="Helvetica,Arial,sans-serif" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="${c}">δ${sign}</text>`; }
function cap(x,y,t,col,fs,anchor){ col=col||"#6c6358"; fs=fs||21; anchor=anchor||"middle";
  return `<text x="${x}" y="${y}" font-size="${fs}" font-family="Helvetica,Arial,sans-serif" text-anchor="${anchor}" fill="${col}">${esc(t)}</text>`; }
function wrap(w,h,body){ return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"><rect width="${w}" height="${h}" fill="${PAPER}"/>\n${body}\n</svg>`; }

/* ---- Wassermolekül-Glyph (gewinkelt, ~104°). rot: 0=Hs unten, 180=Hs oben ---- */
function water(cx, cy, rot, opt){
  opt = opt || {};
  const L = opt.L || 46;            // Bindungslänge
  const ang = (rot||0) * Math.PI/180;
  // zwei H im Winkel ±52° um die "Öffnungsrichtung"
  const a1 = ang + 52*Math.PI/180, a2 = ang - 52*Math.PI/180;
  const h1 = [cx + L*Math.cos(a1), cy + L*Math.sin(a1)];
  const h2 = [cx + L*Math.cos(a2), cy + L*Math.sin(a2)];
  let s = bond(cx,cy,h1[0],h1[1]) + bond(cx,cy,h2[0],h2[1]);
  s += atom(cx,cy,"O",INK,30);
  s += atom(h1[0],h1[1],"H",INK,26);
  s += atom(h2[0],h2[1],"H",INK,26);
  if(opt.showDelta){
    s += delta(cx + (opt.dOx||-26), cy + (opt.dOy||0), "−");
    s += delta(h1[0]+(opt.dH1x||0), h1[1]+(opt.dH1y||20), "+");
    s += delta(h2[0]+(opt.dH2x||0), h2[1]+(opt.dH2y||20), "+");
  }
  return { svg:s, O:[cx,cy], H1:h1, H2:h2 };
}

/* =====================================================================
   1) LEGENDE: Partialladungen + Dipol + Wasserstoffbrücke
   ===================================================================== */
function legendPartial(){
  const W=820, H=300;
  let s = "";
  // -- Panel A: polare Atombindung mit Partialladungen + Dipolpfeil --
  s += cap(180, 36, "Polare Elektronenpaarbindung", "#3a342c", 22);
  const ax=110, ay=130, bx=250, by=130;
  s += bond(ax,ay,bx,by,6);
  s += atom(ax,ay,"H",INK,34);
  s += atom(bx,by,"O",INK,34);
  s += delta(ax, ay-44, "+");
  s += delta(bx, by-44, "−");
  s += cap(ax, ay+52, "geringere EN", "#8a8275", 16);
  s += cap(bx, by+52, "höhere EN", "#8a8275", 16);
  // Dipolpfeil (Pfeil mit Querstrich am Pluspol) von δ+ nach δ−
  const px=120, py=190, qx=240, qy=190;
  s += `<line x1="${px}" y1="${py}" x2="${qx}" y2="${qy}" stroke="${RUST}" stroke-width="4"/>`;
  s += `<line x1="${px}" y1="${py-9}" x2="${px}" y2="${py+9}" stroke="${RUST}" stroke-width="4"/>`;
  s += `<path d="M ${qx} ${qy} L ${qx-12} ${qy-7} L ${qx-12} ${qy+7} Z" fill="${RUST}"/>`;
  s += cap(180, 224, "Dipolmoment (Pluspol → Minuspol)", RUST, 16);
  // Trennlinie
  s += `<line x1="350" y1="60" x2="350" y2="250" stroke="#e0dccf" stroke-width="2" stroke-dasharray="6 6"/>`;
  // -- Panel B: Wasserstoffbrücke zwischen zwei Wassermolekülen --
  s += cap(585, 36, "Wasserstoffbrücke", "#3a342c", 22);
  const w1 = water(470, 150, 0, {showDelta:true, dOx:-24, dH1y:22, dH2y:22});
  s += w1.svg;
  const w2 = water(690, 110, 150, {showDelta:true, dOx:24, dH1y:-18, dH2y:-18});
  s += w2.svg;
  // H-Brücke: vom Donor-H (w1.H1, weist nach rechts-unten? wähle nächstliegendes) zum Akzeptor-O (w2.O)
  s += hbond(w1.H1[0]+10, w1.H1[1], w2.O[0]-18, w2.O[1]+6);
  s += cap(600, 250, "O–H ··· O  (gestrichelt)", TEAL, 16);
  return wrap(W,H,s);
}

/* =====================================================================
   2) DIPOL-DIPOL-WECHSELWIRKUNG (allgemeines Schema)
   ===================================================================== */
function dipoleDipole(){
  const W=720, H=240;
  let s = cap(360, 34, "Dipol–Dipol–Wechselwirkung", "#3a342c", 22);
  function dipoleBox(x, y){
    let b = `<rect x="${x}" y="${y}" width="200" height="74" rx="14" fill="#f5f1e8" stroke="#cdc6b5" stroke-width="2"/>`;
    b += delta(x+34, y+37, "+");
    b += delta(x+166, y+37, "−");
    b += `<line x1="${x+62}" y1="${y+37}" x2="${x+138}" y2="${y+37}" stroke="${RUST}" stroke-width="3"/>`;
    b += `<path d="M ${x+138} ${y+37} L ${x+126} ${y+30} L ${x+126} ${y+44} Z" fill="${RUST}"/>`;
    b += `<line x1="${x+62}" y1="${y+28}" x2="${x+62}" y2="${y+46}" stroke="${RUST}" stroke-width="3"/>`;
    return b;
  }
  s += dipoleBox(70, 100);
  s += dipoleBox(450, 100);
  // Anziehung zwischen δ− des linken und δ+ des rechten? Standard: δ+···δ−
  s += hbond(270, 137, 450, 137);
  s += cap(360, 122, "Anziehung", TEAL, 17);
  s += cap(360, 210, "δ+ eines Moleküls zieht δ− des Nachbarmoleküls an", "#8a8275", 16);
  return wrap(W,H,s);
}

/* =====================================================================
   3) WASSERSTOFFBRÜCKE einer Hydroxylgruppe (Solvatation einer OH-Gruppe)
   ===================================================================== */
function ohSolvation(){
  const W=560, H=420;
  let s = cap(280, 34, "Hydroxylgruppe (–OH) in Wasser", "#3a342c", 22);
  // zentrale R–O–H Gruppe
  const rx=210, ry=210, ox=290, oy=210, hx=360, hy=210;
  s += bond(rx,ry,ox,oy,6);
  s += bond(ox,oy,hx,hy,6);
  s += atom(rx,ry,"R",INK,28);
  s += atom(ox,oy,"O",INK,32);
  s += atom(hx,hy,"H",INK,28);
  s += delta(ox, oy-40, "−");
  s += delta(hx, hy-40, "+");
  s += cap(250, 250, "Hydroxylgruppe", RUST, 16);
  // drei Wassermoleküle drumherum, je eine H-Brücke
  // (a) Wasser donatet H an das O der OH-Gruppe
  const wa = water(300, 90, 100, {showDelta:false, L:40});
  s += wa.svg;
  s += hbond(ox+6, oy-22, wa.O[0]-6, wa.O[1]+22);
  // (b) das H der OH-Gruppe bindet an O eines Wassers
  const wb = water(440, 300, 250, {showDelta:false, L:40});
  s += wb.svg;
  s += hbond(hx+14, hy+6, wb.O[0]-14, wb.O[1]-12);
  // (c) weiteres Wasser am O
  const wc = water(150, 320, 300, {showDelta:false, L:40});
  s += wc.svg;
  s += hbond(ox-10, oy+18, wc.O[0]+10, wc.O[1]-14);
  s += cap(280, 400, "jede O–H ··· O Brücke = starke Anziehung an die Lösungsmittelmoleküle", "#8a8275", 15);
  return wrap(W,H,s);
}

/* =====================================================================
   4) SCHLÜSSEL-SCHLOSS-PRINZIP (Süßrezeptor)
   ===================================================================== */
function lockKey(){
  const W=720, H=300;
  let s = cap(360, 34, "Schlüssel-Schloss-Prinzip am Süßrezeptor", "#3a342c", 22);
  // "Schloss" = Rezeptortasche (Bogen)
  s += `<path d="M 360 90 C 470 90 500 150 500 200 C 500 250 450 270 360 270 L 360 200 Z"
         fill="#eef4ec" stroke="${TEAL}" stroke-width="4"/>`;
  // Bindungsstellen (komplementär) als kleine Kreise
  s += `<circle cx="430" cy="150" r="9" fill="none" stroke="${TEAL}" stroke-width="3"/>`;
  s += `<circle cx="455" cy="200" r="9" fill="none" stroke="${TEAL}" stroke-width="3"/>`;
  s += `<circle cx="430" cy="250" r="9" fill="none" stroke="${TEAL}" stroke-width="3"/>`;
  s += cap(475, 300-10, "Rezeptor (Geschmacksknospe)", TEAL, 15);
  // "Schlüssel" = Zuckermolekül (schematisch) mit OH-Gruppen, das in die Tasche passt
  s += `<path d="M 360 120 C 280 120 250 150 250 200 C 250 250 300 250 360 240
         C 410 235 410 165 360 160 Z" fill="#f7eede" stroke="${RUST}" stroke-width="4"/>`;
  // komplementäre OH-Kontakte
  s += atom(340,150,"OH",RUST,18);
  s += atom(360,200,"OH",RUST,18);
  s += atom(340,250,"OH",RUST,18);
  s += hbond(360,160,422,150);
  s += hbond(372,200,448,200);
  s += hbond(360,240,422,250);
  s += cap(295, 300-10, "Molekül (Zucker)", RUST, 15);
  // Signalpfeil
  s += `<line x1="510" y1="180" x2="600" y2="180" stroke="${INK}" stroke-width="4"/>`;
  s += `<path d="M 600 180 L 586 172 L 586 188 Z" fill="${INK}"/>`;
  s += cap(630, 168, "Signal", INK, 18, "start");
  s += cap(630, 192, "„süß\u201c", INK, 18, "start");
  return wrap(W,H,s);
}

/* ---- Export (Node) ---- */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { legendPartial, dipoleDipole, ohSolvation, lockKey, water };
}
