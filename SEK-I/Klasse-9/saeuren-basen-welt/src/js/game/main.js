// Bootstrap. Baut die Insel aus data/world.json (§7) mit dem Blockregister
// aus blocks.js.

(function () {
  const CHUNK_SIZE_X = SBW.CHUNK_SIZE_X;
  const CHUNK_SIZE_Y = SBW.CHUNK_SIZE_Y;
  const CHUNK_SIZE_Z = SBW.CHUNK_SIZE_Z;

  function baueWelt(rezept, blockregister) {
    const breiteX = rezept.groesse.x;
    const breiteZ = rezept.groesse.z;
    const chunksX = breiteX / CHUNK_SIZE_X;
    const chunksZ = breiteZ / CHUNK_SIZE_Z;

    const chunks = new Map();
    for (let cx = 0; cx < chunksX; cx++) {
      for (let cz = 0; cz < chunksZ; cz++) {
        chunks.set(`${cx},${cz}`, new SBW.Chunk(cx, cz));
      }
    }

    function chunkAt(worldX, worldZ) {
      const cx = Math.floor(worldX / CHUNK_SIZE_X);
      const cz = Math.floor(worldZ / CHUNK_SIZE_Z);
      return chunks.get(`${cx},${cz}`);
    }

    function setBlockId(worldX, worldY, worldZ, blockId) {
      if (worldX < 0 || worldX >= breiteX || worldZ < 0 || worldZ >= breiteZ) return;
      if (worldY < 0 || worldY >= CHUNK_SIZE_Y) return;
      const chunk = chunkAt(worldX, worldZ);
      if (!chunk) return;
      const lx = ((worldX % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
      const lz = ((worldZ % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
      const code = blockId === null ? 0 : blockregister.CODE_BY_ID[blockId];
      chunk.set(lx, worldY, lz, code);
    }

    function getBlockCode(worldX, worldY, worldZ) {
      if (worldX < 0 || worldX >= breiteX || worldZ < 0 || worldZ >= breiteZ) return 0;
      if (worldY < 0 || worldY >= CHUNK_SIZE_Y) return 0;
      const chunk = chunkAt(worldX, worldZ);
      if (!chunk) return 0;
      const lx = ((worldX % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
      const lz = ((worldZ % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
      return chunk.get(lx, worldY, lz);
    }

    // Höher als jede mögliche Geländehöhe (Grundhöhe + Wellen + Hüttendach) —
    // damit eine spätere, niedrigere Säule (Teich, Meer) übrig gebliebene
    // höhere Blöcke aus einem früheren Durchlauf zuverlässig wegräumt.
    const SAEULEN_RAEUM_HOEHE = 24;

    function fuelleSaeule(worldX, worldZ, hoehe, deckBlockId, unterbauBlockId) {
      for (let y = 0; y < hoehe - 1; y++) {
        setBlockId(worldX, y, worldZ, unterbauBlockId);
      }
      setBlockId(worldX, hoehe - 1, worldZ, deckBlockId);
      for (let y = hoehe; y < SAEULEN_RAEUM_HOEHE; y++) {
        setBlockId(worldX, y, worldZ, null);
      }
    }

    function geglaetteteGrundhoehe(worldX, worldZ, grundhoehe) {
      const welle = Math.sin(worldX / 10) * Math.cos(worldZ / 10) * 2;
      return Math.max(3, Math.round(grundhoehe + welle));
    }

    function naechsteZone(worldX, worldZ) {
      let beste = null;
      let besterAnteil = Infinity;
      rezept.zonen.forEach((zone) => {
        const [zx, zz] = zone.zentrum;
        const distanz = Math.hypot(worldX - zx, worldZ - zz);
        const anteil = distanz / zone.radius;
        if (anteil <= 1 && anteil < besterAnteil) {
          besterAnteil = anteil;
          beste = zone;
        }
      });
      return beste;
    }

    function distanzZuPfad(worldX, worldZ, pfad) {
      let minDistanz = Infinity;
      for (let i = 0; i < pfad.length - 1; i++) {
        const [ax, az] = pfad[i];
        const [bx, bz] = pfad[i + 1];
        const dx = bx - ax;
        const dz = bz - az;
        const laenge2 = dx * dx + dz * dz;
        let t = laenge2 === 0 ? 0 : ((worldX - ax) * dx + (worldZ - az) * dz) / laenge2;
        t = Math.max(0, Math.min(1, t));
        const px = ax + t * dx;
        const pz = az + t * dz;
        minDistanz = Math.min(minDistanz, Math.hypot(worldX - px, worldZ - pz));
      }
      return minDistanz;
    }

    // 1) Grundterrain: Zonen-Boden oder Hintergrundwiese, sanfte Wellen.
    for (let worldX = 0; worldX < breiteX; worldX++) {
      for (let worldZ = 0; worldZ < breiteZ; worldZ++) {
        const zone = naechsteZone(worldX, worldZ);
        const deckBlock = zone ? zone.bodenBlock : rezept.hintergrundBoden;
        const hoehe = geglaetteteGrundhoehe(worldX, worldZ, rezept.grundhoehe);
        fuelleSaeule(worldX, worldZ, hoehe, deckBlock, rezept.unterbauBlock);
      }
    }

    // 2) Gewässer: Teiche (Kreis, flacher Wasserspiegel), Bäche (Pfad), Küste (Rand).
    rezept.gewaesser.forEach((gw) => {
      if (gw.zentrum && gw.radius) {
        const [zx, zz] = gw.zentrum;
        const wasserHoehe = Math.max(2, rezept.grundhoehe - gw.tiefe);
        for (let worldX = Math.floor(zx - gw.radius); worldX <= zx + gw.radius; worldX++) {
          for (let worldZ = Math.floor(zz - gw.radius); worldZ <= zz + gw.radius; worldZ++) {
            if (Math.hypot(worldX - zx, worldZ - zz) <= gw.radius) {
              fuelleSaeule(worldX, worldZ, wasserHoehe, gw.blockId, rezept.unterbauBlock);
            }
          }
        }
      } else if (gw.pfad) {
        const wasserHoehe = Math.max(2, rezept.grundhoehe - 1);
        const minX = Math.min(...gw.pfad.map((p) => p[0])) - gw.breite;
        const maxX = Math.max(...gw.pfad.map((p) => p[0])) + gw.breite;
        const minZ = Math.min(...gw.pfad.map((p) => p[1])) - gw.breite;
        const maxZ = Math.max(...gw.pfad.map((p) => p[1])) + gw.breite;
        for (let worldX = minX; worldX <= maxX; worldX++) {
          for (let worldZ = minZ; worldZ <= maxZ; worldZ++) {
            if (distanzZuPfad(worldX, worldZ, gw.pfad) <= gw.breite / 2) {
              fuelleSaeule(worldX, worldZ, wasserHoehe, gw.blockId, rezept.unterbauBlock);
            }
          }
        }
      } else if (gw.randKante === "west") {
        const wasserHoehe = Math.max(2, rezept.grundhoehe - gw.tiefe);
        for (let worldX = 0; worldX < gw.bisSpalte; worldX++) {
          for (let worldZ = 0; worldZ < breiteZ; worldZ++) {
            fuelleSaeule(worldX, worldZ, wasserHoehe, gw.blockId, rezept.unterbauBlock);
          }
        }
        if (rezept.kuestenSand) {
          for (let worldX = gw.bisSpalte; worldX < gw.bisSpalte + rezept.kuestenSand.breite; worldX++) {
            for (let worldZ = 0; worldZ < breiteZ; worldZ++) {
              const hoehe = geglaetteteGrundhoehe(worldX, worldZ, rezept.grundhoehe);
              fuelleSaeule(worldX, worldZ, hoehe, rezept.kuestenSand.block, rezept.unterbauBlock);
            }
          }
        }
      }
    });

    // 3) Hütte: Boden, Wände mit Türlücke, Dach, Regal mit den Haushaltsprodukten.
    const huette = rezept.huette;
    if (huette) {
      const [hx, hz] = huette.zentrum;
      const halbX = Math.floor(huette.breiteX / 2);
      const halbZ = Math.floor(huette.tiefeZ / 2);
      const bodenY = geglaetteteGrundhoehe(hx, hz, rezept.grundhoehe);

      for (let worldX = hx - halbX; worldX <= hx + halbX; worldX++) {
        for (let worldZ = hz - halbZ; worldZ <= hz + halbZ; worldZ++) {
          fuelleSaeule(worldX, worldZ, bodenY, "bretter", rezept.unterbauBlock);
        }
      }

      const tuerMitteX = hx;
      for (let worldX = hx - halbX; worldX <= hx + halbX; worldX++) {
        for (let stufe = 1; stufe <= huette.hoeheWand; stufe++) {
          const istTuer = Math.abs(worldX - tuerMitteX) <= 1 && stufe <= 2;
          if (!istTuer) setBlockId(worldX, bodenY - 1 + stufe, hz - halbZ, huette.wandBlock);
          setBlockId(worldX, bodenY - 1 + stufe, hz + halbZ, huette.wandBlock);
        }
      }
      for (let worldZ = hz - halbZ; worldZ <= hz + halbZ; worldZ++) {
        for (let stufe = 1; stufe <= huette.hoeheWand; stufe++) {
          setBlockId(hx - halbX, bodenY - 1 + stufe, worldZ, huette.wandBlock);
          setBlockId(hx + halbX, bodenY - 1 + stufe, worldZ, huette.wandBlock);
        }
      }
      for (let worldX = hx - halbX; worldX <= hx + halbX; worldX++) {
        for (let worldZ = hz - halbZ; worldZ <= hz + halbZ; worldZ++) {
          setBlockId(worldX, bodenY + huette.hoeheWand, worldZ, huette.dachBlock);
        }
      }

      const regalZ = hz + halbZ - 1;
      const regalStartX = hx - Math.floor((huette.regal.length - 1) / 2);
      huette.regal.forEach((blockId, index) => {
        setBlockId(regalStartX + index, bodenY + 1, regalZ, blockId);
      });
    }

    // 4) Bäume: Stamm + einfache Krone.
    if (rezept.baeume && rezept.baumTypen) {
      rezept.baeume.forEach((baum) => {
        const typ = rezept.baumTypen[baum.typ];
        if (!typ) return;
        const basis = geglaetteteGrundhoehe(baum.x, baum.z, rezept.grundhoehe);
        for (let y = 0; y < 3; y++) {
          setBlockId(baum.x, basis + y, baum.z, typ.stamm);
        }
        const kroneY = basis + 3;
        setBlockId(baum.x, kroneY, baum.z, typ.krone);
        setBlockId(baum.x + 1, kroneY - 1, baum.z, typ.krone);
        setBlockId(baum.x - 1, kroneY - 1, baum.z, typ.krone);
        setBlockId(baum.x, kroneY - 1, baum.z + 1, typ.krone);
        setBlockId(baum.x, kroneY - 1, baum.z - 1, typ.krone);
      });
    }

    return { chunks, chunksX, chunksZ, getBlockCode, breiteX, breiteZ };
  }

  function baueChunkMeshes(world, getUV) {
    const meshes = [];
    for (const [key, chunk] of world.chunks) {
      const [cx, cz] = key.split(",").map(Number);
      const localGetBlock = (lx, ly, lz) =>
        world.getBlockCode(cx * CHUNK_SIZE_X + lx, ly, cz * CHUNK_SIZE_Z + lz);
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

    const rezept = window.SBW_WORLD;
    const world = baueWelt(rezept, SBW);

    const codes = SBW.BLOCKS.map((def) => def.code);
    const farbenNachCode = {};
    SBW.BLOCKS.forEach((def) => {
      farbenNachCode[def.code] = def.farbe;
    });

    const layout = SBW.computeAtlasLayout(codes);
    const atlasCanvas = document.createElement("canvas");
    SBW.drawAtlasCanvas(atlasCanvas, layout, farbenNachCode);
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

    const startUeberschreibung = new URLSearchParams(window.location.search).get("start");
    const start3 = startUeberschreibung ? (() => {
      const [x, y, z] = startUeberschreibung.split(",").map(Number);
      return { x, y, z };
    })() : rezept.start;
    const spielerZustand = SBW.createPlayerState([start3.x, start3.y, start3.z]);
    const eingabe = SBW.createControls ? SBW.createControls(canvas) : null;

    const debugModus = new URLSearchParams(window.location.search).get("debug") === "1";
    const uebersichtsModus = new URLSearchParams(window.location.search).get("uebersicht") === "1";
    let fpsAnzeige = null;
    let fpsFrameZaehler = 0;
    let fpsLetzteAnzeige = performance.now();
    if (debugModus) {
      fpsAnzeige = document.createElement("div");
      fpsAnzeige.className = "hud-fps";
      fpsAnzeige.textContent = "-- fps";
      document.getElementById("hud").appendChild(fpsAnzeige);
    }
    if (debugModus || uebersichtsModus) {
      window.SBW_DEBUG_WORLD = world;
      window.SBW_DEBUG_PLAYER = spielerZustand;
    }

    let letzteZeit = performance.now();
    let renderLoopHandle;

    function isSolid(x, y, z) {
      return world.getBlockCode(Math.floor(x), Math.floor(y), Math.floor(z)) !== 0;
    }

    function renderLoop(jetzt) {
      renderLoopHandle = requestAnimationFrame(renderLoop);
      const dt = Math.min(0.05, (jetzt - letzteZeit) / 1000);
      letzteZeit = jetzt;

      const input = eingabe ? eingabe.getInput() : { moveX: 0, moveZ: 0, jump: false };
      SBW.stepPhysics(spielerZustand, input, dt, isSolid);

      if (uebersichtsModus) {
        // Nur zur visuellen Kontrolle beim Bauen, kein Teil der Spielsteuerung.
        camera.far = 140;
        camera.updateProjectionMatrix();
        scene.fog = null;
        camera.position.set(rezept.groesse.x / 2, 80, rezept.groesse.z / 2 + 0.01);
        camera.lookAt(rezept.groesse.x / 2, 0, rezept.groesse.z / 2);
      } else {
        camera.position.set(
          spielerZustand.position.x,
          spielerZustand.position.y + SBW.PLAYER_EYE_HEIGHT,
          spielerZustand.position.z
        );
        if (eingabe) {
          eingabe.applyLook(camera);
        } else {
          camera.lookAt(rezept.groesse.x / 2, 6, rezept.groesse.z / 2);
        }
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
