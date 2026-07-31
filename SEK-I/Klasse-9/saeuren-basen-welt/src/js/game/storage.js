// localStorage-Wrapper (§2.3: hier ausdrücklich erlaubt, anders als in
// Claude-Artefakten). Fortschrittscode kommt in M4 dazu.

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

const SBW_STORAGE_EXPORTS = { speichereJSON, ladeJSON };

if (typeof module !== "undefined" && module.exports) {
  module.exports = SBW_STORAGE_EXPORTS;
}
if (typeof globalThis !== "undefined") {
  globalThis.SBW = globalThis.SBW || {};
  Object.assign(globalThis.SBW, SBW_STORAGE_EXPORTS);
}
