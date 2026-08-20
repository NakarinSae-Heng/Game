// Juice: ประกายไฟ, ตัวเลขคะแนนลอย, จอสั่น, สโลโมชัน, แฟลช, สั่นเครื่อง

import { CFG } from './config.js';

const REDUCED = typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Fx {
  constructor() {
    this.particles = [];
    this.texts = [];
    this.rings = [];
    this.shake = 0;
    this.flash = 0;
    this.flashColor = '#fff';
    this.slowMo = 0;
    this.hitstop = 0;
    this.haptics = true;
  }

  clear() {
    this.particles.length = 0;
    this.texts.length = 0;
    this.rings.length = 0;
    this.shake = 0;
    this.flash = 0;
    this.slowMo = 0;
    this.hitstop = 0;
  }

  /** ตัวคูณเวลาของเกม (สโลโมชัน / หยุดภาพชั่วขณะ) */
  timeScale() {
    if (this.hitstop > 0) return 0;
    if (this.slowMo > 0) return CFG.fx.slowMoFactor;
    return 1;
  }

  burst(x, y, color, count = 14, power = 6) {
    if (REDUCED) count = Math.min(count, 5);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const v = power * (0.45 + Math.random() * 0.8);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0.35 + Math.random() * 0.45,
        max: 0.8,
        r: 0.06 + Math.random() * 0.1,
        color,
      });
    }
  }

  spark(x, y, color) {
    this.burst(x, y, color, 5, 3.2);
  }

  text(x, y, str, color = '#fff', size = 1, rise = 1.6) {
    this.texts.push({ x, y, str, color, size, life: 0.9, max: 0.9, rise });
  }

  ring(x, y, color, maxR = 3.2) {
    if (REDUCED) return;
    this.rings.push({ x, y, color, r: 0.2, maxR, life: 0.45, max: 0.45 });
  }

  addShake(amount) {
    if (REDUCED) amount *= 0.25;
    this.shake = Math.min(CFG.fx.shakeMax, this.shake + amount);
  }

  addFlash(color, amount = 0.5) {
    if (REDUCED) amount *= 0.35;
    this.flashColor = color;
    this.flash = Math.max(this.flash, amount);
  }

  addSlowMo(duration = CFG.fx.slowMoDuration) {
    if (REDUCED) return;
    this.slowMo = Math.max(this.slowMo, duration);
  }

  addHitstop(duration = CFG.fx.hitstop) {
    this.hitstop = Math.max(this.hitstop, duration);
  }

  vibrate(pattern) {
    if (!this.haptics || REDUCED) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch { /* บางเบราว์เซอร์ไม่รองรับ */ }
    }
  }

  /** เอฟเฟกต์เดินด้วยเวลาจริง (ไม่โดนสโลโมชัน) เพื่อให้ภาพลื่นตลอด */
  update(dt) {
    if (this.hitstop > 0) this.hitstop -= dt;
    if (this.slowMo > 0) this.slowMo -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * CFG.fx.shakeDecay);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3.2);

    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += CFG.fx.particleGravity * dt * 0.35;
      p.vx *= 0.97;
    }
    if (this.particles.length) this.particles = this.particles.filter((p) => p.life > 0);

    for (const t of this.texts) {
      t.life -= dt;
      t.y -= t.rise * dt;
    }
    if (this.texts.length) this.texts = this.texts.filter((t) => t.life > 0);

    for (const r of this.rings) {
      r.life -= dt;
      r.r += (r.maxR - r.r) * Math.min(1, dt * 9);
    }
    if (this.rings.length) this.rings = this.rings.filter((r) => r.life > 0);
  }

  shakeOffset() {
    if (this.shake <= 0) return { x: 0, y: 0 };
    const a = Math.random() * Math.PI * 2;
    return { x: Math.cos(a) * this.shake, y: Math.sin(a) * this.shake };
  }
}

export const reducedMotion = REDUCED;
