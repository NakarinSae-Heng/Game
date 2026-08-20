// วาดกำแพงลง canvas สำรองครั้งเดียวต่อด่าน แล้ว blit ทุกเฟรม
// เมซมีกำแพงหลายร้อยช่อง การวาดใหม่ทุกเฟรมจะกินเวลาเฟรมบนมือถือไปเปล่าๆ

import { T, COLS, ROWS } from './maze.js';

const isWall = (maze, x, y) => {
  if (y < 0 || y >= ROWS) return true; // นอกขอบบน/ล่างถือเป็นกำแพง
  const wx = ((x % COLS) + COLS) % COLS;
  return maze.grid[y * COLS + wx] === T.WALL;
};

function roundedTile(g, px, py, size, r) {
  // r = [tl, tr, br, bl]; ใช้ roundRect ถ้ามี ไม่มีก็วาดเป็นสี่เหลี่ยมธรรมดา
  if (typeof g.roundRect === 'function') {
    g.beginPath();
    g.roundRect(px, py, size, size, r);
    return;
  }
  g.beginPath();
  g.rect(px, py, size, size);
}

/**
 * @param {object} maze
 * @param {number} tile ขนาดช่องเป็นพิกเซล
 * @returns {HTMLCanvasElement}
 */
export function renderWalls(maze, tile) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(maze.cols * tile);
  c.height = Math.ceil(maze.rows * tile);
  const g = c.getContext('2d');
  const radius = tile * 0.44;
  const theme = maze.theme;

  const shapes = [];
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      if (maze.grid[y * maze.cols + x] !== T.WALL) continue;
      const n = isWall(maze, x, y - 1);
      const s = isWall(maze, x, y + 1);
      const w = isWall(maze, x - 1, y);
      const e = isWall(maze, x + 1, y);
      // มุมจะโค้งเฉพาะมุม "นอก" คือด้านที่ติดกันทั้งสองด้านไม่ใช่กำแพง
      shapes.push({
        px: x * tile,
        py: y * tile,
        r: [
          !n && !w ? radius : 0,
          !n && !e ? radius : 0,
          !s && !e ? radius : 0,
          !s && !w ? radius : 0,
        ],
      });
    }
  }

  // ชั้นที่ 1: เรืองแสงรอบกำแพง
  g.save();
  g.shadowColor = theme.glow;
  g.shadowBlur = tile * 0.75;
  g.fillStyle = theme.wall;
  for (const sh of shapes) {
    roundedTile(g, sh.px, sh.py, tile, sh.r);
    g.fill();
  }
  g.restore();

  // ชั้นที่ 2: ตัวกำแพงจริง ไล่เฉดให้ดูมีมิติ
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, theme.wall);
  grad.addColorStop(1, shade(theme.wall, -0.35));
  g.fillStyle = grad;
  for (const sh of shapes) {
    roundedTile(g, sh.px, sh.py, tile, sh.r);
    g.fill();
  }

  // ชั้นที่ 3: ไฮไลต์ขอบบนของกำแพง ให้ดูเหมือนมีแสงตกจากด้านบน
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.lineWidth = Math.max(1, tile * 0.07);
  g.lineCap = 'round';
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      if (maze.grid[y * maze.cols + x] !== T.WALL) continue;
      if (isWall(maze, x, y - 1)) continue;
      const inset = tile * 0.18;
      const left = isWall(maze, x - 1, y) ? 0 : inset;
      const right = isWall(maze, x + 1, y) ? 0 : inset;
      g.beginPath();
      g.moveTo(x * tile + left, y * tile + tile * 0.16);
      g.lineTo((x + 1) * tile - right, y * tile + tile * 0.16);
      g.stroke();
    }
  }

  // ประตูบ้านผี
  g.fillStyle = 'rgba(255,255,255,0.5)';
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      if (maze.grid[y * maze.cols + x] !== T.DOOR) continue;
      g.fillRect(x * tile, y * tile + tile * 0.4, tile, tile * 0.2);
    }
  }

  return c;
}

/** ปรับความสว่างของสี hex (amount -1..1) */
export function shade(hex, amount) {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((ch) => ch + ch).join('') : m;
  const num = parseInt(full, 16);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((num >> 16) & 255) * (1 + amount));
  const g = clamp(((num >> 8) & 255) * (1 + amount));
  const b = clamp((num & 255) * (1 + amount));
  return `rgb(${r},${g},${b})`;
}
