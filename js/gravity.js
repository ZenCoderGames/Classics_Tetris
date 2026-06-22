import { TIMING, gravityMsForLevel } from './config.js';

export function createGravityState(level) {
  return {
    dropTimer: 0,
    dropInterval: gravityMsForLevel(level),
    softDrop: false,
    lockTimer: 0,
    locking: false,
    moveResets: 0,
    dasTimer: 0,
    dasDirection: 0,
    arrTimer: 0,
    areTimer: 0,
    inAre: false,
  };
}

export function setLevelGravity(state, level) {
  state.dropInterval = gravityMsForLevel(level);
}

export function updateGravity(state, dt, onDrop, isOnGround) {
  if (state.inAre) {
    state.areTimer -= dt;
    if (state.areTimer <= 0) {
      state.inAre = false;
      state.areTimer = 0;
    }
    return;
  }

  const interval = state.softDrop ? TIMING.SOFT_DROP_MS : state.dropInterval;
  state.dropTimer += dt;

  if (state.dropTimer >= interval) {
    state.dropTimer = 0;
    onDrop(state.softDrop ? 1 : 1);
  }

  if (isOnGround()) {
    if (!state.locking) {
      state.locking = true;
      state.lockTimer = TIMING.LOCK_DELAY_MS;
      state.moveResets = 0;
    } else {
      state.lockTimer -= dt;
    }
  } else {
    state.locking = false;
    state.lockTimer = 0;
    state.moveResets = 0;
  }
}

export function resetLockDelay(state) {
  if (!state.locking) {
    return false;
  }
  if (state.moveResets >= TIMING.MAX_MOVE_RESETS) {
    return false;
  }
  state.lockTimer = TIMING.LOCK_DELAY_MS;
  state.moveResets += 1;
  return true;
}

export function resetHorizontalShift(state) {
  state.dasTimer = 0;
  state.dasDirection = 0;
  state.arrTimer = 0;
}

export function shouldLock(state) {
  return state.locking && state.lockTimer <= 0;
}

export function startAre(state) {
  state.inAre = true;
  state.areTimer = TIMING.ARE_MS;
  state.locking = false;
  state.lockTimer = 0;
  state.dropTimer = 0;
  resetHorizontalShift(state);
}

export function updateDas(state, dt, direction, onShift) {
  if (direction === 0) {
    state.dasDirection = 0;
    state.dasTimer = 0;
    state.arrTimer = 0;
    return;
  }

  if (state.dasDirection !== direction) {
    state.dasDirection = direction;
    state.dasTimer = 0;
    state.arrTimer = 0;
    return;
  }

  state.dasTimer += dt;
  if (state.dasTimer < TIMING.DAS_MS) {
    return;
  }

  state.arrTimer += dt;
  while (state.arrTimer >= TIMING.ARR_MS) {
    state.arrTimer -= TIMING.ARR_MS;
    onShift(direction);
  }
}
