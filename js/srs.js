// Direct SRS wall kick tables from Tetris Guideline (tetris.wiki/Super_Rotation_System).

const JLSTZ_KICKS = {
  '0-1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '1-0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '1-2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2-1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2-3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '3-2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3-0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0-3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

const I_KICKS = {
  '0-1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1-0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1-2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2-1': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '2-3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3-2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3-0': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '0-3': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
};

const O_KICKS = {
  '0-1': [[0, 0]],
  '1-0': [[0, 0]],
  '1-2': [[0, 0]],
  '2-1': [[0, 0]],
  '2-3': [[0, 0]],
  '3-2': [[0, 0]],
  '3-0': [[0, 0]],
  '0-3': [[0, 0]],
};

function getKickTable(type) {
  if (type === 'I') {
    return I_KICKS;
  }
  if (type === 'O') {
    return O_KICKS;
  }
  return JLSTZ_KICKS;
}

export function getRotationKicks(type, fromRotation, toRotation) {
  const table = getKickTable(type);
  return table[`${fromRotation}-${toRotation}`] || [[0, 0]];
}

export function rotateIndex(current, direction) {
  if (direction === 'cw') {
    return (current + 1) % 4;
  }
  return (current + 3) % 4;
}
