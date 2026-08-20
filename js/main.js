// จุดเริ่มต้น: ตั้งค่า canvas, ลูปเกมแบบ fixed timestep, ต่อสายทุกระบบเข้าด้วยกัน

import { TICK } from './config.js';
import { Game, S } from './game.js';
import { Fx } from './fx.js';
import { Audio } from './audio.js';
import { createInput } from './input.js';
import { renderWalls } from './mazeRenderer.js';
import {
  drawPellets, drawPowerups, drawFruit, drawPac, drawGhost, drawFx, drawBanner, SKINS,
} from './render.js';
import { initHud, updateHud, toast, hideHint, resetHudCache } from './hud.js';
import * as ui from './ui.js';
import * as store from './storage.js';
import * as lb from './leaderboard.js';
import * as missions from './missions.js';
import { G } from './entities/ghost.js';
import { isJunction } from './ghostAI.js';

const DEBUG = new URLSearchParams(location.search).has('debug');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const stage = document.getElementById('stage');

const fx = new Fx();
const audio = new Audio();
const game = new Game({ fx, audio, emit: onGameEvent });

let tile = 16;
let dpr = 1;
let wallCanvas = null;
let wallKey = '';
let paused = true;      // เริ่มที่เมนู
let running = false;
let lastFrame = 0;
let acc = 0;
let fpsSmooth = 60;

// ── ขนาด canvas ────────────────────────────────────────────
function layout() {
  if (!game.maze) return;
  const rect = stage.getBoundingClientRect();
  const availW = Math.max(120, rect.width - 4);
  const availH = Math.max(120, rect.height - 4);
  const newTile = Math.max(6, Math.floor(Math.min(availW / game.maze.cols, availH / game.maze.rows)));
  // จำกัด devicePixelRatio ที่ 2 — สูงกว่านั้นแทบไม่เห็นความต่างแต่กินเวลาเฟรมมาก
  const newDpr = Math.min(2, window.devicePixelRatio || 1);

  const cssW = newTile * game.maze.cols;
  const cssH = newTile * game.maze.rows;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssW * newDpr);
  canvas.height = Math.round(cssH * newDpr);

  tile = newTile;
  dpr = newDpr;
  ensureWalls();
}

function ensureWalls() {
  const key = `${game.maze.name}|${tile}|${dpr}`;
  if (key === wallKey) return;
  wallKey = key;
  wallCanvas = renderWalls(game.maze, tile * dpr);
}

const ro = new ResizeObserver(() => layout());
ro.observe(stage);
window.addEventListener('orientationchange', () => setTimeout(layout, 120));

// ── เหตุการณ์จากเกม ────────────────────────────────────────
function onGameEvent(type, data) {
  switch (type) {
    case 'level':
      resetHudCache();
      layout();
      toast(`ด่าน ${data.level} · ${data.name}`, 'warn');
      break;
    case 'gameover':
      endRun(data);
      break;
    case 'extralife':
      toast('ชีวิตพิเศษ! +1', 'good');
      break;
    case 'elroy':
      if (data === 1) toast('บลิงกี้เริ่มดุแล้ว!', 'warn');
      break;
    case 'levelclear':
      toast(data.flawless ? 'ผ่านด่านแบบไม่เสียชีวิต!' : 'ผ่านด่าน!', 'good');
      break;
    default:
      break;
  }
}

// ── เริ่ม / จบ / หยุด ──────────────────────────────────────
function startRun() {
  audio.unlock();
  applySettings();
  game.skinColor = SKINS[store.get('skin')]?.color || SKINS.classic.color;
  game.newGame();
  resetHudCache();
  ui.hide();
  paused = false;
  layout();
  audio.startSiren();
  hideHint();
}

function endRun(result) {
  audio.stopSiren();
  paused = true;
  const { rank, isRecord } = lb.submit(result.score, result.level);
  const { newlyDone, coins } = missions.applyRun(result);
  store.bumpTotals({
    games: 1,
    ghostsEaten: result.ghostsEaten,
    levelsCleared: result.level - 1,
    pellets: result.pellets,
  });
  ui.gameOver({ result, rank, isRecord, newlyDone, coins });
}

function togglePause(force) {
  if (game.state === S.OVER || ui.isOpen()) {
    if (force === false) return;
    if (ui.isOpen() && !paused) return;
  }
  if (paused && ui.isOpen()) {
    // ปิดชีท = เล่นต่อ
    if (game.state === S.OVER) return;
    ui.hide();
    paused = false;
    audio.startSiren();
    return;
  }
  paused = true;
  audio.stopSiren();
  ui.paused(game);
}

function quitToMenu() {
  audio.stopSiren();
  paused = true;
  ui.menu();
}

function applySettings() {
  audio.setEnabled(store.get('sound'));
  fx.haptics = store.get('haptics');
}

// ── ลูปหลัก ────────────────────────────────────────────────
function frame(now) {
  requestAnimationFrame(frame);
  if (!lastFrame) lastFrame = now;
  let real = (now - lastFrame) / 1000;
  lastFrame = now;
  // สลับแอปกลับมาแล้วอย่ากระโดดข้ามเวลาเป็นก้อนใหญ่
  if (real > 0.25) real = 0.25;
  fpsSmooth += (1 / Math.max(real, 1e-4) - fpsSmooth) * 0.08;

  fx.update(real); // เอฟเฟกต์เดินด้วยเวลาจริง ภาพจึงลื่นแม้ตอนสโลโมชัน

  if (!paused && game.maze) {
    acc += real * fx.timeScale();
    let steps = 0;
    while (acc >= TICK && steps < 5) {
      game.update(TICK);
      acc -= TICK;
      steps++;
      if (game.state === S.OVER) break;
    }
    if (acc > TICK * 5) acc = 0;
    audio.updateSiren(game.pelletProgress, game.anyFrightened);
    updateHud(game, lb.best());
  }

  if (game.maze) draw();
}

