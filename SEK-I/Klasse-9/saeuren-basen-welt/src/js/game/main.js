// Bootstrap. Baut aktuell die M1-Testwelt (§13, M1.3: "flaches 32x32-Feld aus
// Gras, Stein und Holz mit ein paar Erhebungen"). Wird in M2 durch den echten
// Insel-Aufbau aus data/world.json ersetzt.

(function () {
  const CHUNK_SIZE_X = SBW.CHUNK_SIZE_X;
  const CHUNK_SIZE_Y = SBW.CHUNK_SIZE_Y;
  const CHUNK_SIZE_Z = SBW.CHUNK_SIZE_Z;

  const TESTWELT_BREITE = 32; // Blöcke, in X wie Z
  const CHUNKS_PRO_ACHSE = TESTWELT_BREITE / CHUNK_SIZE_X;

  const BLOCK_GRAS = 1;
  const BLOCK_STEIN = 2;
  const BLOCK_HOLZ = 3;

  const TESTWELT_FARBEN = {
    [BLOCK_GRAS]: "#5c8a3c",
    [BLOCK_STEIN]: "#8a8a86",
    [BLOCK_HOLZ]: "#6b4a2f",
  };

  function gelaendeHoehe(worldX, worldZ) {
    const welle = Math.sin(worldX / 6) * Math.cos(worldZ / 6) * 2;
    return Math.max(1, Math.round(4 + welle));
  }

  // ein paar feste Erhebungen ("Baumstämme") zum Testen vertikaler Geometrie
  const HOLZ_STAEMME = [
    { x: 5, z: 5, hoehe: 3 },
    { x: 20, z: 10, hoehe: 4 },
    { x: 10, z: 25, hoehe: 3 },
    { x: 26, z: 26, hoehe: 3 },
  ];

  function baueTestwelt() {
    const chunks = new Map();
    for (let cx = 0; cx < CHUNKS_PRO_ACHSE; cx++) {
      for (let cz = 0; cz < CHUNKS_PRO_ACHSE; cz++) {
        chunks.set(`${cx},${cz}`, new SBW.Chunk(cx, cz));
      }
    }

    function chunkAt(worldX, worldZ) {
      const cx = Math.floor(worldX / CHUNK_SIZE_X);
      const cz = Math.floor(worldZ / CHUNK_SIZE_Z);
      return chunks.get(`${cx},${cz}`);
    }

    function setBlock(worldX, worldY, worldZ, blockId) {
      const chunk = chunkAt(worldX, worldZ);
      if (!chunk) return;
      const lx = ((worldX % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
      const lz = ((worldZ % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
      chunk.set(lx, worldY, lz, blockId);
    }

    function getBlock(worldX, worldY, worldZ) {
      if (worldX < 0 || worldX >= TESTWELT_BREITE || worldZ < 0 || worldZ >= TESTWELT_BREITE) return 0;
      if (worldY < 0 || worldY >= CHUNK_SIZE_Y) return 0;
      const chunk = chunkAt(worldX, worldZ);
      if (!chunk) return 0;
      const lx = ((worldX % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
      const lz = ((worldZ % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
      return chunk.get(lx, worldY, lz);
    }

    for (let worldX = 0; worldX < TESTWELT_BREITE; worldX++) {
      for (let worldZ = 0; worldZ < TESTWELT_BREITE; worldZ++) {
        const hoehe = gelaendeHoehe(worldX, worldZ);
        for (let y = 0; y < hoehe - 1; y++) {
          setBlock(worldX, y, worldZ, BLOCK_STEIN);
        }
        setBlock(worldX, hoehe - 1, worldZ, BLOCK_GRAS);
      }
    }

    HOLZ_STAEMME.forEach(({ x, z, hoehe: stammHoehe }) => {
      const basis = gelaendeHoehe(x, z);
      for (let y = 0; y < stammHoehe; y++) {
        setBlock(x, basis + y, z, BLOCK_HOLZ);
      }
    });

    return { chunks, getBlock };
  }

  function baueChunkMeshes(world, getUV) {
    const meshes = [];
    for (const [key, chunk] of world.chunks) {
      const [cx, cz] = key.split(",").map(Number);
      const localGetBlock = (lx, ly, lz) =>
        world.getBlock(cx * CHUNK_SIZE_X + lx, ly, cz * CHUNK_SIZE_Z + lz);
      const meshData = SBW.greedyMesh(localGetBlock, [CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z], getUV);
      if (meshData.indices.length === 0) continue;
      const geometry = SBW.meshToBufferGeometry(THREE, meshData);
      meshes.push({ geometry, cx, cz });
    }
    return meshes;
  }

  function start() {
    const canvas = document.getElementById("welt-canvas");
    if (!canvas) return;

    const renderer = SBW.createRenderer(canvas);
    const scene = SBW.createScene();
    const camera = SBW.createCamera(window.innerWidth / window.innerHeight);

    const world = baueTestwelt();

    const layout = SBW.computeAtlasLayout([BLOCK_GRAS, BLOCK_STEIN, BLOCK_HOLZ]);
    const atlasCanvas = document.createElement("canvas");
    SBW.drawAtlasCanvas(atlasCanvas, layout, TESTWELT_FARBEN);
    const texture = SBW.createAtlasTexture(atlasCanvas);
    const material = SBW.createAtlasMaterial(texture);
    const getUV = SBW.createAtlasUVProvider(layout);

    const chunkMeshes = baueChunkMeshes(world, getUV);
    chunkMeshes.forEach(({ geometry, cx, cz }) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(cx * CHUNK_SIZE_X, 0, cz * CHUNK_SIZE_Z);
      scene.add(mesh);
    });

    SBW.attachContextLossHandling(renderer, canvas, {
      onLost: () => {
        cancelAnimationFrame(renderLoopHandle);
      },
      onRestored: () => {
        texture.needsUpdate = true;
        renderLoopHandle = requestAnimationFrame(renderLoop);
      },
    });

    const spielerZustand = SBW.createPlayerState([16, 12, 16]);
    const eingabe = SBW.createControls ? SBW.createControls(canvas) : null;

    const debugModus = new URLSearchParams(window.location.search).get("debug") === "1";
    let fpsAnzeige = null;
    let fpsFrameZaehler = 0;
    let fpsLetzteAnzeige = performance.now();
    if (debugModus) {
      fpsAnzeige = document.createElement("div");
      fpsAnzeige.className = "hud-fps";
      fpsAnzeige.textContent = "-- fps";
      document.getElementById("hud").appendChild(fpsAnzeige);
    }

    let letzteZeit = performance.now();
    let renderLoopHandle;

    function isSolid(x, y, z) {
      return world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)) !== 0;
    }

    function renderLoop(jetzt) {
      renderLoopHandle = requestAnimationFrame(renderLoop);
      const dt = Math.min(0.05, (jetzt - letzteZeit) / 1000);
      letzteZeit = jetzt;

      const input = eingabe ? eingabe.getInput(camera) : { moveX: 0, moveZ: 0, jump: false };
      SBW.stepPhysics(spielerZustand, input, dt, isSolid);

      if (eingabe) {
        camera.position.set(
          spielerZustand.position.x,
          spielerZustand.position.y + SBW.PLAYER_EYE_HEIGHT,
          spielerZustand.position.z
        );
        eingabe.applyLook(camera);
      } else {
        // Vor M1.4 (controls.js) gibt es noch keine Blickrichtung — feste
        // Übersichtskamera, damit sich Terrain/Atlas/Nebel visuell prüfen lassen.
        camera.position.set(TESTWELT_BREITE * 0.9, TESTWELT_BREITE * 0.6, TESTWELT_BREITE * 0.9);
        camera.lookAt(TESTWELT_BREITE / 2, 4, TESTWELT_BREITE / 2);
      }

      SBW.resizeRendererToCanvas(renderer, camera);
      renderer.render(scene, camera);

      if (fpsAnzeige) {
        fpsFrameZaehler++;
        const vergangen = jetzt - fpsLetzteAnzeige;
        if (vergangen >= 250) {
          fpsAnzeige.textContent = `${Math.round((fpsFrameZaehler * 1000) / vergangen)} fps`;
          fpsFrameZaehler = 0;
          fpsLetzteAnzeige = jetzt;
        }
      }
    }

    renderLoopHandle = requestAnimationFrame(renderLoop);
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start);
    } else {
      start();
    }
  }
})();
