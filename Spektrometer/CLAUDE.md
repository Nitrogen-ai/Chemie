# Spektrometer — Raspberry-Pi-Projekt

## Worum es geht
Ein Raspberry Pi 4 Model B (4GB) mit OV5647-Kameramodul und Touchscreen betreibt ein
browserbasiertes Vis-Spektrometer ("Lambdacloud"), das über ein optisches Gitter/Spalt-Setup
Absorptions- und Emissionsspektren misst. Ein einziger Flask-Prozess (`spectrometer_web/`) hält
den Kamerazugriff und bedient gleichzeitig zwei Anzeigen: den Pi-eigenen Touchscreen (Kiosk-
Chromium, lokal) und jedes andere Gerät im selben WLAN/Hotspot (Browser, per `nitrogen.local`).
Fernsteuerung des Pi selbst läuft weiterhin über SSH und VNC.

Frühere Rolle als Kamera-Wache (Bewegungserkennung + Pushover-Alarm) ist entfallen — dafür wird
inzwischen eine andere Lösung genutzt, der komplette `camera_watch`-Anwendungsbereich (Skript,
systemd-Dienst, Umschalt-Skripte, Pushover-Zugangsdaten) wurde aus diesem Repo und vom Pi
entfernt.

## Herkunft & Lizenz
Die Kernalgorithmik (automatische Erkennung der 0. Ordnung im Kamerabild, Scan-Linie durchs
Spektrum, Wellenlängen-Umrechnung über einen linearen nm/Pixel-Faktor, Effizienzkorrektur des
Gitters, Regenbogen-Einfärbung des Diagramms per `wavelength_to_color`, LED-Ansteuerung über
GPIO, Messreihen-Konzept) stammt aus dem Open-Source-Projekt **"Lambda"** von Maurice Kahre
(2021), das seinerseits auf dem Referenzprojekt der Uni Würzburg (Didaktik der Chemie) beruht:
<https://www.chemie.uni-wuerzburg.de/didaktik/lehrpersonen/low-cost-messgeraete/vis-spektrometer/>

Lizenz des Originals: **CC BY 4.0**, Maurice Kahre (2021), selbst basierend auf einer
**MIT-lizenzierten** Vorarbeit von Tony Butterfield (2016). Der Code hier (`pi/spectrometer_web/`)
ist eine eigenständige Neuentwicklung (Python/Flask/picamera2 statt Tkinter/legacy `picamera`) —
Lambdas Tkinter-Desktop-Oberfläche läuft auf dem aktuellen Pi-OS (nur noch `libcamera`/picamera2-
Stack) nicht mehr, deshalb wurden gezielt einzelne, kameraunabhängige Bausteine der
Algorithmik/Funktionalität übernommen und auf picamera2 portiert, nicht die komplette GUI.
Namensnennung entsprechend beibehalten, da dieses Repo öffentlich ist.

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
  spectrometer_web/
    app.py                     Flask-Webserver (Kamera, State, API-Routen, HTML-Templates)
    spectro.py                 Bildauswertung: Spalterkennung, Wellenlängen-Umrechnung, Plot/CSV
    led.py                     LED-Ansteuerung (RPi.GPIO PWM, Pin 7) fuer Emissionsbeleuchtung
    settings.example.json      Vorlage für settings.json (Kalibrierwerte) — echte Datei bleibt auf dem Pi
  systemd/
    spectrometer-webapp.service Dauerhaft aktiver Dienst, startet app.py beim Boot
  scripts/
    labwc-autostart            Startet automatisch einen Kiosk-Chromium auf http://localhost:8080
