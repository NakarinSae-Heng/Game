// ภารกิจรายวัน
//
// สุ่มด้วย PRNG ที่ seed จากวันที่ (YYYY-MM-DD) — ทุกเครื่องได้ภารกิจชุดเดียวกัน
// ในวันเดียวกัน โดยไม่ต้องมีเซิร์ฟเวอร์เลย

import { CFG } from './config.js';
import * as store from './storage.js';

/** PRNG แบบ deterministic (mulberry32) */
export function makeRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// แม่พิมพ์ภารกิจ: stat คือชื่อตัวนับใน run stats, scope คือ 'run' (ในเกมเดียว)
// หรือ 'day' (สะสมข้ามเกมภายในวันนั้น)
const TEMPLATES = [
  { id: 'ghosts', scope: 'run', stat: 'ghostsEaten', goals: [4, 6, 8], text: (n) => `กินผี ${n} ตัวในเกมเดียว` },
  { id: 'combo', scope: 'run', stat: 'bestCombo', goals: [5, 7, 9], text: (n) => `ทำคอมโบให้ถึง x${n}` },
  { id: 'level', scope: 'run', stat: 'levelReached', goals: [2, 3, 4], text: (n) => `ไปให้ถึงด่าน ${n}` },
  { id: 'powerups', scope: 'run', stat: 'powerups', goals: [4, 6, 8], text: (n) => `เก็บ power-up ${n} ชิ้น` },
  { id: 'score', scope: 'run', stat: 'score', goals: [4000, 7000, 11000], text: (n) => `ทำคะแนนถึง ${n.toLocaleString('th-TH')}` },
  { id: 'flawless', scope: 'run', stat: 'flawlessLevels', goals: [1, 2], text: (n) => `จบด่านโดยไม่เสียชีวิต ${n} ด่าน` },
  { id: 'pellets', scope: 'day', stat: 'pellets', goals: [400, 700, 1000], text: (n) => `กินเม็ดถั่วรวม ${n} เม็ดวันนี้` },
  { id: 'fruit', scope: 'run', stat: 'fruit', goals: [2, 3], text: (n) => `เก็บผลไม้โบนัส ${n} ลูก` },
];

/** สร้างภารกิจของวันนี้ (ผลลัพธ์เหมือนกันทุกครั้งที่เรียกในวันเดียวกัน) */
export function generate(day = today()) {
  const rand = makeRandom(hashString(day));
  const pool = [...TEMPLATES];
  const out = [];
  for (let i = 0; i < CFG.missionCount && pool.length; i++) {
    const t = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    const goal = t.goals[Math.floor(rand() * t.goals.length)];
    out.push({
      key: `${t.id}:${goal}`,
      id: t.id,
      scope: t.scope,
      stat: t.stat,
      goal,
      text: t.text(goal),
      reward: CFG.missionCoinReward,
    });
  }
  return out;
}

/** โหลดสถานะภารกิจ และรีเซ็ตอัตโนมัติเมื่อขึ้นวันใหม่ */
export function load() {
  const day = today();
  const list = generate(day);
  if (store.get('missionDay') !== day) {
    store.set({
      missionDay: day,
      missionState: list.map((m) => ({ key: m.key, progress: 0, claimed: false })),
    });
  }
  const saved = store.get('missionState');
  return list.map((m) => {
    const s = saved.find((x) => x.key === m.key) || { progress: 0, claimed: false };
    return { ...m, progress: s.progress, claimed: s.claimed, done: s.progress >= m.goal };
  });
}

/**
 * อัปเดตความคืบหน้าจากสถิติของเกมที่เพิ่งจบ
 * @returns {{missions:Array, newlyDone:Array, coins:number}}
 */
export function applyRun(runStats) {
  const missions = load();
  const newlyDone = [];
  let coins = 0;

  const next = missions.map((m) => {
    let progress = m.progress;
    const v = runStats[m.stat] || 0;
    // 'run' = ผลงานในเกมเดียว (เอาค่าที่ดีที่สุด), 'day' = สะสมทั้งวัน
    progress = m.scope === 'day' ? progress + v : Math.max(progress, v);

    const done = progress >= m.goal;
    let claimed = m.claimed;
    if (done && !claimed) {
      claimed = true;
      coins += m.reward;
      newlyDone.push({ ...m, progress });
    }
    return { key: m.key, progress, claimed };
  });

  store.set({ missionState: next });
  if (coins) store.addCoins(coins);
  return { missions: load(), newlyDone, coins };
}
