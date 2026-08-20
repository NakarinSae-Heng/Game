// เก็บข้อมูลผู้เล่นใน localStorage — ไม่มีเซิร์ฟเวอร์ ไม่ต้องล็อกอิน

const KEY = 'pacrush.v1';

const DEFAULTS = {
  best: 0,
  coins: 0,
  scores: [],          // [{ score, level, date }]
  skin: 'classic',
  unlocked: ['classic'],
  sound: true,
  haptics: true,
  missionDay: '',
  missionState: [],    // [{ id, progress, claimed }]
  totals: { games: 0, ghostsEaten: 0, levelsCleared: 0, pellets: 0 },
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const data = JSON.parse(raw);
    return { ...DEFAULTS, ...data, totals: { ...DEFAULTS.totals, ...(data.totals || {}) } };
  } catch {
    return { ...DEFAULTS };
  }
}

let state = read();

export function all() {
  return state;
}

export function get(key) {
  return state[key];
}

export function set(patch) {
  state = { ...state, ...patch };
  save();
  return state;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // โหมดส่วนตัวของ Safari อาจเขียนไม่ได้ — เกมยังเล่นได้ แค่ไม่จำ
  }
}

export function addCoins(n) {
  set({ coins: Math.max(0, state.coins + n) });
  return state.coins;
}

export function bumpTotals(patch) {
  const t = { ...state.totals };
  for (const [k, v] of Object.entries(patch)) t[k] = (t[k] || 0) + v;
  set({ totals: t });
}

export function reset() {
  state = { ...DEFAULTS };
  save();
}
