import { detectTSpin } from './tspin.js';

const DIFFICULT_CLEARS = new Set([
  'tetris',
  'tspinSingle',
  'tspinDouble',
  'tspinTriple',
  'miniTspinSingle',
  'miniTspinDouble',
]);

export function createScoreState(startLevel = 1) {
  return {
    score: 0,
    level: startLevel,
    lines: 0,
    combo: -1,
    backToBack: false,
    lastClearWasDifficult: false,
  };
}

function baseLineScore(clearType, level) {
  const table = {
    single: 100,
    double: 300,
    triple: 500,
    tetris: 800,
    miniTspinNone: 100,
    tspinNone: 400,
    miniTspinSingle: 200,
    tspinSingle: 800,
    miniTspinDouble: 400,
    tspinDouble: 1200,
    tspinTriple: 1600,
  };
  return (table[clearType] || 0) * level;
}

function lineClearType(lineCount) {
  if (lineCount === 1) return 'single';
  if (lineCount === 2) return 'double';
  if (lineCount === 3) return 'triple';
  if (lineCount === 4) return 'tetris';
  return null;
}

export function consecutiveLineScores(lineCount, level) {
  return Array.from({ length: lineCount }, (_, index) => 100 * (index + 1) * level);
}

export function scoreLineClear(state, lineCount, tSpinResult, options = {}) {
  const { deferScore = false } = options;
  let clearType = lineClearType(lineCount);

  if (tSpinResult.isTSpin) {
    if (lineCount === 0) {
      clearType = tSpinResult.isMini ? 'miniTspinNone' : 'tspinNone';
    } else if (lineCount === 1) {
      clearType = tSpinResult.isMini ? 'miniTspinSingle' : 'tspinSingle';
    } else if (lineCount === 2) {
      clearType = tSpinResult.isMini ? 'miniTspinDouble' : 'tspinDouble';
    } else if (lineCount === 3) {
      clearType = 'tspinTriple';
    }
  }

  if (!clearType) {
    return { points: 0, perLineScores: null };
  }

  let perLineScores = null;
  let points;

  if (lineCount > 1 && !tSpinResult.isTSpin) {
    perLineScores = consecutiveLineScores(lineCount, state.level);
    points = perLineScores.reduce((sum, value) => sum + value, 0);
  } else {
    points = baseLineScore(clearType, state.level);
  }

  if (DIFFICULT_CLEARS.has(clearType) && state.backToBack) {
    points = Math.floor(points * 1.5);
  }

  if (lineCount > 0) {
    state.combo += 1;
    if (state.combo > 0) {
      points += 50 * state.combo * state.level;
    }
  } else if (clearType !== 'miniTspinNone' && clearType !== 'tspinNone') {
    state.combo = -1;
  }

  if (lineCount > 0 || clearType === 'miniTspinNone' || clearType === 'tspinNone') {
    if (DIFFICULT_CLEARS.has(clearType)) {
      state.backToBack = true;
      state.lastClearWasDifficult = true;
    } else if (lineCount > 0) {
      state.backToBack = false;
      state.lastClearWasDifficult = false;
    }
  }

  if (perLineScores) {
    const baseTotal = perLineScores.reduce((sum, value) => sum + value, 0);
    const bonus = points - baseTotal;
    if (bonus > 0) {
      perLineScores = [...perLineScores];
      perLineScores[perLineScores.length - 1] += bonus;
    }
  } else if (lineCount > 0) {
    perLineScores = [points];
  }

  if (!deferScore) {
    state.score += points;
  }

  return { points, perLineScores };
}

export function applyLineCount(state, clearedLines, linesPerLevel) {
  state.lines += clearedLines;
  const startLevel = state.startLevel || 1;
  const newLevel = startLevel + Math.floor(state.lines / linesPerLevel);
  const leveledUp = newLevel > state.level;
  state.level = newLevel;
  return leveledUp;
}

export function evaluateLock(board, piece, lastMoveWasRotation) {
  const tSpinResult = detectTSpin(board, piece, lastMoveWasRotation);
  return tSpinResult;
}
