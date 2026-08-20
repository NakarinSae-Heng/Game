// Power-up พิเศษที่เพิ่มเข้ามาจากเกมต้นฉบับ
// โผล่เป็นระยะบนช่องที่เม็ดถั่วถูกกินไปแล้ว มีอายุจำกัดและกระพริบเตือนก่อนหาย

import { CFG } from './config.js';
import { walkableTiles, T, tileAt } from './maze.js';
import { tileDistance } from './movement.js';

export const PU = {
  SLOW: { id: 'SLOW', icon: '⏳', label: 'ผีอืด', color: '#8de1ff', duration: 6 },
  MAGNET: { id: 'MAGNET', icon: '🧲', label: 'แม่เหล็ก', color: '#ff8fb0', duration: 8 },
  SHIELD: { id: 'SHIELD', icon: '🛡️', label: 'เกราะ', color: '#4ee06a', duration: Infinity },
  FREEZE: { id: 'FREEZE', icon: '❄️', label: 'แช่แข็ง', color: '#b9ecff', duration: 3 },
  DOUBLE: { id: 'DOUBLE', icon: '✨', label: 'คูณสอง', color: '#ffd93d', duration: 10 },
  DASH: { id: 'DASH', icon: '⚡', label: 'วิ่งไว', color: '#ffb03d', duration: 6 },
};

const POOL = Object.values(PU);

export class PowerupManager {
  constructor(rand) {
    this.rand = rand;
    this.items = [];        // ที่วางอยู่บนสนาม
    this.active = new Map(); // id -> เวลาที่เหลือ (Infinity = ถาวรจนใช้)
    this.spawnTimer = CFG.powerup.firstSpawn;
    this.collected = 0;
  }

  reset(hard = true) {
    this.items = [];
    this.spawnTimer = CFG.powerup.firstSpawn;
    if (hard) {
      this.active.clear();
      this.collected = 0;
    }
  }

  /** ล้างเฉพาะของบนสนาม เก็บเอฟเฟกต์ที่กำลังทำงานไว้ (ใช้ตอนเสียชีวิต) */
  clearField() {
    this.items = [];
    this.spawnTimer = Math.max(this.spawnTimer, 4);
  }

  has(id) {
    return this.active.has(id);
  }

  remaining(id) {
    return this.active.get(id) ?? 0;
  }

  grant(id) {
    const def = PU[id];
    this.active.set(id, def.duration);
  }

  consumeShield() {
    if (!this.active.has(PU.SHIELD.id)) return false;
    this.active.delete(PU.SHIELD.id);
    return true;
  }

  update(dt, maze, pac) {
    // นับเวลาเอฟเฟกต์ที่กำลังทำงาน
    for (const [id, t] of [...this.active]) {
      if (t === Infinity) continue;
      const left = t - dt;
      if (left <= 0) this.active.delete(id);
      else this.active.set(id, left);
    }

    // ของบนสนามหมดอายุ
    for (const it of this.items) it.life -= dt;
    this.items = this.items.filter((it) => it.life > 0);

    // ถึงเวลาโผล่ของใหม่
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = CFG.powerup.spawnEvery[0] +
        this.rand() * (CFG.powerup.spawnEvery[1] - CFG.powerup.spawnEvery[0]);
      if (this.items.length < CFG.powerup.maxOnField) this.spawn(maze, pac);
    }
  }

  /** เลือกช่องที่เม็ดถั่วถูกกินไปแล้ว และไม่ใกล้ผู้เล่นเกินไป (ต้องวิ่งไปเก็บ) */
  spawn(maze, pac) {
    const cand = walkableTiles(maze, (x, y, t) =>
      t === T.EMPTY &&
      y !== maze.tunnelRow &&
      tileDistance(x, y, pac.x, pac.y) > 5 &&
      !this.items.some((it) => it.x === x && it.y === y)
    );
    if (!cand.length) return;
    const spot = cand[Math.floor(this.rand() * cand.length)];
    const def = POOL[Math.floor(this.rand() * POOL.length)];
    this.items.push({ x: spot.x, y: spot.y, def, life: CFG.powerup.lifetime, born: 0 });
  }

  /** ผู้เล่นเหยียบของชิ้นไหนอยู่ไหม */
  pickupAt(tx, ty) {
    const i = this.items.findIndex((it) => it.x === tx && it.y === ty);
    if (i < 0) return null;
    const [it] = this.items.splice(i, 1);
    this.grant(it.def.id);
    this.collected++;
    return it.def;
  }

  /** ตัวคูณความเร็วผีจากเอฟเฟกต์ที่กำลังทำงาน */
  ghostSpeedMul() {
    if (this.has(PU.FREEZE.id)) return 0;
    if (this.has(PU.SLOW.id)) return 0.55;
    return 1;
  }

  pacSpeedMul() {
    return this.has(PU.DASH.id) ? CFG.pac.dashMul : 1;
  }

  scoreMul() {
    return this.has(PU.DOUBLE.id) ? 2 : 1;
  }

  /** รายการสำหรับแสดงบน HUD */
  chips() {
    return [...this.active.entries()].map(([id, t]) => ({
      def: PU[id],
      left: t,
      frac: t === Infinity ? 1 : t / PU[id].duration,
      permanent: t === Infinity,
    }));
  }
}

/** แม่เหล็ก: ดูดเม็ดถั่วรอบตัวผู้เล่นเข้ามา — คืนรายการช่องที่ถูกดูด */
export function magnetHarvest(maze, pac, radius = 3) {
  const got = [];
  const cx = Math.round(pac.x);
  const cy = Math.round(pac.y);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (Math.hypot(dx, dy) > radius) continue;
      const t = tileAt(maze, cx + dx, cy + dy);
      if (t === T.PELLET) got.push({ x: cx + dx, y: cy + dy });
    }
  }
  return got;
}
