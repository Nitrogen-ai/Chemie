# CLAUDE.md — Säuren-Basen-Welt (Voxel-Lernumgebung, Klasse 9)

## 1. Projekt

Webbasierte, Minecraft-artige Lernwelt für die ersten drei Doppelstunden der Reihe
**„Säuren und Laugen – echt ätzend"** (Rosa-Luxemburg-Gymnasium, SchiC Doppeljahrgang 9/10,
Klasse 9 = 90-min-Doppelstunden, Reihe ca. 15 Wochen).

Der Pilot deckt bewusst **nur den messend-qualitativen Teil** ab. Es gibt in diesem
Ausbaustand **kein Reaktionssystem** — keine Neutralisation, kein Crafting von Stoffen.
Schüler:innen messen, ordnen zu und vergleichen Indikatoren. Das hält den Umfang klein
und die Fachlogik überschaubar.

**Lernziele des Piloten**
- DS 1: sauer / neutral / basisch mit Indikatoren qualitativ unterscheiden
- DS 2: pH-Wert als Skala lesen und Alltagsprodukte einordnen
- DS 3: pH-Werte von Böden und Gewässern erfassen und deuten

**Zielgerät: iPad.** Alles andere ist Sekundärziel. Wenn eine Designentscheidung
zwischen Desktop-Komfort und iPad-Performance abwägt, gewinnt immer das iPad.

---

## 2. Harte Randbedingungen

Diese Punkte sind nicht verhandelbar. Bei Konflikt mit einer anderen Anweisung
in diesem Dokument gewinnen sie.

1. **Auslieferung als eine einzige HTML-Datei.** Keine externen Dateien, kein CDN,
   keine Netzwerkanfragen zur Laufzeit. Alle Assets base64-eingebettet, alle
   Bibliotheken inline.
2. **Entwicklung erfolgt trotzdem modular.** Quellen liegen in `src/`, ein
   Python-Assembler baut daraus `dist/`. Niemals direkt in der 1,5-MB-Ausgabedatei
   editieren.
3. **Kein localStorage-Verbot hier** — anders als in Claude-Artefakten ist die Datei
   für GitHub Pages gedacht, localStorage ist erlaubt und erwünscht.
4. **Hosting:** GitHub Pages, Repo `nitrogen-ai/Chemie`,
   Zielpfad `SEK-I/Klasse-9/saeuren-basen-welt/`.
5. **Sprache:** Alle Oberflächentexte, Kommentare und Commit-Messages auf Deutsch.
   Fachsprache nach SchiC-Begriffsliste (siehe §8).

---

## 3. Repo-Struktur

```
SEK-I/Klasse-9/saeuren-basen-welt/
├── CLAUDE.md                  (diese Datei)
├── src/
│   ├── index.template.html    Grundgerüst mit Platzhaltern <!--INJECT:css--> usw.
│   ├── css/
│   │   ├── tokens.css         Designsystem, siehe §7
│   │   ├── hud.css
│   │   └── touch.css
│   ├── js/
│   │   ├── engine/
│   │   │   ├── chunk.js       Chunk-Datenstruktur, Uint8Array
│   │   │   ├── mesher.js      Greedy Meshing → BufferGeometry
│   │   │   ├── renderer.js    three.js-Setup, Kamera, Nebel
│   │   │   ├── controls.js    Touch: Joystick + Look-Zone
│   │   │   └── physics.js     AABB-Kollision, Gravitation, Springen
│   │   └── game/
│   │       ├── blocks.js      Blockregister (aus data/blocks.json generiert)
│   │       ├── indicator.js   pH → Farbe, beide Indikatoren
│   │       ├── hud.js         Farbskala, Werkzeugleiste
│   │       ├── journal.js     Forschungsheft
│   │       ├── quests.js      Aufgabenlogik, Zeitschloss
│   │       └── storage.js     localStorage-Wrapper, Fortschrittscode
│   ├── data/
│   │   ├── blocks.json        Blocktabelle, siehe §5
│   │   ├── world.json         Kartendefinition
│   │   └── quests.json
│   └── vendor/
│       └── three.min.js       fest gepinnte Version, nicht auto-updaten
├── build/
│   └── assemble.py            Assembler mit assert-Selbstprüfungen
├── tests/
│   └── test_integration.js    jsdom
└── dist/
    └── saeuren-basen-welt.html
```

