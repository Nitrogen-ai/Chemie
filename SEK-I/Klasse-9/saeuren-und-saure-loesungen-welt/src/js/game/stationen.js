// Teilchen-Statuen: Pixel-Schrift + Denkmal-Stationen + Hebel-Animation.
//
// Jede Station zeigt eine Protonenübertragung Säure + Wasser -> Säurerest + Oxonium-Ion
// als begehbares Buchstaben-Standbild (5x7-Pixelschrift, freistehend aus Blöcken
// gestapelt). Ein Hebel löst die Umwandlung aus: das übertragene Proton fliegt als
// eigenes, nicht-voxelbasiertes Objekt vom Säure- zum Wasserteilchen, danach werden
// die betroffenen Glyphen-Blöcke direkt umgeschrieben (kein neuer Chunk-Bau nötig,
// nur ein Remesh der bestehenden Chunks).
//
// Vereinfachung, bewusst: Wasser mutiert immer H2O -> H3O (Ziffer "2" wird zu "3"),
// die Säureseite verliert genau ein Proton, dargestellt durch Löschen genau einer
// Glyphe (das führende "H" bei einprotonigen Säuren, oder nur die Ziffer bei H2SO4,
// wo aus "H2" nach realer Schreibweise "H" ohne Ziffer wird). Kein Shiften der
// übrigen Glyphen nötig, weil jede gelöschte Glyphe exakt ihre eigene Boundingbox
// leer zurücklässt.

const GLYPH_WIDTH = 5;
const GLYPH_HEIGHT = 7;
const GLYPH_GAP = 1;

