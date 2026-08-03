# Spektrometer — Raspberry-Pi-Projekt

## Worum es geht
Ein Raspberry Pi 4 Model B (4GB) mit OV5647-Kameramodul übernimmt drei Rollen:
1. **Fernsteuerung** vom Mac/Laptop aus über SSH und VNC (WLAN, kein Bildschirm nötig).
2. **Wach-Modus**: dauerhafte Bewegungserkennung zuhause mit Pushover-Alarm (Foto-Anhang) aufs Handy.
3. **Unterrichtsmodus**: browserbasiertes Vis-Spektrometer, das über ein optisches Gitter/Spalt-Setup
   Absorptions- und Emissionsspektren misst — Ablösung der ursprünglichen Tkinter-Anwendung "Lambda".

Nur eine der Rollen (2) und (3) kann gleichzeitig aktiv sein (eine Kamera, ein Prozess).
Das Umschalten übernehmen zwei systemd-Dienste plus Skripte, siehe unten.

## Herkunft & Lizenz
Die Kernidee (automatische Erkennung der 0. Ordnung im Kamerabild, Scan-Linie durchs Spektrum,
Wellenlängen-Umrechnung über einen linearen nm/Pixel-Faktor, Effizienzkorrektur des Gitters)
stammt aus dem Referenzprojekt **"Lambda"** der Uni Würzburg (Didaktik der Chemie):
<https://www.chemie.uni-wuerzburg.de/didaktik/lehrpersonen/low-cost-messgeraete/vis-spektrometer/>

Lizenz des Originals: **CC BY 4.0**, Maurice Kahre (2021), selbst basierend auf einer
**MIT-lizenzierten** Vorarbeit von Tony Butterfield (2016). Der Code hier (`pi/spectrometer_web/`)
ist eine eigenständige Neuentwicklung (Python/Flask/picamera2 statt Tkinter/picamera), aber die
Kernalgorithmik ist inspiriert vom Original — Namensnennung entsprechend beibehalten, wenn dieses
Repo veröffentlicht wird.

## Gerät erreichen
- Hostname: `nitrogen.local` (mDNS/Bonjour, IP ändert sich, Name bleibt stabil)
- SSH-User: `nitrogen` (Passwort nicht in diesem Repo — beim Nutzer erfragen oder direkt am Gerät nachsehen)
- VNC: **wayvnc** läuft auf dem Pi. Apples eingebaute "Bildschirmfreigabe" hängt sich beim
  TLS/PAM-Handshake auf (Verbindung baut auf, aber nie ein Passwortfeld) — stattdessen
  **TigerVNC Viewer** verwenden (`brew install --cask tigervnc-viewer`), das funktioniert zuverlässig.
- Betriebssystem: aktuelles Raspberry Pi OS (64-bit), technisch bereits auf Debian 13 "trixie"
  (Nachfolger von Bookworm) — moderner `libcamera`/`picamera2`-Stack, nicht die alte `picamera`-Bibliothek.

### Bekannte Eigenheit: Verbindungsaussetzer nach Aktivität
Nach Neustarts oder intensiver Kamera-Nutzung verweigert SSH für ca. 30s–3min neue Verbindungen
(`kex_exchange_identification: Connection closed`), obwohl der Dienst selbst läuft (per VNC bestätigt).
Vermutlich eine Schutzfunktion des Heim-Routers gegen viele schnelle Verbindungsversuche.
**Lösung: geduldig mit größeren Abständen erneut verbinden, nicht in schneller Schleife retryen**
(macht es nur schlimmer/länger).

## Aufbau in diesem Repo
```
pi/
  camera_watch.py              Wach-Modus: Bewegungserkennung + Pushover-Alarm
  spectrometer_web/
    app.py                     Flask-Webserver (Kern der Unterrichtsmodus-Anwendung)
    spectro.py                 Bildauswertung: Spalterkennung, Wellenlängen-Umrechnung, Plot/CSV
    settings.example.json      Vorlage für settings.json (Kalibrierwerte) — echte Datei bleibt auf dem Pi
  systemd/
    camera-watch.service       Wach-Modus als systemd-Dienst
    spectrometer-webapp.service Unterrichtsmodus als systemd-Dienst
    camera-watch.env.example   Vorlage für /etc/camera-watch.env (Pushover-Zugangsdaten)
  scripts/
    pi-modus-wache             Umschalt-Skript: aktiviert Wach-Modus, deaktiviert Unterrichtsmodus
    pi-modus-unterricht        Umschalt-Skript: umgekehrt
    labwc-autostart            Startet im Unterrichtsmodus automatisch einen Kiosk-Chromium
  desktop/
    Wach-Modus.desktop         Desktop-Icon für pi-modus-wache
    Unterrichtsmodus.desktop   Desktop-Icon für pi-modus-unterricht
```
Diese Dateien sind Kopien vom Pi (Stand siehe Commit-Datum) — die "lebende" Version läuft auf dem
Gerät selbst unter `/home/nitrogen/...` bzw. `/etc/systemd/system/...`. Änderungen müssen auf
beiden Seiten synchron gehalten werden (aktuell manuell per `scp`/SSH-Heredoc, kein Deploy-Skript).

