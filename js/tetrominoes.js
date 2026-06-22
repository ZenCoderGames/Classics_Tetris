// Explicit mino offsets for each rotation state. Piece x,y is the top-left
// visible occupied cell area, so collision can never include hidden matrix cells.
export const SHAPES = {
  I: [
    [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [0, 1], [0, 2], [0, 3]],
    [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [0, 1], [0, 2], [0, 3]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [1, 0], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [2, 0], [2, 1]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
  O: [
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [0, 1], [1, 1], [0, 2]],
    [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
};

export const SPAWN = {
  I: { x: 3, y: 19 },
  J: { x: 3, y: 18 },
  L: { x: 3, y: 18 },
  O: { x: 4, y: 18 },
  S: { x: 3, y: 18 },
  T: { x: 3, y: 18 },
  Z: { x: 3, y: 18 },
};

export function createPiece(type) {
  const spawn = SPAWN[type];
  return {
    type,
    x: spawn.x,
    y: spawn.y,
    rotation: 0,
  };
}

export function getCells(piece) {
  return SHAPES[piece.type][piece.rotation].map(([dx, dy]) => ({
    x: piece.x + dx,
    y: piece.y + dy,
  }));
}

export function clonePiece(piece) {
  return { ...piece };
}

export function getPreviewCells(type) {
  return SHAPES[type][0];
}
