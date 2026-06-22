const STORAGE_KEY = 'classics-tetris-audio-enabled';
const MUSIC_PATH = 'audio/music.mp3';
const MUSIC_VOLUME = 0.35;

let enabled = localStorage.getItem(STORAGE_KEY) !== 'false';
let music = null;
let musicStarted = false;

function getMusic() {
  if (!music) {
    music = new Audio(MUSIC_PATH);
    music.loop = true;
    music.volume = MUSIC_VOLUME;
    music.preload = 'auto';
  }
  return music;
}

function updateAudioButton() {
  const button = document.getElementById('audio-toggle-btn');
  if (!button) {
    return;
  }

  button.textContent = enabled ? 'Audio: On' : 'Audio: Off';
  button.setAttribute('aria-pressed', String(!enabled));
}

function syncMusic() {
  if (!musicStarted) {
    return;
  }

  const track = getMusic();
  if (enabled) {
    track.play().catch(() => {});
  } else {
    track.pause();
  }
}

export function isAudioEnabled() {
  return enabled;
}

export function toggleAudio() {
  enabled = !enabled;
  localStorage.setItem(STORAGE_KEY, String(enabled));
  syncMusic();
  updateAudioButton();
  return enabled;
}

export function startMusic() {
  musicStarted = true;
  if (!enabled) {
    return;
  }

  getMusic().play().catch(() => {
    musicStarted = false;
  });
}

export function initAudioUi() {
  updateAudioButton();
}

export function bindAudioToggle() {
  const button = document.getElementById('audio-toggle-btn');
  if (!button) {
    return;
  }

  button.addEventListener('click', () => {
    toggleAudio();
  });
}
