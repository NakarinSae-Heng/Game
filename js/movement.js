// การเดินบนกริดแบบต่อเนื่อง
//
// กฎที่ทั้งเกมยึดไว้: ตัวละครจะ "จัดแนว" กับกริดตลอด — ถ้าเดินแนวนอน y จะเป็น
// จำนวนเต็มเสมอ, ถ้าเดินแนวตั้ง x จะเป็นจำนวนเต็มเสมอ ทำให้การตรวจกำแพงและ
// การตัดสินใจของผีทำที่ "กลางช่อง" ได้อย่างแม่นยำ

import { COLS } from './maze.js';

const EPS = 1e-6;

/**
 * เดินหน้าไปตาม e.dir เป็นระยะ dist (หน่วยช่อง) โดยหยุดที่กลางช่องทุกครั้ง
 * ที่ผ่าน เพื่อเรียก onCenter (ใช้ตัดสินใจเลี้ยว/กินของ) และไม่ทะลุกำแพง
 *
 * @param {object} e        ตัวละคร (ต้องมี x, y, dir)
 * @param {number} dist     ระยะที่จะเดินเฟรมนี้
 * @param {(x:number,y:number)=>boolean} canPass  ช่องนี้เดินผ่านได้ไหม
 * @param {(x:number,y:number)=>void} [onCenter]  เรียกทุกครั้งที่อยู่กลางช่อง
 */
export function advance(e, dist, canPass, onCenter) {
  let guard = 0;
  while (dist > EPS && guard++ < 64) {
    const tx = Math.round(e.x);
    const ty = Math.round(e.y);
    const atCenter = Math.abs(e.x - tx) < EPS && Math.abs(e.y - ty) < EPS;

    if (atCenter) {
      if (onCenter) onCenter(tx, ty);
      if (!e.dir.x && !e.dir.y) {
        e.blocked = true;
        return;
      }
      if (!canPass(tx + e.dir.x, ty + e.dir.y)) {
        e.blocked = true;
        return;
      }
    }
    e.blocked = false;

    // ระยะจากตำแหน่งปัจจุบันถึงกลางช่องถัดไปในทิศที่เดิน
    if (e.dir.x) {
      const next = e.dir.x > 0 ? Math.floor(e.x + EPS) + 1 : Math.ceil(e.x - EPS) - 1;
      const d = Math.abs(next - e.x);
      if (d <= dist + EPS) {
        e.x = next;
        dist -= d;
      } else {
        e.x += e.dir.x * dist;
        dist = 0;
      }
      // อุโมงค์: วนซ้าย-ขวา
      if (e.x < -0.5) e.x += COLS;
      else if (e.x > COLS - 0.5) e.x -= COLS;
    } else {
      const next = e.dir.y > 0 ? Math.floor(e.y + EPS) + 1 : Math.ceil(e.y - EPS) - 1;
      const d = Math.abs(next - e.y);
      if (d <= dist + EPS) {
        e.y = next;
        dist -= d;
      } else {
        e.y += e.dir.y * dist;
        dist = 0;
      }
    }
  }
}

/** เดินตรงเข้าหาเป้าหมายแบบไม่สนกำแพง (ใช้เฉพาะในบ้านผี) */
export function moveToward(e, tx, ty, dist) {
  const dx = tx - e.x;
  const dy = ty - e.y;
  // จัดแกน x ก่อน แล้วจึงแกน y — บ้านผีเป็นสี่เหลี่ยม จึงพอเพียง
  if (Math.abs(dx) > EPS) {
    const step = Math.min(dist, Math.abs(dx));
    e.x += Math.sign(dx) * step;
    dist -= step;
  }
  if (dist > EPS && Math.abs(dy) > EPS) {
    const step = Math.min(dist, Math.abs(dy));
    e.y += Math.sign(dy) * step;
  }
  return Math.abs(tx - e.x) < 1e-4 && Math.abs(ty - e.y) < 1e-4;
}

/** ระยะห่างระหว่างสองจุดโดยคิดการวนอุโมงค์ด้วย */
export function tileDistance(ax, ay, bx, by) {
  let dx = Math.abs(ax - bx);
  if (dx > COLS / 2) dx = COLS - dx;
  const dy = ay - by;
  return Math.hypot(dx, dy);
}
