import { GRID, LINES_PER_LEVEL, TIMING } from './config.js';
import { isAudioEnabled } from './audio.js';
import {
  createBoard,
  collides,
  getGhostY,
  isAboveVisible,
  isBlockedAboveBuffer,
  findCompletedLines,
  clearLines,
} from './board.js';
import { getCells } from './tetrominoes.js';
import { getRotationKicks, rotateIndex } from './srs.js';
import {
  createPieceManager,
  spawnNext,
  holdPiece,
  resetPieceManager,
} from './piece.js';
import {
  createGravityState,
  updateGravity,
  resetLockDelay,
  shouldLock,
  startAre,
  setLevelGravity,
  updateDas,
} from './gravity.js';
import {
  createScoreState,
  scoreLineClear,
  applyLineCount,
  evaluateLock,
} from './scoring.js';

export const STATES = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  LINE_CLEAR: 'lineClear',
  COLLAPSE: 'collapse',
  GAME_OVER: 'gameOver',
  HIGH_SCORE: 'highScore',
};

export function createGame(renderer, input, hud, highScores) {
  let state = STATES.MENU;
  let board = createBoard();
  let pieces = createPieceManager();
  let gravity = createGravityState(1);
  let scoreState = createScoreState(1);
  let lastMoveWasRotation = false;
  let highlightScoreIndex = -1;
  let lineClearRows = [];
  let lineClearQueue = [];
  let lineClearColumnQueue = [];
  let lineClearActiveColumns = [];
  let lineClearTimer = 0;
  let collapseTimer = 0;
  let lineClearLabel = '';
  let lineClearScoreQueue = [];
  let lineClearCount = 0;
  let lineClearStartDelayTimer = 0;
  let lineClearStartDelayActive = false;
  let lineClearPitchStep = 0;
  let lineClearPitchBaseStep = 0;
  let scorePopupText = '';
  let scorePopupLabel = '';
  let scorePopupTimer = 0;
  let scorePopupRow = null;
  let dropTrails = [];
  let landFlashActive = false;
  let landFlashTimer = 0;
  let audioContext = null;
  const lastPlayerNameKey = 'classics-tetris-last-player-name';

  function resetHorizontalShift() {
    gravity.dasTimer = 0;
    gravity.dasDirection = 0;
    gravity.arrTimer = 0;
  }

  function loadLastPlayerName() {
    if (typeof highScores.loadLastPlayerName === 'function') {
      return highScores.loadLastPlayerName();
    }
    return localStorage.getItem(lastPlayerNameKey) || 'Player';
  }

  function saveLastPlayerName(name) {
    if (typeof highScores.saveLastPlayerName === 'function') {
      highScores.saveLastPlayerName(name);
      return;
    }
    localStorage.setItem(lastPlayerNameKey, name);
  }

  function getBestScoreForName(name) {
    if (typeof highScores.getBestScoreForName === 'function') {
      return highScores.getBestScoreForName(name);
    }

    const normalizedName = name.trim().toLowerCase();
    return highScores.loadHighScores()
      .filter((entry) => entry.name.trim().toLowerCase() === normalizedName)
      .reduce((best, entry) => Math.max(best, entry.score), 0);
  }

  function findSavedScoreIndex(scores, score, id) {
    if (typeof highScores.findNewScoreIndex === 'function') {
      return highScores.findNewScoreIndex(scores, score, id);
    }

    const idIndex = scores.findIndex((entry) => entry.id === id);
    return idIndex !== -1
      ? idIndex
      : scores.findIndex((entry) => entry.score === score);
  }

  let levelUpTimeout = null;
  let levelUpCelebrationActive = false;
  let levelUpCelebrationTimer = 0;
  let pendingLevelUpLevel = null;
  let timeScale = 1;
  let deferredLineScoring = false;

  function updateHudDisplay() {
    hud.updateHud(scoreState);

    const progressFill = document.getElementById('level-progress-fill');
    if (progressFill) {
      const lines = scoreState.lines ?? 0;
      const progress = (lines % LINES_PER_LEVEL) / LINES_PER_LEVEL;
      progressFill.style.width = `${progress * 100}%`;
    }
  }

  function showLevelUpCelebration(level) {
    const popup = document.getElementById('level-up-popup');
    const valueEl = document.getElementById('level-up-value');
    if (!popup || !valueEl) {
      return;
    }

    if (levelUpTimeout !== null) {
      window.clearTimeout(levelUpTimeout);
      levelUpTimeout = null;
    }

    levelUpCelebrationActive = true;
    levelUpCelebrationTimer = TIMING.LEVEL_UP_SLOW_MS;
    timeScale = TIMING.LEVEL_UP_TIME_SCALE;

    valueEl.textContent = String(level);
    popup.classList.remove('hidden', 'visible');
    void popup.offsetWidth;
    popup.classList.add('visible');

    playTone({
      frequency: 440,
      endFrequency: 880,
      duration: 0.18,
      volume: 0.12,
      type: 'triangle',
    });

    levelUpTimeout = window.setTimeout(() => {
      popup.classList.remove('visible');
      popup.classList.add('hidden');
      levelUpTimeout = null;
    }, TIMING.LEVEL_UP_POPUP_MS);
  }

  function updateLevelUpCelebration(realDt) {
    if (!levelUpCelebrationActive) {
      return false;
    }

    levelUpCelebrationTimer -= realDt;
    if (levelUpCelebrationTimer <= 0) {
      levelUpCelebrationActive = false;
      timeScale = 1;
    }

    return levelUpCelebrationActive;
  }

  function getScaledDt(dt) {
    return dt * timeScale;
  }

  function canPlaceCells(pieceCells) {
    return !collides(board, pieceCells);
  }

  function getAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    audioContext ??= new AudioContextClass();
    return audioContext;
  }

  function playTone({
    frequency,
    endFrequency = frequency,
    duration = 0.1,
    volume = 0.1,
    type = 'sine',
  }) {
    if (!isAudioEnabled()) {
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration * 0.65);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  }

  function playLineClearPing(step = 0) {
    if (!isAudioEnabled()) {
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const frequency = 360 * (1.075 ** step);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.18, now + 0.05);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }

  function playMoveSound() {
    playSoftDropSound();
  }

  function playSoftDropSound() {
    playTone({
      frequency: 260,
      endFrequency: 190,
      duration: 0.055,
      volume: 0.055,
      type: 'sine',
    });
  }

  function playHardDropSound() {
    playTone({
      frequency: 520,
      endFrequency: 380,
      duration: 0.075,
      volume: 0.08,
      type: 'sine',
    });
  }

  function playLockSound() {
    playTone({
      frequency: 390,
      endFrequency: 285,
      duration: 0.07,
      volume: 0.075,
      type: 'sine',
    });
  }

  function playGravityDropSound() {
    playTone({
      frequency: 260,
      endFrequency: 190,
      duration: 0.055,
      volume: 0.0385,
      type: 'sine',
    });
  }

  function playLineCollapseSound() {
    playSoftDropSound();
  }

  function playGameOverSound() {
    playTone({
      frequency: 220,
      endFrequency: 55,
      duration: 0.42,
      volume: 0.2,
      type: 'sawtooth',
    });
  }

  function triggerLandFlash() {
    landFlashActive = true;
    landFlashTimer = 0;
  }

  function clearLandFlash() {
    landFlashActive = false;
    landFlashTimer = 0;
  }

  function updateLandFlash(dt) {
    if (!landFlashActive) {
      return;
    }

    landFlashTimer += dt;
    if (landFlashTimer >= TIMING.LOCK_FLASH_MS) {
      clearLandFlash();
    }
  }

  function normalizeBoardCells() {
    for (let y = 0; y < board.cells.length; y += 1) {
      for (let x = 0; x < board.cells[y].length; x += 1) {
        if (board.cells[y][x] === undefined) {
          board.cells[y][x] = null;
        }
      }
    }
  }

  function resetGame() {
    board = createBoard();
    resetPieceManager(pieces);
    scoreState = createScoreState(1);
    scoreState.startLevel = 1;
    gravity = createGravityState(1);
    lastMoveWasRotation = false;
    highlightScoreIndex = -1;
    lineClearRows = [];
    lineClearQueue = [];
    lineClearColumnQueue = [];
    lineClearActiveColumns = [];
    lineClearTimer = 0;
    collapseTimer = 0;
    lineClearLabel = '';
    lineClearScoreQueue = [];
    lineClearCount = 0;
    lineClearStartDelayTimer = 0;
    lineClearStartDelayActive = false;
    lineClearPitchStep = 0;
    lineClearPitchBaseStep = 0;
    scorePopupText = '';
    scorePopupLabel = '';
    scorePopupTimer = 0;
    scorePopupRow = null;
    dropTrails = [];
    landFlashActive = false;
    landFlashTimer = 0;
    levelUpCelebrationActive = false;
    levelUpCelebrationTimer = 0;
    pendingLevelUpLevel = null;
    timeScale = 1;
    deferredLineScoring = false;
  }

  function activeCells(piece = pieces.active) {
    return piece ? getCells(piece) : [];
  }

  function isOnGround() {
    if (!pieces.active) {
      return false;
    }
    const cells = activeCells();
    const shifted = cells.map(({ x, y }) => ({ x, y: y + 1 }));
    return collides(board, shifted);
  }

  function addDropTrail(piece) {
    dropTrails.push({
      type: piece.type,
      cells: getCells(piece),
      age: 0,
    });
  }

  function updateDropTrails(dt) {
    if (dropTrails.length === 0) {
      return;
    }

    for (const trail of dropTrails) {
      trail.age += dt;
    }
    dropTrails = dropTrails.filter((trail) => trail.age < TIMING.DROP_TRAIL_MS);
  }

  function tryMove(dx, dy, options = {}) {
    if (!pieces.active || gravity.inAre) {
      return false;
    }

    const testPiece = {
      ...pieces.active,
      x: pieces.active.x + dx,
      y: pieces.active.y + dy,
    };
    if (!canPlaceCells(getCells(testPiece))) {
      return false;
    }

    if (options.trail && dy > 0) {
      addDropTrail(pieces.active);
    }

    pieces.active.x = testPiece.x;
    pieces.active.y = testPiece.y;
    lastMoveWasRotation = false;

    if (dy === 0) {
      resetLockDelay(gravity);
    }
    return true;
  }

  function tryRotate(direction) {
    if (!pieces.active || gravity.inAre) {
      return false;
    }

    const piece = pieces.active;
    const fromRotation = piece.rotation;
    const toRotation = rotateIndex(fromRotation, direction);
    const kicks = getRotationKicks(piece.type, fromRotation, toRotation);

    for (const [dx, dy] of kicks) {
      const testPiece = {
        ...piece,
        rotation: toRotation,
        x: piece.x + dx,
        y: piece.y + dy,
      };
      if (canPlaceCells(getCells(testPiece))) {
        piece.rotation = toRotation;
        piece.x = testPiece.x;
        piece.y = testPiece.y;
        lastMoveWasRotation = true;
        resetLockDelay(gravity);
        return true;
      }
    }
    return false;
  }

  function hardDrop() {
    if (!pieces.active || gravity.inAre) {
      return;
    }

    playHardDropSound();
    while (tryMove(0, 1, { trail: true })) {}
  }

  function lockActivePiece() {
    if (!pieces.active) {
      return;
    }

    playLockSound();
    const piece = pieces.active;
    const cells = getCells(piece);
    const tSpinResult = evaluateLock(board, piece, lastMoveWasRotation);

    for (const { x, y } of cells) {
      if (y >= 0 && y < board.cells.length && x >= 0 && x < GRID.COLS) {
        board.cells[y][x] = piece.type;
      }
    }
    normalizeBoardCells();
    clearLandFlash();

    const completed = findCompletedLines(board);
    const cleared = completed.length;

    if (cleared > 0) {
      const { points, perLineScores, deferScore } = resolveLineClearScore(cleared, tSpinResult);
      const leveledUp = applyLineCount(scoreState, cleared, LINES_PER_LEVEL);
      if (leveledUp) {
        setLevelGravity(gravity, scoreState.level);
        pendingLevelUpLevel = scoreState.level;
      }
      startLineClear(completed, points, perLineScores, deferScore);
    } else if (tSpinResult.isTSpin) {
      finishLock(cells);
    } else {
      scoreState.combo = -1;
      finishLock(cells);
    }

    updateHudDisplay();
  }

  function finishLock(lockedCells) {
    if (isBlockedAboveBuffer(board)) {
      endGame();
      return;
    }

    if (isAboveVisible(board, lockedCells)) {
      endGame();
      return;
    }

    spawnNextPiece();
  }

  function startLineClear(rows, points, perLineScores = null, deferScore = false) {
    state = STATES.LINE_CLEAR;
    clearLandFlash();
    pieces.active = null;
    lineClearQueue = [...rows].sort((a, b) => b - a);
    lineClearScoreQueue = perLineScores?.length ? [...perLineScores] : splitPointsAcrossRows(points, rows.length);
    deferredLineScoring = deferScore;
    collapseTimer = 0;
    lineClearLabel = '';
    lineClearCount = 0;
    lineClearPitchBaseStep = 0;
    lineClearRows = [];
    lineClearColumnQueue = [];
    lineClearActiveColumns = [];
    lineClearTimer = 0;
    lineClearStartDelayTimer = 0;
    lineClearStartDelayActive = true;
    scorePopupText = '';
    scorePopupTimer = 0;
    resetHorizontalShift();
  }

  function beginNextLineClearRow() {
    const row = lineClearQueue.shift();

    if (row === undefined) {
      lineClearRows = [];
      lineClearColumnQueue = [];
      lineClearActiveColumns = [];
      collapseTimer = 0;
      state = STATES.COLLAPSE;
      return;
    }

    state = STATES.LINE_CLEAR;
    lineClearCount += 1;
    lineClearLabel = `x${lineClearCount}`;
    lineClearRows = [row];
    lineClearColumnQueue = getCenterOutColumnGroups();
    lineClearActiveColumns = lineClearColumnQueue.shift() || [];
    lineClearPitchBaseStep = (lineClearCount - 1) * 2;
    lineClearPitchStep = 0;
    lineClearTimer = 0;
  }

  function splitPointsAcrossRows(points, rowCount) {
    if (rowCount <= 0 || !Number.isFinite(points)) {
      return [];
    }

    const base = Math.floor(points / rowCount);
    const remainder = points - base * rowCount;
    return Array.from({ length: rowCount }, (_, index) => (
      index === rowCount - 1 ? base + remainder : base
    ));
  }

  function buildConsecutiveLineScores(lineCount, level) {
    return Array.from({ length: lineCount }, (_, index) => 100 * (index + 1) * level);
  }

  function resolveLineClearScore(cleared, tSpinResult) {
    const levelAtClear = scoreState.level;
    const deferScore = cleared > 1 && !tSpinResult.isTSpin;
    const scoreBefore = scoreState.score;
    const result = scoreLineClear(scoreState, cleared, tSpinResult, { deferScore });

    const points = typeof result === 'number'
      ? result
      : (Number.isFinite(result?.points) ? result.points : 0);

    if (deferScore && scoreState.score - scoreBefore === points) {
      scoreState.score -= points;
    }

    let perLineScores;
    if (deferScore) {
      perLineScores = buildConsecutiveLineScores(cleared, levelAtClear);
      const baseTotal = perLineScores.reduce((sum, value) => sum + value, 0);
      const bonus = points - baseTotal;
      if (bonus > 0) {
        perLineScores = [...perLineScores];
        perLineScores[perLineScores.length - 1] += bonus;
      }
    } else if (Array.isArray(result?.perLineScores) && result.perLineScores.length === cleared) {
      perLineScores = result.perLineScores;
    } else {
      perLineScores = splitPointsAcrossRows(points, cleared);
    }

    return { points, perLineScores, deferScore };
  }

  function showNextLineScorePopup(row = lineClearRows[0]) {
    const points = lineClearScoreQueue.shift();
    if (!Number.isFinite(points)) {
      return;
    }

    if (deferredLineScoring) {
      scoreState.score += points;
      updateHudDisplay();
    }

    scorePopupText = '';
    scorePopupLabel = '';
    scorePopupText = `+${points}`;
    scorePopupLabel = `x${lineClearCount}`;
    scorePopupTimer = 0;
    scorePopupRow = row ?? null;
  }

  function updateLineClear(dt) {
    if (lineClearStartDelayActive) {
      lineClearStartDelayTimer += dt;
      updateScorePopup(dt);

      if (lineClearStartDelayTimer < TIMING.LINE_CLEAR_START_DELAY_MS) {
        return;
      }

      lineClearStartDelayActive = false;
      beginNextLineClearRow();
      return;
    }

    lineClearTimer += dt;
    updateScorePopup(dt);

    if (lineClearTimer < TIMING.LINE_CLEAR_FLASH_MS + TIMING.LINE_CLEAR_REMOVE_DELAY_MS) {
      return;
    }

    removeActiveLineClearBlocks();
    normalizeBoardCells();

    if (lineClearColumnQueue.length > 0) {
      lineClearActiveColumns = lineClearColumnQueue.shift();
      lineClearTimer = 0;
      return;
    }

    showNextLineScorePopup(lineClearRows[0]);
    collapseTimer = 0;
    state = STATES.COLLAPSE;
  }

  function removeActiveLineClearBlocks() {
    const row = lineClearRows[0];
    if (row === undefined) {
      return;
    }

    for (const col of lineClearActiveColumns) {
      if (board.cells[row]?.[col] !== undefined) {
        if (board.cells[row][col] !== null) {
          playLineClearPing(lineClearPitchBaseStep + lineClearPitchStep);
          lineClearPitchStep += 1;
        }
        board.cells[row][col] = null;
      }
    }
  }

  function updateCollapse(dt) {
    collapseTimer += dt;
    updateScorePopup(dt);

    if (collapseTimer < TIMING.LINE_CLEAR_ROW_COLLAPSE_DELAY_MS) {
      return;
    }

    if (lineClearRows.length > 0) {
      const clearedRow = lineClearRows[0];
      clearLines(board, lineClearRows);
      playLineCollapseSound();
      normalizeBoardCells();
      lineClearQueue = lineClearQueue.map((row) => (row < clearedRow ? row + 1 : row));

      if (lineClearQueue.length > 0) {
        beginNextLineClearRow();
        return;
      }

      lineClearRows = [];
    }

    if (isBlockedAboveBuffer(board)) {
      endGame();
      return;
    }

    if (pendingLevelUpLevel !== null) {
      showLevelUpCelebration(pendingLevelUpLevel);
      pendingLevelUpLevel = null;
      return;
    }

    if (levelUpCelebrationActive) {
      return;
    }

    spawnNextPiece();
  }

  function updateLockFlash(dt) {
    updateLandFlash(dt);
  }

  function updateScorePopup(dt) {
    if (!scorePopupText) {
      return;
    }

    scorePopupTimer += dt;
    if (scorePopupTimer >= TIMING.SCORE_POPUP_MS) {
      scorePopupText = '';
      scorePopupLabel = '';
      lineClearLabel = '';
      scorePopupRow = null;
    }
  }

  function spawnNextPiece() {
    const spawned = spawnNext(pieces);
    const cells = getCells(spawned);
    if (!canPlaceCells(cells)) {
      endGame();
      return;
    }
    startAre(gravity);
    lastMoveWasRotation = false;
    state = STATES.PLAYING;
  }

  function endGame() {
    state = STATES.GAME_OVER;
    playGameOverSound();
    if (highScores.qualifiesForHighScore(scoreState.score)) {
      state = STATES.HIGH_SCORE;
      hud.showOverlay({
        title: 'New High Score!',
        message: `Score: ${scoreState.score.toLocaleString()}`,
        showNameEntry: true,
        buttonText: 'Save Score',
        playerName: loadLastPlayerName(),
      });
    } else {
      hud.showOverlay({
        title: 'Game Over',
        message: `Score: ${scoreState.score.toLocaleString()}`,
        showNameEntry: false,
        buttonText: 'Play Again',
      });
    }
  }

  function start() {
    resetGame();
    state = STATES.PLAYING;
    hud.hideOverlay();
    spawnNextPiece();
    updateHudDisplay();
  }

  function saveHighScore(name) {
    const isNewBest = scoreState.score > getBestScoreForName(name);
    const scoreId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    saveLastPlayerName(name);
    const scores = highScores.addHighScore({
      id: scoreId,
      name,
      score: scoreState.score,
      lines: scoreState.lines,
      level: scoreState.level,
    });
    highlightScoreIndex = findSavedScoreIndex(scores, scoreState.score, scoreId);
    highScores.renderHighScores(
      scores,
      highlightScoreIndex,
      isNewBest ? highlightScoreIndex : -1,
    );
    state = STATES.MENU;
    hud.showOverlay({
      title: 'Score Saved',
      message: 'Press Enter or click to play again',
      showNameEntry: false,
      buttonText: 'Play',
    });
  }

  function pauseGame() {
    if (state !== STATES.PLAYING) {
      return;
    }

    state = STATES.PAUSED;
    resetHorizontalShift();
    hud.showOverlay({
      title: 'Paused',
      message: 'Press P to resume',
      showNameEntry: false,
      buttonText: 'Resume',
    });
  }

  function resumeGame() {
    if (state !== STATES.PAUSED) {
      return;
    }

    state = STATES.PLAYING;
    hud.hideOverlay();
    resetHorizontalShift();
  }

  function processInput(pressed) {
    if (state !== STATES.PLAYING) {
      return;
    }

    for (const action of pressed) {
      switch (action) {
        case 'left':
          if (tryMove(-1, 0)) {
            playMoveSound();
          }
          resetHorizontalShift(gravity);
          break;
        case 'right':
          if (tryMove(1, 0)) {
            playMoveSound();
          }
          resetHorizontalShift(gravity);
          break;
        case 'rotateCW':
          if (tryRotate('cw')) {
            playMoveSound();
          }
          break;
        case 'rotateCCW':
          if (tryRotate('ccw')) {
            playMoveSound();
          }
          break;
        case 'hold':
          if (!pieces.holdUsed && pieces.active) {
            holdPiece(pieces);
            lastMoveWasRotation = false;
            startAre(gravity);
            resetHorizontalShift(gravity);
            const cells = activeCells();
            if (collides(board, cells)) {
              endGame();
            }
          }
          break;
        case 'hardDrop':
          hardDrop();
          break;
        default:
          break;
      }
    }

    gravity.softDrop = input.isHeld('softDrop');
    if (pressed.includes('softDrop')) {
      if (tryMove(0, 1, { trail: true })) {
        playSoftDropSound();
      }
    }
  }

  function update(dt) {
    const pressed = input.consumePressed();

    if (pressed.includes('pause')) {
      if (state === STATES.PAUSED) {
        resumeGame();
      } else if (state === STATES.PLAYING) {
        pauseGame();
      }
      render();
      return;
    }

    if (state === STATES.PAUSED) {
      updateLockFlash(dt);
      render();
      return;
    }

    if (state === STATES.PLAYING) {
      updateScorePopup(getScaledDt(dt));
      updateLockFlash(getScaledDt(dt));
    }

    if (state === STATES.LINE_CLEAR) {
      if (updateLevelUpCelebration(dt)) {
        updateDropTrails(getScaledDt(dt));
        updateScorePopup(getScaledDt(dt));
        updateLockFlash(getScaledDt(dt));
        render();
        return;
      }

      updateDropTrails(getScaledDt(dt));
      updateLockFlash(getScaledDt(dt));
      updateLineClear(getScaledDt(dt));
      render();
      return;
    }

    if (state === STATES.COLLAPSE) {
      if (updateLevelUpCelebration(dt)) {
        updateDropTrails(getScaledDt(dt));
        updateScorePopup(getScaledDt(dt));
        updateLockFlash(getScaledDt(dt));
        render();
        return;
      }

      updateDropTrails(getScaledDt(dt));
      updateLockFlash(getScaledDt(dt));
      updateCollapse(getScaledDt(dt));
      render();
      return;
    }

    if (state !== STATES.PLAYING) {
      return;
    }

    updateDropTrails(getScaledDt(dt));
    processInput(pressed);

    const wasLocking = gravity.locking;

    updateDas(gravity, getScaledDt(dt), input.isHeld('left') ? -1 : input.isHeld('right') ? 1 : 0, (dir) => {
      if (tryMove(dir, 0)) {
        playMoveSound();
      }
    });

    updateGravity(gravity, getScaledDt(dt), (distance) => {
      if (tryMove(0, distance, { trail: gravity.softDrop })) {
        if (gravity.softDrop) {
          playSoftDropSound();
        } else {
          playGravityDropSound();
        }
      }
    }, isOnGround);

    if (gravity.locking && !wasLocking && pieces.active) {
      triggerLandFlash();
    } else if (!gravity.locking && wasLocking) {
      clearLandFlash();
    }

    if (shouldLock(gravity)) {
      lockActivePiece();
    }

    render();
  }

  function render() {
    const ghostY = pieces.active
      ? getGhostY(board, activeCells(), pieces.active.y)
      : null;
    const clearFlashOn = state === STATES.LINE_CLEAR
      && lineClearTimer < TIMING.LINE_CLEAR_FLASH_MS
      && Math.floor(lineClearTimer / TIMING.LINE_CLEAR_FLASH_INTERVAL_MS) % 2 === 0;
    const shakeOffset = getShakeOffset();
    const scorePopupProgress = scorePopupText
      ? Math.min(1, scorePopupTimer / TIMING.SCORE_POPUP_MS)
      : 1;
    const landFlashProgress = landFlashActive && pieces.active
      ? Math.min(1, landFlashTimer / TIMING.LOCK_FLASH_MS)
      : 0;
    const landFlashCells = landFlashActive && pieces.active
      ? activeCells().map(({ x, y }) => ({ x, y, type: pieces.active.type }))
      : [];

    renderer.renderFrame({
      board,
      active: pieces.active,
      ghostY,
      hold: pieces.hold,
      nextPiece: pieces.nextQueue[0] ?? null,
      dropTrails,
      clearingRows: lineClearRows,
      clearFlashOn,
      clearColumns: lineClearActiveColumns,
      clearLabel: scorePopupText ? scorePopupLabel : '',
      scorePopupText,
      scorePopupProgress,
      scorePopupRow,
      shakeOffset,
      lockFlashCells: landFlashCells,
      lockFlashProgress: landFlashProgress,
    });
  }

  function getCenterOutColumnGroups() {
    const centerLeft = Math.floor((GRID.COLS - 1) / 2);
    const centerRight = Math.ceil((GRID.COLS - 1) / 2);
    const groups = [];

    for (let step = 0; step < GRID.COLS; step += 1) {
      const left = centerLeft - step;
      const right = centerRight + step;
      const group = [];

      if (left >= 0) {
        group.push(left);
      }
      if (right < GRID.COLS && right !== left) {
        group.push(right);
      }

      if (group.length > 0) {
        groups.push(group);
      }
    }

    return groups;
  }

  function getShakeOffset() {
    if (state !== STATES.LINE_CLEAR && state !== STATES.COLLAPSE) {
      return { x: 0, y: 0 };
    }

    const duration = state === STATES.LINE_CLEAR
      ? TIMING.LINE_CLEAR_FLASH_MS
      : TIMING.LINE_CLEAR_ROW_COLLAPSE_DELAY_MS;
    const timer = state === STATES.LINE_CLEAR ? lineClearTimer : collapseTimer;
    const progress = Math.min(1, timer / duration);
    const amplitude = 4 * (1 - progress);

    return {
      x: Math.sin(timer * 0.085) * amplitude,
      y: Math.cos(timer * 0.11) * amplitude * 0.55,
    };
  }

  function showMenu() {
    state = STATES.MENU;
    highScores.renderHighScores(highScores.loadHighScores(), highlightScoreIndex);
    hud.showOverlay({
      title: 'Classic Tetris',
      message: 'Press Enter or click to start',
      showNameEntry: false,
      buttonText: 'Play',
    });
    render();
  }

  return {
    STATES,
    get state() {
      return state;
    },
    start,
    resume: resumeGame,
    update,
    render,
    showMenu,
    saveHighScore,
    getScoreState: () => scoreState,
  };
}
