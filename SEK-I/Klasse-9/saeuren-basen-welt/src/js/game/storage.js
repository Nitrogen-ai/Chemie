// localStorage-Wrapper (§2.3: hier ausdrücklich erlaubt, anders als in
// Claude-Artefakten) und Fortschrittscode (§9).

function speichereJSON(schluessel, wert) {
  try {
    localStorage.setItem(schluessel, JSON.stringify(wert));
    return true;
  } catch (fehler) {
    return false;
  }
}

function ladeJSON(schluessel, standardwert) {
  try {
    const roh = localStorage.getItem(schluessel);
    if (roh === null) return standardwert;
    return JSON.parse(roh);
  } catch (fehler) {
    return standardwert;
  }
}

// Kompakter, deterministisch dekodierbarer Code aus Quest-Status und Anzahl
// korrekter Einordnungen (§9) — kein Server, keine personenbezogenen Daten.
function erzeugeFortschrittscode(status) {
  const bits = (status.q1 ? 1 : 0) | (status.q2 ? 2 : 0) | (status.q3 ? 4 : 0);
  const wert = bits | (Math.max(0, status.korrekt || 0) << 3);
  return wert.toString(36).toUpperCase();
}

function dekodiereFortschrittscode(code) {
  const wert = parseInt(code, 36);
  return {
    q1: (wert & 1) !== 0,
    q2: (wert & 2) !== 0,
    q3: (wert & 4) !== 0,
    korrekt: wert >> 3,
  };
}

const SBW_STORAGE_EXPORTS = { speichereJSON, ladeJSON, erzeugeFortschrittscode, dekodiereFortschrittscode };

if (typeof module !== "undefined" && module.exports) {
  module.exports = SBW_STORAGE_EXPORTS;
}
if (typeof globalThis !== "undefined") {
  globalThis.SBW = globalThis.SBW || {};
  Object.assign(globalThis.SBW, SBW_STORAGE_EXPORTS);
}
