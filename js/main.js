import { createRenderer } from './renderer.js';
import { createInput } from './input.js';
import * as hud from './hud.js';
import * as highScores from './highscores.js';
import { createGame } from './game.js';
import { startMusic, bindAudioToggle, initAudioUi } from './audio.js';

async function main() {
  const gameCanvas = document.getElementById('game-canvas');
  const holdCanvas = document.getElementById('hold-canvas');
  const nextCanvas = document.getElementById('next-canvas');

  const renderer = createRenderer(gameCanvas, holdCanvas, nextCanvas);
  await renderer.loadSprites();

  const input = createInput();
  input.attach();

  const game = createGame(renderer, input, hud, highScores);

  function handleOverlayAction() {
    if (game.state === game.STATES.HIGH_SCORE) {
      game.saveHighScore(hud.getPlayerName());
      return;
    }

    if (game.state === game.STATES.PAUSED) {
      game.resume();
      return;
    }

    if (game.state === game.STATES.PLAYING) {
      return;
    }

    startMusic();
    game.start();
  }

  hud.bindOverlayButton(handleOverlayAction);
  hud.bindOverlayEnter((event) => {
    if (game.state === game.STATES.HIGH_SCORE) {
      event.preventDefault();
    }
    handleOverlayAction();
  });

  function bindRestartButton() {
    const button = document.getElementById('restart-btn');
    if (!button) {
      return;
    }

    button.addEventListener('click', () => {
      if (game.state === game.STATES.HIGH_SCORE) {
        if (!window.confirm('Restart without saving this score?')) {
          return;
        }
      }

      startMusic();
      game.start();
    });
  }

  initAudioUi();
  bindAudioToggle();
  bindRestartButton();
  highScores.bindClearHighScoresButton();

  game.showMenu();

  let lastTime = performance.now();

  function loop(now) {
    const dt = now - lastTime;
    lastTime = now;
    game.update(dt);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

main().catch((error) => {
  console.error('Failed to start Tetris:', error);
});
