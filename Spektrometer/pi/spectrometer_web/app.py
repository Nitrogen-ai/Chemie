#!/usr/bin/env python3
import io
import threading
import time

import numpy as np
from flask import Flask, Response, request, jsonify, render_template_string
from PIL import Image
from picamera2 import Picamera2

import spectro

app = Flask(__name__)
lock = threading.Lock()

picam2 = Picamera2()
config = picam2.create_still_configuration(main={"size": (1640, 1232), "format": "RGB888"})
picam2.configure(config)
picam2.set_controls({
    "AeEnable": False,
    "AwbEnable": False,
    "ExposureTime": 20000,
    "AnalogueGain": 1.0,
})
picam2.start()
time.sleep(2)

state = {"mode": "emission", "last_measurement": None}


def capture_frame():
    with lock:
        return picam2.capture_array()


def current_spectrum():
    settings = spectro.load_settings()
    frame = capture_frame()
    wavelengths, intensities, *_ = spectro.extract_spectrum(
        frame, settings["wavelength_factor"], settings["spectrum_angle_deg"]
    )
    if state["mode"] == "absorption":
        ref = spectro.load_reference()
        if ref is not None:
            ref_wl, ref_i = ref
            values = spectro.compute_extinction(wavelengths, intensities, ref_wl, ref_i)
            ylabel = "Extinktion"
        else:
            values = intensities
            ylabel = "Intensitaet (keine Referenz gesetzt)"
    else:
        values = intensities
        ylabel = "Intensitaet"
    return wavelengths, values, ylabel


@app.route("/")
def index():
    return render_template_string(INDEX_HTML, mode=state["mode"])


@app.route("/frame.jpg")
def frame_jpg():
    frame = capture_frame()
    buf = io.BytesIO()
    Image.fromarray(frame).save(buf, format="JPEG", quality=80)
    return Response(buf.getvalue(), mimetype="image/jpeg")


@app.route("/live_plot.svg")
def live_plot_svg():
    wavelengths, values, ylabel = current_spectrum()
    svg = spectro.render_plot(wavelengths, values, ylabel, "Live-Spektrum")
    return Response(svg, mimetype="image/svg+xml")


@app.route("/api/mode", methods=["POST"])
def set_mode():
    mode = request.json.get("mode")
    if mode in ("emission", "absorption"):
        state["mode"] = mode
    return jsonify({"mode": state["mode"]})


@app.route("/api/reference", methods=["POST"])
def capture_reference():
    settings = spectro.load_settings()
    frame = capture_frame()
    wavelengths, intensities, *_ = spectro.extract_spectrum(
        frame, settings["wavelength_factor"], settings["spectrum_angle_deg"]
    )
    spectro.save_reference(wavelengths, intensities)
    return jsonify({"status": "ok"})


@app.route("/api/freeze", methods=["POST"])
def freeze_measurement():
    wavelengths, values, ylabel = current_spectrum()
    state["last_measurement"] = {
        "wavelengths": wavelengths.tolist(),
        "values": values.tolist(),
        "ylabel": ylabel,
    }
    return jsonify({"status": "ok", "points": len(wavelengths)})


@app.route("/export/<fmt>")
def export(fmt):
    m = state["last_measurement"]
    if m is None:
        return "Keine gesicherte Messung vorhanden. Zuerst 'Messung sichern' klicken.", 400
    wavelengths = np.array(m["wavelengths"])
    values = np.array(m["values"])
    if fmt == "csv":
        csv_text = spectro.build_csv(wavelengths, values, m["ylabel"])
        return Response(csv_text, mimetype="text/csv",
                         headers={"Content-Disposition": "attachment; filename=messung.csv"})
    if fmt in ("svg", "png"):
        data = spectro.render_plot(wavelengths, values, m["ylabel"], "Gespeicherte Messung", svg=(fmt == "svg"))
        mimetype = "image/svg+xml" if fmt == "svg" else "image/png"
        return Response(data, mimetype=mimetype,
                         headers={"Content-Disposition": f"attachment; filename=messung.{fmt}"})
    return "Unbekanntes Format", 400


@app.route("/settings", methods=["GET", "POST"])
def settings_page():
    if request.method == "POST":
        s = spectro.load_settings()
        s["wavelength_factor"] = float(request.form["wavelength_factor"])
        s["spectrum_angle_deg"] = float(request.form["spectrum_angle_deg"])
        spectro.save_settings(s)
    s = spectro.load_settings()
    return render_template_string(SETTINGS_HTML, settings=s)


