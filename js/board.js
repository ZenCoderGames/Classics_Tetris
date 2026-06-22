import { GRID, TOTAL_ROWS } from './config.js';

export function createBoard() {
  const cells = Array.from({ length: TOTAL_ROWS }, () =>
    Array.from({ length: GRID.COLS }, () => null),
  );
  return { cells };
}

export function inBounds(x, y) {
  return x >= 0 && x < GRID.COLS && y >= 0 && y < TOTAL_ROWS;
}

export function getCell(board, x, y) {
  if (!inBounds(x, y)) {
    return '#';
  }
  return board.cells[y][x];
}

export function collides(board, pieceCells) {
  return getCollision(board, pieceCells) !== null;
}

export function getCollision(board, pieceCells) {
  for (const { x, y } of pieceCells) {
    if (!inBounds(x, y)) {
      return { x, y, reason: 'bounds', value: null };
    }

    const value = board.cells[y][x];
    if (value !== null) {
      return { x, y, reason: 'occupied', value };
    }
  }

  return null;
}

export function canPlaceCells(board, pieceCells) {
  return getCollision(board, pieceCells) === null;
}

export function normalizeBoard(board) {
  for (let y = 0; y < board.cells.length; y += 1) {
    for (let x = 0; x < board.cells[y].length; x += 1) {
      if (board.cells[y][x] === undefined) {
        board.cells[y][x] = null;
      }
    }
  }
}

export function lockPiece(board, piece) {
  for (const { x, y } of piece.cells) {
    if (inBounds(x, y)) {
      board.cells[y][x] = piece.type;
    }
  }
}

export function findCompletedLines(board) {
  const completed = [];
  const firstVisible = GRID.BUFFER_ROWS;
  const lastVisible = GRID.BUFFER_ROWS + GRID.VISIBLE_ROWS - 1;

  for (let y = firstVisible; y <= lastVisible; y += 1) {
    if (board.cells[y].every((cell) => cell !== null)) {
      completed.push(y);
    }
  }
  return completed;
}

export function clearLines(board, lineRows) {
  if (lineRows.length === 0) {
    return 0;
  }

  const rowsToClear = new Set(lineRows);
  const kept = board.cells.filter((_, y) => !rowsToClear.has(y));
  const emptyRows = Array.from({ length: lineRows.length }, () =>
    Array.from({ length: GRID.COLS }, () => null),
  );

  board.cells = [...emptyRows, ...kept];
  return lineRows.length;
}

export function isAboveVisible(board, pieceCells) {
  const firstVisible = GRID.BUFFER_ROWS;
  return pieceCells.every(({ y }) => y < firstVisible);
}

export function isBlockedAboveBuffer(board) {
  for (let y = 0; y < GRID.BUFFER_ROWS; y += 1) {
    if (board.cells[y].some((cell) => cell !== null)) {
      return true;
    }
  }
  return false;
}

export function getGhostY(board, pieceCells, startY) {
  let ghostY = startY;
  while (true) {
    const nextY = ghostY + 1;
    const shifted = pieceCells.map(({ x, y }) => ({ x, y: y - startY + nextY }));
    if (collides(board, shifted)) {
      break;
    }
    ghostY = nextY;
  }
  return ghostY;
}
