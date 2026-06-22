import { MAX_HIGH_SCORES } from './config.js';

const STORAGE_KEY = 'classics-tetris-highscores';
const LAST_PLAYER_NAME_KEY = 'classics-tetris-last-player-name';

export function loadHighScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHighScores(scores) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
}

export function loadLastPlayerName() {
  return localStorage.getItem(LAST_PLAYER_NAME_KEY) || 'Player';
}

export function saveLastPlayerName(name) {
  localStorage.setItem(LAST_PLAYER_NAME_KEY, name);
}

export function getBestScoreForName(name) {
  const normalizedName = name.trim().toLowerCase();
  return loadHighScores()
    .filter((entry) => entry.name.trim().toLowerCase() === normalizedName)
    .reduce((best, entry) => Math.max(best, entry.score), 0);
}

export function qualifiesForHighScore(score, scores = loadHighScores()) {
  if (scores.length < MAX_HIGH_SCORES) {
    return true;
  }
  const lowest = scores[MAX_HIGH_SCORES - 1]?.score ?? 0;
  return score > lowest;
}

export function addHighScore(entry) {
  const scores = loadHighScores();
  scores.push({
    id: entry.id,
    name: entry.name,
    score: entry.score,
    lines: entry.lines,
    level: entry.level,
    date: entry.date || new Date().toISOString(),
  });
  scores.sort((a, b) => b.score - a.score);
  const trimmed = scores.slice(0, MAX_HIGH_SCORES);
  saveHighScores(trimmed);
  return trimmed;
}

export function clearHighScores() {
  saveHighScores([]);
  return [];
}

export function bindClearHighScoresButton(onClear) {
  const button = document.getElementById('clear-high-scores-btn');
  if (!button) {
    return;
  }

  button.addEventListener('click', () => {
    if (!window.confirm('Clear all high scores?')) {
      return;
    }

    const scores = clearHighScores();
    renderHighScores(scores);
    onClear?.();
  });
}

export function renderHighScores(scores, highlightIndex = -1, newIndex = -1) {
  const list = document.getElementById('high-scores-list');
  list.innerHTML = '';

  if (scores.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = 'No scores yet';
    list.appendChild(empty);
    return;
  }

  scores.forEach((entry, index) => {
    const item = document.createElement('li');
    if (index === highlightIndex) {
      item.classList.add('new-entry');
    }
    item.append(`${entry.name} - ${entry.score.toLocaleString()} `);
    if (index === newIndex) {
      const newMarker = document.createElement('span');
      newMarker.className = 'new-score-marker';
      newMarker.textContent = '(New)';
      item.appendChild(newMarker);
      item.append(' ');
    }
    item.append(`(Lvl ${entry.level})`);
    list.appendChild(item);
  });
}

export function findNewScoreIndex(scores, score, id) {
  if (id) {
    const idIndex = scores.findIndex((entry) => entry.id === id);
    if (idIndex !== -1) {
      return idIndex;
    }
  }
  return scores.findIndex((entry) => entry.score === score);
}
