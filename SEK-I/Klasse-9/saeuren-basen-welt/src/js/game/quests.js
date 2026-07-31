// Aufgabenlogik und Zeitschloss, nach CLAUDE.md §9.
//
// WICHTIG: Die zeitschlossDatum-Werte in data/quests.json sind Platzhalter
// (Samstage ab September 2026) und müssen vor dem echten Einsatz auf die
// tatsächlichen Unterrichtswochen angepasst werden — analog zur Farbwerte-
// Prüfung in §6 ("Nitrogen prüft das").

const FRUEHZUGANG_PASSWORT = "Chemieistüberall.";
const FRUEHZUGANG_SCHLUESSEL = "sbw.fruehzugang.v1";
const Q3_FREITEXT_SCHLUESSEL = "sbw.q3.freitext.v1";

// Wie in den bestehenden Lernpfaden: Freischaltung samstags 07:00 MESZ.
// MESZ (UTC+2) wird hier als fester Versatz behandelt, nicht per echter
// Zeitzonen-/DST-Berechnung — für ein Schuljahr in der Sommerzeit ausreichend
// und ohne Zeitzonen-Bibliothek umsetzbar.
const MESZ_VERSATZ_STUNDEN = 2;

function zeitschlossOeffnungszeitpunkt(datumIso) {
  const [jahr, monat, tag] = datumIso.split("-").map(Number);
  return Date.UTC(jahr, monat - 1, tag, 7 - MESZ_VERSATZ_STUNDEN, 0, 0);
}

function istZeitschlossOffen(datumIso, jetzt, passwort) {
  if (passwort === FRUEHZUGANG_PASSWORT) return true;
  const jetztMs = (jetzt instanceof Date ? jetzt : new Date(jetzt)).getTime();
  return jetztMs >= zeitschlossOeffnungszeitpunkt(datumIso);
}

function ladeQuestDefinitionen() {
  if (typeof window !== "undefined" && window.SBW_QUESTS) return window.SBW_QUESTS;
  if (typeof require !== "undefined") return require("../../data/quests.json");
  return [];
}

const QUEST_DEFINITIONEN = ladeQuestDefinitionen();

function gespeichertesFruehzugangPasswort() {
  return typeof SBW !== "undefined" && SBW.ladeJSON ? SBW.ladeJSON(FRUEHZUGANG_SCHLUESSEL, null) : null;
}

function schaltePasswortFrei(eingabe) {
  if (eingabe === FRUEHZUGANG_PASSWORT) {
    SBW.speichereJSON(FRUEHZUGANG_SCHLUESSEL, eingabe);
    return true;
  }
  return false;
}

function istQuestFreigeschaltet(questId, jetzt) {
  const quest = QUEST_DEFINITIONEN.find((q) => q.id === questId);
  if (!quest) return false;
  return istZeitschlossOffen(quest.zeitschlossDatum, jetzt || new Date(), gespeichertesFruehzugangPasswort());
}

function istPhMeterFreigeschaltet() {
  return istQuestFreigeschaltet("q2");
}

function kategorieAusPh(ph) {
  if (ph < 6.5) return "sauer";
  if (ph > 7.5) return "basisch";
  return "neutral";
}

function zaehleKorrekteEinordnungenQ1() {
  const heft = SBW.ladeForschungsheft();
  let korrekt = 0;
  heft.forEach((eintrag) => {
    if (eintrag.werkzeug !== "universal" && eintrag.werkzeug !== "rotkohl") return;
    const blockDef = SBW.getBlockDefById(eintrag.stoffId);
    if (!blockDef || typeof blockDef.ph !== "number") return;
    if (eintrag.einordnung === kategorieAusPh(blockDef.ph)) korrekt++;
  });
  return korrekt;
}

const HUETTE_ITEM_IDS = [
  "cola", "zitrone", "essig", "apfelsaft", "kaffee", "milch",
  "leitungswasser", "dest_wasser", "backpulver", "seifenloesung",
  "waschmittel", "salmiakgeist", "kalkwasser", "rohrreiniger",
];

const BODEN_UND_GEWAESSER_IDS = [
  "moorboden", "nadelwaldboden", "laubwaldboden", "ackerboden", "kalkboden",
  "moorsee", "waldsee_sauer", "bach", "kalkbach", "meerwasser",
];

function speichereQ3Freitext(text) {
  SBW.speichereJSON(Q3_FREITEXT_SCHLUESSEL, text);
}

function ladeQ3Freitext() {
  return SBW.ladeJSON(Q3_FREITEXT_SCHLUESSEL, "");
}

function istQuestQ1Abgeschlossen() {
  return zaehleKorrekteEinordnungenQ1() >= 6;
}

function istQuestQ2Abgeschlossen() {
  const heft = SBW.ladeForschungsheft();
  const gemessen = new Set(heft.filter((e) => e.werkzeug === "ph_meter").map((e) => e.stoffId));
  return HUETTE_ITEM_IDS.every((id) => gemessen.has(id));
}

function istQuestQ3Abgeschlossen() {
  const heft = SBW.ladeForschungsheft();
  const gemessen = new Set(heft.map((e) => e.stoffId));
  const alleGemessen = BODEN_UND_GEWAESSER_IDS.every((id) => gemessen.has(id));
  return alleGemessen && ladeQ3Freitext().trim().length > 0;
}

function questFortschritt() {
  return {
    q1: istQuestQ1Abgeschlossen(),
    q2: istQuestQ2Abgeschlossen(),
    q3: istQuestQ3Abgeschlossen(),
    korrekt: zaehleKorrekteEinordnungenQ1(),
  };
}

const SBW_QUESTS_EXPORTS = {
  QUEST_DEFINITIONEN,
  FRUEHZUGANG_PASSWORT,
  istZeitschlossOffen,
  istQuestFreigeschaltet,
  istPhMeterFreigeschaltet,
  schaltePasswortFrei,
  kategorieAusPh,
  zaehleKorrekteEinordnungenQ1,
  istQuestQ1Abgeschlossen,
  istQuestQ2Abgeschlossen,
  istQuestQ3Abgeschlossen,
  speichereQ3Freitext,
  ladeQ3Freitext,
  questFortschritt,
  HUETTE_ITEM_IDS,
  BODEN_UND_GEWAESSER_IDS,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = SBW_QUESTS_EXPORTS;
}
if (typeof globalThis !== "undefined") {
  globalThis.SBW = globalThis.SBW || {};
  Object.assign(globalThis.SBW, SBW_QUESTS_EXPORTS);
}
