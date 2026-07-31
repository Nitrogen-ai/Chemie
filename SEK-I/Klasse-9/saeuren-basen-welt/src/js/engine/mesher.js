// Greedy Meshing nach CLAUDE.md §4: eine BufferGeometry pro Chunk, ein Material,
// Face-Culling gegen Nachbarblöcke — verdeckte Flächen werden nie erzeugt.
//
// Vereinfachung (bewusst, wegen Performance-Budget/§4): Eine gemergte Fläche
// bekommt die Textur einmal gestreckt, nicht wiederholt gekachelt. Bei den
// kleinen Zonen aus §7 fällt das im Retro-Look kaum auf, spart aber die
// Komplexität eines Multi-Draw-Atlas-Shaders.

function greedyMesh(getBlock, dims, getUV) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const [sizeX, sizeY, sizeZ] = dims;
  const dimsArr = [sizeX, sizeY, sizeZ];

  for (let axis = 0; axis < 3; axis++) {
    const u = (axis + 1) % 3;
    const v = (axis + 2) % 3;

    const x = [0, 0, 0];
    const q = [0, 0, 0];
    q[axis] = 1;

    const maskW = dimsArr[u];
    const maskH = dimsArr[v];
    const mask = new Int32Array(maskW * maskH);

    for (x[axis] = -1; x[axis] < dimsArr[axis]; ) {
      let n = 0;
      for (x[v] = 0; x[v] < maskH; x[v]++) {
        for (x[u] = 0; x[u] < maskW; x[u]++) {
          const a = x[axis] >= 0 ? getBlock(x[0], x[1], x[2]) : 0;
          const bx = x[0] + q[0];
          const by = x[1] + q[1];
          const bz = x[2] + q[2];
          const b = x[axis] < dimsArr[axis] - 1 ? getBlock(bx, by, bz) : 0;

          if (Boolean(a) === Boolean(b)) {
            mask[n] = 0;
          } else if (a) {
            mask[n] = a;
          } else {
            mask[n] = -b;
          }
          n++;
        }
      }

      x[axis]++;

      n = 0;
      for (let j = 0; j < maskH; j++) {
        for (let i = 0; i < maskW; ) {
          const c = mask[n];
          if (c === 0) {
            i++;
            n++;
            continue;
          }

          let w = 1;
          while (i + w < maskW && mask[n + w] === c) w++;

          let h = 1;
          let done = false;
          while (j + h < maskH) {
            for (let k = 0; k < w; k++) {
              if (mask[n + k + h * maskW] !== c) {
                done = true;
                break;
              }
            }
            if (done) break;
            h++;
          }

          const blockId = Math.abs(c);
          const dir = c > 0 ? 1 : -1;

          x[u] = i;
          x[v] = j;

          const du = [0, 0, 0];
          du[u] = w;
          const dv = [0, 0, 0];
          dv[v] = h;

          const p0 = [x[0], x[1], x[2]];
          const p1 = [p0[0] + du[0], p0[1] + du[1], p0[2] + du[2]];
          const p2 = [p0[0] + du[0] + dv[0], p0[1] + du[1] + dv[1], p0[2] + du[2] + dv[2]];
          const p3 = [p0[0] + dv[0], p0[1] + dv[1], p0[2] + dv[2]];

          const normal = [0, 0, 0];
          normal[axis] = dir;

          const vertStart = positions.length / 3;
          [p0, p1, p2, p3].forEach((p) => {
            positions.push(p[0], p[1], p[2]);
            normals.push(normal[0], normal[1], normal[2]);
          });

          const uv = getUV ? getUV(blockId, axis) : { u0: 0, v0: 0, u1: 1, v1: 1 };
          uvs.push(uv.u0, uv.v1);
          uvs.push(uv.u1, uv.v1);
          uvs.push(uv.u1, uv.v0);
          uvs.push(uv.u0, uv.v0);

          if (dir > 0) {
            indices.push(vertStart, vertStart + 1, vertStart + 2);
            indices.push(vertStart + 2, vertStart + 3, vertStart);
          } else {
            indices.push(vertStart, vertStart + 3, vertStart + 2);
            indices.push(vertStart + 2, vertStart + 1, vertStart);
          }

          for (let l = 0; l < h; l++) {
            for (let k = 0; k < w; k++) {
              mask[n + k + l * maskW] = 0;
            }
          }

          i += w;
          n += w;
        }
      }
    }
  }

  return { positions, normals, uvs, indices };
}

function meshChunk(chunk, dims, getUV) {
  const getBlock = (x, y, z) => chunk.get(x, y, z);
  return greedyMesh(getBlock, dims, getUV);
}

function meshToBufferGeometry(THREE, meshData) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(meshData.positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(meshData.normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(meshData.uvs, 2));
  geometry.setIndex(meshData.indices);
  return geometry;
}

const SBW_MESHER_EXPORTS = { greedyMesh, meshChunk, meshToBufferGeometry };

if (typeof module !== "undefined" && module.exports) {
  module.exports = SBW_MESHER_EXPORTS;
}
if (typeof globalThis !== "undefined") {
  globalThis.SBW = globalThis.SBW || {};
  Object.assign(globalThis.SBW, SBW_MESHER_EXPORTS);
}
