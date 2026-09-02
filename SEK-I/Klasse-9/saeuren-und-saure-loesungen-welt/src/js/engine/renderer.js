// three.js-Setup: Renderer, Kamera, Nebel — CLAUDE.md §4.
// Unlit-Material (MeshBasicMaterial) statt Lambert/Phong: spart die
// Beleuchtungsrechnung pro Fragment und passt zum flachen Retro-Look —
// wichtig fürs Performance-Budget auf dem iPad.

const MAX_PIXEL_RATIO = 1.5;
const SICHTWEITE = 32; // Blöcke, siehe Performance-Budget §4
const NEBEL_START = 24; // Blöcke

const HIMMEL_FARBE = 0xbcd9e8;

function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "low-power",
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.setClearColor(HIMMEL_FARBE, 1);
  return renderer;
}

function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(HIMMEL_FARBE);
  scene.fog = new THREE.Fog(HIMMEL_FARBE, NEBEL_START, SICHTWEITE);
  return scene;
}

function createCamera(aspect) {
  const camera = new THREE.PerspectiveCamera(70, aspect, 0.1, SICHTWEITE + 8);
  return camera;
}

function createAtlasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  // computeAtlasLayout() rechnet v=0 als oberste Canvas-Zeile. three.js dreht
  // Canvas-Texturen sonst standardmäßig (flipY), was Kachel-Zeilen vertauscht.
  texture.flipY = false;
  return texture;
}

function createAtlasMaterial(texture) {
  return new THREE.MeshBasicMaterial({ map: texture });
}

// Safari verwirft den WebGL-Kontext beim Tab-/App-Wechsel regelmäßig (§4).
// Ohne diesen Handler bleibt der Bildschirm nach der Wiederkehr schwarz.
function attachContextLossHandling(renderer, canvas, callbacks) {
  const onLost = (event) => {
    event.preventDefault();
    if (callbacks && callbacks.onLost) callbacks.onLost();
  };
  const onRestored = () => {
    if (callbacks && callbacks.onRestored) callbacks.onRestored();
  };
  canvas.addEventListener("webglcontextlost", onLost, false);
  canvas.addEventListener("webglcontextrestored", onRestored, false);
  return () => {
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", onRestored);
  };
}

function resizeRendererToCanvas(renderer, camera) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

const SBW_RENDERER_EXPORTS = {
  MAX_PIXEL_RATIO,
  SICHTWEITE,
  NEBEL_START,
  HIMMEL_FARBE,
  createRenderer,
  createScene,
  createCamera,
  createAtlasTexture,
  createAtlasMaterial,
  attachContextLossHandling,
  resizeRendererToCanvas,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = SBW_RENDERER_EXPORTS;
}
if (typeof globalThis !== "undefined") {
  globalThis.SBW = globalThis.SBW || {};
  Object.assign(globalThis.SBW, SBW_RENDERER_EXPORTS);
}