**Assembler-Pflichten** (`build/assemble.py`): Nach dem Zusammenbau prüfen per `assert`,
dass (a) kein `<!--INJECT:` mehr in der Ausgabe steht, (b) kein `http://` oder `https://`
in `src=`/`href=`-Attributen vorkommt, (c) jeder Blocktyp aus `blocks.json` mindestens
einmal in der Welt vorkommt, (d) die Dateigröße unter 2,0 MB liegt. Bei Fehlschlag
mit Exit-Code ≠ 0 abbrechen, keine Teilausgabe schreiben.

---

## 4. Engine-Vorgaben

**Renderer:** three.js, `WebGLRenderer` mit `antialias: false`, `powerPreference: 'low-power'`.
Alle Blöcke eines Chunks in **einer** `BufferGeometry` mit einem einzigen Material und
einem prozedural erzeugten Textur-Atlas (Canvas 2D → `CanvasTexture`, `NearestFilter`,
keine Mipmaps für den Retro-Look). Keine `THREE.BoxGeometry` pro Block — das killt die
Framerate sofort.

**Chunks:** 16×16×32, gespeichert als `Uint8Array(8192)`. Remeshing nur für den
betroffenen Chunk und nur bei tatsächlicher Blockänderung.

**Meshing:** Greedy Meshing mit Face-Culling gegen Nachbarblöcke. Verdeckte Flächen
werden nie erzeugt.

**Performance-Budget (iPad, Safari)**
| Größe | Ziel | Abbruchkriterium |
|---|---|---|
| Framerate | 30 fps stabil | unter 24 fps → M1 gilt als nicht bestanden |
| `devicePixelRatio` | auf 1.5 deckeln | — |
| Weltgröße | 64×64×32 Blöcke | — |
| Sichtweite | 32 Blöcke, Nebel ab 24 | — |
| Draw Calls | < 40 | — |
| Ladezeit bis spielbar | < 3 s | > 5 s |

**Pflicht-Handler:** `webglcontextlost` abfangen und Kontext wiederherstellen —
Safari verwirft den WebGL-Kontext beim Tab-Wechsel regelmäßig. Ohne diesen Handler
sieht die Klasse nach dem ersten App-Wechsel einen schwarzen Bildschirm.

**Kein Pointer Lock.** Existiert auf iOS nicht. Nicht als Hauptpfad einbauen.

---

## 5. Touch-Interface

```
┌─────────────────────────────────────────┐
│  [Forschungsheft]        [pH-Skala]     │  HUD oben
│                                          │
│                                          │
│                    ●                     │  Fadenkreuz Bildschirmmitte
│                                          │
│                                          │
│    ◯                          [Pipette]  │  Joystick links, Aktion rechts
│  Joystick                   [Rotkohl]    │
└─────────────────────────────────────────┘
```

- **Linke Bildschirmhälfte:** virtueller Joystick, erscheint dort, wo der Finger
  aufsetzt (kein fester Ort). Bewegung vorwärts/rückwärts/seitwärts.
- **Rechte Bildschirmhälfte:** Wischen = umsehen. Empfindlichkeit als Konstante
  `LOOK_SENSITIVITY` ganz oben in `controls.js`, damit sie ohne Suche justierbar ist.
- **Tap auf rechter Hälfte ohne Bewegung** (< 10 px, < 200 ms): Werkzeug auf den
  Block unter dem Fadenkreuz anwenden.
- **Sprung-Button** unten rechts über den Werkzeugen.
- Alle Touch-Ziele mindestens 44×44 CSS-Pixel.
- `touch-action: none` auf dem Canvas, `user-select: none` global, Doppeltipp-Zoom
  per `viewport`-Meta unterbinden.
- **Kein Blockabbau, kein Blocksetzen im Piloten.** Die Welt ist nicht veränderbar.
  Das spart Physik-Sonderfälle und verhindert, dass die Klasse die Karte zerlegt.

---

## 6. Fachliche Blocktabelle

**Wichtig: Die Hex-Werte unten sind Näherungen und müssen vor dem Einsatz gegen eine
echte Farbskala geprüft werden.** Nitrogen prüft das; nicht eigenmächtig „verbessern".

### 6.1 Universalindikator (pH → Farbe)

