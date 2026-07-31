// Blockregister, generiert aus data/blocks.json (§6). Vergibt die numerischen
// Codes fürs Uint8Array-Chunk-Format (0 = Luft, reserviert).

function ladeBlocksJson() {
  if (typeof window !== "undefined" && window.SBW_BLOCKS) {
    return window.SBW_BLOCKS;
  }
  if (typeof require !== "undefined") {
    return require("../../data/blocks.json");
  }
  return [];
}

function baueBlockregister() {
  const rohdaten = ladeBlocksJson();
  const BLOCKS = rohdaten.map((def, index) => Object.assign({ code: index + 1 }, def));
  const BLOCK_BY_ID = {};
  const BLOCK_BY_CODE = {};
  const CODE_BY_ID = {};

  BLOCKS.forEach((def) => {
    BLOCK_BY_ID[def.id] = def;
    BLOCK_BY_CODE[def.code] = def;
    CODE_BY_ID[def.id] = def.code;
  });

  function getBlockDefByCode(code) {
    return BLOCK_BY_CODE[code] || null;
  }

  function getBlockDefById(id) {
    return BLOCK_BY_ID[id] || null;
  }

  function istMessbar(blockIdOderCode) {
    const def = typeof blockIdOderCode === "number" ? getBlockDefByCode(blockIdOderCode) : getBlockDefById(blockIdOderCode);
    return !!def && typeof def.ph === "number";
  }

  return {
    AIR: 0,
    BLOCKS,
    BLOCK_BY_ID,
    BLOCK_BY_CODE,
    CODE_BY_ID,
    getBlockDefByCode,
    getBlockDefById,
    istMessbar,
  };
}

const SBW_BLOCKS_EXPORTS = baueBlockregister();

if (typeof module !== "undefined" && module.exports) {
  module.exports = SBW_BLOCKS_EXPORTS;
}
if (typeof globalThis !== "undefined") {
  globalThis.SBW = globalThis.SBW || {};
  Object.assign(globalThis.SBW, SBW_BLOCKS_EXPORTS);
}
