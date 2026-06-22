import { NEXT_QUEUE_SIZE } from './config.js';
import { createBag, fillNextQueue } from './bag.js';
import { createPiece } from './tetrominoes.js';

export function createPieceManager() {
  const bag = createBag();
  const nextQueue = [];

  fillNextQueue(bag, nextQueue, NEXT_QUEUE_SIZE);

  return {
    bag,
    nextQueue,
    hold: null,
    holdUsed: false,
    active: null,
  };
}

export function spawnNext(manager) {
  fillNextQueue(manager.bag, manager.nextQueue, NEXT_QUEUE_SIZE);
  const type = manager.nextQueue.shift();
  manager.active = createPiece(type);
  fillNextQueue(manager.bag, manager.nextQueue, NEXT_QUEUE_SIZE);
  manager.holdUsed = false;
  return manager.active;
}

export function holdPiece(manager) {
  if (!manager.active || (manager.holdUsed && manager.hold === null)) {
    return null;
  }

  manager.holdUsed = true;
  const currentType = manager.active.type;

  if (manager.hold === null) {
    manager.hold = currentType;
    fillNextQueue(manager.bag, manager.nextQueue, NEXT_QUEUE_SIZE);
    manager.active = createPiece(manager.nextQueue.shift());
    fillNextQueue(manager.bag, manager.nextQueue, NEXT_QUEUE_SIZE);
  } else {
    const swapType = manager.hold;
    manager.hold = currentType;
    manager.active = createPiece(swapType);
  }

  return manager.active;
}

export function resetPieceManager(manager) {
  manager.bag.queue.length = 0;
  manager.nextQueue.length = 0;
  manager.hold = null;
  manager.holdUsed = false;
  manager.active = null;
  fillNextQueue(manager.bag, manager.nextQueue, NEXT_QUEUE_SIZE);
}
