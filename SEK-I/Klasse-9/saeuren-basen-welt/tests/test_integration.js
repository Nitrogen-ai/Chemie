// Integrationstests, jsdom. Prüft die Engine-Module direkt aus src/ (nicht das
// gebaute dist/-Bundle) — siehe Editierdisziplin in CLAUDE.md §11.
//
// Aufruf: node tests/test_integration.js  (oder: npm test)

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
  if (fs.existsSync(full)) {
    require(full);
  }
}

requireIfPresent("engine/chunk.js");
requireIfPresent("engine/mesher.js");
requireIfPresent("engine/atlas.js");
requireIfPresent("engine/physics.js");
requireIfPresent("game/blocks.js");
requireIfPresent("game/indicator.js");
requireIfPresent("game/quests.js");
requireIfPresent("game/storage.js");

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
    throw new Error(
      `${msg || "Werte weichen ab"}: erwartet ${JSON.stringify(expected)}, erhalten ${JSON.stringify(actual)}`
    );
  }
}

// ---------------------------------------------------------------------------
// engine/chunk.js
// ---------------------------------------------------------------------------

if (SBW.Chunk) {
  test("Chunk: Volumen ist 16*16*32 = 8192", () => {
    assertEqual(SBW.CHUNK_VOLUME, 8192);
    const chunk = new SBW.Chunk(0, 0);
    assertEqual(chunk.data.length, 8192);
  });

  test("Chunk: set/get Rundlauf innerhalb der Grenzen", () => {
    const chunk = new SBW.Chunk(0, 0);
    chunk.set(3, 7, 2, 42);
    assertEqual(chunk.get(3, 7, 2), 42);
  });

  test("Chunk: get außerhalb der Grenzen liefert 0, wirft nicht", () => {
    const chunk = new SBW.Chunk(0, 0);
    assertEqual(chunk.get(-1, 0, 0), 0);
    assertEqual(chunk.get(0, 999, 0), 0);
    assertEqual(chunk.get(16, 0, 0), 0);
  });

  test("Chunk: set außerhalb der Grenzen ist ein No-Op", () => {
    const chunk = new SBW.Chunk(0, 0);
    chunk.dirty = false;
    chunk.set(-1, 0, 0, 9);
    chunk.set(0, 0, 0, 0);
    assertEqual(chunk.dirty, false);
  });

  test("Chunk: dirty-Flag nur bei tatsächlicher Änderung", () => {
    const chunk = new SBW.Chunk(0, 0);
    chunk.dirty = false;
    chunk.set(1, 1, 1, 0); // war schon 0 -> keine Änderung
    assertEqual(chunk.dirty, false);
    chunk.set(1, 1, 1, 5);
    assertEqual(chunk.dirty, true);
  });
} else {
  console.log("  (uebersprungen: engine/chunk.js noch nicht vorhanden)");
}

// ---------------------------------------------------------------------------
// engine/mesher.js — Kernanforderung M1.2: verdeckte Flaechen entstehen nie
// ---------------------------------------------------------------------------

