import { LINES_PER_LEVEL, TIMING } from './config.js';

let previousScore = 0;
let scoreAnimationTimeout = null;
let levelUpTimeout = null;

export function updateHud({ score, level, lines = 0 }) {
  const scoreEl = document.getElementById('score');
  scoreEl.textContent = String(score);
  if (score > previousScore) {
    scoreEl.classList.remove('score-rainbow');
    if (scoreAnimationTimeout !== null) {
      window.clearTimeout(scoreAnimationTimeout);
    }
    // Force animation restart when score changes repeatedly in quick succession.
    void scoreEl.offsetWidth;
    scoreEl.classList.add('score-rainbow');
    scoreAnimationTimeout = window.setTimeout(() => {
      scoreEl.classList.remove('score-rainbow');
      scoreAnimationTimeout = null;
    }, 720);
  } else if (score < previousScore) {
    scoreEl.classList.remove('score-rainbow');
    if (scoreAnimationTimeout !== null) {
      window.clearTimeout(scoreAnimationTimeout);
      scoreAnimationTimeout = null;
    }
  }
  previousScore = score;

  document.getElementById('level').textContent = String(level);

  const progressFill = document.getElementById('level-progress-fill');
  if (progressFill) {
    const progress = (lines % LINES_PER_LEVEL) / LINES_PER_LEVEL;
    progressFill.style.width = `${progress * 100}%`;
  }
}

export function showLevelUp(level) {
  const popup = document.getElementById('level-up-popup');
  const valueEl = document.getElementById('level-up-value');
  if (!popup || !valueEl) {
    return;
  }

  if (levelUpTimeout !== null) {
    window.clearTimeout(levelUpTimeout);
    levelUpTimeout = null;
  }

  valueEl.textContent = String(level);
  popup.classList.remove('hidden', 'visible');
  void popup.offsetWidth;
  popup.classList.add('visible');

  levelUpTimeout = window.setTimeout(() => {
    popup.classList.remove('visible');
    popup.classList.add('hidden');
    levelUpTimeout = null;
  }, TIMING.LEVEL_UP_POPUP_MS);
}

export function showOverlay({
  title,
  message,
  showNameEntry,
  buttonText,
  playerName,
}) {
  const overlay = document.getElementById('overlay');
  const titleEl = document.getElementById('overlay-title');
  const messageEl = document.getElementById('overlay-message');
  const nameEntry = document.getElementById('name-entry');
  const overlayBtn = document.getElementById('overlay-btn');
  const playerNameInput = document.getElementById('player-name');

  overlay.classList.remove('hidden');
  titleEl.textContent = title;
  messageEl.textContent = message;
  nameEntry.classList.toggle('hidden', !showNameEntry);
  if (showNameEntry && playerNameInput) {
    playerNameInput.value = playerName || 'Player';
    playerNameInput.select();
  }
  overlayBtn.textContent = buttonText;
  overlayBtn.classList.remove('hidden');
}

export function hideOverlay() {
  document.getElementById('overlay').classList.add('hidden');
}

export function getPlayerName() {
  const input = document.getElementById('player-name');
  const name = input.value.trim();
  return name.length > 0 ? name.slice(0, 12) : 'Player';
}

export function bindOverlayButton(handler) {
  document.getElementById('overlay-btn').addEventListener('click', handler);
}

export function bindOverlayEnter(handler) {
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const overlay = document.getElementById('overlay');
      if (!overlay.classList.contains('hidden')) {
        handler(event);
      }
    }
  });
}
