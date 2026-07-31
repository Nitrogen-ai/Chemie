// Prozeduraler Textur-Atlas nach CLAUDE.md §4/§10: 16x16 px pro Kachel,
// aus der Palette abgeleitet, leicht gedämpft (kein Minecraft-Klon).
//
// Layout-Berechnung (computeAtlasLayout) ist reines Zahlenwerk und lässt sich
// ohne echten Canvas testen. Das Zeichnen (drawAtlasCanvas) braucht ein
// Canvas-2D-Element und läuft nur im Browser.

const TILE_SIZE = 16;

function computeAtlasLayout(blockIds, tileSize = TILE_SIZE) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(blockIds.length)));
  const rows = Math.max(1, Math.ceil(blockIds.length / columns));
  const atlasWidth = columns * tileSize;
  const atlasHeight = rows * tileSize;

  const uvByBlockId = {};
  blockIds.forEach((id, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    uvByBlockId[id] = {
      col,
      row,
      u0: col / columns,
      v0: row / rows,
      u1: (col + 1) / columns,
      v1: (row + 1) / rows,
    };
  });

  return { columns, rows, tileSize, atlasWidth, atlasHeight, uvByBlockId };
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return { r: 136, g: 136, b: 136 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

// Deterministischer PRNG (mulberry32), Seed aus der Block-ID abgeleitet — so
// sieht ein Block bei jedem Build gleich aus, ohne echte Zufallswerte zu
// speichern.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

function drawTile(ctx, originX, originY, size, hex) {
  const { r, g, b } = hexToRgb(hex);
  const rand = mulberry32(seedFromString(hex));
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const daempfung = (rand() - 0.5) * 28; // leichte Dämpfung/Variation
      const rr = Math.min(255, Math.max(0, Math.round(r + daempfung)));
      const gg = Math.min(255, Math.max(0, Math.round(g + daempfung)));
      const bb = Math.min(255, Math.max(0, Math.round(b + daempfung)));
      ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
      ctx.fillRect(originX + px, originY + py, 1, 1);
    }
  }
}

function drawAtlasCanvas(canvas, layout, colorByBlockId) {
  canvas.width = layout.atlasWidth;
  canvas.height = layout.atlasHeight;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  Object.entries(layout.uvByBlockId).forEach(([blockId, uv]) => {
    const hex = colorByBlockId[blockId] || "#888888";
    drawTile(ctx, uv.col * layout.tileSize, uv.row * layout.tileSize, layout.tileSize, hex);
  });
  return canvas;
}

function createAtlasUVProvider(layout) {
  return function getUV(blockId) {
    return layout.uvByBlockId[blockId] || { u0: 0, v0: 0, u1: 1, v1: 1 };
  };
}

// Zeichnet genau eine Kachel neu (z.B. für den Indikator-Blinkeffekt beim
// Messen), ohne den ganzen Atlas neu aufzubauen.
function zeichneEineKachel(canvas, layout, blockId, hex) {
  const uv = layout.uvByBlockId[blockId];
  if (!uv) return;
  const ctx = canvas.getContext("2d");
  drawTile(ctx, uv.col * layout.tileSize, uv.row * layout.tileSize, layout.tileSize, hex);
}

const SBW_ATLAS_EXPORTS = {
  TILE_SIZE,
  computeAtlasLayout,
  drawAtlasCanvas,
  createAtlasUVProvider,
  zeichneEineKachel,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = SBW_ATLAS_EXPORTS;
}
if (typeof globalThis !== "undefined") {
  globalThis.SBW = globalThis.SBW || {};
  Object.assign(globalThis.SBW, SBW_ATLAS_EXPORTS);
}
