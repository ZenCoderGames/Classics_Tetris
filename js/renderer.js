import { GRID, CELL_PX, PIECE_COLORS, TIMING } from './config.js';
import { getCells, getPreviewCells } from './tetrominoes.js';

const WALL_PX = CELL_PX;
const BLOCK_SPRITE_PATH = 'art/WhiteBlock.png';
const TOP_BUFFER_TINT = '#ff5454';
const TINT_BLOCKS = false;
const PIECE_SPRITE_PATHS = {
  I: 'art/WhiteBlock.png',
  J: 'art/BlueBlock.png',
  L: 'art/BrownBlock.png',
  O: 'art/YellowBlock.png',
  S: 'art/GreenBlock.png',
  T: 'art/PurpleBlock.png',
  Z: 'art/RedBlock.png',
};

export function createRenderer(gameCanvas, holdCanvas, nextCanvas) {
  const ctx = gameCanvas.getContext('2d');
  const holdCtx = holdCanvas.getContext('2d');
  const nextCtx = nextCanvas.getContext('2d');

  const playfieldWidth = GRID.COLS * CELL_PX + WALL_PX * 2;
  const playfieldHeight = GRID.VISIBLE_ROWS * CELL_PX + WALL_PX * 2;

  gameCanvas.width = playfieldWidth;
  gameCanvas.height = playfieldHeight;

  const sprites = {
    empty: null,
    block: null,
    blocks: {},
    wall: null,
  };

  const tintedCache = new Map();
  let emptyRedTint = null;

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function loadSprites() {
    [sprites.empty, sprites.block, sprites.wall] = await Promise.all([
      loadImage('art/EmptyBlock.png'),
      loadImage(BLOCK_SPRITE_PATH),
      loadImage('art/Walls.png'),
    ]);
    await loadPieceSprites();
    buildTintCache();
  }

  async function loadPieceSprites() {
    const entries = await Promise.all(
      Object.entries(PIECE_SPRITE_PATHS).map(async ([type, src]) => [
        type,
        await loadImage(src),
      ]),
    );
    sprites.blocks = Object.fromEntries(entries);
  }

  function buildTintCache() {
    emptyRedTint = createTintedSprite(sprites.empty, TOP_BUFFER_TINT);

    for (const [type, color] of Object.entries(PIECE_COLORS)) {
      tintedCache.set(
        type,
        TINT_BLOCKS
          ? createTintedSprite(sprites.block, color)
          : sprites.blocks[type] || sprites.block,
      );
    }
  }

  function createTintedSprite(source, color) {
    const canvas = document.createElement('canvas');
    canvas.width = CELL_PX;
    canvas.height = CELL_PX;
    const c = canvas.getContext('2d');

    c.fillStyle = color;
    c.fillRect(0, 0, CELL_PX, CELL_PX);
    c.globalCompositeOperation = 'multiply';
    c.drawImage(source, 0, 0, CELL_PX, CELL_PX);
    c.globalCompositeOperation = 'destination-in';
    c.drawImage(source, 0, 0, CELL_PX, CELL_PX);
    c.globalCompositeOperation = 'source-over';

    return canvas;
  }

  function drawCell(context, x, y, sprite) {
    context.drawImage(sprite, x * CELL_PX, y * CELL_PX, CELL_PX, CELL_PX);
  }

  function drawBoardBackground() {
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, playfieldWidth, playfieldHeight);

    const gridOffset = WALL_PX / CELL_PX;
    const topBufferSprite = emptyRedTint || sprites.empty;

    for (let col = 0; col < GRID.COLS; col += 1) {
      drawCell(ctx, gridOffset + col, 0, topBufferSprite);
    }

    for (let row = 0; row < GRID.VISIBLE_ROWS; row += 1) {
      for (let col = 0; col < GRID.COLS; col += 1) {
        drawCell(ctx, gridOffset + col, gridOffset + row, sprites.empty);
      }
    }

    drawWalls();
  }

  function drawWalls() {
    const left = 0;
    const right = playfieldWidth - WALL_PX;
    const bottom = playfieldHeight - WALL_PX;

    for (let row = 0; row <= GRID.VISIBLE_ROWS; row += 1) {
      ctx.drawImage(sprites.wall, left, row * CELL_PX, WALL_PX, CELL_PX);
      ctx.drawImage(sprites.wall, right, row * CELL_PX, WALL_PX, CELL_PX);
    }

    for (let col = 0; col < GRID.COLS; col += 1) {
      ctx.drawImage(sprites.wall, WALL_PX + col * CELL_PX, bottom, CELL_PX, WALL_PX);
    }

    ctx.drawImage(sprites.wall, left, bottom, WALL_PX, WALL_PX);
    ctx.drawImage(sprites.wall, right, bottom, WALL_PX, WALL_PX);
  }

  function boardToCanvas(col, row) {
    const firstVisible = GRID.BUFFER_ROWS;
    const visibleRow = row - firstVisible;
    return {
      x: WALL_PX + col * CELL_PX,
      y: WALL_PX + visibleRow * CELL_PX,
    };
  }

  function drawLockedCells(
    board,
    clearingRows = [],
    clearFlashOn = false,
    clearColumns = [],
  ) {
    const firstVisible = GRID.BUFFER_ROWS;
    const lastVisible = firstVisible + GRID.VISIBLE_ROWS - 1;
    const clearingRowSet = new Set(clearingRows);
    const clearingColumnSet = new Set(clearColumns);

    for (let y = firstVisible; y <= lastVisible; y += 1) {
      for (let x = 0; x < GRID.COLS; x += 1) {
        const type = board.cells[y][x];
        if (type) {
          const pos = boardToCanvas(x, y);
          ctx.drawImage(tintedCache.get(type), pos.x, pos.y, CELL_PX, CELL_PX);

          if (
            clearFlashOn
            && clearingRowSet.has(y)
            && clearingColumnSet.has(x)
          ) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.62)';
            ctx.fillRect(pos.x, pos.y, CELL_PX, CELL_PX);
          }
        }
      }
    }
  }

  function drawActivePiece(piece, ghostY = null) {
    if (!piece) {
      return;
    }

    const cells = getCells(piece);
    const firstVisible = GRID.BUFFER_ROWS;
    const lastVisible = firstVisible + GRID.VISIBLE_ROWS - 1;
    const pieceSprite = tintedCache.get(piece.type);

    if (ghostY !== null && ghostY !== piece.y) {
      ctx.globalAlpha = 0.5;
      for (const { x, y } of cells) {
        const gy = y - piece.y + ghostY;
        if (gy >= firstVisible && gy <= lastVisible) {
          const pos = boardToCanvas(x, gy);
          ctx.drawImage(pieceSprite, pos.x, pos.y, CELL_PX, CELL_PX);
        }
      }
      ctx.globalAlpha = 1;
    }

    for (const { x, y } of cells) {
      if (y >= firstVisible && y <= lastVisible) {
        const pos = boardToCanvas(x, y);
        ctx.drawImage(pieceSprite, pos.x, pos.y, CELL_PX, CELL_PX);
      }
    }
  }

  function drawDropTrails(trails = []) {
    if (trails.length === 0) {
      return;
    }

    const firstVisible = GRID.BUFFER_ROWS;
    const lastVisible = firstVisible + GRID.VISIBLE_ROWS - 1;

    ctx.save();
    ctx.filter = `blur(${TIMING.DROP_TRAIL_BLUR_PX}px)`;

    for (const trail of trails) {
      const sprite = tintedCache.get(trail.type);
      if (!sprite) {
        continue;
      }

      const progress = Math.max(0, Math.min(1, trail.age / TIMING.DROP_TRAIL_MS));
      ctx.globalAlpha = (1 - progress) * 0.38;

      for (const { x, y } of trail.cells) {
        if (y >= firstVisible && y <= lastVisible) {
          const pos = boardToCanvas(x, y);
          ctx.drawImage(sprite, pos.x, pos.y, CELL_PX, CELL_PX);
        }
      }
    }

    ctx.restore();
  }

  function drawPreview(context, type, canvasWidth, canvasHeight) {
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    if (!type || !sprites.block) {
      return;
    }

    const previewCell = 24;
    const offsets = getPreviewCells(type);
    const minX = Math.min(...offsets.map(([dx]) => dx));
    const maxX = Math.max(...offsets.map(([dx]) => dx));
    const minY = Math.min(...offsets.map(([, dy]) => dy));
    const maxY = Math.max(...offsets.map(([, dy]) => dy));
    const width = (maxX - minX + 1) * previewCell;
    const height = (maxY - minY + 1) * previewCell;
    const startX = (canvasWidth - width) / 2;
    const startY = (canvasHeight - height) / 2;
    const tinted = tintedCache.get(type);

    for (const [dx, dy] of offsets) {
      context.drawImage(
        tinted,
        startX + (dx - minX) * previewCell,
        startY + (dy - minY) * previewCell,
        previewCell,
        previewCell,
      );
    }
  }

  function drawClearLabel(label, scoreText, progress, row) {
    if (!label && !scoreText) {
      return;
    }

    const clamped = Math.max(0, Math.min(1, progress));
    const bounce = 1 + Math.sin(clamped * Math.PI) * 0.42;
    const alpha = clamped > 0.72 ? Math.max(0, 1 - (clamped - 0.72) / 0.28) : 1;
    const popupY = row === null || row === undefined
      ? playfieldHeight / 2
      : Math.min(
        playfieldHeight - WALL_PX - 34,
        boardToCanvas(0, row).y + CELL_PX - 34,
      );

    ctx.save();
    ctx.translate(playfieldWidth / 2, popupY);
    ctx.scale(bounce, bounce);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 22px "Segoe UI", Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(-(GRID.COLS * CELL_PX) / 2, -34, GRID.COLS * CELL_PX, 68);
    ctx.fillStyle = '#ffffff';
    if (label) {
      ctx.fillText(label, 0, -10);
    }
    if (scoreText) {
      ctx.font = 'bold 28px "Segoe UI", Tahoma, sans-serif';
      ctx.fillStyle = '#ffd866';
      ctx.fillText(scoreText, 0, label ? 18 : 0);
    }
    ctx.restore();
  }

  function renderFrame({
    board,
    active,
    ghostY,
    hold,
    nextPiece,
    dropTrails = [],
    clearingRows = [],
    clearFlashOn = false,
    clearColumns = [],
    clearLabel = '',
    scorePopupText = '',
    scorePopupProgress = 1,
    scorePopupRow = null,
    shakeOffset = { x: 0, y: 0 },
  }) {
    ctx.clearRect(0, 0, playfieldWidth, playfieldHeight);
    ctx.save();
    ctx.translate(shakeOffset.x, shakeOffset.y);
    drawBoardBackground();
    drawLockedCells(board, clearingRows, clearFlashOn, clearColumns);
    drawDropTrails(dropTrails);
    drawActivePiece(active, ghostY);
    drawClearLabel(clearLabel, scorePopupText, scorePopupProgress, scorePopupRow);
    ctx.restore();
    drawPreview(holdCtx, hold, holdCanvas.width, holdCanvas.height);
    drawPreview(nextCtx, nextPiece, nextCanvas.width, nextCanvas.height);
  }

  return {
    loadSprites,
    renderFrame,
    playfieldWidth,
    playfieldHeight,
  };
}
