// หน้าจอซ้อนทั้งหมด: เมนูหลัก, หยุดพัก, จบเกม, ภารกิจ, ตารางคะแนน, สกิน, ตั้งค่า

import * as store from './storage.js';
import * as lb from './leaderboard.js';
import * as missions from './missions.js';
import { SKINS } from './render.js';

const overlay = () => document.getElementById('overlay');
const sheet = () => document.getElementById('sheet');

let handlers = {};

export function initUi(h) {
  handlers = h;
  // ใช้ event delegation ทีเดียว — เนื้อหาในชีทถูกสร้างใหม่บ่อย
  sheet().addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'skin') {
      chooseSkin(btn.dataset.skin);
      return;
    }
    if (act === 'toggle') {
      const key = btn.dataset.key;
      const next = !store.get(key);
      store.set({ [key]: next });
      handlers.onSetting?.(key, next);
      btn.setAttribute('aria-checked', String(next));
      return;
    }
    handlers[act]?.();
  });
}

export function show(html) {
  sheet().innerHTML = html;
  overlay().hidden = false;
}

export function hide() {
  overlay().hidden = true;
}

export function isOpen() {
  return !overlay().hidden;
}

// ── ชิ้นส่วนที่ใช้ซ้ำ ───────────────────────────────────────
function missionPanel() {
  const list = missions.load();
  const rows = list.map((m) => {
    const pct = Math.min(100, Math.round((m.progress / m.goal) * 100));
    return `
      <div class="row ${m.done ? 'done' : ''}">
        <span class="grow">
          ${m.done ? '✓ ' : ''}${m.text}
          <span class="progress"><i style="width:${pct}%"></i></span>
        </span>
        <span class="val">${Math.min(m.progress, m.goal)}/${m.goal}</span>
      </div>`;
  }).join('');
  return `
    <div class="panel">
      <h3>ภารกิจวันนี้ · <span class="coins">🪙 ${store.get('coins')}</span></h3>
      ${rows}
    </div>`;
}

function leaderboardPanel(highlight) {
  const list = lb.top();
  if (!list.length) {
    return `<div class="panel"><h3>อันดับสูงสุด</h3>
      <div class="row"><span class="grow">ยังไม่มีสถิติ — เล่นเลย!</span></div></div>`;
  }
  const rows = list.map((s, i) => `
    <div class="row ${highlight === i + 1 ? 'me' : ''}">
      <span class="num">${i + 1}</span>
      <span class="grow">ด่าน ${s.level} · ${s.date}</span>
      <span class="val">${s.score.toLocaleString('th-TH')}</span>
    </div>`).join('');
  return `<div class="panel"><h3>อันดับสูงสุด</h3>${rows}</div>`;
}

function skinPanel() {
  const coins = store.get('coins');
  const unlocked = store.get('unlocked');
  const current = store.get('skin');
  const items = Object.entries(SKINS).map(([id, s]) => {
    const owned = unlocked.includes(id);
    return `
      <button class="skin ${owned ? '' : 'locked'} ${current === id ? 'selected' : ''}"
              data-act="skin" data-skin="${id}" type="button"
              style="background:${s.color}" title="${s.name}"
              aria-label="${s.name}${owned ? '' : ` ราคา ${s.cost} เหรียญ`}">
        ${owned ? '' : s.cost}
      </button>`;
  }).join('');
  return `
    <div class="panel">
      <h3>สกิน · <span class="coins">🪙 ${coins}</span></h3>
      <div class="skins">${items}</div>
    </div>`;
}

function settingsPanel() {
  const row = (key, label) => `
    <div class="toggle-row">
      <span>${label}</span>
      <button class="switch" data-act="toggle" data-key="${key}" role="switch"
              aria-checked="${store.get(key)}" aria-label="${label}" type="button"></button>
    </div>`;
  return `<div class="panel"><h3>ตั้งค่า</h3>${row('sound', 'เสียง')}${row('haptics', 'สั่นเมื่อกินผี')}</div>`;
}

