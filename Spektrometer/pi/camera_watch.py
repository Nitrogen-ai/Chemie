#!/usr/bin/env python3
import os
import time
from datetime import datetime

import numpy as np
import requests
from PIL import Image
from picamera2 import Picamera2

USER_KEY = os.environ["PUSHOVER_USER_KEY"]
API_TOKEN = os.environ["PUSHOVER_API_TOKEN"]
SNAPSHOT_DIR = "/home/nitrogen/camera_watch/snapshots"
THRESHOLD = 18
COOLDOWN_SECONDS = 120
CHECK_INTERVAL = 1.0

os.makedirs(SNAPSHOT_DIR, exist_ok=True)


def send_pushover(image_path, message):
    with open(image_path, "rb") as f:
        response = requests.post(
            "https://api.pushover.net/1/messages.json",
            data={
                "token": API_TOKEN,
                "user": USER_KEY,
                "title": "Pi-Wache",
                "message": message,
            },
            files={"attachment": (os.path.basename(image_path), f, "image/jpeg")},
            timeout=15,
        )
    response.raise_for_status()


def main():
    picam2 = Picamera2()
    config = picam2.create_video_configuration(main={"size": (640, 480), "format": "RGB888"})
    picam2.configure(config)
    picam2.start()
    time.sleep(2)

    prev_gray = None
    last_alert = 0.0

    print("Wach-Modus gestartet.", flush=True)
    while True:
        frame = picam2.capture_array()
        gray = frame.mean(axis=2)

        if prev_gray is not None:
            diff = float(np.abs(gray - prev_gray).mean())
            now = time.time()
            if diff > THRESHOLD and (now - last_alert) > COOLDOWN_SECONDS:
                timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
                snapshot_path = os.path.join(SNAPSHOT_DIR, f"bewegung_{timestamp}.jpg")
                Image.fromarray(frame).save(snapshot_path, quality=85)
                try:
                    send_pushover(snapshot_path, f"Bewegung erkannt um {datetime.now().strftime('%H:%M:%S')}")
                    print(f"Alarm gesendet: {snapshot_path}", flush=True)
                except Exception as exc:
                    print(f"Fehler beim Senden der Push-Nachricht: {exc}", flush=True)
                last_alert = now

        prev_gray = gray
        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    main()
