// Forschungsheft nach §8: Stoff / beobachtete Farbe / eigene Einordnung.
// Persistent in localStorage unter sbw.journal.v1.

const JOURNAL_SCHLUESSEL = "sbw.journal.v1";

function journalSchluesselFuer(stoffId, werkzeug) {
  return `${stoffId}::${werkzeug}`;
}

function ladeForschungsheft() {
  return SBW.ladeJSON(JOURNAL_SCHLUESSEL, []);
}

function trageInForschungsheftEin(eintrag) {
  const heft = ladeForschungsheft();
  const schluessel = journalSchluesselFuer(eintrag.stoffId, eintrag.werkzeug);
  const index = heft.findIndex((e) => journalSchluesselFuer(e.stoffId, e.werkzeug) === schluessel);
  const neuerEintrag = Object.assign({ zeitpunkt: Date.now() }, eintrag);
  if (index >= 0) {
    heft[index] = neuerEintrag;
  } else {
    heft.push(neuerEintrag);
  }
  SBW.speichereJSON(JOURNAL_SCHLUESSEL, heft);
  return heft;
}

const SBW_JOURNAL_EXPORTS = { JOURNAL_SCHLUESSEL, ladeForschungsheft, trageInForschungsheftEin };

if (typeof module !== "undefined" && module.exports) {
  module.exports = SBW_JOURNAL_EXPORTS;
}
if (typeof globalThis !== "undefined") {
  globalThis.SBW = globalThis.SBW || {};
  Object.assign(globalThis.SBW, SBW_JOURNAL_EXPORTS);
}
