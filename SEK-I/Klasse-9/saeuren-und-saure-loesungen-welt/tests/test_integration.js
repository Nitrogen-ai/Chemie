// Integrationstests, jsdom. Prüft Engine- und Stationen-Module direkt aus
// src/ (nicht das gebaute dist/-Bundle) — siehe Editierdisziplin in der
// Schwesterwelt saeuren-basen-welt/CLAUDE.md §11.
//
// Aufruf: node tests/test_integration.js (oder: npm test)

const path = require("path");
const fs = require("fs");
const { JSDOM } = require("jsdom");

const dom = new JSDOM("<!DOCTYPE html><body></body>", { url: "http://localhost/" });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

const SRC = path.join(__dirname, "..", "src", "js");

function requireIfPresent(relPath) {
  const full = path.join(SRC, relPath);
  if (fs.existsSync(full)) require(full);
}

requireIfPresent("engine/chunk.js");
requireIfPresent("engine/mesher.js");
requireIfPresent("engine/atlas.js");
requireIfPresent("engine/physics.js");
requireIfPresent("game/blocks.js");
requireIfPresent("game/stationen.js");

const SBW = globalThis.SBW || {};

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  OK    ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.log(`  FEHLER ${name}`);
    console.log(`         ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "Assertion fehlgeschlagen");
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || "Werte weichen ab"}: erwartet ${JSON.stringify(expected)}, erhalten ${JSON.stringify(actual)}`);
  }
}

// ---------------------------------------------------------------------------
// engine/chunk.js
// ---------------------------------------------------------------------------

if (SBW.Chunk) {
  test("Chunk: Volumen ist 16*16*32 = 8192", () => {
    assertEqual(SBW.CHUNK_VOLUME, 8192);
  });
  test("Chunk: get/set rundtrip", () => {
    const chunk = new SBW.Chunk(0, 0);
    chunk.set(1, 2, 3, 7);
    assertEqual(chunk.get(1, 2, 3), 7);
  });
}

// ---------------------------------------------------------------------------
// game/blocks.json — über blocks.js geladen
// ---------------------------------------------------------------------------

const blocksJsonPath = path.join(__dirname, "..", "src", "data", "blocks.json");
const blocksData = JSON.parse(fs.readFileSync(blocksJsonPath, "utf-8"));

test("blocks.json: keine doppelten IDs", () => {
  const ids = blocksData.map((b) => b.id);
  assertEqual(new Set(ids).size, ids.length, "Dubletten bei Block-IDs gefunden");
});

test("blocks.json: jeder Block hat eine gültige Hex-Farbe", () => {
  blocksData.forEach((b) => {
    assert(/^#[0-9a-fA-F]{6}$/.test(b.farbe), `Block ${b.id} hat keine gültige Hex-Farbe`);
  });
});

// ---------------------------------------------------------------------------
// game/stationen.js — Pixel-Schrift
// ---------------------------------------------------------------------------

if (SBW.FONT) {
  test("Pixel-Schrift: jede Glyphe ist 7 Zeilen x 5 Zeichen aus '#'/'.'", () => {
    Object.entries(SBW.FONT).forEach(([ch, rows]) => {
      assertEqual(rows.length, SBW.GLYPH_HEIGHT, `Glyphe '${ch}' hat falsche Zeilenzahl`);
      rows.forEach((row) => {
        assertEqual(row.length, SBW.GLYPH_WIDTH, `Glyphe '${ch}' hat eine Zeile mit falscher Breite`);
        assert(/^[#.]+$/.test(row), `Glyphe '${ch}' enthält ein ungültiges Zeichen`);
      });
    });
  });

  test("Pixel-Schrift: jede Station verwendet nur bekannte Glyphen", () => {
    SBW.STATIONEN.forEach((def) => {
      for (const ch of def.saeureWort) {
        assert(SBW.FONT[ch], `Station ${def.id}: Zeichen '${ch}' hat keine Glyphe`);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// game/stationen.js — Stationsaufbau + Hebel-Umschaltung, mit simuliertem
// setBlockId (Map statt echtem Chunk-Voxelraster; reicht, um Platzierung und
// Rundtrip Aktivieren/Zurücksetzen zu prüfen).
// ---------------------------------------------------------------------------

function mockSetBlockId() {
  const belegt = new Map();
  const setBlockId = (x, y, z, blockId) => {
    const key = `${x},${y},${z}`;
    if (blockId === null) {
      belegt.delete(key);
    } else {
      belegt.set(key, blockId);
    }
  };
  return { belegt, setBlockId };
}

if (SBW.baueStationen) {
  test("baueStationen: erzeugt genau vier Stationen mit Hebel-Block", () => {
    const { belegt, setBlockId } = mockSetBlockId();
    const { stationen } = SBW.baueStationen(setBlockId, 4, 6);
    assertEqual(stationen.length, 4);
    stationen.forEach((s) => {
      const key = `${s.hebel.x},${s.hebel.y},${s.hebel.z}`;
      assertEqual(belegt.get(key), "hebel", `Station ${s.def.id}: Hebel nicht an erwarteter Position gesetzt`);
    });
  });

  test("baueStationen: bleibt innerhalb der Weltbreite aus world.json", () => {
    const worldPath = path.join(__dirname, "..", "src", "data", "world.json");
    const world = JSON.parse(fs.readFileSync(worldPath, "utf-8"));
    const { belegt } = mockSetBlockId();
    const { setBlockId } = mockSetBlockId();
    const rec = mockSetBlockId();
    const { naechsteFreieX } = SBW.baueStationen(rec.setBlockId, world.grundhoehe, 6);
    assert(naechsteFreieX <= world.groesse.x, `Stationen ragen über die Weltbreite hinaus (${naechsteFreieX} > ${world.groesse.x})`);
  });

  test("Hebel-Umschaltung: Aktivieren dann Zurücksetzen stellt den Ursprungszustand exakt wieder her", () => {
    const rec = mockSetBlockId();
    const { stationen } = SBW.baueStationen(rec.setBlockId, 4, 6);
    const vorher = new Map(rec.belegt);

    const station = stationen[0];
    SBW.wendeProtonenuebertragungAn(rec.setBlockId, station);
    assert(rec.belegt.size !== vorher.size || [...vorher.keys()].some((k) => vorher.get(k) !== rec.belegt.get(k)), "Aktivieren hat sichtbar nichts verändert");

    SBW.setzeStationZurueck(rec.setBlockId, station);
    assertEqual(rec.belegt.size, vorher.size, "Nach Reset stimmt die Blockanzahl nicht mehr");
    for (const [key, val] of vorher) {
      assertEqual(rec.belegt.get(key), val, `Nach Reset weicht Block bei ${key} ab`);
    }
  });

  test("Alle Blocktypen aus blocks.json kommen beim Stationsaufbau (inkl. Aktivierung) vor", () => {
    const rec = mockSetBlockId();
    const { stationen } = SBW.baueStationen(rec.setBlockId, 4, 6);
    stationen.forEach((s) => SBW.wendeProtonenuebertragungAn(rec.setBlockId, s));
    const verwendet = new Set(rec.belegt.values());
    verwendet.add("boden"); // wird separat in main.js für die Plaza gesetzt, nicht in stationen.js
    blocksData.forEach((b) => {
      assert(verwendet.has(b.id), `Blocktyp '${b.id}' kommt nirgends vor`);
    });
  });
}

// ---------------------------------------------------------------------------

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen.`);
if (failed > 0) {
  process.exit(1);
}
