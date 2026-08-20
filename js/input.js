// รวมการควบคุมทั้งสามแบบให้เป็นทิศเดียว: ปัดนิ้ว, ปุ่มบนหน้าจอ, คีย์บอร์ด

import { DIR } from './dir.js';

const SWIPE_MIN = 24;      // px ที่ต้องปัดก่อนจะนับเป็นทิศ
const SWIPE_RATIO = 1.25;  // แกนหลักต้องชนะแกนรองเท่านี้ กันการปัดเฉียง

const KEYMAP = {
  ArrowUp: DIR.up, ArrowDown: DIR.down, ArrowLeft: DIR.left, ArrowRight: DIR.right,
  KeyW: DIR.up, KeyS: DIR.down, KeyA: DIR.left, KeyD: DIR.right,
  KeyK: DIR.up, KeyJ: DIR.down, KeyH: DIR.left, KeyL: DIR.right,
};

// ปัดนิ้วได้ทั่วจอ ยกเว้น "ตัวปุ่ม" จริงๆ — บนมือถือนิ้วโป้งอยู่ครึ่งล่าง
// ถ้าจำกัดให้ปัดได้แค่บนเมซ ผู้เล่นต้องเอื้อมขึ้นไปทุกครั้ง จึงเปิดให้พื้นที่
// ว่างข้าง D-pad ปัดได้ด้วย (กันไว้แค่ตัว D-pad, ปุ่ม และหน้าจอซ้อน)
const NO_SWIPE = '.dpad, button, .overlay';

export function createInput({ swipeArea, dpad, onDir, onPause, onFirstInput }) {
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
    if (ev.target.closest?.(NO_SWIPE)) return;
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

  swipeArea.addEventListener('pointerdown', onDown, { passive: true });
  swipeArea.addEventListener('pointermove', onMove, { passive: true });
  swipeArea.addEventListener('pointerup', onUp, { passive: true });
  swipeArea.addEventListener('pointercancel', onUp, { passive: true });

  // ── ปุ่ม D-pad ─────────────────────────────────────────
  // ใช้ pointerdown เพื่อให้ตอบสนองทันที และ setPointerCapture ให้ลากนิ้ว
  // ข้ามปุ่มได้โดยไม่หลุด
  const held = new Set();
  const dpadPointers = new Set();
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
    btn.addEventListener('pointerdown', (ev) => {
      dpadPointers.add(ev.pointerId);
      press(ev);
    });
    // ลากนิ้วข้ามไปปุ่มอื่นได้ แต่ต้องเป็นนิ้วที่เริ่มกดจาก D-pad เท่านั้น
    btn.addEventListener('pointerenter', (ev) => {
      if (ev.buttons && dpadPointers.has(ev.pointerId)) press(ev);
    });
    btn.addEventListener('pointerup', (ev) => {
      dpadPointers.delete(ev.pointerId);
      release(ev);
    });
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('pointercancel', (ev) => {
      dpadPointers.delete(ev.pointerId);
      release(ev);
    });
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

  // นิ้วหลุดออกนอกจอกลางทาง — ล้างสถานะปุ่มที่ค้างไว้
  window.addEventListener('pointerup', (ev) => dpadPointers.delete(ev.pointerId));
  window.addEventListener('pointercancel', (ev) => {
    dpadPointers.delete(ev.pointerId);
    held.clear();
    paint();
  });

  return {
    destroy() {
      clearInterval(repeat);
    },
  };
}
