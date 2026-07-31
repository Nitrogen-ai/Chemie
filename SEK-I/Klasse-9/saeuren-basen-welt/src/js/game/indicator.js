// pH → Farbe für beide Indikatoren, nach CLAUDE.md §6.1/§6.2.
// Wichtig: Diese Hex-Werte sind Näherungen und wurden nicht eigenmächtig
// verändert — nur linear zwischen den angegebenen Stützstellen interpoliert.

const UNIVERSAL_FARBEN = {
  1: "#e02020",
  2: "#e8452a",
  3: "#ef6c1f",
  4: "#f59120",
  5: "#f2c31d",
  6: "#d3d21c",
  7: "#4caf50",
  8: "#2f9e8f",
  9: "#1f7ab8",
  10: "#1c56a8",
  11: "#3b3f9e",
  12: "#5b2f92",
  13: "#6b2585",
  14: "#4e1a63",
};

const ROTKOHL_FARBEN = {
  1: "#c8102e",
  2: "#c8102e",
  3: "#d6285a",
  4: "#c73a7a",
  5: "#a83a92",
  6: "#8b3fa0",
  7: "#6b46b0",
  8: "#4a53b5",
  9: "#2f6bb8",
  10: "#2e8b9e",
  11: "#2f9e7d",
  12: "#4aa84a",
  13: "#8bb52e",
  14: "#d4c62e",
};

function hexZuRgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function rgbZuHex(r, g, b) {
  const kanal = (n) => Math.round(n).toString(16).padStart(2, "0");
  return `#${kanal(r)}${kanal(g)}${kanal(b)}`;
}

function mischeHexFarben(hexA, hexB, t) {
  const a = hexZuRgb(hexA);
  const b = hexZuRgb(hexB);
  return rgbZuHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}

function getIndikatorFarbe(typ, ph) {
  const tabelle = typ === "rotkohl" ? ROTKOHL_FARBEN : UNIVERSAL_FARBEN;
  const phGeklemmt = Math.min(14, Math.max(1, ph));
  const unten = Math.floor(phGeklemmt);
  const oben = Math.ceil(phGeklemmt);
  if (unten === oben) return tabelle[unten];
  return mischeHexFarben(tabelle[unten], tabelle[oben], phGeklemmt - unten);
}

const SBW_INDICATOR_EXPORTS = { UNIVERSAL_FARBEN, ROTKOHL_FARBEN, getIndikatorFarbe };

if (typeof module !== "undefined" && module.exports) {
  module.exports = SBW_INDICATOR_EXPORTS;
}
if (typeof globalThis !== "undefined") {
  globalThis.SBW = globalThis.SBW || {};
  Object.assign(globalThis.SBW, SBW_INDICATOR_EXPORTS);
}