if (SBW.greedyMesh) {
  function solidCuboid(dims, blockId, offset = [0, 0, 0]) {
    const [sx, sy, sz] = dims;
    const filled = new Set();
    for (let x = offset[0]; x < offset[0] + sx; x++) {
      for (let y = offset[1]; y < offset[1] + sy; y++) {
        for (let z = offset[2]; z < offset[2] + sz; z++) {
          filled.add(`${x},${y},${z}`);
        }
      }
    }
    return (x, y, z) => (filled.has(`${x},${y},${z}`) ? blockId : 0);
  }

  test("Mesher: leeres Feld erzeugt keine Flaechen", () => {
    const getBlock = () => 0;
    const result = SBW.greedyMesh(getBlock, [4, 4, 4]);
    assertEqual(result.indices.length, 0);
  });

  test("Mesher: ein einzelner Block erzeugt genau 6 Flaechen", () => {
    const getBlock = solidCuboid([1, 1, 1], 5, [1, 1, 1]);
    const result = SBW.greedyMesh(getBlock, [3, 3, 3]);
    assertEqual(result.indices.length / 3, 12, "12 Dreiecke = 6 Quads");
    assertEqual(result.positions.length / 3, 24, "4 Vertices pro Quad");
  });

  test("Mesher: voll gefuellter Quader mergt zu genau 6 Flaechen (keine inneren Flaechen)", () => {
    const dims = [4, 3, 2];
    const getBlock = solidCuboid(dims, 7);
    const result = SBW.greedyMesh(getBlock, dims);
    assertEqual(
      result.indices.length / 3,
      12,
      "ein komplett gefuellter Quader darf nur die 6 Aussenflaechen haben, egal wie gross"
    );
  });

  test("Mesher: Flaeche zwischen zwei verschiedenen Blocktypen wird trotzdem gekappt", () => {
    const filled = { "0,0,0": 3, "1,0,0": 9 };
    const getBlock = (x, y, z) => filled[`${x},${y},${z}`] || 0;
    const result = SBW.greedyMesh(getBlock, [2, 1, 1]);
    // Erwartung: keine Flaeche an der inneren Grenze x=1 (solide-solide),
    // aber getrennte (nicht gemergte) Aussenflaechen je Blocktyp.
    assertEqual(result.indices.length / 3, 20, "10 Quads: 2 Stirnseiten + 4x2 nicht gemergte Seiten");
  });

  test("Mesher: Nachbarschaftsfunktion wird an den Feldgrenzen als Luft behandelt", () => {
    const getBlock = solidCuboid([2, 2, 2], 1);
    const result = SBW.greedyMesh(getBlock, [2, 2, 2]);
    assertEqual(result.indices.length / 3, 12, "auch am Feldrand nur 6 Aussenflaechen");
  });
} else {
  console.log("  (uebersprungen: engine/mesher.js noch nicht vorhanden)");
}

// ---------------------------------------------------------------------------
// engine/physics.js
// ---------------------------------------------------------------------------

if (SBW.stepPhysics) {
  const flatGroundSolid = (x, y, z) => y < 0;

  test("Physik: Spieler faellt und bleibt auf dem Boden stehen (onGround)", () => {
    const state = SBW.createPlayerState([0, 5, 0]);
    for (let i = 0; i < 300; i++) {
      SBW.stepPhysics(state, {}, 1 / 60, flatGroundSolid);
    }
    assert(state.onGround, "Spieler sollte nach dem Fall auf dem Boden stehen");
    assertEqual(state.position.y, 0, "Spieler sollte exakt auf y=0 landen");
  });

  test("Physik: Sprung hebt den Spieler kurzzeitig vom Boden ab", () => {
    const state = SBW.createPlayerState([0, 0, 0]);
    state.onGround = true;
    SBW.stepPhysics(state, { jump: true }, 1 / 60, flatGroundSolid);
    assert(state.velocity.y > 0, "Sprung muss positive Y-Geschwindigkeit erzeugen");
    assertEqual(state.onGround, false, "Spieler darf während des Sprungs nicht onGround sein");
  });

  test("Physik: seitliche Bewegung wird durch eine Wand gestoppt", () => {
    const wallAtX2 = (x, y, z) => y < 0 || (x === 2 && y === 0);
    const state = SBW.createPlayerState([0, 0, 0]);
    for (let i = 0; i < 120; i++) {
      SBW.stepPhysics(state, { moveX: 1 }, 1 / 60, wallAtX2);
    }
    assert(state.position.x < 2, "Spieler darf nicht durch die Wand bei x=2 laufen");
  });
} else {
  console.log("  (uebersprungen: engine/physics.js noch nicht vorhanden)");
}

// ---------------------------------------------------------------------------
// engine/atlas.js
// ---------------------------------------------------------------------------

if (SBW.computeAtlasLayout) {
  test("Atlas: jedes Blockid bekommt ein eigenes, nicht ueberlappendes Tile", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const layout = SBW.computeAtlasLayout(ids);
    const seen = new Set();
    ids.forEach((id) => {
      const uv = layout.uvByBlockId[id];
      assert(uv, `kein UV-Eintrag fuer ${id}`);
      const key = `${uv.col},${uv.row}`;
      assert(!seen.has(key), `Tile ${key} doppelt vergeben`);
      seen.add(key);
      assert(uv.u0 >= 0 && uv.u1 <= 1 && uv.v0 >= 0 && uv.v1 <= 1, "UV ausserhalb [0,1]");
    });
  });
} else {
  console.log("  (uebersprungen: engine/atlas.js noch nicht vorhanden)");
}

