// Bootstrap. Baut eine flache Plaza mit vier Denkmal-Stationen (stationen.js)
// und verdrahtet Hebel-Interaktion + Flug-Animation des übertragenen Protons.

(function () {
  const CHUNK_SIZE_X = SBW.CHUNK_SIZE_X;
  const CHUNK_SIZE_Y = SBW.CHUNK_SIZE_Y;
  const CHUNK_SIZE_Z = SBW.CHUNK_SIZE_Z;

  function baueWelt(rezept, blockregister) {
    const breiteX = rezept.groesse.x;
    const breiteZ = rezept.groesse.z;
    const chunksX = Math.ceil(breiteX / CHUNK_SIZE_X);
    const chunksZ = Math.ceil(breiteZ / CHUNK_SIZE_Z);

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

    // 1) Flache Plaza über die gesamte Weltfläche.
    for (let worldX = 0; worldX < breiteX; worldX++) {
      for (let worldZ = 0; worldZ < breiteZ; worldZ++) {
        for (let y = 0; y < rezept.grundhoehe; y++) {
          setBlockId(worldX, y, worldZ, rezept.bodenBlock);
        }
      }
    }

    // 2) Stationen (Buchstaben-Standbilder + Hebel) aus stationen.js.
    const { stationen, naechsteFreieX } = SBW.baueStationen(setBlockId, rezept.grundhoehe, 6);

    return { chunks, chunksX, chunksZ, setBlockId, getBlockCode, breiteX, breiteZ, stationen, naechsteFreieX };
  }

  function baueChunkMesh(world, cx, cz, getUV) {
    const localGetBlock = (lx, ly, lz) =>
      world.getBlockCode(cx * CHUNK_SIZE_X + lx, ly, cz * CHUNK_SIZE_Z + lz);
    const meshData = SBW.greedyMesh(localGetBlock, [CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z], getUV);
    if (meshData.indices.length === 0) return null;
    return SBW.meshToBufferGeometry(THREE, meshData);
  }

  // Baut ein Canvas-Schild (Titel + optionaler zweiter Zeile) als Plane in der Welt.
  function baueSchild(THREE, scene, position, breiteWelt) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    function zeichne(zeile1, zeile2, zeile3) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(250,246,238,0.88)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#1e5d52";
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
      ctx.fillStyle = "#23201c";
      ctx.textAlign = "center";
      ctx.font = "bold 30px Georgia, serif";
      ctx.fillText(zeile1, canvas.width / 2, 44);
      ctx.font = "26px 'SF Mono', ui-monospace, monospace";
      ctx.fillStyle = "#a83610";
      ctx.fillText(zeile2 || "", canvas.width / 2, 84);
      if (zeile3) {
        ctx.font = "16px system-ui, sans-serif";
        ctx.fillStyle = "#23201c";
        wrapText(ctx, zeile3, canvas.width / 2, 112, canvas.width - 40, 20);
      }
      texture.needsUpdate = true;
    }

    function wrapText(context, text, x, y, maxWidth, lineHeight) {
      const words = text.split(" ");
      let line = "";
      let lineY = y;
      words.forEach((word) => {
        const testLine = line + word + " ";
        if (context.measureText(testLine).width > maxWidth && line !== "") {
          context.fillText(line, x, lineY);
          line = word + " ";
          lineY += lineHeight;
        } else {
          line = testLine;
        }
      });
      context.fillText(line, x, lineY);
    }

    const geometry = new THREE.PlaneGeometry(9, 9 * (canvas.height / canvas.width));
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    scene.add(mesh);
    return { mesh, zeichne };
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

    const meshByKey = new Map();
    const meshListe = [];

    function baueAlleMeshesNeu() {
      meshListe.length = 0;
      for (const [key, mesh] of meshByKey) {
        scene.remove(mesh);
        mesh.geometry.dispose();
      }
      meshByKey.clear();
      for (const [key, chunk] of world.chunks) {
        const [cx, cz] = key.split(",").map(Number);
        const geometry = baueChunkMesh(world, cx, cz, getUV);
        if (!geometry) continue;
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(cx * CHUNK_SIZE_X, 0, cz * CHUNK_SIZE_Z);
        scene.add(mesh);
        meshByKey.set(key, mesh);
        meshListe.push(mesh);
      }
    }
    baueAlleMeshesNeu();

    // Schilder über jeder Station: Titel + Zustand + didaktischer Hinweis.
    const hebelCode = SBW.CODE_BY_ID["hebel"];
    world.stationen.forEach((station) => {
      const schild = baueSchild(THREE, scene, {
        x: station.schildMitte.x,
        y: station.schildMitte.y,
        z: station.schildMitte.z - 1.5,
      });
      const formel = station.def.saeureWort + " " + station.def.zustand + "  +  H2O  ->  ...";
      schild.zeichne(station.def.titel, formel, station.def.hinweis || "Hebel vorn antippen, um die Protonenübertragung auszulösen.");
      station.schild = schild;
    });

    SBW.attachContextLossHandling(renderer, canvas, {
      onLost: () => cancelAnimationFrame(renderLoopHandle),
      onRestored: () => {
        texture.needsUpdate = true;
        renderLoopHandle = requestAnimationFrame(renderLoop);
      },
    });

    const raycaster = new THREE.Raycaster();
    raycaster.far = 6;

    function blockUnterFadenkreuz() {
      const richtung = camera.getWorldDirection(new THREE.Vector3());
      raycaster.set(camera.position, richtung);
      const treffer = raycaster.intersectObjects(meshListe, false);
      if (treffer.length === 0) return null;
      const einschlag = treffer[0];
      const punkt = einschlag.point.clone().sub(einschlag.face.normal.clone().multiplyScalar(0.5));
      return { x: Math.floor(punkt.x), y: Math.floor(punkt.y), z: Math.floor(punkt.z) };
    }

    // --- Proton-Flugobjekt: eigenes Mesh, kein Voxel, per Tween animiert. ---
    const protonGeometry = new THREE.SphereGeometry(0.35, 12, 12);
    const protonMaterial = new THREE.MeshBasicMaterial({ color: 0xffd23f });
    const protonMesh = new THREE.Mesh(protonGeometry, protonMaterial);
    protonMesh.visible = false;
    scene.add(protonMesh);

    let flug = null; // { von, nach, start, dauer, danach }
    function starteFlug(von, nach, dauer, danach) {
      protonMesh.visible = true;
      protonMesh.position.set(von.x + 0.5, von.y + 0.5, von.z + 0.5);
      flug = { von, nach, start: performance.now(), dauer, danach };
    }

    function aktualisiereFlug(jetzt) {
      if (!flug) return;
      let t = (jetzt - flug.start) / flug.dauer;
      if (t >= 1) {
        t = 1;
        protonMesh.position.set(flug.nach.x + 0.5, flug.nach.y + 0.5, flug.nach.z + 0.5);
        protonMesh.visible = false;
        const danach = flug.danach;
        flug = null;
        if (danach) danach();
        return;
      }
      const bogenHoehe = 2.2 * Math.sin(t * Math.PI);
      protonMesh.position.set(
        flug.von.x + (flug.nach.x - flug.von.x) * t + 0.5,
        flug.von.y + (flug.nach.y - flug.von.y) * t + 0.5 + bogenHoehe,
        flug.von.z + (flug.nach.z - flug.von.z) * t + 0.5
      );
    }

    function loeseStationAus(station) {
      if (flug) return; // eine Animation gleichzeitig reicht für den Unterrichtseinsatz
      const wirdAktiviert = !station.ausgeloest;
      const von = wirdAktiviert ? station.protonStart : station.protonEnde;
      const nach = wirdAktiviert ? station.protonEnde : station.protonStart;
      starteFlug(von, nach, 1400, () => {
        if (wirdAktiviert) {
          SBW.wendeProtonenuebertragungAn(world.setBlockId, station);
        } else {
          SBW.setzeStationZurueck(world.setBlockId, station);
        }
        baueAlleMeshesNeu();
        const formel = wirdAktiviert
          ? station.def.saeureWort.replace(station.erasedBox.char, "") + "-  +  H3O+"
          : station.def.saeureWort + " " + station.def.zustand + "  +  H2O  ->  ...";
        station.schild.zeichne(
          station.def.titel,
          wirdAktiviert ? "Säurerest (Base) + Oxonium-Ion" : station.def.saeureWort + " " + station.def.zustand + "  +  H2O  ->  ...",
          wirdAktiviert ? (station.def.hinweis || "Hebel erneut antippen, um zurückzusetzen.") : (station.def.hinweis || "Hebel vorn antippen, um die Protonenübertragung auszulösen.")
        );
      });
    }

    let hudPrompt;
    let hudTitel;
    let letzteZeit = performance.now();
    let renderLoopHandle;

    function isSolid(x, y, z) {
      return world.getBlockCode(Math.floor(x), Math.floor(y), Math.floor(z)) !== 0;
    }

    // Steuerung zuerst, HUD-Elemente danach (Stapelreihenfolge, siehe CLAUDE.md
    // der Schwesterwelt "Säuren-Basen-Welt", §4 Bugfix Nr. 4).
    const startUeberschreibung = new URLSearchParams(window.location.search).get("start");
    const start3 = startUeberschreibung
      ? (() => {
          const [x, y, z] = startUeberschreibung.split(",").map(Number);
          return { x, y, z };
        })()
      : rezept.start;
    const spielerZustand = SBW.createPlayerState([start3.x, start3.y, start3.z]);

    const eingabe = SBW.createControls(canvas, {
      onTap: () => {
        const block = blockUnterFadenkreuz();
        if (!block) return;
        const code = world.getBlockCode(block.x, block.y, block.z);
        if (code !== hebelCode) return;
        const station = world.stationen.find(
          (s) => s.hebel.x === block.x && s.hebel.y === block.y && s.hebel.z === block.z
        );
        if (station) loeseStationAus(station);
      },
    });

    const hud = document.getElementById("hud");
    hudTitel = document.createElement("div");
    hudTitel.id = "titel-leiste";
    hudTitel.className = "hud-flaeche";
    hudTitel.textContent = "Säuren und saure Lösungen — Teilchenwelt";
    hud.appendChild(hudTitel);

    const fadenkreuz = document.createElement("div");
    fadenkreuz.className = "hud-fadenkreuz";
    hud.appendChild(fadenkreuz);

    hudPrompt = document.createElement("div");
    hudPrompt.id = "hebel-prompt";
    hudPrompt.className = "hud-flaeche";
    hudPrompt.textContent = "Hebel antippen";
    hudPrompt.style.display = "none";
    hud.appendChild(hudPrompt);

    const debugModus = new URLSearchParams(window.location.search).get("debug") === "1";
    let fpsAnzeige = null;
    let fpsFrameZaehler = 0;
    let fpsLetzteAnzeige = performance.now();
    if (debugModus) {
      fpsAnzeige = document.createElement("div");
      fpsAnzeige.className = "hud-fps";
      fpsAnzeige.textContent = "-- fps";
      hud.appendChild(fpsAnzeige);
      window.SBW_DEBUG_WORLD = world;
      window.SBW_DEBUG_PLAYER = spielerZustand;
    }

    function renderLoop(jetzt) {
      renderLoopHandle = requestAnimationFrame(renderLoop);
      const dt = Math.min(0.05, (jetzt - letzteZeit) / 1000);
      letzteZeit = jetzt;

      const input = eingabe.getInput();
      SBW.stepPhysics(spielerZustand, input, dt, isSolid);

      camera.position.set(
        spielerZustand.position.x,
        spielerZustand.position.y + SBW.PLAYER_EYE_HEIGHT,
        spielerZustand.position.z
      );
      eingabe.applyLook(camera);

      const zielBlock = blockUnterFadenkreuz();
      const ziehltHebel = zielBlock && world.getBlockCode(zielBlock.x, zielBlock.y, zielBlock.z) === hebelCode;
      hudPrompt.style.display = ziehltHebel ? "block" : "none";

      aktualisiereFlug(jetzt);

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
