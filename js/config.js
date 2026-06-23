export const GRID = {
  COLS: 10,
  VISIBLE_ROWS: 20,
  BUFFER_ROWS: 20,
};

export const TOTAL_ROWS = GRID.VISIBLE_ROWS + GRID.BUFFER_ROWS;
export const CELL_PX = 32;
export const NEXT_QUEUE_SIZE = 1;
export const LINES_PER_LEVEL = 10;
export const MAX_HIGH_SCORES = 10;

export const TIMING = {
  LOCK_DELAY_MS: 500,
  LOCK_FLASH_MS: 220,
  MAX_MOVE_RESETS: 15,
  DAS_MS: 167,
  ARR_MS: 33,
  SOFT_DROP_MS: 50,
  ARE_MS: 100,
  LINE_CLEAR_FLASH_MS: 60,
  LINE_CLEAR_START_DELAY_MS: 120,
  LINE_CLEAR_REMOVE_DELAY_MS: 60,
  LINE_CLEAR_ROW_COLLAPSE_DELAY_MS: 240,
  LINE_CLEAR_COLLAPSE_MS: 120,
  LINE_CLEAR_FLASH_INTERVAL_MS: 60,
  SCORE_POPUP_MS: 575,
  LEVEL_UP_POPUP_MS: 1800,
  LEVEL_UP_SLOW_MS: 1400,
  LEVEL_UP_TIME_SCALE: 0.18,
  DROP_TRAIL_MS: 600,
  DROP_TRAIL_BLUR_PX: 4,
};

export function gravityMsForLevel(level) {
  const speeds = [
    800, 720, 630, 550, 470, 380, 300, 220, 140, 100,
    80, 80, 80, 70, 70, 70, 50, 50, 50, 30,
  ];
  const idx = Math.max(0, Math.min(level - 1, speeds.length - 1));
  return speeds[idx];
}

export const PIECE_TYPES = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

export const PIECE_COLORS = {
  I: '#00F0F0',
  J: '#0000F0',
  L: '#F0A000',
  O: '#F0F000',
  S: '#00F000',
  T: '#A000F0',
  Z: '#F00000',
};