| pH | Farbe | Hex |
|---|---|---|
| 1 | rot | `#e02020` |
| 2 | rot-orange | `#e8452a` |
| 3 | orange | `#ef6c1f` |
| 4 | orange-gelb | `#f59120` |
| 5 | gelb | `#f2c31d` |
| 6 | gelb-grün | `#d3d21c` |
| 7 | grün | `#4caf50` |
| 8 | blau-grün | `#2f9e8f` |
| 9 | blau | `#1f7ab8` |
| 10 | blau | `#1c56a8` |
| 11 | blau-violett | `#3b3f9e` |
| 12 | violett | `#5b2f92` |
| 13 | violett | `#6b2585` |
| 14 | dunkelviolett | `#4e1a63` |

### 6.2 Rotkohlsaft (Anthocyane)

| pH | Farbe | Hex |
|---|---|---|
| 1–2 | rot | `#c8102e` |
| 3 | pink-rot | `#d6285a` |
| 4 | pink-violett | `#c73a7a` |
| 5 | violett | `#a83a92` |
| 6 | violett | `#8b3fa0` |
| 7 | blau-violett | `#6b46b0` |
| 8 | blau-violett | `#4a53b5` |
| 9 | blau | `#2f6bb8` |
| 10 | türkis | `#2e8b9e` |
| 11 | blaugrün | `#2f9e7d` |
| 12 | grün | `#4aa84a` |
| 13 | gelb-grün | `#8bb52e` |
| 14 | gelb | `#d4c62e` |

Der didaktische Kern von DS 1: **Beide Indikatoren zeigen dieselbe Lösung
unterschiedlich an.** Rotkohl unterscheidet im sauren Bereich schlecht, im basischen
gut; Universalindikator ist über die ganze Skala gleichmäßig. Genau das sollen die
Schüler:innen selbst bemerken — nicht vorher im Text erklären.

### 6.3 Messbare Blöcke

| Block-ID | Bezeichnung | pH | Kategorie | Vorkommen |
|---|---|---|---|---|
| `cola` | Cola | 2,5 | Haushalt | Hütte |
| `zitrone` | Zitronensaft | 2,4 | Haushalt | Hütte |
| `essig` | Haushaltsessig (5 %) | 2,5 | Haushalt | Hütte |
| `apfelsaft` | Apfelsaft | 3,5 | Haushalt | Hütte |
| `kaffee` | Kaffee | 5,0 | Haushalt | Hütte |
| `milch` | Milch | 6,6 | Haushalt | Hütte |
| `leitungswasser` | Leitungswasser | 7,2 | Neutral | Hütte, Brunnen |
| `dest_wasser` | Destilliertes Wasser | 7,0 | Neutral | Hütte |
| `backpulver` | Backpulverlösung | 8,3 | Haushalt | Hütte |
| `seifenloesung` | Seifenlösung | 9,5 | Haushalt | Hütte |
| `waschmittel` | Waschmittellösung | 10,5 | Haushalt | Hütte |
| `salmiakgeist` | Salmiakgeist (verd.) | 11,5 | Haushalt | Hütte |
| `kalkwasser` | Kalkwasser | 12,4 | Labor | Hütte |
| `rohrreiniger` | Rohrreiniger | 13,5 | Haushalt | Hütte |
| `moorboden` | Moorboden | 3,8 | Boden | Moorsenke |
| `nadelwaldboden` | Nadelwaldboden | 4,2 | Boden | Fichtenhain |
| `laubwaldboden` | Laubwaldboden | 5,5 | Boden | Laubwald |
| `ackerboden` | Ackerboden | 6,8 | Boden | Feld |
| `kalkboden` | Kalkboden | 7,9 | Boden | Steinbruch |
| `moorsee` | Moorwasser | 4,0 | Gewässer | Moorsenke |
| `waldsee_sauer` | versauerter Waldsee | 4,8 | Gewässer | Fichtenhain |
| `bach` | Bachwasser | 7,4 | Gewässer | Bachlauf |
| `kalkbach` | kalkreicher Bach | 8,2 | Gewässer | Steinbruch |
| `meerwasser` | Meerwasser | 8,1 | Gewässer | Küste |

Zusätzlich rein dekorative Blöcke ohne pH (Gras, Stein, Holz, Laub, Sand, Bretter,
Fichtennadeln). Diese geben beim Antippen die Rückmeldung „Hier lässt sich nichts messen."

---

## 7. Weltaufbau

Eine kleine Insel, 64×64 Blöcke, sechs klar unterscheidbare Zonen:

1. **Hütte** (Zentrum) — Regal mit den Haushaltsprodukten, Arbeitstisch,
   Farbskala als Poster an der Wand
