
# Chemie — Unterrichtsmaterial

## Was hier liegt
- Interaktive Lern- und Übungsmaterialien als HTML.
- Gegliedert nach Schulstufe: SEK-I/, SEK-II/, darin nach Klassenstufe.

## Konventionen
- Sprache: Deutsch.
- HTML immer als einzelne, offline lauffähige Datei — keine CDN-Abhängigkeiten.
- Typst (.typ) für PDF-Dokumente, sobald welche dazukommen.
  Build-Ergebnisse (PDFs) gehören nach iCloud, nicht ins Repo.

## Öffentlich — Vorsicht
- Dieses Repo ist public. Keine Schüler-Klarnamen, Noten oder
  personenbezogenen Daten in Dateien oder Commit-Nachrichten.

## Struktur SEK-II
- SEK-II/chemie-lk-kursplan.html — Kursübersicht LK.
- SEK-II/Q1/ — die neun Lernpfade (lernpfad-q1-01…09).
- SEK-II/Q1/organik-build/ — Generator für Lernpfad 03:
  src/ erzeugt die HTML, svg/ enthält die Strukturformeln.
  Ausgabe gehört nach Q1/, NICHT nochmal in organik-build/.

## Was hier NIE hineingehört
- PDFs und Musterlösungen (die .gitignore blockt *.pdf).
- Typst-Quellen mit LOESUNG-Flag: eine Quelle, die per Schalter
  zwischen Lücken- und Lösungsfassung wechselt — die Lösungen
  stehen darin im Klartext. Solche Dateien bleiben in iCloud.
- Aufgabenblätter, Mitschriften, Rohmaterial → iCloud.
