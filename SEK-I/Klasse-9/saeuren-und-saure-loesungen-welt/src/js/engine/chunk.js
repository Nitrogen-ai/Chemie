// Chunk-Datenstruktur nach CLAUDE.md §3/§4: 16x16x32 Blöcke, Uint8Array(8192).

const CHUNK_SIZE_X = 16;
const CHUNK_SIZE_Z = 16;
const CHUNK_SIZE_Y = 32;
const CHUNK_VOLUME = CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z;

class Chunk {
  constructor(chunkX, chunkZ) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.data = new Uint8Array(CHUNK_VOLUME);
    this.dirty = true;
  }

  static index(x, y, z) {
    return x + z * CHUNK_SIZE_X + y * CHUNK_SIZE_X * CHUNK_SIZE_Z;
  }

  static inBounds(x, y, z) {
    return (
      x >= 0 && x < CHUNK_SIZE_X &&
      y >= 0 && y < CHUNK_SIZE_Y &&
      z >= 0 && z < CHUNK_SIZE_Z
    );
  }

  get(x, y, z) {
    if (!Chunk.inBounds(x, y, z)) return 0;
    return this.data[Chunk.index(x, y, z)];
  }

  set(x, y, z, blockId) {
    if (!Chunk.inBounds(x, y, z)) return;
    const idx = Chunk.index(x, y, z);
    if (this.data[idx] !== blockId) {
      this.data[idx] = blockId;
      this.dirty = true;
    }
  }
}

const SBW_CHUNK_EXPORTS = {
  Chunk,
  CHUNK_SIZE_X,
  CHUNK_SIZE_Y,
  CHUNK_SIZE_Z,
  CHUNK_VOLUME,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = SBW_CHUNK_EXPORTS;
}
if (typeof globalThis !== "undefined") {
  globalThis.SBW = globalThis.SBW || {};
  Object.assign(globalThis.SBW, SBW_CHUNK_EXPORTS);
}
