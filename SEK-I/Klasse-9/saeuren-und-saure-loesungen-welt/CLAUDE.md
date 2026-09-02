# CLAUDE.md — Säuren und saure Lösungen: Teilchenwelt (Klasse 8/9)

## 1. Projekt

Kleine, begehbare Voxel-Ergänzung zum Lernpfad „01 Säuren und saure Lösungen"
(Sek I, Reihe „Säuren und Laugen – echt ätzend"). Zeigt genau das, was die
Schwesterwelt `saeuren-basen-welt` bewusst ausklammert (siehe deren CLAUDE.md
§14: „Teilchenebene / Ionen-Darstellung"): die Protonenübertragung
Säure + Wasser → Säurerest-Anion + Oxonium-Ion als begehbares Standbild.

Kein Quest-/Indikator-/Zeitschloss-System wie bei der Schwesterwelt — das ist
hier nicht angefragt und würde den Umfang unnötig aufblasen. Ausschließlich:
vier Denkmal-Stationen mit Hebel-Interaktion.

## 2. Wiederverwendung aus `saeuren-basen-welt`

Engine (`chunk.js`, `mesher.js`, `atlas.js`, `renderer.js`, `controls.js`,
`physics.js`) ist 1:1 aus der Schwesterwelt übernommen — sie ist generisch und
kennt keine fachlichen Inhalte. `game/blocks.js` (Registrierung aus
`data/blocks.json`) ebenfalls unverändert übernommen. **Bei einem Bugfix in
der Engine der Schwesterwelt prüfen, ob er hier genauso zutrifft** (z. B. der
`flipY`-Textur-Gotcha oder die Event-Reihenfolge Steuerung-vor-HUD).

Neu für dieses Projekt: `game/stationen.js` (5x7-Pixelschrift, Stationsaufbau,
Hebel-Umschaltung) und ein schlankeres `game/main.js` (flache Plaza statt
Zonen-Insel, keine HUD-Werkzeugleiste, dafür Hebel-Raycast + Flug-Animation
des Protons).

## 3. Harte Randbedingungen (wie Schwesterwelt)

Eine einzige HTML-Datei, kein CDN, keine Laufzeit-Netzwerkanfragen, Assets
inline. Entwicklung modular in `src/`, `build/assemble.py` baut `dist/`.
Hosting: GitHub Pages, Repo `nitrogen-ai/Chemie`,
Zielpfad `SEK-I/Klasse-9/saeuren-und-saure-loesungen-welt/`.

## 4. Stationen

Vier Stationen entlang einer Plaza (X-Achse), jede mit eigenem Hebel:

| Station | Säure (Wort) | Zustand | gelöschte Glyphe beim Hebelzug |
|---|---|---|---|
| `haupt` | HA | — | H (Index 0) → Rest "A" |
| `hcl` | HCL | (g) | H (Index 0) → Rest "CL" |
| `h2so4` | H2SO4 | (l), nur 1. Protolysestufe | Ziffer "2" (Index 1) → Rest "H SO4" liest sich als HSO4 |
| `vitc` | HASC | (s), vereinfachtes Modell | H (Index 0) → Rest "ASC" |

Wasserseite ist bei allen vier Stationen identisch: `H2O` → `H3O` (Ziffer "2"
wird zu "3" an derselben Boundingbox, kein Verschieben nötig) + angehängte
Ladungsglyphe "+". Die Säureseite bekommt eine angehängte "-"-Ladungsglyphe.
Zwei Elektronenpaar-Blöcke am Sauerstoff, eines davon verschwindet beim
Hebelzug (das jetzt zur neuen O–H-Bindung "verbrauchte" freie Elektronenpaar).

Hebel ist erneut antippbar → setzt die Station zurück (Rundtrip getestet in
`tests/test_integration.js`), damit dieselbe Vorführung mehrfach pro
Unterrichtstag funktioniert, ohne die Seite neu zu laden.

**Bewusste fachliche Vereinfachungen** (je Station in `stationen.js` als
`hinweis`-Text hinterlegt und auf dem Schild angezeigt):
- Schwefelsäure: nur die erste von zwei Protolysestufen.
- Ascorbinsäure (Vitamin C, C6H8O6): stellvertretend als einprotonige Säure
  "HAsc" dargestellt, keine echte Strukturformel — die reale Struktur ließe
  sich in der 5x7-Blockschrift nicht sinnvoll darstellen.

## 5. Deep-Links

`main.js` unterstützt wie die Schwesterwelt `?start=x,y,z` zum Überschreiben
des Spawnpunkts. Genutzt für zwei Links aus dem Lernpfad-HTML:
- Haupteingang (Station `haupt`) ohne Parameter — `world.json`s
  `start` (24,6,26) liegt bereits passend vor deren Hebel (x=27).
- „Weitere Beispiele" mit `?start=84,6,26` kurz vor Station `hcl`
  (Hebel bei x=87), damit man nicht erst an der Hauptstation vorbeilaufen muss.

Stand nach aktuellem Layout (`node -e` mit `baueStationen()` nachgerechnet,
Kommando siehe unten): Hebel bei x=27 (`haupt`), 87 (`hcl`), 156 (`h2so4`),
228 (`vitc`), letzte belegte Spalte bei x=270 (Weltbreite 304, reicht mit
Marge). **Bei Änderungen an `STATION_ABSTAND` oder den Glyphenwörtern in
`stationen.js` diese Zahlen neu ermitteln und die zwei Links im
Lernpfad-HTML entsprechend nachziehen:**

```
node -e 'require("./src/js/game/blocks.js"); require("./src/js/game/stationen.js");
const { stationen, naechsteFreieX } = SBW.baueStationen(() => {}, 4, 6);
stationen.forEach(s => console.log(s.def.id, s.hebel));
console.log("naechsteFreieX", naechsteFreieX);'
```

## 6. Qualitätssicherung

Wie Schwesterwelt: `python3 build/assemble.py` (Assertions: keine
INJECT-Reste, keine `http(s)://`-Referenzen, jeder Blocktyp aus
`blocks.json` kommt im JS-Quellcode vor — nicht in `world.json`, da Stationen
programmatisch gestampft werden, nicht aus einer Zonen-Rezept-JSON), dann
`node tests/test_integration.js`. Vor Unterrichtseinsatz einmal auf einem
iPad/Tablet öffnen und die Hebel-Interaktion antippen (Tap-Erkennung wurde
nur per Unit-Test auf die Blockplatzierung geprüft, nicht das echte
Touch-Raycasting — siehe Lektion zu `element.dispatchEvent` vs.
`elementFromPoint` in der Schwesterwelt-Memory, falls hier ein ähnlicher
Tap-Erreichbarkeits-Bug auftaucht).