function draw() {
  const maze = game.maze;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#05060f';
  ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

  const shake = fx.shakeOffset();
  ctx.setTransform(dpr, 0, 0, dpr, shake.x * tile * dpr, shake.y * tile * dpr);

  if (wallCanvas) ctx.drawImage(wallCanvas, 0, 0, wallCanvas.width / dpr, wallCanvas.height / dpr);

  drawPellets(ctx, maze, tile, game.time);
  drawPowerups(ctx, game.powerups.items, tile, game.time);
  drawFruit(ctx, game.fruit, tile, game.time);

  const frozen = game.powerups.ghostSpeedMul() === 0;
  for (const gh of game.ghosts) drawGhost(ctx, gh, tile, { frozen });

  if (game.state !== S.CLEAR) {
    drawPac(ctx, game.pac, tile, game.skinColor, game.pac.dead ? game.pac.deathT / 1.2 : 0);
  }

  drawFx(ctx, fx, tile);
  if (DEBUG) drawDebug();

  // แบนเนอร์กลางสนาม
  if (game.state === S.READY) {
    drawBanner(ctx, maze, tile, [
      { text: `ด่าน ${game.level}`, color: '#ffffff', size: 0.9 },
      { text: 'READY!', color: '#ffd93d', size: 1.15 },
    ]);
  } else if (game.state === S.CLEAR) {
    drawBanner(ctx, maze, tile, [{ text: 'ผ่านด่าน!', color: '#4ee06a', size: 1.2 }]);
  } else if (game.state === S.OVER) {
    drawBanner(ctx, maze, tile, [{ text: 'GAME OVER', color: '#ff5470', size: 1.1 }]);
  }

  if (fx.flash > 0) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = Math.min(0.55, fx.flash);
    ctx.fillStyle = fx.flashColor;
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.globalAlpha = 1;
  }
}

function drawDebug() {
  const maze = game.maze;
  ctx.save();
  ctx.font = `${Math.round(tile * 0.5)}px monospace`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f0';
  ctx.fillText(
    `${fpsSmooth.toFixed(0)} fps · ${game.mode} · เม็ด ${game.pelletsLeft} · elroy ${game.blinky.elroy}`,
    tile * 0.4, tile * 1.1
  );
  // ทางแยก
  ctx.fillStyle = 'rgba(0,255,255,0.25)';
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      if (isJunction(maze, x, y) && maze.grid[y * maze.cols + x] !== 1) {
        ctx.fillRect(x * tile + tile * 0.4, y * tile + tile * 0.4, tile * 0.2, tile * 0.2);
      }
    }
  }
  // เป้าของผีแต่ละตัว
  for (const gh of game.ghosts) {
    if (!gh.lastTarget) continue;
    ctx.strokeStyle = gh.color;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo((gh.x + 0.5) * tile, (gh.y + 0.5) * tile);
    ctx.lineTo((gh.lastTarget.x + 0.5) * tile, (gh.lastTarget.y + 0.5) * tile);
    ctx.stroke();
    ctx.fillStyle = gh.color;
    ctx.fillRect((gh.lastTarget.x + 0.3) * tile, (gh.lastTarget.y + 0.3) * tile, tile * 0.4, tile * 0.4);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ── ต่อสาย UI + อินพุต ────────────────────────────────────
initHud();
ui.initUi({
  start: startRun,
  resume: () => {
    ui.hide();
    paused = false;
    audio.startSiren();
  },
  restart: startRun,
  quit: quitToMenu,
  howto: () => ui.howto(),
  back: () => ui.menu(),
  refresh: () => ui.refreshMenu(),
  onSetting: () => applySettings(),
  onSkin: (id) => {
    game.skinColor = SKINS[id]?.color || SKINS.classic.color;
  },
  onNotEnoughCoins: (short) => toast(`ขาดอีก ${short} เหรียญ`, 'warn'),
});

createInput({
  swipeArea: document.body,
  dpad: document.getElementById('dpad'),
  onDir: (dir) => {
    if (paused || game.state === S.OVER) return;
    game.pac.steer(dir);
    hideHint();
  },
  onPause: () => togglePause(),
  onFirstInput: () => audio.unlock(),
});

document.getElementById('btn-pause').addEventListener('click', () => {
  if (paused && !ui.isOpen()) return;
  togglePause();
});

// สลับแอป/ล็อกจอ = หยุดเกมให้เอง (ไม่งั้นกลับมาเจอผีทับหน้า)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !paused) togglePause();
});
window.addEventListener('blur', () => {
  if (!paused) togglePause();
});

// ── เริ่มต้น ───────────────────────────────────────────────
applySettings();
game.loadLevel(1);   // โหลดด่านแรกไว้เป็นฉากหลังของเมนู
game.state = S.READY;
game.stateTimer = 1e9;
layout();
ui.menu();
running = true;
requestAnimationFrame(frame);

// ── PWA ────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // ไม่สำเร็จก็ไม่เป็นไร — เกมยังเล่นได้ปกติ แค่ไม่มีโหมดออฟไลน์
    });
  });
}

// เผื่อไว้สำหรับทดสอบอัตโนมัติ
if (DEBUG) {
  window.__game = game;
  window.__fx = fx;
}