**Nicht im Repo (bewusst, siehe .gitignore-Prinzip):** `settings.json`, `reference.json`
(Kalibrierung/Referenzmessung sind Laufzeitzustand des konkreten Aufbaus), `camera-watch.env`
(enthält echte Pushover-Zugangsdaten).

## Funktionsweise der Spektrum-Auswertung (`spectro.py`)
1. `find_aperture`: sucht in der rechten Bildhälfte entlang der mittleren Zeile den hellsten Punkt
   (die nullte Beugungsordnung / das direkte Bild des Eintrittsspalts), bestimmt daraus Mittelpunkt
   und Höhe des Spalts.
2. `extract_spectrum`: läuft spaltenweise von der Spalt-Position nach links, rechnet
   Pixelabstand → Wellenlänge über `wellenlaenge = pixelabstand * wavelength_factor`
   (linearer Kalibrierfaktor, Default `0.6` nm/Pixel — **unvalidiert, muss mit echter
   Lichtquelle bekannter Wellenlänge kalibriert werden**, siehe `/settings`-Seite der Web-App).
3. Intensität pro Wellenlänge: gewichteter Mittelwert `R + B + 2*G` über die Spalthöhe,
   normiert durch eine grobe Gitter-Effizienzkurve (`grating_efficiency`, fällt zu langen
   Wellenlängen hin ab) — beides 1:1 aus dem Referenzprojekt übernommen.
4. Absorptionsmodus: `Extinktion = -log10(I / I_referenz)`, Referenz wird per Knopfdruck
   ("Referenz aufnehmen") gespeichert (`reference.json`, per Wellenlänge interpoliert mit `np.interp`).

## Stand nach Phasen (siehe auch das Artefakt "Pi 4B — Wache, Klassenzimmer, Web-Spektrometer")

- **Phase 1 (Grundsystem/Fernsteuerung): fertig.** SSH, VNC (TigerVNC), Hostname `nitrogen.local`.
- **Phase 2 (Wach-Modus): fertig, getestet.** Bewegung → Foto → Pushover-Push kommt an,
  2-Minuten-Cooldown gegen Spam eingebaut (`camera_watch.py`, `COOLDOWN_SECONDS`).
- **Phase 3 (Umschaltbarkeit): fertig, getestet.** Beide Modi schließen sich sauber gegenseitig
  aus (ein `enable`/`disable`-Paar pro Wechsel), Kiosk-Autostart im Unterrichtsmodus funktioniert.
- **Phase 4 (Web-Spektrometer): Grundgerüst steht, echte Messungen stehen noch aus.**
  - ✅ Live-Ansicht (Kamerabild + Live-Spektrum), Emission/Absorption-Umschalter,
    Referenzaufnahme, "Messung sichern", Export als CSV/PNG/SVG, Kalibrierungsseite (`/settings`).
  - ⏳ **Nächster Schritt laut Nutzer: echte Proben messen** (Farbstofflösungen für Absorption,
    verschiedene Lichtquellen für Emission) und dabei den Kalibrierfaktor (`wavelength_factor`)
    gegen bekannte Referenzwellenlängen validieren/korrigieren.
  - ⏳ Noch nicht gebaut: Messreihen mit unterschiedlichen Konzentrationen (nice-to-have laut Plan).
  - ⏳ Flask läuft aktuell mit dem eingebauten Entwicklungsserver (`app.run(...)`) — für den
    Dauerbetrieb wäre ein richtiger WSGI-Server (z.B. `waitress` oder `gunicorn`) sauberer,
    aktuell aber stabil genug für den Klassenzimmer-Einsatz.
  - ⏳ Validierung der Ergebnisse gegen die alte Lambda-Software ist hinfällig, da die alte App
    laut Entscheidung des Nutzers bewusst nicht weiterverwendet wird (moderner libcamera-Stack
    statt Legacy-`picamera`).
- **Phase 5 (Feinschliff/Doku): noch nicht begonnen.**

## Für die nahtlose Fortführung
- Der Pi läuft aktuell im **Unterrichtsmodus** (spectrometer-webapp aktiv, camera-watch deaktiviert).
- Wenn der Nutzer "weiter mit dem Spektrometer" sagt: zuerst per SSH prüfen, ob die Dateien auf
  dem Pi noch dem Stand hier im Repo entsprechen (Verbindungsabbrüche mitten im Deploy sind schon
  vorgekommen, siehe oben) — Diff zwischen `pi/spectrometer_web/*.py` hier und den Dateien auf
  dem Pi ist der sicherste erste Schritt nach einer Pause.
- Reale Messungen mit dem Nutzer sind der nächste inhaltliche Schritt, keine neue Funktion.
