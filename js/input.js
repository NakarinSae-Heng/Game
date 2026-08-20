// รวมการควบคุมทั้งสามแบบให้เป็นทิศเดียว: ปัดนิ้ว, ปุ่มบนหน้าจอ, คีย์บอร์ด

import { DIR } from './dir.js';

const SWIPE_MIN = 24;      // px ที่ต้องปัดก่อนจะนับเป็นทิศ
const SWIPE_RATIO = 1.25;  // แกนหลักต้องชนะแกนรองเท่านี้ กันการปัดเฉียง

const KEYMAP = {
  ArrowUp: DIR.up, ArrowDown: DIR.down, ArrowLeft: DIR.left, ArrowRight: DIR.right,
  KeyW: DIR.up, KeyS: DIR.down, KeyA: DIR.left, KeyD: DIR.right,
  KeyK: DIR.up, KeyJ: DIR.down, KeyH: DIR.left, KeyL: DIR.right,
};

export function createInput({ stage, dpad, onDir, onPause, onFirstInput }) {
  let firstDone = false;
  const fireFirst = () => {
    if (firstDone) return;
    firstDone = true;
    onFirstInput?.();
  };

  const emit = (dir) => {
    if (!dir) return;
    fireFirst();
    onDir(dir);
  };

  // ── ปัดนิ้วบนสนาม ──────────────────────────────────────
  // ยิงทิศทันทีที่เกินระยะขั้นต่ำ (ไม่รอยกนิ้ว) เพื่อให้ไม่หน่วง
  // และรีเซ็ตจุดอ้างอิงเพื่อให้ปัดต่อเนื่องเป็นทิศใหม่ได้ในนิ้วเดียว
  const active = new Map();

  const onDown = (ev) => {
    active.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, fired: false });
    fireFirst();
  };

  const onMove = (ev) => {
    const s = active.get(ev.pointerId);
    if (!s) return;
    const dx = ev.clientX - s.x;
    const dy = ev.clientY - s.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (Math.max(adx, ady) < SWIPE_MIN) return;

    let dir = null;
    if (adx > ady * SWIPE_RATIO) dir = dx > 0 ? DIR.right : DIR.left;
    else if (ady > adx * SWIPE_RATIO) dir = dy > 0 ? DIR.down : DIR.up;
    if (!dir) return;

    emit(dir);
    s.fired = true;
    s.x = ev.clientX;
    s.y = ev.clientY;
  };

  const onUp = (ev) => {
    const s = active.get(ev.pointerId);
    active.delete(ev.pointerId);
    // แตะสั้นๆ โดยไม่ปัด = ไม่ทำอะไร (กันการเปลี่ยนทิศโดยไม่ตั้งใจ)
    return s;
  };

  stage.addEventListener('pointerdown', onDown, { passive: true });
  stage.addEventListener('pointermove', onMove, { passive: true });
  stage.addEventListener('pointerup', onUp, { passive: true });
  stage.addEventListener('pointercancel', onUp, { passive: true });

  // ── ปุ่ม D-pad ─────────────────────────────────────────
  // ใช้ pointerdown เพื่อให้ตอบสนองทันที และ setPointerCapture ให้ลากนิ้ว
  // ข้ามปุ่มได้โดยไม่หลุด
  const held = new Set();
  const paint = () => {
    dpad.querySelectorAll('.dbtn').forEach((b) => {
      b.classList.toggle('active', held.has(b.dataset.dir));
    });
  };

  dpad.querySelectorAll('.dbtn').forEach((btn) => {
    const dirName = btn.dataset.dir;
    const press = (ev) => {
      ev.preventDefault();
      held.add(dirName);
      paint();
      emit(DIR[dirName]);
    };
    const release = (ev) => {
      ev.preventDefault();
      held.delete(dirName);
      paint();
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerenter', (ev) => {
      if (ev.buttons) press(ev);
    });
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('contextmenu', (ev) => ev.preventDefault());
  });

  // กดปุ่มค้างไว้ = สั่งทิศซ้ำ เพื่อให้เลี้ยวได้เมื่อถึงทางแยกถัดไป
  const repeat = setInterval(() => {
    for (const name of held) onDir(DIR[name]);
  }, 90);

  // ── คีย์บอร์ด (เดสก์ท็อป / ทดสอบ) ──────────────────────
  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'Space' || ev.code === 'Escape' || ev.code === 'KeyP') {
      ev.preventDefault();
      fireFirst();
      onPause?.();
      return;
    }
    const dir = KEYMAP[ev.code];
    if (dir) {
      ev.preventDefault();
      emit(dir);
    }
  });

  // กันการซูมด้วยสองนิ้ว / ดับเบิลแท็บบน iOS
  document.addEventListener('gesturestart', (ev) => ev.preventDefault());
  document.addEventListener('dblclick', (ev) => ev.preventDefault());

  return {
    destroy() {
      clearInterval(repeat);
    },
  };
}