2. **Moorsenke** (NW) — dunkler Boden, Moorsee, Torfmoos
3. **Fichtenhain** (NO) — Nadelwaldboden, kleiner versauerter See
4. **Laubwald** (O) — heller Boden, Mischbestand
5. **Feld** (S) — Ackerboden, Zaun
6. **Steinbruch + Küste** (W) — Kalkboden, Kalkbach, Übergang zum Meer

Alle Zonen vom Startpunkt in unter 30 Sekunden Laufweg erreichbar. Keine Gefahren,
keine Gegner, kein Fallschaden, keine Nacht — die Welt ist ein Messrevier, kein Spiel
mit Verlustrisiko.

---

## 8. Werkzeuge & Forschungsheft

**Drei Werkzeuge in der Leiste:**
1. Pipette Universalindikator
2. Rotkohlsaft
3. pH-Meter (erst ab DS 2 freigeschaltet, zeigt Zahlenwert direkt)

**Messvorgang:** Werkzeug wählen → Block antippen → Block färbt sich für 8 Sekunden
in der Indikatorfarbe → HUD zeigt die Farbskala mit Markierung → Schüler:in ordnet
selbst zu und trägt ins Forschungsheft ein.

Bei Indikatoren wird **kein Zahlenwert angezeigt.** Der pH-Wert steht in `blocks.json`,
wird aber in DS 1 nie ausgegeben — die Zuordnung ist die Aufgabe. Erst das pH-Meter
in DS 2 liefert Zahlen.

**Forschungsheft:** Tabelle Stoff / beobachtete Farbe / eigene Einordnung. Einträge
persistent in localStorage unter Schlüssel `sbw.journal.v1`.

---

## 9. Quests & Zeitschloss

`quests.json`, drei Aufträge:

| ID | Doppelstunde | Auftrag | Abschluss wenn |
|---|---|---|---|
| `q1` | DS 1 | Sechs Haushaltsprodukte mit beiden Indikatoren prüfen und in sauer/neutral/basisch einordnen | 6 korrekte Einordnungen |
| `q2` | DS 2 | Alle vierzehn Haushaltsprodukte mit dem pH-Meter messen und nach pH ordnen | Rangfolge korrekt |
| `q3` | DS 3 | pH aller Böden und Gewässer erfassen, Zusammenhang Nadelwald↔Waldsee begründen | alle Messpunkte + Freitextantwort |

**Zeitschloss-Konvention** (wie in den bestehenden Lernpfaden): ISO-Datum, Freischaltung
samstags 07:00 MESZ nach der jeweiligen Unterrichtswoche. Passwort für Frühzugang:
`Chemieistüberall.` (mit Punkt).

**Fortschrittscode:** Beim Abschluss aller Quests erzeugt `storage.js` einen kurzen
Base36-Code aus Quest-Status und Anzahl korrekter Einordnungen, den Schüler:innen
abgeben können. Kein Server, keine Datenübertragung, keine personenbezogenen Daten —
die Welt fragt zu keinem Zeitpunkt nach einem Namen.

---

## 10. Designsystem

Übernahme aus den bestehenden Lernpfaden, damit die Welt zum übrigen Material passt:

```css
--bg-cream:    #faf6ee;
--teal:        #1e5d52;
--terracotta:  #a83610;
--gold:        #c9a961;
--ink:         #23201c;

--font-display: Georgia, 'Times New Roman', serif;   /* Überschriften */
--font-body:    system-ui, -apple-system, sans-serif;
--font-mono:    ui-monospace, 'SF Mono', monospace;  /* Messwerte */
```

HUD-Flächen: cremefarben mit `backdrop-filter: blur(6px)`, teal Rahmen 2 px.
Messwerte immer in `--font-mono`. Keine Systemfont-Fallbacks, die auf iOS fehlen.

Die Voxel-Texturen sind bewusst nicht Minecraft-Kopien: 16×16 px, prozedural aus der
Palette oben erzeugt, leicht gedämpft. Wiedererkennbare Ästhetik, kein Markenkonflikt.

---

## 11. Qualitätssicherung

**Pflichtroutine vor jedem Commit auf `main`:**
1. `python build/assemble.py` — muss ohne Assertion-Fehler durchlaufen
2. `node tests/test_integration.js` — jsdom, **Null-JS-Fehler-Politik**, alle Tests grün
3. Dateigröße prüfen, unter 2,0 MB

**Testabdeckung mindestens:**
- `indicator.js`: jeder pH-Wert aus `blocks.json` liefert für beide Indikatoren eine
  definierte Farbe; keine `undefined`