// Nur die Zeichen, die die vier Stationen tatsächlich brauchen (§ Editierdisziplin:
// keine unbenutzten Glyphen mitschleppen).
const FONT = {
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  A: ["..#..", ".#.#.", "#...#", "#####", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": [".###.", "#...#", "....#", "..##.", "....#", "#...#", ".###."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
};

// setBlockId(worldX, worldY, worldZ, blockId|null) — dieselbe Signatur wie in main.js.
function stampGlyph(setBlockId, x0, baseY, z, ch, blockId) {
  const rows = FONT[ch];
  if (!rows) return;
  for (let row = 0; row < GLYPH_HEIGHT; row++) {
    const worldY = baseY + (GLYPH_HEIGHT - 1 - row);
    for (let col = 0; col < GLYPH_WIDTH; col++) {
      if (rows[row][col] === "#") {
        setBlockId(x0 + col, worldY, z, blockId);
      }
    }
  }
}

// Stampft ein Wort, gibt { boxen: [{char,x0,x1,y0,y1}], breite } zurück — die
// Boxen erlauben es Stationen später, genau eine Glyphe gezielt zu löschen/
// neu zu zeichnen, ohne die Nachbarglyphen zu verschieben.
function stampWord(setBlockId, x0, baseY, z, wort, blockId) {
  const boxen = [];
  let cursor = x0;
  for (const ch of wort) {
    stampGlyph(setBlockId, cursor, baseY, z, ch, blockId);
    boxen.push({ char: ch, x0: cursor, x1: cursor + GLYPH_WIDTH - 1, y0: baseY, y1: baseY + GLYPH_HEIGHT - 1 });
    cursor += GLYPH_WIDTH + GLYPH_GAP;
  }
  return { boxen, breite: cursor - x0 - GLYPH_GAP };
}

// Freistehender Pfeilblock (Reaktionspfeil), mittig auf halber Glyphenhöhe.
function stampPfeil(setBlockId, x0, baseY, z, laenge, blockId) {
  const midY = baseY + 3;
  for (let i = 0; i < laenge - 2; i++) {
    setBlockId(x0 + i, midY, z, blockId);
  }
  // Pfeilspitze, zwei Reihen zulaufend.
  setBlockId(x0 + laenge - 2, midY + 1, z, blockId);
  setBlockId(x0 + laenge - 2, midY - 1, z, blockId);
  setBlockId(x0 + laenge - 1, midY, z, blockId);
  return x0 + laenge;
}

// --- Stationsdefinitionen ---------------------------------------------------
// erasedIndex: Index der Glyphe im Säure-Wort, die beim Hebelzug gelöscht wird
// (das übertragene Proton). ladungAcid/ladungWasser: angehängte Ladungsglyphe.
const STATIONEN = [
  {
    id: "haupt",
    titel: "Allgemeine Protonenübertragung",
    saeureWort: "HA",
    erasedIndex: 0,
    zustand: "",
    hinweis: null,
  },
  {
    id: "hcl",
    titel: "Chlorwasserstoffgas in Wasser",
    saeureWort: "HCL",
    erasedIndex: 0,
    zustand: "(g)",
    hinweis: "Chlorwasserstoff ist bei Raumtemperatur ein Gas — erst beim Einleiten in Wasser entsteht Salzsäure.",
  },
  {
    id: "h2so4",
    titel: "Reine, flüssige Schwefelsäure in Wasser",
    saeureWort: "H2SO4",
    erasedIndex: 1,
    zustand: "(l)",
    hinweis: "Nur die erste von zwei möglichen Protonenabgaben ist dargestellt: H2SO4 -> HSO4- + H3O+.",
  },
  {
    id: "vitc",
    titel: "Feste Ascorbinsäure (Vitamin C) in Wasser",
    saeureWort: "HASC",
    erasedIndex: 0,
    zustand: "(s)",
    hinweis: "Vereinfachtes Modell: Ascorbinsäure (C6H8O6) ist hier stellvertretend als einprotonige Säure HAsc dargestellt.",
  },
];

const STATION_ABSTAND = 16; // Blöcke Gehweg zwischen zwei Stationen
const PFEIL_LAENGE = 8;
const PFEIL_GAP = 3;
const BASE_Y_OFFSET = 2; // Blöcke über dem Plaza-Boden, an dem die Glyphen beginnen
const LADUNG_OFFSET_Y = 3; // Hochstellung der Ladungsglyphe über der Grundlinie
const LADUNG_GAP = 2;

// Baut alle Stationen ab startX, gibt Laufzeit-Beschreibungen für main.js zurück
// (Hebelposition fürs Raycasting, Boxen fürs Proton-Ziel, Startpunkt hinter der
// ersten Station als Deep-Link-Ziel für "weitere Beispiele").
function baueStationen(setBlockId, grundhoehe, startX) {
  const ergebnisse = [];
  let cursorX = startX;

  STATIONEN.forEach((def) => {
    const baseY = grundhoehe + BASE_Y_OFFSET;
    const z = 12;

    const saeure = stampWord(setBlockId, cursorX, baseY, z, def.saeureWort, "saeure");
    const pfeilStart = saeure.boxen[saeure.boxen.length - 1].x1 + PFEIL_GAP;
    const pfeilEnde = stampPfeil(setBlockId, pfeilStart, baseY, z, PFEIL_LAENGE, "saeure");
    const wasserStartX = pfeilEnde + PFEIL_GAP;
    const wasser = stampWord(setBlockId, wasserStartX, baseY, z, "H2O", "wasser");

    const oBox = wasser.boxen[2];
    // Zwei Elektronenpaare am Sauerstoff: eines oben (wird beim Binden des
    // Protons "verbraucht"), eines seitlich (bleibt bestehen, damit sichtbar
    // bleibt, dass Sauerstoff weitere freie Elektronenpaare besitzt).
    const elektronOben = [
      { x: oBox.x0 + 1, y: oBox.y1 + 1, z },
      { x: oBox.x0 + 3, y: oBox.y1 + 1, z },
    ];
    const elektronSeite = [
      { x: oBox.x1 + 1, y: oBox.y0 + 2, z },
      { x: oBox.x1 + 1, y: oBox.y0 + 4, z },
    ];
    [...elektronOben, ...elektronSeite].forEach((p) => setBlockId(p.x, p.y, p.z, "elektron"));

    // Hebel auf kurzem Sockel, mittig vor der Station, gut antippbar.
    const hebelX = Math.round((cursorX + wasserStartX + wasser.breite) / 2);
    const hebelY = grundhoehe;
    const hebelZ = z + 4;
    setBlockId(hebelX, hebelY, hebelZ, "sockel");
    setBlockId(hebelX, hebelY + 1, hebelZ, "hebel");

    const erasedBox = saeure.boxen[def.erasedIndex];

    ergebnisse.push({
      def,
      z,
      saeureBoxen: saeure.boxen,
      erasedBox,
      wasserBoxen: wasser.boxen,
      digitBox: wasser.boxen[1], // die "2" in H2O, wird zu "3"
      oBox,
      elektronOben,
      hebel: { x: hebelX, y: hebelY + 1, z: hebelZ },
      ladungSaeurePos: { x: saeure.boxen[saeure.boxen.length - 1].x1 + LADUNG_GAP, y: baseY + LADUNG_OFFSET_Y, z },
      ladungWasserPos: { x: wasser.boxen[2].x1 + LADUNG_GAP, y: baseY + LADUNG_OFFSET_Y, z },
      protonStart: { x: erasedBox.x0 + 2, y: erasedBox.y0 + 3, z },
      protonEnde: { x: oBox.x0 + 2, y: oBox.y1 + 1, z },
      schildMitte: { x: (cursorX + wasserStartX + wasser.breite) / 2, y: baseY + GLYPH_HEIGHT + 2, z },
      ausgeloest: false,
    });

    cursorX = wasserStartX + wasser.breite + STATION_ABSTAND;
  });

  return { stationen: ergebnisse, naechsteFreieX: cursorX };
}

// Wird beim Hebelzug einmalig aufgerufen: schreibt die Blockänderungen (Proton-
// Glyphe löschen, Wasser-Ziffer 2->3, Ladungsglyphen anhängen, ein Elektronen-
// paar entfernen). Der Aufrufer kümmert sich um Remesh + Flug-Animation.
function wendeProtonenuebertragungAn(setBlockId, station) {
  if (station.ausgeloest) return;
  station.ausgeloest = true;

  stampGlyph(setBlockId, station.erasedBox.x0, station.erasedBox.y0, station.z, station.erasedBox.char, null);
  stampGlyph(setBlockId, station.digitBox.x0, station.digitBox.y0, station.z, "2", null);
  stampGlyph(setBlockId, station.digitBox.x0, station.digitBox.y0, station.z, "3", "wasser");
  stampGlyph(setBlockId, station.ladungSaeurePos.x, station.ladungSaeurePos.y, station.ladungSaeurePos.z, "-", "ladung");
  stampGlyph(setBlockId, station.ladungWasserPos.x, station.ladungWasserPos.y, station.ladungWasserPos.z, "+", "ladung");
  station.elektronOben.forEach((p) => setBlockId(p.x, p.y, p.z, null));
}

// Macht eine Station wieder für eine neue Klasse/Vorführung nutzbar.
function setzeStationZurueck(setBlockId, station) {
  if (!station.ausgeloest) return;
  station.ausgeloest = false;

  stampGlyph(setBlockId, station.erasedBox.x0, station.erasedBox.y0, station.z, station.erasedBox.char, "saeure");
  stampGlyph(setBlockId, station.digitBox.x0, station.digitBox.y0, station.z, "3", null);
  stampGlyph(setBlockId, station.digitBox.x0, station.digitBox.y0, station.z, "2", "wasser");
  stampGlyph(setBlockId, station.ladungSaeurePos.x, station.ladungSaeurePos.y, station.ladungSaeurePos.z, "-", null);
  stampGlyph(setBlockId, station.ladungWasserPos.x, station.ladungWasserPos.y, station.ladungWasserPos.z, "+", null);
  station.elektronOben.forEach((p) => setBlockId(p.x, p.y, p.z, "elektron"));
}

const SBW_STATIONEN_EXPORTS = {
  FONT,
  GLYPH_WIDTH,
  GLYPH_HEIGHT,
  STATIONEN,
  STATION_ABSTAND,
  stampGlyph,
  stampWord,
  stampPfeil,
  baueStationen,
  wendeProtonenuebertragungAn,
  setzeStationZurueck,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = SBW_STATIONEN_EXPORTS;
}
if (typeof globalThis !== "undefined") {
  globalThis.SBW = globalThis.SBW || {};
  Object.assign(globalThis.SBW, SBW_STATIONEN_EXPORTS);
}
