// HUD: Werkzeugleiste, Farbskala, Forschungsheft-Ansicht, Messvorgang (§8).

const FLASH_DAUER_MS = 8000;

const WERKZEUGE = [
  { id: "universal", label: "U", titel: "Pipette Universalindikator" },
  { id: "rotkohl", label: "R", titel: "Rotkohlsaft" },
  { id: "ph_meter", label: "pH", titel: "pH-Meter (ab DS 2)" },
];

function erzeugeFarbskalaStreifen(doc, farbtabelle) {
  const streifen = doc.createElement("div");
  streifen.className = "skala-streifen";
  for (let ph = 1; ph <= 14; ph++) {
    const segment = doc.createElement("div");
    segment.className = "skala-segment";
    segment.style.background = farbtabelle[ph];
    segment.dataset.ph = String(ph);
    streifen.appendChild(segment);
  }
  return streifen;
}

function createHud(kontext) {
  const doc = kontext.document;
  const hud = doc.getElementById("hud");
  const blockregister = kontext.blockregister;

  let aktivesWerkzeug = "universal";
  let flashTimeoutByCode = new Map();

  // --- Fadenkreuz ------------------------------------------------------------
  const fadenkreuz = doc.createElement("div");
  fadenkreuz.className = "hud-fadenkreuz";
  hud.appendChild(fadenkreuz);

  // --- Werkzeugleiste ------------------------------------------------------
  const werkzeugleiste = doc.createElement("div");
  werkzeugleiste.id = "werkzeugleiste";

  const slotByWerkzeug = {};
  WERKZEUGE.forEach((werkzeug) => {
    const slot = doc.createElement("div");
    slot.className = "werkzeug-slot hud-flaeche touch-ziel";
    slot.textContent = werkzeug.label;
    slot.title = werkzeug.titel;
    slot.dataset.werkzeug = werkzeug.id;
    slot.addEventListener("touchstart", (event) => {
      event.preventDefault();
      waehleWerkzeug(werkzeug.id);
    });
    werkzeugleiste.appendChild(slot);
    slotByWerkzeug[werkzeug.id] = slot;
  });
  hud.appendChild(werkzeugleiste);

  function aktualisiereWerkzeugleiste() {
    WERKZEUGE.forEach((werkzeug) => {
      const slot = slotByWerkzeug[werkzeug.id];
      const gesperrt = werkzeug.id === "ph_meter" && !istPhMeterFreigeschaltet();
      slot.classList.toggle("werkzeug-aktiv", werkzeug.id === aktivesWerkzeug);
      slot.classList.toggle("werkzeug-gesperrt", gesperrt);
    });
  }

  function istPhMeterFreigeschaltet() {
    return typeof SBW.istPhMeterFreigeschaltet === "function" && SBW.istPhMeterFreigeschaltet();
  }

  function waehleWerkzeug(werkzeugId) {
    if (werkzeugId === "ph_meter" && !istPhMeterFreigeschaltet()) {
      zeigeToast("pH-Meter ist noch nicht freigeschaltet.");
      return;
    }
    aktivesWerkzeug = werkzeugId;
    aktualisiereWerkzeugleiste();
  }
  aktualisiereWerkzeugleiste();

  // --- Toast (kurze Rückmeldung) ------------------------------------------
  const toast = doc.createElement("div");
  toast.id = "werkzeug-toast";
  toast.className = "hud-flaeche";
  toast.style.display = "none";
  hud.appendChild(toast);

  let toastTimeout = null;
  function zeigeToast(text, dauerMs = 2200) {
    toast.textContent = text;
    toast.style.display = "block";
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.style.display = "none";
    }, dauerMs);
  }

  // --- Farbskala-Panel ------------------------------------------------------
  const skalaButton = doc.createElement("div");
  skalaButton.id = "skala-button";
  skalaButton.className = "hud-flaeche touch-ziel";
  skalaButton.textContent = "pH-Skala";
  hud.appendChild(skalaButton);

  const skalaPanel = doc.createElement("div");
  skalaPanel.id = "skala-panel";
  skalaPanel.className = "hud-flaeche hud-panel";
  skalaPanel.style.display = "none";

  const skalaUeberschriftUni = doc.createElement("div");
  skalaUeberschriftUni.className = "skala-titel";
  skalaUeberschriftUni.textContent = "Universalindikator";
  const streifenUni = erzeugeFarbskalaStreifen(doc, SBW.UNIVERSAL_FARBEN);

  const skalaUeberschriftRotkohl = doc.createElement("div");
  skalaUeberschriftRotkohl.className = "skala-titel";
  skalaUeberschriftRotkohl.textContent = "Rotkohlsaft";
  const streifenRotkohl = erzeugeFarbskalaStreifen(doc, SBW.ROTKOHL_FARBEN);

  const skalaBeschriftung = doc.createElement("div");
  skalaBeschriftung.className = "skala-beschriftung";
  skalaBeschriftung.innerHTML = "<span>sauer</span><span>neutral</span><span>basisch</span>";

  skalaPanel.appendChild(skalaUeberschriftUni);
  skalaPanel.appendChild(streifenUni);
  skalaPanel.appendChild(skalaUeberschriftRotkohl);
  skalaPanel.appendChild(streifenRotkohl);
  skalaPanel.appendChild(skalaBeschriftung);
  hud.appendChild(skalaPanel);

  // Nur ein Panel gleichzeitig offen, sonst überlappen sie sich (beide oben mittig).
  const alleTogglePanels = [skalaPanel];
  function schliesseAndereToggle(panel) {
    alleTogglePanels.forEach((p) => {
      if (p !== panel) p.style.display = "none";
    });
  }

  skalaButton.addEventListener("touchstart", (event) => {
    event.preventDefault();
    const wirdGeoeffnet = skalaPanel.style.display === "none";
    schliesseAndereToggle(skalaPanel);
    skalaPanel.style.display = wirdGeoeffnet ? "block" : "none";
  });

  function markiereSkala(werkzeug, ph) {
    const streifen = werkzeug === "rotkohl" ? streifenRotkohl : streifenUni;
    Array.from(streifen.children).forEach((segment) => {
      segment.classList.remove("skala-markiert");
    });
    const phGeklemmt = Math.min(14, Math.max(1, Math.round(ph)));
    const segment = streifen.children[phGeklemmt - 1];
    if (segment) segment.classList.add("skala-markiert");
    schliesseAndereToggle(skalaPanel);
    skalaPanel.style.display = "block";
  }

  // --- Forschungsheft-Panel -------------------------------------------------
  const heftButton = doc.createElement("div");
  heftButton.id = "forschungsheft-button";
  heftButton.className = "hud-flaeche touch-ziel";
  heftButton.textContent = "Forschungsheft";
  hud.appendChild(heftButton);

  const heftPanel = doc.createElement("div");
  heftPanel.id = "forschungsheft-panel";
  heftPanel.className = "hud-flaeche hud-panel";
  heftPanel.style.display = "none";
  hud.appendChild(heftPanel);
  alleTogglePanels.push(heftPanel);

  function aktualisiereHeftPanel() {
    const eintraege = SBW.ladeForschungsheft();
    heftPanel.innerHTML = "";
    const tabelle = doc.createElement("table");
    tabelle.className = "heft-tabelle";
    const kopf = doc.createElement("tr");
    kopf.innerHTML = "<th>Stoff</th><th>Farbe</th><th>Einordnung</th>";
    tabelle.appendChild(kopf);
    eintraege.forEach((eintrag) => {
      const zeile = doc.createElement("tr");
      const zelleStoff = doc.createElement("td");
      zelleStoff.textContent = eintrag.stoffName;
      const zelleFarbe = doc.createElement("td");
      const farbpunkt = doc.createElement("span");
      farbpunkt.className = "heft-farbpunkt";
      farbpunkt.style.background = eintrag.beobachteteFarbe || "#ccc";
      zelleFarbe.appendChild(farbpunkt);
      const zelleEinordnung = doc.createElement("td");
      zelleEinordnung.textContent = eintrag.einordnung || (eintrag.phWert != null ? `${eintrag.phWert}` : "–");
      zeile.appendChild(zelleStoff);
      zeile.appendChild(zelleFarbe);
      zeile.appendChild(zelleEinordnung);
      tabelle.appendChild(zeile);
    });
    heftPanel.appendChild(tabelle);
  }

  heftButton.addEventListener("touchstart", (event) => {
    event.preventDefault();
    const wirdGeoeffnet = heftPanel.style.display === "none";
    schliesseAndereToggle(heftPanel);
    if (wirdGeoeffnet) aktualisiereHeftPanel();
    heftPanel.style.display = wirdGeoeffnet ? "block" : "none";
  });

  // --- Einordnungs-Prompt ---------------------------------------------------
  const prompt = doc.createElement("div");
  prompt.id = "einordnung-prompt";
  prompt.className = "hud-flaeche hud-panel";
  prompt.style.display = "none";

  const promptFrage = doc.createElement("div");
  promptFrage.className = "skala-titel";
  promptFrage.textContent = "Wie ordnest du das ein?";
  prompt.appendChild(promptFrage);

  const promptKnoepfe = doc.createElement("div");
  promptKnoepfe.className = "einordnung-knoepfe";
  let ausstehenderEintrag = null;
  ["sauer", "neutral", "basisch"].forEach((kategorie) => {
    const knopf = doc.createElement("div");
    knopf.className = "einordnung-knopf touch-ziel";
    knopf.textContent = kategorie;
    knopf.addEventListener("touchstart", (event) => {
      event.preventDefault();
      if (!ausstehenderEintrag) return;
      SBW.trageInForschungsheftEin(Object.assign({}, ausstehenderEintrag, { einordnung: kategorie }));
      ausstehenderEintrag = null;
      prompt.style.display = "none";
      zeigeToast(`Eingetragen: ${kategorie}`);
    });
    promptKnoepfe.appendChild(knopf);
  });
  prompt.appendChild(promptKnoepfe);
  hud.appendChild(prompt);

  // --- Blink-Effekt am Atlas ------------------------------------------------
  function blinkeBlock(blockCode, farbe) {
    const bestehenderTimeout = flashTimeoutByCode.get(blockCode);
    if (bestehenderTimeout) clearTimeout(bestehenderTimeout);

    SBW.zeichneEineKachel(kontext.atlasCanvas, kontext.atlasLayout, blockCode, farbe);
    kontext.atlasTexture.needsUpdate = true;

    const timeout = setTimeout(() => {
      const originalFarbe = kontext.farbenNachCode[blockCode];
      SBW.zeichneEineKachel(kontext.atlasCanvas, kontext.atlasLayout, blockCode, originalFarbe);
      kontext.atlasTexture.needsUpdate = true;
      flashTimeoutByCode.delete(blockCode);
    }, FLASH_DAUER_MS);
    flashTimeoutByCode.set(blockCode, timeout);
  }

  // --- Werkzeug anwenden ------------------------------------------------------
  function wendeWerkzeugAn(blockCode) {
    const blockDef = blockregister.getBlockDefByCode(blockCode);
    if (!blockDef) return;

    if (typeof blockDef.ph !== "number") {
      zeigeToast("Hier lässt sich nichts messen.");
      return;
    }

    if (aktivesWerkzeug === "ph_meter") {
      if (!istPhMeterFreigeschaltet()) {
        zeigeToast("pH-Meter ist noch nicht freigeschaltet.");
        return;
      }
      zeigeToast(`${blockDef.name}: pH ${blockDef.ph}`);
      SBW.trageInForschungsheftEin({
        stoffId: blockDef.id,
        stoffName: blockDef.name,
        werkzeug: "ph_meter",
        beobachteteFarbe: null,
        einordnung: null,
        phWert: blockDef.ph,
      });
      return;
    }

    const farbe = SBW.getIndikatorFarbe(aktivesWerkzeug, blockDef.ph);
    blinkeBlock(blockCode, farbe);
    markiereSkala(aktivesWerkzeug, blockDef.ph);

    ausstehenderEintrag = {
      stoffId: blockDef.id,
      stoffName: blockDef.name,
      werkzeug: aktivesWerkzeug,
      beobachteteFarbe: farbe,
    };
    prompt.style.display = "block";
  }

  return { wendeWerkzeugAn, waehleWerkzeug, zeigeToast };
}

const SBW_HUD_EXPORTS = { createHud };

if (typeof module !== "undefined" && module.exports) {
  module.exports = SBW_HUD_EXPORTS;
}
if (typeof globalThis !== "undefined") {
  globalThis.SBW = globalThis.SBW || {};
  Object.assign(globalThis.SBW, SBW_HUD_EXPORTS);
}
