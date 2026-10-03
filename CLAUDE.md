
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

## Umgezogen
Das Spektrometer-Projekt (`Spektrometer/`) lag hier bis 2026-08-30, liegt jetzt im Repo
`Nitrogen-ai/Jugend-Forscht` unter `spektrometer/` — inhaltlich ein Jugend-Forscht-Projekt.
Git-Historie bis zum Umzug bleibt hier in diesem Repo.

## Struktur SEK-II
- SEK-II/Leistungskurs/chemie-lk-kursplan.html — Kursübersicht LK. Seit 2026-10-03 mit realem
  Stundenverlauf je Einheit (`.verlauf`) und OHNE Links auf Lernpfade (Lernpfade bleiben als Dateien
  bestehen). Selbsteinschätzung: Schlüssel = Index + Textanfang der Kompetenz → Kompetenztexte und
  Reihenfolge nicht ändern; neue Kompetenzen mit `data-sa-key` (zählen nicht im Index).
- SEK-II/Leistungskurs/Q1/ — Lernpfade lernpfad-q1-01, 02, 04…09 (nicht mehr verlinkt).
  Lernpfad 03 Organik samt organik-build am 2026-10-03 entfernt (nicht mehr benötigt, in der Git-Historie).
- SEK-II/Leistungskurs/laborjournal.html — elektronisches Laborjournal (ELN):
  Speicherung in IndexedDB, Export .html/.zip (eigener ZIP-Code, Deflate-Lesen
  über DecompressionStream), Import beider Formate. Keine Schülerdaten im Repo.

## Was hier NIE hineingehört
- PDFs und Musterlösungen (die .gitignore blockt *.pdf).
- Typst-Quellen mit LOESUNG-Flag: eine Quelle, die per Schalter
  zwischen Lücken- und Lösungsfassung wechselt — die Lösungen
  stehen darin im Klartext. Solche Dateien bleiben in iCloud.
- Aufgabenblätter, Mitschriften, Rohmaterial → iCloud.