```
Diese Dateien sind Kopien vom Pi (Stand siehe Commit-Datum) — die "lebende" Version läuft auf dem
Gerät selbst unter `/home/nitrogen/...` bzw. `/etc/systemd/system/...`. Änderungen müssen auf
beiden Seiten synchron gehalten werden (aktuell manuell per `scp`/SSH-Heredoc, kein Deploy-Skript).

**Nicht im Repo (bewusst, siehe .gitignore-Prinzip):** `settings.json`, `reference.json`
(Kalibrierung/Referenzmessung sind Laufzeitzustand des konkreten Aufbaus).

## WLAN
Der Pi kennt zwei WLAN-Profile (NetworkManager, `nmcli`): das Heim-WLAN
(`netplan-wlan0-WLAN-311366`, Priorität 10) und den Schul-Hotspot (`Schul-Hotspot-iPhone`,
SSID "iPhone", Priorität 5) — er verbindet sich automatisch mit dem jeweils erreichbaren Netz,
sobald das aktuell genutzte wegfällt (kein aktives Umschalten weg von einer funktionierenden
Verbindung). **Am 2026-08-29 live getestet:** Heim-WLAN am Pi deaktiviert, Pi hat automatisch den
Hotspot "iPhone" übernommen (IP im 172.20.10.0/28-Bereich), `nitrogen.local:8080` war darüber per
mDNS erreichbar — funktioniert also zuverlässig, kein IP-Fallback nötig.

**Wichtige Eigenheit von Apples Personal Hotspot:** Das SSID "iPhone" wird für neue Scans nur
zuverlässig gesendet, solange der "Persönlicher Hotspot"-Bildschirm auf dem iPhone selbst offen
ist — sonst wird die Sichtbarkeit gedrosselt und der Pi findet das Netz beim WLAN-Scan nicht
(`nmcli device wifi list` zeigt es dann schlicht nicht an). Vor dem Schuleinsatz: Hotspot-Screen
kurz offen lassen, bis der Pi sich verbunden hat; danach bleibt die Verbindung stabil.

## Bildausrichtung (`image_rotation_deg` / `image_flip` in den Einstellungen)
`find_aperture`/`extract_spectrum` erwarten den hellen Referenzpunkt (0. Ordnung/direktes Bild
des Spalts) in der **rechten** Bildhälfte, mit dem Spektrum nach links auslaufend. Das rohe
Kamerabild kommt aber je nach Kamera-/Spiegel-Einbaulage in beliebiger Orientierung an —
`spectro.apply_rotation()` dreht (0/90/180/270°) und spiegelt (horizontal) optional, bevor die
Auswertung läuft. **Für den aktuellen Aufbau bestätigt (2026-08-29): `image_rotation_deg=90`
plus `image_flip=true`.** Eine reine Drehung reichte nicht — der Strahlengang enthält offenbar
eine Spiegelung (z.B. durch das Umlenkprisma an der Küvette), die Rot/Blau-Reihenfolge war bei
purer 90°-Drehung genau vertauscht (heller Punkt zwar rechts, aber Rot statt Blau daneben).
Diese Werte sind jetzt der Default in `settings.example.json`, sollten aber bei jedem
Neuaufbau/jeder Kamerademontage neu überprüft werden (`/frame.jpg` ansehen: heller Punkt muss
rechts sein, direkt daneben eine plausible Farbreihenfolge zum langwelligen Ende hin).

## Wellenlängen-Kalibrierung (`wavelength_factor`)
**Kalibriert am 2026-08-29 auf `0.5381` nm/Pixel** (vorher unvalidierter Default `0.6`).

Methode, wie im Original-Lambda-Paket dokumentiert (`Einrichtung`-Datei bzw. `GUI.py`,
Funktion `spectrum_scale_calibration`): Statt einer separaten schmalbandigen Referenz-LED
wurde die **bekannte Peak-Wellenlänge der ohnehin verbauten weißen LED** (aus deren
technischem Datenblatt) als Kalibrierpunkt genutzt. Der Nutzer hatte dafür historisch bereits
`LambdaSpektrometer/Setup_files/setup.csv` erzeugt (liegt in `~/Downloads/LambdaSpektrometer/`
bzw. `~/Desktop/LambdaSpektrometer/`, nicht Teil dieses Repos) — deren Maximum liegt exakt bei
**391,2 nm**, das ist der historisch verwendete Referenzwert.

Vorgehen für die Übertragung auf den neuen picamera2-Aufbau:
1. Live-Emissionsspektrum der weißen LED aufgenommen (Referenzmessung durch die
   Wasser-Küvette, altes `wavelength_factor=0.6`).
2. Darin das **lokale** Maximum im violett-blauen Bereich gesucht (nicht das globale Maximum —
   das liegt in der breiten Phosphor-Bande bei längeren Wellenlängen). Form und Lage relativ
   zum Nebenminimum stimmten mit der Form der historischen `setup.csv` überein (steiler Peak,
   danach Einbruch, danach breiter Anstieg) — das bestätigt, welcher Peak der richtige ist.
3. Pixelabstand des Peaks zum hellen Referenzpunkt bestimmt (`peak_wavelength_alt / 0.6`),
   neuen Faktor berechnet: `391.2 / pixelabstand = 0.5381`.
4. Auf `/settings` eingetragen und mit einer frischen Absorptionsmessung (rötliche Lösung
   gegen Wasser-Referenz) plausibilisiert: Banden liegen jetzt bei ~385nm (violett) und
   ~520nm (grün) mit abfallender Extinktion zum Rot hin — genau das erwartete Verhalten für
   eine rötliche Probe (Rot wird durchgelassen, Grün/Blau absorbiert).

**Bleibt zu tun:** `spectrum_angle_deg` (Winkelkorrektur) ist noch nicht kalibriert (Default
`0.0`), und der Kalibrierfaktor beruht auf einem einzigen Referenzpunkt (391,2nm) — für höhere
Präzision wäre ein zweiter bekannter Punkt (z.B. eine schmalbandige Referenz-LED wie im
Original-Aufbau vorgesehen) sinnvoll, um Nichtlinearitäten zu erkennen.

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
5. `wavelength_to_color`: bildet eine Wellenlänge auf eine RGB-Sichtfarbe ab (aus Lambda
   portiert), nutzt `render_plot`, um den Diagrammhintergrund einzufärben.
6. `resample`/`build_csv_series`: für die Messreihen-Funktion — mehrere Einzelmessungen (jede
   mit eigenem Wellenlängen-Raster aus ihrer eigenen Aufnahme) werden auf ein gemeinsames
   1nm-Raster (380–1000nm) interpoliert, bevor sie gemeinsam als CSV/Plot exportiert werden.

## Stand nach Phasen

- **Phase 1 (Grundsystem/Fernsteuerung): fertig.** SSH, VNC (TigerVNC), Hostname `nitrogen.local`.
- **Phase 2 (Wach-Modus): entfernt (2026-08-29).** Bewegungserkennung/Pushover wird nicht mehr
  gebraucht (Alternative gefunden), kompletter `camera_watch`-Anwendungsbereich aus Repo und Pi
  entfernt. `spectrometer-webapp.service` läuft seitdem dauerhaft, kein Umschalten mehr nötig.
- **Phase 3 (Web-Spektrometer, Grundgerüst): fertig.** Live-Ansicht (Kamerabild + Live-Spektrum),
  Emission/Absorption-Umschalter, Referenzaufnahme, "Messung sichern", Export als CSV/PNG/SVG,
  Kalibrierungsseite (`/settings`), Kiosk-Autostart auf dem Touchscreen.
- **Phase 4 (Lambdacloud — Funktionsumfang aus dem Lambda-Projekt): fertig, ungetestet am
  echten Aufbau.**
  - ✅ LED-Steuerung (an/aus/Helligkeit) über `led.py` (Pin 7, `RPi.GPIO` PWM).
  - ✅ Messreihe: mehrere Messungen sammeln (`/api/series/add`), gemeinsamer Export als
    mehrspaltige CSV bzw. überlagerter Plot (`/export/series/<fmt>`), auf gemeinsames
    1nm-Raster (380–1000nm) resampled (`spectro.resample`).
  - ✅ Diagramm mit Regenbogen-Hintergrund nach Wellenlänge (`spectro.wavelength_to_color`).
  - ✅ CSV-Sprachmodus (Deutsch/Englisch) als Einstellung, wie im Lambda-Original.
  - ✅ **Live am echten Aufbau getestet (2026-08-29):** LED per API tatsächlich an/ausgeschaltet,
    Messreihe mit zwei Messungen angelegt und als CSV/SVG exportiert — alles über das Netz
    erreichbar und fehlerfrei (`journalctl -u spectrometer-webapp` sauber).
  - ✅ **Erste echte Proben gemessen (2026-08-29):** Bildausrichtung gefunden (siehe Abschnitt
    "Bildausrichtung" oben, `image_rotation_deg=90`+`image_flip=true`), danach ein
    plausibles Emissionsspektrum (LED durch Wasser-Küvette, strukturierter Verlauf statt
    Rauschen, 593 Punkte) und ein plausibles Absorptionsspektrum (rötliche Lösung gegen
    Wasser-Referenz, 475 Punkte, deutliche Extinktionsbanden) aufgenommen und als CSV/PNG/SVG
    exportiert.
  - ✅ **`wavelength_factor` kalibriert (2026-08-29): `0.5381` nm/Pixel** anhand der bekannten
    Peak-Wellenlänge (391,2nm) der verbauten weißen LED aus deren Datenblatt, siehe Abschnitt
    "Wellenlängen-Kalibrierung" oben — die x-Achsen-Werte der Testspektren sind damit nicht
    mehr nur grob geschätzt.
  - ⏳ `spectrum_angle_deg` (Winkelkorrektur) ist noch nicht kalibriert (Default `0.0`), und
    ein zweiter unabhängiger Referenzpunkt (z.B. schmalbandige Referenz-LED) würde die
    Kalibrierung gegen Nichtlinearitäten absichern.
  - ⏳ Flask läuft aktuell mit dem eingebauten Entwicklungsserver (`app.run(...)`) — für den
    Dauerbetrieb wäre ein richtiger WSGI-Server (z.B. `waitress` oder `gunicorn`) sauberer,
    aktuell aber stabil genug für den Klassenzimmer-Einsatz.
- **Phase 5 (WLAN-Erweiterung Schul-Hotspot): fertig, live getestet.** Zweites `nmcli`-Profil
  für den Hotspot "iPhone" angelegt, automatischer Wechsel und mDNS-Erreichbarkeit bestätigt
  (siehe Abschnitt "WLAN" oben inkl. der Hotspot-Sichtbarkeits-Eigenheit).
- **Phase 6 (Feinschliff/Doku): noch nicht begonnen.**

## Für die nahtlose Fortführung
- Der Pi läuft aktuell im (einzigen verbliebenen) Web-Spektrometer-Modus, `spectrometer-webapp`
  dauerhaft aktiv. Es gibt keinen Wach-Modus mehr, Stand 2026-08-29 auf dem Pi deployt und
  live getestet (LED, Messreihe, WLAN-Hotspot-Wechsel).
- Der Pi kennt inzwischen zwei WLAN-Profile und wechselt selbstständig — falls er beim nächsten
  Zugriff nicht unter `nitrogen.local` antwortet, könnte er gerade im jeweils anderen Netz hängen
  (z.B. noch im Schul-Hotspot, wenn zuletzt dort getestet wurde). Eigenes Gerät ggf. ebenfalls
  ins selbe Netz wechseln, siehe Abschnitt "WLAN" oben.
- Wenn der Nutzer "weiter mit dem Spektrometer" sagt: zuerst per SSH prüfen, ob die Dateien auf
  dem Pi noch dem Stand hier im Repo entsprechen (Verbindungsabbrüche mitten im Deploy sind schon
  vorgekommen, siehe oben) — Diff zwischen `pi/spectrometer_web/*.py` hier und den Dateien auf
  dem Pi ist der sicherste erste Schritt nach einer Pause.
- Reale Messungen mit dem Nutzer (Farbstofflösungen, Lichtquellen, Kalibrierfaktor validieren)
  sind der nächste inhaltliche Schritt.