// ---------------------------------------------------------------------------
// game/indicator.js
// ---------------------------------------------------------------------------

if (SBW.getIndicatorFarbe) {
  test("Indikator: jeder pH-Wert 0-14 liefert fuer beide Indikatoren eine definierte Farbe", () => {
    for (let ph = 0; ph <= 14; ph += 0.5) {
      const uni = SBW.getIndicatorFarbe("universal", ph);
      const rk = SBW.getIndicatorFarbe("rotkohl", ph);
      assert(typeof uni === "string" && /^#[0-9a-fA-F]{6}$/.test(uni), `Universalindikator undefiniert bei pH ${ph}`);
      assert(typeof rk === "string" && /^#[0-9a-fA-F]{6}$/.test(rk), `Rotkohlsaft undefiniert bei pH ${ph}`);
    }
  });
} else {
  console.log("  (uebersprungen: game/indicator.js noch nicht vorhanden)");
}

// ---------------------------------------------------------------------------
// data/blocks.json
// ---------------------------------------------------------------------------

const blocksPath = path.join(__dirname, "..", "src", "data", "blocks.json");
if (fs.existsSync(blocksPath)) {
  test("blocks.json: alle pH-Werte in [0,14], keine doppelten Block-IDs", () => {
    const blocks = JSON.parse(fs.readFileSync(blocksPath, "utf-8"));
    const ids = new Set();
    blocks.forEach((b) => {
      assert(!ids.has(b.id), `doppelte Block-ID: ${b.id}`);
      ids.add(b.id);
      if (typeof b.ph === "number") {
        assert(b.ph >= 0 && b.ph <= 14, `pH ausserhalb [0,14] bei ${b.id}: ${b.ph}`);
      }
    });
  });
} else {
  console.log("  (uebersprungen: data/blocks.json noch nicht vorhanden)");
}

// ---------------------------------------------------------------------------
// game/quests.js — Zeitschloss
// ---------------------------------------------------------------------------

if (SBW.istZeitschlossOffen) {
  test("Quests: Zeitschloss vor Datum geschlossen, nach Datum offen", () => {
    const datum = "2026-01-10"; // Samstag
    assertEqual(SBW.istZeitschlossOffen(datum, new Date("2026-01-09T06:00:00Z")), false);
    assertEqual(SBW.istZeitschlossOffen(datum, new Date("2026-01-10T06:00:00+02:00")), true);
  });

  test("Quests: Passwort schaltet vor dem Datum frei", () => {
    const datum = "2026-01-10";
    assertEqual(
      SBW.istZeitschlossOffen(datum, new Date("2026-01-01T00:00:00Z"), "Chemieistüberall."),
      true
    );
  });
} else {
  console.log("  (uebersprungen: game/quests.js noch nicht vorhanden)");
}

// ---------------------------------------------------------------------------
// game/storage.js — Fortschrittscode
// ---------------------------------------------------------------------------

if (SBW.erzeugeFortschrittscode && SBW.dekodiereFortschrittscode) {
  test("Storage: Fortschrittscode ist deterministisch und dekodierbar", () => {
    const status = { q1: true, q2: true, q3: false, korrekt: 11 };
    const code1 = SBW.erzeugeFortschrittscode(status);
    const code2 = SBW.erzeugeFortschrittscode(status);
    assertEqual(code1, code2, "gleicher Status muss gleichen Code ergeben");
    const decoded = SBW.dekodiereFortschrittscode(code1);
    assertEqual(decoded.q1, true);
    assertEqual(decoded.q2, true);
    assertEqual(decoded.q3, false);
    assertEqual(decoded.korrekt, 11);
  });
} else {
  console.log("  (uebersprungen: game/storage.js noch nicht vorhanden)");
}

// ---------------------------------------------------------------------------
// Zusammenfassung
// ---------------------------------------------------------------------------

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen.`);
if (failed > 0) {
  process.exit(1);
}