- `blocks.json`: alle pH-Werte im Bereich 0–14, keine Dubletten bei Block-IDs
- `quests.js`: Zeitschloss gibt vor dem Datum `false`, nach dem Datum `true`,
  Passwort schaltet frei
- `storage.js`: Fortschrittscode ist deterministisch und wieder dekodierbar
- Welt: jede der sechs Zonen enthält mindestens einen messbaren Block

**Manuell auf dem iPad zu prüfen** (kann kein Test abdecken): Framerate, Joystick-
Empfindlichkeit, Lesbarkeit des HUD bei Sonnenlicht, Verhalten nach App-Wechsel.

**Editierdisziplin:** Vor Änderungen `grep -n` mit mehreren Suchmustern, um alle
betroffenen Stellen zu finden. Nach jeder Ersetzung per grep verifizieren
(alter String = 0 Treffer, neuer String > 0).

---

## 12. Meilensteine

| M | Inhalt | Abnahmekriterium |
|---|---|---|
| **M1** | Voxel-Renderer, Touch-Steuerung, feste Testwelt aus drei Blocktypen | 30 fps auf dem ältesten Schul-iPad, Laufen und Umsehen fühlt sich richtig an |
| **M2** | Vollständige Insel, alle Blocktypen, localStorage | Ladezeit < 3 s, alle sechs Zonen begehbar |
| **M3** | Indikator-Items, Farblogik, HUD-Skala, Forschungsheft | Farbwerte gegen echte Skala geprüft und freigegeben |
| **M4** | Drei Quests, Zeitschloss, Fortschrittscode | jsdom-Tests grün, Deployment auf GitHub Pages |

**M1 ist die Risikostufe.** Wenn die Framerate dort nicht hält, wird das Projekt
neu zugeschnitten (kleinere Welt oder Verzicht auf three.js zugunsten von rohem
WebGL2) — nicht mit Inhaltsarbeit weitergemacht.

---

## 13. Startprompts für M1

Nacheinander, jeweils erst nach bestandener Prüfung des vorigen Schritts:

**M1.1**
> Lege die Repo-Struktur aus §3 an. Schreibe `build/assemble.py` mit allen vier
> Assertion-Prüfungen aus §3 und ein minimales `src/index.template.html` mit den
> Platzhaltern. Lade three.js in `src/vendor/` und pinne die Version. Der Assembler
> muss durchlaufen und eine gültige, wenn auch leere HTML-Datei erzeugen.

**M1.2**
> Implementiere `engine/chunk.js` und `engine/mesher.js` nach §4: Chunks 16×16×32 als
> Uint8Array, Greedy Meshing mit Face-Culling, Ausgabe als eine BufferGeometry pro
> Chunk. Erzeuge den Textur-Atlas prozedural per Canvas 2D aus der Palette in §10.
> Schreibe jsdom-Tests, die prüfen, dass verdeckte Flächen nicht erzeugt werden.

**M1.3**
> Implementiere `engine/renderer.js` und `engine/physics.js`. Testwelt: flaches
> 32×32-Feld aus Gras, Stein und Holz mit ein paar Erhebungen. AABB-Kollision,
> Gravitation, Springen. Nebel ab 24 Blöcken. devicePixelRatio auf 1.5 deckeln.
> `webglcontextlost`-Handler nicht vergessen.

**M1.4**
> Implementiere `engine/controls.js` nach der Touch-Spezifikation in §5. Virtueller
> Joystick links, Look-Zone rechts, Sprung-Button, LOOK_SENSITIVITY als Konstante
> ganz oben. Blende einen FPS-Zähler ein, der sich per URL-Parameter `?debug=1`
> aktivieren lässt. Baue die Datei und gib mir den Pfad zur fertigen HTML zum Testen
> auf dem iPad.

---

## 14. Was in diesem Ausbaustand ausdrücklich nicht gebaut wird

Nicht anfangen, auch nicht „schon mal vorbereiten":

- Reaktionssystem, Neutralisation, Crafting
- Blockabbau und Blocksetzen
- Teilchenebene / Ionen-Darstellung
- Mehrspieler, Server, Backend jeder Art
- Tag-Nacht-Wechsel, Wetter, Gegner, Gesundheit
- Doppelstunden 4–15 der Reihe

Diese Punkte kommen nach der Pilot-Erprobung im Unterricht — und erst, wenn feststeht,
dass die Klasse mit der Grundmechanik zurechtkommt.