INDEX_HTML = """
<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Web-Spektrometer</title>
<style>
  body { font-family: -apple-system, sans-serif; background: #14181a; color: #e6e9e4; text-align: center; }
  img { max-width: 92%; margin: 10px auto; display: block; border: 1px solid #333; }
  button, a.btn { background:#2a3134; color:#e6e9e4; border:1px solid #444; border-radius:6px; padding:8px 14px; margin:4px; cursor:pointer; text-decoration:none; display:inline-block; font-size:0.95rem;}
  button.active { background:#a62148; border-color:#a62148; }
  .row { margin: 10px; }
  a.settings { color:#9aa39b; font-size:0.85rem; }
</style>
</head>
<body>
  <h1>Web-Spektrometer</h1>
  <div class="row">
    <button id="btn-emission" onclick="setMode('emission')">Emission</button>
    <button id="btn-absorption" onclick="setMode('absorption')">Absorption</button>
  </div>
  <div class="row">
    <button onclick="captureReference()">Referenz aufnehmen</button>
    <button onclick="freeze()">Messung sichern</button>
  </div>
  <img id="frame" src="/frame.jpg" alt="Kamerabild">
  <img id="plot" src="/live_plot.svg" alt="Spektrum">
  <div class="row">
    <a class="btn" href="/export/csv">CSV herunterladen</a>
    <a class="btn" href="/export/png">PNG herunterladen</a>
    <a class="btn" href="/export/svg">SVG herunterladen</a>
  </div>
  <p><a class="settings" href="/settings">Kalibrierung &amp; Einstellungen</a></p>
  <p id="status" style="color:#9aa39b;"></p>
<script>
let mode = "{{ mode }}";
function updateButtons() {
  document.getElementById('btn-emission').className = mode === 'emission' ? 'active' : '';
  document.getElementById('btn-absorption').className = mode === 'absorption' ? 'active' : '';
}
updateButtons();
function setMode(m) {
  fetch('/api/mode', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({mode: m})})
    .then(r => r.json()).then(d => { mode = d.mode; updateButtons(); });
}
function captureReference() {
  fetch('/api/reference', {method:'POST'}).then(() => {
    document.getElementById('status').textContent = 'Referenz gespeichert um ' + new Date().toLocaleTimeString();
  });
}
function freeze() {
  fetch('/api/freeze', {method:'POST'}).then(r => r.json()).then(d => {
    document.getElementById('status').textContent = 'Messung gesichert (' + d.points + ' Punkte) - Export-Links oben sind jetzt aktuell.';
  });
}
setInterval(() => {
  document.getElementById('frame').src = '/frame.jpg?' + Date.now();
  document.getElementById('plot').src = '/live_plot.svg?' + Date.now();
}, 1500);
</script>
</body>
</html>
"""

SETTINGS_HTML = """
<!doctype html>
<html lang="de">
<head><meta charset="utf-8"><title>Kalibrierung</title>
<style>
body{font-family:-apple-system,sans-serif;background:#14181a;color:#e6e9e4;padding:20px;max-width:480px;margin:auto;}
label{display:block;margin-top:14px;}
input{width:100%;padding:6px;margin-top:4px;background:#232a2c;border:1px solid #444;color:#e6e9e4;border-radius:4px;box-sizing:border-box;}
button{margin-top:18px;background:#a62148;color:white;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;}
a{color:#9aa39b;}
</style></head>
<body>
<h1>Kalibrierung &amp; Einstellungen</h1>
<form method="post">
  <label>Nanometer pro Pixel (Kalibrierfaktor)
    <input type="number" step="0.001" name="wavelength_factor" value="{{ settings.wavelength_factor }}">
  </label>
  <label>Winkelkorrektur des Spektrums (Grad)
    <input type="number" step="0.1" name="spectrum_angle_deg" value="{{ settings.spectrum_angle_deg }}">
  </label>
  <button type="submit">Speichern</button>
</form>
<p>Kalibrierung bestimmen: bekannte Lichtquelle (z.B. schmalbandige LED) mit bekannter Wellenlaenge messen,
   Pixelabstand des Peaks von der 0. Ordnung ablesen, Faktor = bekannte Wellenlaenge / Pixelabstand.</p>
<p><a href="/">&larr; Zurueck zur Messung</a></p>
</body>
</html>
"""

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, threaded=True)