function chooseSkin(id) {
  const s = SKINS[id];
  if (!s) return;
  const unlocked = store.get('unlocked');
  if (unlocked.includes(id)) {
    store.set({ skin: id });
  } else if (store.get('coins') >= s.cost) {
    store.addCoins(-s.cost);
    store.set({ unlocked: [...unlocked, id], skin: id });
  } else {
    handlers.onNotEnoughCoins?.(s.cost - store.get('coins'));
    return;
  }
  handlers.onSkin?.(store.get('skin'));
  handlers.refresh?.();
}

// ── หน้าจอต่างๆ ────────────────────────────────────────────
export function menu() {
  show(`
    <h1>PAC RUSH</h1>
    <p class="tagline">ปัดนิ้วเก็บเม็ดถั่ว · เก็บ power-up · ต่อคอมโบให้สุด</p>
    <button class="btn" data-act="start" type="button">▶ เริ่มเล่น</button>
    ${missionPanel()}
    ${skinPanel()}
    ${leaderboardPanel()}
    ${settingsPanel()}
    <button class="btn ghost" data-act="howto" type="button">วิธีเล่น</button>
  `);
}

export function howto() {
  show(`
    <h2>วิธีเล่น</h2>
    <div class="panel">
      <div class="row"><span class="grow">ปัดนิ้วที่สนาม หรือกดปุ่มลูกศรด้านล่าง เพื่อเปลี่ยนทิศ
      — สั่งล่วงหน้าก่อนถึงทางแยกได้เลย ตัวจะเลี้ยวให้เองพอดี</span></div>
      <div class="row"><span class="grow">เม็ดใหญ่ที่เรืองแสงทำให้ผีกลัว กินได้ 200 → 400 → 800 → 1600</span></div>
      <div class="row"><span class="grow">กินติดต่อกันเร็วๆ จะได้คอมโบ ตัวคูณสูงสุด x10</span></div>
      <div class="row"><span class="grow">⏳ ผีอืด · 🧲 ดูดเม็ดถั่ว · 🛡️ กันตาย 1 ครั้ง · ❄️ แช่แข็งผี · ✨ คะแนนคูณสอง · ⚡ วิ่งไว</span></div>
      <div class="row"><span class="grow">อุโมงค์ซ้าย-ขวาทะลุถึงกัน ใช้หนีผีได้ และผีจะวิ่งช้าลงในอุโมงค์</span></div>
      <div class="row"><span class="grow">ผีแดงจะดุขึ้นเมื่อเม็ดถั่วเหลือน้อย — ระวังช่วงท้ายด่าน</span></div>
    </div>
    <button class="btn" data-act="back" type="button">เข้าใจแล้ว</button>
  `);
}

export function paused(game) {
  show(`
    <h2>หยุดพัก</h2>
    <p class="sub-line">ด่าน ${game.level} · ${game.maze.name} · ${game.score.toLocaleString('th-TH')} คะแนน</p>
    <button class="btn" data-act="resume" type="button">▶ เล่นต่อ</button>
    <button class="btn secondary" data-act="restart" type="button">เริ่มด่านใหม่ทั้งเกม</button>
    ${settingsPanel()}
    <button class="btn ghost" data-act="quit" type="button">กลับเมนูหลัก</button>
  `);
}

export function gameOver({ result, rank, isRecord, newlyDone, coins }) {
  const missionBlock = newlyDone.length
    ? `<div class="panel"><h3>ภารกิจสำเร็จ · +🪙 ${coins}</h3>
        ${newlyDone.map((m) => `<div class="row done"><span class="grow">✓ ${m.text}</span></div>`).join('')}
      </div>`
    : '';
  return show(`
    <h2>${isRecord ? 'สถิติใหม่!' : 'จบเกม'}</h2>
    <div class="big-score">${result.score.toLocaleString('th-TH')}</div>
    <p class="sub-line">
      ไปถึงด่าน ${result.level} · กินผี ${result.ghostsEaten} ตัว · คอมโบสูงสุด x${result.bestCombo}
      ${rank ? `<br><span class="record">อันดับที่ ${rank} ของเครื่องนี้</span>` : ''}
    </p>
    <button class="btn" data-act="start" type="button">▶ เล่นอีกครั้ง</button>
    ${missionBlock}
    ${leaderboardPanel(rank)}
    <button class="btn ghost" data-act="quit" type="button">กลับเมนูหลัก</button>
  `);
}

export function refreshMenu() {
  menu();
}
