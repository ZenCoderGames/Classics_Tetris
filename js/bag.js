import { PIECE_TYPES } from './config.js';

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createBag() {
  return {
    queue: [],
  };
}

function refillBag(bag) {
  bag.queue.push(...shuffle(PIECE_TYPES));
}

export function takeFromBag(bag) {
  if (bag.queue.length === 0) {
    refillBag(bag);
  }
  return bag.queue.shift();
}

export function fillNextQueue(bag, nextQueue, targetSize) {
  while (nextQueue.length < targetSize) {
    nextQueue.push(takeFromBag(bag));
  }
}

export function peekQueue(bag, count) {
  while (bag.queue.length < count) {
    refillBag(bag);
  }
  return bag.queue.slice(0, count);
}
