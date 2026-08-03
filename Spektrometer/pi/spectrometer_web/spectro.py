import io
import json
import math
import os

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

SETTINGS_PATH = "/home/nitrogen/spectrometer_web/settings.json"
REFERENCE_PATH = "/home/nitrogen/spectrometer_web/reference.json"

DEFAULT_SETTINGS = {
    "wavelength_factor": 0.6,
    "spectrum_angle_deg": 0.0,
}


def load_settings():
    if os.path.exists(SETTINGS_PATH):
        with open(SETTINGS_PATH) as f:
            data = json.load(f)
        merged = dict(DEFAULT_SETTINGS)
        merged.update(data)
        return merged
    return dict(DEFAULT_SETTINGS)


def save_settings(settings):
    with open(SETTINGS_PATH, "w") as f:
        json.dump(settings, f, indent=2)


def load_reference():
    if os.path.exists(REFERENCE_PATH):
        with open(REFERENCE_PATH) as f:
            data = json.load(f)
        return np.array(data["wavelengths"]), np.array(data["intensities"])
    return None


def save_reference(wavelengths, intensities):
    with open(REFERENCE_PATH, "w") as f:
        json.dump({
            "wavelengths": [float(v) for v in wavelengths],
            "intensities": [float(v) for v in intensities],
        }, f)


def find_aperture(frame):
    h, w, _ = frame.shape
    mid_y = h // 2
    mid_x = w // 2
    row = frame[mid_y, mid_x:, :].astype(np.int32)
    brightness = row.sum(axis=1)
    aperture_x = mid_x + int(np.argmax(brightness))

    threshold = brightness.max() * 0.9
    col = frame[:, aperture_x, :].astype(np.int32).sum(axis=1)
    above = np.where(col > threshold)[0]
    if len(above) == 0:
        top, bottom = mid_y - 5, mid_y + 5
    else:
        top, bottom = int(above.min()), int(above.max())
    return aperture_x, (top + bottom) / 2.0, max(bottom - top, 4)


def grating_efficiency(wavelength):
    eff = (800 - (wavelength - 250)) / 800
    return max(eff, 0.3)


def extract_spectrum(frame, wavelength_factor, spectrum_angle_deg):
    aperture_x, aperture_y, aperture_h = find_aperture(frame)
    half_h = aperture_h / 2.0
    angle = math.radians(spectrum_angle_deg)

    xs = np.arange(0, max(int(aperture_x * 7 / 8), 1))
    wavelengths = (aperture_x - xs) * wavelength_factor
    mask = (wavelengths >= 380) & (wavelengths <= 1000)
    xs = xs[mask]
    wavelengths = wavelengths[mask]

    h, w, _ = frame.shape
    intensities = np.zeros(len(xs))
    for i, x in enumerate(xs):
        y0 = math.tan(angle) * (aperture_x - x) + aperture_y
        y_start = int(max(y0 - half_h, 0))
        y_end = int(min(y0 + half_h, h))
        if y_end <= y_start:
            y_end = y_start + 1
        band = frame[y_start:y_end, x, :].astype(np.float64)
        raw = (band[:, 0] + band[:, 2] + 2 * band[:, 1]).mean()
        intensities[i] = raw / grating_efficiency(wavelengths[i])

    order = np.argsort(wavelengths)
    return wavelengths[order], intensities[order], aperture_x, aperture_y, aperture_h


def compute_extinction(wavelengths, intensities, ref_wavelengths, ref_intensities):
    ref_interp = np.interp(wavelengths, ref_wavelengths, ref_intensities)
    ref_interp = np.clip(ref_interp, 1e-6, None)
    intensities_safe = np.clip(intensities, 1e-6, None)
    return -np.log10(intensities_safe / ref_interp)


def build_csv(wavelengths, values, value_label, german=True):
    lines = []
    if german:
        lines.append(f"Wellenlaenge [nm];{value_label}")
        for wl, v in zip(wavelengths, values):
            lines.append(f"{wl:.1f};{v:.4f}".replace(".", ","))
    else:
        lines.append(f"Wellenlaenge [nm],{value_label}")
        for wl, v in zip(wavelengths, values):
            lines.append(f"{wl:.1f},{v:.4f}")
    return "\n".join(lines)


def render_plot(wavelengths, values, ylabel, title, svg=True):
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.plot(wavelengths, values, color="black", linewidth=1)
    ax.set_xlabel("Wellenlaenge [nm]")
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    ax.grid(alpha=0.3)
    fig.tight_layout()
    if svg:
        buf = io.StringIO()
        fig.savefig(buf, format="svg")
        data = buf.getvalue()
    else:
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=150)
        data = buf.getvalue()
    plt.close(fig)
    return data
