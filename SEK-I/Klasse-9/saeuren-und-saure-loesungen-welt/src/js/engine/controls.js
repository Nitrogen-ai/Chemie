// Touch-Steuerung nach CLAUDE.md §5. Kein Pointer Lock (existiert auf iOS nicht).

// Ganz oben, damit sie ohne Suche justierbar ist (§5).
const LOOK_SENSITIVITY = 0.0035; // Radiant Blickwinkel pro Pixel Wischweg

const JOYSTICK_MAX_RADIUS = 40; // CSS-Pixel
const JOYSTICK_TOTRADIUS = 4; // CSS-Pixel, unterhalb davon zählt es nicht als Bewegung
const TAP_MAX_DISTANZ = 10; // CSS-Pixel
const TAP_MAX_DAUER = 200; // ms
const MAX_PITCH = 1.4835; // ~85°, verhindert Überschlag beim Umsehen

function createControls(canvas, options = {}) {
  const doc = canvas.ownerDocument;
  const hud = doc.getElementById("hud");

  const joystickZone = doc.createElement("div");
  joystickZone.id = "joystick-zone";
  joystickZone.className = "touch-ziel";

  const joystickBasis = doc.createElement("div");
  joystickBasis.className = "joystick-basis";
  joystickBasis.style.display = "none";

  const joystickKnopf = doc.createElement("div");
  joystickKnopf.className = "joystick-knopf";
  joystickKnopf.style.display = "none";

  joystickZone.appendChild(joystickBasis);
  joystickZone.appendChild(joystickKnopf);

  const lookZone = doc.createElement("div");
  lookZone.id = "look-zone";
  lookZone.className = "touch-ziel";

  const sprungButton = doc.createElement("div");
  sprungButton.id = "sprung-button";
  sprungButton.className = "hud-flaeche touch-ziel";
  sprungButton.textContent = "↑";

  hud.appendChild(joystickZone);
  hud.appendChild(lookZone);
  hud.appendChild(sprungButton);

  const state = {
    joystickTouchId: null,
    originX: 0,
    originY: 0,
    currentX: 0,
    currentY: 0,
    lookTouchId: null,
    lastX: 0,
    lastY: 0,
    startX: 0,
    startY: 0,
    startTime: 0,
    bewegtSeitTapStart: false,
    yaw: 0,
    pitch: 0,
    jumpHeld: false,
  };

  function setzeJoystickPosition(clientX, clientY) {
    joystickBasis.style.left = `${clientX}px`;
    joystickBasis.style.top = `${clientY}px`;
    joystickKnopf.style.left = `${clientX}px`;
    joystickKnopf.style.top = `${clientY}px`;
  }

  joystickZone.addEventListener(
    "touchstart",
    (event) => {
      for (const touch of event.changedTouches) {
        if (state.joystickTouchId === null) {
          state.joystickTouchId = touch.identifier;
          state.originX = touch.clientX;
          state.originY = touch.clientY;
          state.currentX = touch.clientX;
          state.currentY = touch.clientY;
          joystickBasis.style.display = "block";
          joystickKnopf.style.display = "block";
          setzeJoystickPosition(touch.clientX, touch.clientY);
        }
      }
      event.preventDefault();
    },
    { passive: false }
  );

  joystickZone.addEventListener(
    "touchmove",
    (event) => {
      for (const touch of event.changedTouches) {
        if (touch.identifier === state.joystickTouchId) {
          state.currentX = touch.clientX;
          state.currentY = touch.clientY;
          const dx = state.currentX - state.originX;
          const dy = state.currentY - state.originY;
          const dist = Math.min(JOYSTICK_MAX_RADIUS, Math.hypot(dx, dy));
          const winkel = Math.atan2(dy, dx);
          joystickKnopf.style.left = `${state.originX + Math.cos(winkel) * dist}px`;
          joystickKnopf.style.top = `${state.originY + Math.sin(winkel) * dist}px`;
        }
      }
      event.preventDefault();
    },
    { passive: false }
  );

  function beendeJoystick(event) {
    for (const touch of event.changedTouches) {
      if (touch.identifier === state.joystickTouchId) {
        state.joystickTouchId = null;
        joystickBasis.style.display = "none";
        joystickKnopf.style.display = "none";
      }
    }
  }
  joystickZone.addEventListener("touchend", beendeJoystick);
  joystickZone.addEventListener("touchcancel", beendeJoystick);

  lookZone.addEventListener(
    "touchstart",
    (event) => {
      for (const touch of event.changedTouches) {
        if (state.lookTouchId === null) {
          state.lookTouchId = touch.identifier;
          state.lastX = touch.clientX;
          state.lastY = touch.clientY;
          state.startX = touch.clientX;
          state.startY = touch.clientY;
          state.startTime = performance.now();
          state.bewegtSeitTapStart = false;
        }
      }
      event.preventDefault();
    },
    { passive: false }
  );

  lookZone.addEventListener(
    "touchmove",
    (event) => {
      for (const touch of event.changedTouches) {
        if (touch.identifier === state.lookTouchId) {
          const dx = touch.clientX - state.lastX;
          const dy = touch.clientY - state.lastY;
          state.yaw -= dx * LOOK_SENSITIVITY;
          state.pitch -= dy * LOOK_SENSITIVITY;
          state.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, state.pitch));
          state.lastX = touch.clientX;
          state.lastY = touch.clientY;
          if (Math.hypot(touch.clientX - state.startX, touch.clientY - state.startY) > TAP_MAX_DISTANZ) {
            state.bewegtSeitTapStart = true;
          }
        }
      }
      event.preventDefault();
    },
    { passive: false }
  );

  lookZone.addEventListener("touchend", (event) => {
    for (const touch of event.changedTouches) {
      if (touch.identifier === state.lookTouchId) {
        const dauer = performance.now() - state.startTime;
        if (!state.bewegtSeitTapStart && dauer < TAP_MAX_DAUER && options.onTap) {
          options.onTap();
        }
        state.lookTouchId = null;
      }
    }
  });

  sprungButton.addEventListener(
    "touchstart",
    (event) => {
      state.jumpHeld = true;
      event.preventDefault();
    },
    { passive: false }
  );
  sprungButton.addEventListener("touchend", () => {
    state.jumpHeld = false;
  });
  sprungButton.addEventListener("touchcancel", () => {
    state.jumpHeld = false;
  });

  function getInput() {
    let moveX = 0;
    let moveZ = 0;

    if (state.joystickTouchId !== null) {
      const dx = state.currentX - state.originX;
      const dy = state.currentY - state.originY;
      const dist = Math.hypot(dx, dy);
      if (dist > JOYSTICK_TOTRADIUS) {
        const nx = dx / dist;
        const ny = dy / dist;
        const vorwaerts = -ny;
        const seitwaerts = nx;
        const sinYaw = Math.sin(state.yaw);
        const cosYaw = Math.cos(state.yaw);
        moveX = vorwaerts * -sinYaw + seitwaerts * cosYaw;
        moveZ = vorwaerts * -cosYaw + seitwaerts * -sinYaw;
      }
    }

    return { moveX, moveZ, jump: state.jumpHeld };
  }

  function applyLook(camera) {
    camera.rotation.order = "YXZ";
    camera.rotation.y = state.yaw;
    camera.rotation.x = state.pitch;
  }

  return { getInput, applyLook };
}

const SBW_CONTROLS_EXPORTS = { LOOK_SENSITIVITY, createControls };

if (typeof module !== "undefined" && module.exports) {
  module.exports = SBW_CONTROLS_EXPORTS;
}
if (typeof globalThis !== "undefined") {
  globalThis.SBW = globalThis.SBW || {};
  Object.assign(globalThis.SBW, SBW_CONTROLS_EXPORTS);
}
