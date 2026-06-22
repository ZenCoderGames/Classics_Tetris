import { getCells } from './tetrominoes.js';
import { inBounds } from './board.js';

function isFilled(board, x, y, pieceCells) {
  if (!inBounds(x, y)) {
    return true;
  }
  if (board.cells[y][x] !== null) {
    return true;
  }
  return pieceCells.some((cell) => cell.x === x && cell.y === y);
}

function countFilledCorners(board, centerX, centerY, pieceCells) {
  const corners = [
    [centerX - 1, centerY - 1],
    [centerX + 1, centerY - 1],
    [centerX - 1, centerY + 1],
    [centerX + 1, centerY + 1],
  ];

  let count = 0;
  for (const [x, y] of corners) {
    if (isFilled(board, x, y, pieceCells)) {
      count += 1;
    }
  }
  return count;
}

function getTCenter(piece) {
  const centers = {
    0: { x: piece.x + 1, y: piece.y + 1 },
    1: { x: piece.x + 1, y: piece.y + 1 },
    2: { x: piece.x + 1, y: piece.y + 2 },
    3: { x: piece.x + 1, y: piece.y + 1 },
  };
  return centers[piece.rotation];
}

export function detectTSpin(board, piece, lastMoveWasRotation) {
  if (piece.type !== 'T' || !lastMoveWasRotation) {
    return { isTSpin: false, isMini: false };
  }

  const center = getTCenter(piece);
  const pieceCells = getCells(piece);
  const filledCorners = countFilledCorners(board, center.x, center.y, pieceCells);
  if (filledCorners < 3) {
    return { isTSpin: false, isMini: false };
  }

  const frontCells = {
    0: [[center.x, center.y - 1]],
    1: [[center.x + 1, center.y]],
    2: [[center.x, center.y + 1]],
    3: [[center.x - 1, center.y]],
  };

  const fronts = frontCells[piece.rotation];
  const frontBlocked = fronts.every(([x, y]) => isFilled(board, x, y, pieceCells));
  const isMini = !frontBlocked && filledCorners === 3;

  return {
    isTSpin: true,
    isMini,
  };
}
