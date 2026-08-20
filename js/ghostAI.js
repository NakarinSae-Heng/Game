// สมองของผี: เลือกช่องเป้าหมายตามบุคลิก แล้วเลือกทางแยกที่เข้าใกล้เป้าที่สุด

import { CFG, pickByLevel } from './config.js';
import { DIR, TURN_ORDER, isOpposite } from './dir.js';
import { COLS, ROWS, passableGhost, T, tileAt } from './maze.js';
import { tileDistance } from './movement.js';

// มุมประจำตัวตอนโหมด scatter (ผีจะวนอยู่แถวมุมของตัวเอง)
export const SCATTER_CORNERS = {
  blinky: { x: COLS - 3, y: -2 },
  pinky: { x: 2, y: -2 },
  inky: { x: COLS - 1, y: ROWS + 1 },
  clyde: { x: 0, y: ROWS + 1 },
};

export const GHOSTS = [
  { id: 'blinky', name: 'บลิงกี้', color: '#ff2f4f', release: 0.0 },
  { id: 'pinky', name: 'พิงกี้', color: '#ff9ed8', release: 2.2 },
  { id: 'inky', name: 'อิงกี้', color: '#37e0ff', release: 5.5 },
  { id: 'clyde', name: 'ไคลด์', color: '#ffa63d', release: 9.5 },
];

/**
 * ช่องเป้าหมายของผีตัวหนึ่ง
 * @param {object} g      ผี
 * @param {object} pac    ผู้เล่น
 * @param {object} blinky ผีตัวแรก (อิงกี้ต้องใช้ตำแหน่งของบลิงกี้)
 * @param {number} level  ด่านปัจจุบัน (ยิ่งสูง ยิ่งดักหน้าไกลขึ้น)
 */
export function targetFor(g, pac, blinky, level) {
  const px = Math.round(pac.x);
  const py = Math.round(pac.y);

  switch (g.id) {
    case 'blinky':
      // ไล่ตรงๆ ไม่มีเล่ห์เหลี่ยม — และตอน Elroy จะไม่ยอมถอยไป scatter เลย
      return { x: px, y: py };

    case 'pinky': {
      // ดักหน้า: เล็งไปข้างหน้าผู้เล่นหลายช่อง
      const look = pickByLevel(CFG.pinkyLookahead, level);
      return { x: px + pac.dir.x * look, y: py + pac.dir.y * look };
    }

    case 'inky': {
      // เล็งจุดที่สะท้อนจากบลิงกี้ผ่านจุด 2 ช่องหน้าผู้เล่น — คาดเดายากที่สุด
      const ax = px + pac.dir.x * 2;
      const ay = py + pac.dir.y * 2;
      const bx = Math.round(blinky.x);
      const by = Math.round(blinky.y);
      return { x: ax + (ax - bx), y: ay + (ay - by) };
    }

    case 'clyde':
    default: {
      // ขี้อาย: ไล่ตอนอยู่ไกล แต่ถอยกลับมุมตัวเองเมื่อเข้าใกล้กว่า 8 ช่อง
      const d = tileDistance(g.x, g.y, pac.x, pac.y);
      return d > 8 ? { x: px, y: py } : SCATTER_CORNERS.clyde;
    }
  }
}

/**
 * เลือกทิศถัดไปที่ทางแยก
 * กติกาแบบต้นฉบับ: ห้ามกลับหลัง, เลือกทางที่ระยะตรงถึงเป้าน้อยที่สุด,
 * เสมอกันให้เรียงตามลำดับ ขึ้น → ซ้าย → ลง → ขวา
 */
export function chooseDir(maze, g, target, allowHouse) {
  let best = null;
  let bestD = Infinity;
  let fallback = null;

  for (const d of TURN_ORDER) {
    const nx = g.tileX + d.x;
    const ny = g.tileY + d.y;
    if (!passableGhost(maze, nx, ny, allowHouse)) continue;
    // ผีห้ามเลี้ยวขึ้นในบางช่อง? — ต้นฉบับมีกฎนี้ แต่ผมตัดออกเพื่อความยุติธรรม
    if (!fallback) fallback = d;
    if (isOpposite(d, g.dir)) continue;
    const dist = tileDistance(nx, ny, target.x, target.y);
    if (dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  // ทางตัน: ยอมกลับหลัง
  return best || fallback || DIR.none;
}

/** ตอนโหมดกลัว ผีจะสุ่มเดิน (แต่ยังไม่กลับหลัง) */
export function chooseRandomDir(maze, g, rand) {
  const opts = [];
  let fallback = null;
  for (const d of TURN_ORDER) {
    if (!passableGhost(maze, g.tileX + d.x, g.tileY + d.y, false)) continue;
    if (!fallback) fallback = d;
    if (isOpposite(d, g.dir)) continue;
    opts.push(d);
  }
  if (!opts.length) return fallback || DIR.none;
  return opts[Math.floor(rand() * opts.length) % opts.length];
}

/** ขั้น Cruise Elroy ของบลิงกี้ (0 = ปกติ, 1-2 = ดุขึ้น) */
export function elroyStage(pelletsLeft, thresholds) {
  if (pelletsLeft <= thresholds.t2) return 2;
  if (pelletsLeft <= thresholds.t1) return 1;
  return 0;
}

/** ช่องนี้เป็นทางแยกไหม (ใช้วาดตอน debug) */
export function isJunction(maze, x, y) {
  let n = 0;
  for (const d of TURN_ORDER) {
    if (tileAt(maze, x + d.x, y + d.y) !== T.WALL) n++;
  }
  return n >= 3;
}
