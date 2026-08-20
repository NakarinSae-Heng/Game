// ค่าปรับจูนทั้งหมดของเกมรวมอยู่ที่ไฟล์นี้ที่เดียว
// หน่วยความเร็ว = "ช่อง (tile) ต่อวินาที", หน่วยเวลา = วินาที

export const TICK = 1 / 60; // fixed timestep

export const CFG = {
  // ── ผู้เล่น ────────────────────────────────────────────────
  pac: {
    speed: 8.6,
    dashMul: 1.4,
    // ระยะจากกลางช่องที่ยังยอมให้เลี้ยว (ตัดมุมได้เหมือนต้นฉบับ)
    cornerSlack: 0.38,
    // อายุของทิศที่สั่งค้างไว้ — swipe ล่วงหน้าก่อนถึงทางแยกได้
    turnBuffer: 0.45,
    radius: 0.46,
  },

  // ── ผี ────────────────────────────────────────────────────
  ghost: {
    speed: 8.0,
    frightSpeed: 4.9,
    eatenSpeed: 17.0,
    tunnelSpeed: 4.6,
    houseSpeed: 5.0,
    elroySpeedBonus: [0.9, 1.6], // ขั้นที่ 1 / ขั้นที่ 2 (ช่อง/วินาที)
    radius: 0.46,
  },

  // ── การชน ─────────────────────────────────────────────────
  // ระยะห่างระหว่างจุดศูนย์กลาง (หน่วยช่อง) ที่ถือว่าโดนกัน
  hitDistance: 0.72,

  // ── คะแนน ─────────────────────────────────────────────────
  score: {
    pellet: 10,
    power: 50,
    ghostChain: [200, 400, 800, 1600],
    powerupPickup: 75,
    extraLifeEvery: 10000,
    levelClearBonus: 500,
  },

  // ── ชีวิต / รอบเกม ────────────────────────────────────────
  lives: 3,
  maxLives: 5,
  readyDuration: 2.2,
  deathDuration: 1.6,
  levelClearDuration: 1.8,

  // ── คอมโบ ─────────────────────────────────────────────────
  combo: {
    window: 1.25,   // กินอีกชิ้นภายในกี่วินาทีจึงต่อคอมโบ
    perStep: 3,     // กินกี่ชิ้นต่อการเพิ่มตัวคูณ 1 ขั้น
    maxMul: 10,
  },

  // ── ผลไม้โบนัส ────────────────────────────────────────────
  fruit: {
    // โผล่เมื่อกิน pellet ครบจำนวนนี้
    thresholds: [70, 170],
    lifetime: 9.5,
    // คะแนนตามด่าน (ด่านเกินจากนี้ใช้ค่าท้ายสุด)
    points: [100, 300, 500, 700, 1000, 2000, 3000, 5000],
    names: ['🍒', '🍓', '🍊', '🍎', '🍈', '🍇', '🔔', '🔑'],
  },

  // ── Power-up ที่ผมเพิ่มเข้ามา (ไม่มีในต้นฉบับ) ────────────
  powerup: {
    firstSpawn: 9,        // วินาทีแรกที่เริ่มโผล่
    spawnEvery: [13, 20], // ช่วงสุ่มเวลาระหว่างการโผล่
    lifetime: 11,         // อยู่บนสนามกี่วินาทีก่อนหาย
    blinkAt: 3.5,         // เหลือกี่วินาทีจึงกระพริบเตือน
    maxOnField: 2,
  },

  // ── ตารางเวลา scatter/chase (วินาที) ต่อกลุ่มด่าน ────────
  // สลับไปเรื่อยๆ; ตัวสุดท้ายคือ chase ที่ไม่มีวันหมด
  modeTable: [
    { upTo: 1, phases: [7, 20, 7, 20, 5, 20, 5, Infinity] },
    { upTo: 4, phases: [7, 20, 7, 20, 5, 1033 / 60, 1 / 60, Infinity] },
    { upTo: Infinity, phases: [5, 20, 5, 20, 5, 1037 / 60, 1 / 60, Infinity] },
  ],

  // ── ความยากตามด่าน ───────────────────────────────────────
  frightenedTime: [8, 7, 6, 5, 4.5, 4, 3.5, 3, 2.5, 2],
  // ความเร็วผีเพิ่มขึ้นต่อด่าน (บวกสะสม, เพดานที่ speedCap)
  ghostSpeedPerLevel: 0.22,
  ghostSpeedCap: 10.6,
  // Pinky ดักหน้าไกลขึ้นตามด่าน
  pinkyLookahead: [4, 4, 5, 5, 6, 6, 7],
  // Cruise Elroy: Blinky ดุขึ้นเมื่อ pellet เหลือน้อย
  elroyThresholds: [
    { level: 1, t1: 20, t2: 10 },
    { level: 2, t1: 30, t2: 15 },
    { level: 5, t1: 40, t2: 20 },
    { level: 9, t1: 60, t2: 30 },
  ],

  // ── Juice / เอฟเฟกต์ ─────────────────────────────────────
  fx: {
    shakeDecay: 7.5,
    shakeMax: 0.9,          // หน่วยช่อง
    slowMoFactor: 0.28,
    slowMoDuration: 0.28,
    hitstop: 0.06,
    particleGravity: 14,
  },

  // ── ภารกิจรายวัน ─────────────────────────────────────────
  missionCount: 3,
  missionCoinReward: 20,

  leaderboardSize: 10,
};

// จำนวน pellet ที่เหลือ ซึ่งทำให้ Blinky เข้าโหมด Elroy
export function elroyFor(level) {
  let cur = CFG.elroyThresholds[0];
  for (const e of CFG.elroyThresholds) if (level >= e.level) cur = e;
  return cur;
}

export function pickByLevel(arr, level) {
  return arr[Math.min(level - 1, arr.length - 1)];
}

export function frightenedTimeFor(level) {
  return pickByLevel(CFG.frightenedTime, level);
}

export function modePhasesFor(level) {
  for (const row of CFG.modeTable) if (level <= row.upTo) return row.phases;
  return CFG.modeTable[CFG.modeTable.length - 1].phases;
}

export function ghostSpeedFor(level) {
  return Math.min(
    CFG.ghostSpeedCap,
    CFG.ghost.speed + (level - 1) * CFG.ghostSpeedPerLevel
  );
}

export function fruitPointsFor(level) {
  return pickByLevel(CFG.fruit.points, level);
}

export function fruitIconFor(level) {
  return pickByLevel(CFG.fruit.names, level);
}
