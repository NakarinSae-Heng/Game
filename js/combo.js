// คอมโบ: กินต่อเนื่องเร็วๆ แล้วตัวคูณคะแนนจะไต่ขึ้น หยุดกินแล้วรีเซ็ต

import { CFG } from './config.js';

export class Combo {
  constructor() {
    this.count = 0;
    this.timer = 0;
    this.mul = 1;
    this.best = 0;
    this.justUp = false;
  }

  reset() {
    this.count = 0;
    this.timer = 0;
    this.mul = 1;
    this.justUp = false;
  }

  /** เรียกทุกครั้งที่กินอะไรได้ — คืนตัวคูณล่าสุด */
  hit() {
    this.count++;
    this.timer = CFG.combo.window;
    const next = Math.min(CFG.combo.maxMul, 1 + Math.floor(this.count / CFG.combo.perStep));
    this.justUp = next > this.mul;
    this.mul = next;
    if (this.mul > this.best) this.best = this.mul;
    return this.mul;
  }

  update(dt) {
    this.justUp = false;
    if (this.timer <= 0) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.count = 0;
      this.mul = 1;
    }
  }
}
