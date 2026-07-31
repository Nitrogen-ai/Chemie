// AABB-Kollision, Gravitation, Springen — CLAUDE.md §4.
// Bewegung/Kollision je Achse getrennt aufgelöst (X, dann Z, dann Y), das
// reicht für ein blockbasiertes Gitter mit den kleinen Zeitschritten eines
// requestAnimationFrame-Loops.

const GRAVITY = -20; // Blöcke/s²
const JUMP_SPEED = 7.8; // ergibt ca. 1,5 Blöcke Sprunghöhe
const WALK_SPEED = 4.3; // Blöcke/s, angelehnt an gängige Voxel-Spiele
const PLAYER_WIDTH = 0.6;
const PLAYER_HEIGHT = 1.8;
const PLAYER_EYE_HEIGHT = 1.62;

function createPlayerState(position) {
  return {
    position: { x: position[0], y: position[1], z: position[2] },
    velocity: { x: 0, y: 0, z: 0 },
    onGround: false,
  };
}

function playerAABB(position) {
  const halfWidth = PLAYER_WIDTH / 2;
  return {
    minX: position.x - halfWidth,
    maxX: position.x + halfWidth,
    minY: position.y,
    maxY: position.y + PLAYER_HEIGHT,
    minZ: position.z - halfWidth,
    maxZ: position.z + halfWidth,
  };
}

function moveX(position, delta, isSolid) {
  if (delta === 0) return false;
  position.x += delta;
  const box = playerAABB(position);
  const minBY = Math.floor(box.minY);
  const maxBY = Math.floor(box.maxY - 1e-9);
  const minBZ = Math.floor(box.minZ);
  const maxBZ = Math.floor(box.maxZ - 1e-9);
  const bx = delta > 0 ? Math.floor(box.maxX - 1e-9) : Math.floor(box.minX);

  let collided = false;
  for (let by = minBY; by <= maxBY; by++) {
    for (let bz = minBZ; bz <= maxBZ; bz++) {
      if (isSolid(bx, by, bz)) {
        collided = true;
        position.x = delta > 0 ? bx - PLAYER_WIDTH / 2 : bx + 1 + PLAYER_WIDTH / 2;
      }
    }
  }
  return collided;
}

function moveZ(position, delta, isSolid) {
  if (delta === 0) return false;
  position.z += delta;
  const box = playerAABB(position);
  const minBX = Math.floor(box.minX);
  const maxBX = Math.floor(box.maxX - 1e-9);
  const minBY = Math.floor(box.minY);
  const maxBY = Math.floor(box.maxY - 1e-9);
  const bz = delta > 0 ? Math.floor(box.maxZ - 1e-9) : Math.floor(box.minZ);

  let collided = false;
  for (let bx = minBX; bx <= maxBX; bx++) {
    for (let by = minBY; by <= maxBY; by++) {
      if (isSolid(bx, by, bz)) {
        collided = true;
        position.z = delta > 0 ? bz - PLAYER_WIDTH / 2 : bz + 1 + PLAYER_WIDTH / 2;
      }
    }
  }
  return collided;
}

function moveY(position, delta, isSolid) {
  if (delta === 0) return false;
  position.y += delta;
  const box = playerAABB(position);
  const minBX = Math.floor(box.minX);
  const maxBX = Math.floor(box.maxX - 1e-9);
  const minBZ = Math.floor(box.minZ);
  const maxBZ = Math.floor(box.maxZ - 1e-9);
  const by = delta > 0 ? Math.floor(box.maxY - 1e-9) : Math.floor(box.minY);

  let collided = false;
  for (let bx = minBX; bx <= maxBX; bx++) {
    for (let bz = minBZ; bz <= maxBZ; bz++) {
      if (isSolid(bx, by, bz)) {
        collided = true;
        position.y = delta > 0 ? by - PLAYER_HEIGHT : by + 1;
      }
    }
  }
  return collided;
}

// input: { moveX, moveZ (Welt-Richtung, bereits normalisiert), jump }
function stepPhysics(state, input, dt, isSolid) {
  const dx = (input.moveX || 0) * WALK_SPEED * dt;
  const dz = (input.moveZ || 0) * WALK_SPEED * dt;

  moveX(state.position, dx, isSolid);
  moveZ(state.position, dz, isSolid);

  if (input.jump && state.onGround) {
    state.velocity.y = JUMP_SPEED;
    state.onGround = false;
  }

  state.velocity.y += GRAVITY * dt;
  const dy = state.velocity.y * dt;
  const collidedY = moveY(state.position, dy, isSolid);

  if (collidedY) {
    if (dy < 0) {
      state.onGround = true;
    }
    state.velocity.y = 0;
  } else {
    state.onGround = false;
  }

  return state;
}

const SBW_PHYSICS_EXPORTS = {
  GRAVITY,
  JUMP_SPEED,
  WALK_SPEED,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_EYE_HEIGHT,
  createPlayerState,
  playerAABB,
  stepPhysics,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = SBW_PHYSICS_EXPORTS;
}
if (typeof globalThis !== "undefined") {
  globalThis.SBW = globalThis.SBW || {};
  Object.assign(globalThis.SBW, SBW_PHYSICS_EXPORTS);
}
