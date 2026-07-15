# Lernpfad III — Organische Chemie (Chemie LK · Q1)

Interaktiver Lernpfad zum Basiskonzept **Struktur & Eigenschaft**: Stoffklassen,
funktionelle Gruppen und zwischenmolekulare Kräfte. Verknüpft mit dem
**Chemical Communication Trainer** (Übungsmodus).

## Inhalt des Pakets

| Datei | Zweck |
|---|---|
| `lernpfad-03-organik.html` | **Deploybare Seite** (self-contained, eine Datei). Zeitschloss + Passwortgate bleiben erhalten. |
| `mitschrift-organik.pdf` / `.typ` | Mitschrift (Lückenfassung) für die Hand der SuS. |
| `musterloesung-organik.pdf` / `.typ` | Deckungsgleich gelayoutete Musterlösung. |
| `svg/` | Vektorgrafiken (Skelett-/Strukturformeln + Abbildungen), die die `.typ`-Dateien einbinden. |
| `src/` | Quellcode zur Wartung / zum Neubau. |

### Deployment (GitHub Pages)
`lernpfad-03-organik.html` einfach nach
`SEK-II/Leistungskurs/` legen (Dateiname an deine Q1-Struktur anpassen).
Die Seite ist eigenständig — sie braucht `svg/` und `src/` **nicht**, da Renderer,
Abbildungen und Logik bereits inline enthalten sind.

- **Freischaltung:** automatisch ab `2026-09-26 07:00 MESZ` (SJW 5).
- **Vorzeitiger Zugang:** Passwort `Chemieistüberall.` (wie in den übrigen Lernpfaden).

### Verknüpfung
Aufruf des Trainers (Übungsmodus, Stoffklassen Alkane … Ester) erfolgt aus § 5.
Link: `https://nitrogen-ai.github.io/training/chemical_communication_trainer.html`

## Neu bauen

**Strukturformeln** werden mit demselben Renderer wie der Trainer erzeugt
(`src/render-core.js`, portiert). Abbildungen zu Partialladungen / H-Brücken /
Schlüssel-Schloss in `src/figures.js`.

```bash
# SVGs für die Typst-Dokumente erzeugen
node src/gen-svgs.js      # Skelett-/Strukturformeln  ->  svg/
node src/gen-figs.js      # didaktische Abbildungen    ->  svg/

# HTML zusammenbauen (Renderer + App + Abbildungen werden inline injiziert)
node src/build.js         # src/lernpfad-03-organik.src.html -> lernpfad-03-organik.html

# Typst -> PDF  (LOESUNG-Flag in _lernpfad-organik.typ schaltet Lücke/Lösung)
#   mitschrift-organik.typ   : #let LOESUNG = false
#   musterloesung-organik.typ: #let LOESUNG = true
typst compile mitschrift-organik.typ
typst compile musterloesung-organik.typ
```

> Hinweis Typst: Schriftart `New Computer Modern`; `upright("mol")` statt `mol`
> als Variable. Die `.typ`-Dateien referenzieren `svg/…` relativ — der Ordner
> muss beim Kompilieren daneben liegen.

## Aufbau des Lernpfads
§ 0 Lernziele · § 1 Einstieg Zucker (induktiv) · § 2 Zwischenmolekulare Kräfte &
Partialladungen · § 3 Umkehrung Disaccharide (deduktiv) · § 4 Fazit ·
§ 5 Auftrag + Trainer + Alkanole-Vorlage · § 6 Fachtexte · § 7 Musterlösung
(Stoffklassen) · § 8 Übungen (Reproduktion/Anwendung/Transfer) · § 9 Aromaten
(Schnellläufer:innen) · § 10 Material.
