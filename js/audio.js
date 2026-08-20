// เสียงทั้งหมดสังเคราะห์ด้วย WebAudio — ไม่มีไฟล์เสียงให้ดาวน์โหลด
// เกมจึงโหลดไว, เล่นออฟไลน์ได้, และไม่ต้องรอ asset

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.wakaFlip = false;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenLevel = 0;
  }

  /** ต้องเรียกจากภายใน event ที่ผู้ใช้แตะ (ข้อบังคับของ iOS/Chrome) */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? 0.5 : 0;
    this.master.connect(this.ctx.destination);
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) {
      this.master.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.02);
    }
    if (!on) this.stopSiren();
  }

  get ready() {
    return !!this.ctx && this.enabled;
  }

  /** โน้ตเดี่ยว */
  tone({ freq = 440, dur = 0.12, type = 'square', gain = 0.25, slideTo = null, delay = 0 }) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.2, gain = 0.2, freq = 900, q = 1 }) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(bp).connect(g).connect(this.master);
    src.start(t0);
  }

  // ── เสียงเหตุการณ์ในเกม ───────────────────────────────
  waka() {
    this.wakaFlip = !this.wakaFlip;
    this.tone({
      freq: this.wakaFlip ? 300 : 210,
      slideTo: this.wakaFlip ? 210 : 300,
      dur: 0.07,
      type: 'square',
      gain: 0.12,
    });
  }

  powerPellet() {
    [0, 0.09, 0.18].forEach((d, i) => {
      this.tone({ freq: 180 + i * 90, dur: 0.14, type: 'triangle', gain: 0.22, delay: d });
    });
  }

  eatGhost(chain = 0) {
    const base = 320 + chain * 110;
    [0, 0.07, 0.14, 0.21].forEach((d, i) => {
      this.tone({ freq: base * (1 + i * 0.28), dur: 0.13, type: 'square', gain: 0.2, delay: d });
    });
  }

  powerup() {
    [523, 659, 784, 1047].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.11, type: 'triangle', gain: 0.2, delay: i * 0.055 });
    });
  }

  fruit() {
    this.tone({ freq: 880, slideTo: 1400, dur: 0.18, type: 'sine', gain: 0.25 });
  }

  combo(level) {
    this.tone({ freq: 500 + level * 70, dur: 0.09, type: 'square', gain: 0.16 });
  }

  death() {
    this.stopSiren();
    if (!this.ready) return;
    for (let i = 0; i < 9; i++) {
      this.tone({
        freq: 620 - i * 55,
        slideTo: 520 - i * 55,
        dur: 0.11,
        type: 'sawtooth',
        gain: 0.2,
        delay: i * 0.085,
      });
    }
  }

  shieldBreak() {
    this.noise({ dur: 0.28, gain: 0.3, freq: 420, q: 0.7 });
    this.tone({ freq: 240, slideTo: 90, dur: 0.3, type: 'sawtooth', gain: 0.18 });
  }

  levelUp() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.16, type: 'triangle', gain: 0.24, delay: i * 0.1 });
    });
  }

  extraLife() {
    [784, 1047, 1319].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.2, type: 'sine', gain: 0.26, delay: i * 0.12 });
    });
  }

  gameOver() {
    this.stopSiren();
    [392, 330, 262, 196].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.32, type: 'triangle', gain: 0.24, delay: i * 0.22 });
    });
  }

  // ── ไซเรนพื้นหลัง: สูงขึ้นเมื่อกินเม็ดถั่วไปมาก = กดดันขึ้น ──
  startSiren() {
    if (!this.ready || this.sirenOsc) return;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 150;
    lfo.type = 'sine';
    lfo.frequency.value = 5;
    lfoGain.gain.value = 28;
    lfo.connect(lfoGain).connect(osc.frequency);
    g.gain.value = 0.05;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    osc.connect(lp).connect(g).connect(this.master);
    osc.start();
    lfo.start();
    this.sirenOsc = osc;
    this.sirenLfo = lfo;
    this.sirenGain = g;
  }

  stopSiren() {
    if (!this.sirenOsc) return;
    try {
      this.sirenOsc.stop();
      this.sirenLfo.stop();
    } catch { /* หยุดไปแล้ว */ }
    this.sirenOsc = null;
    this.sirenLfo = null;
    this.sirenGain = null;
  }

  /**
   * @param {number} pressure 0..1 ตามสัดส่วนเม็ดถั่วที่กินไปแล้ว
   * @param {boolean} frightened กำลังอยู่ในโหมดกินผีไหม
   */
  updateSiren(pressure, frightened) {
    if (!this.sirenOsc) return;
    const t = this.ctx.currentTime;
    const base = frightened ? 90 : 130 + pressure * 130;
    this.sirenOsc.frequency.setTargetAtTime(base, t, 0.25);
    this.sirenLfo.frequency.setTargetAtTime(frightened ? 11 : 4 + pressure * 5, t, 0.25);
    this.sirenGain.gain.setTargetAtTime(frightened ? 0.035 : 0.05, t, 0.2);
  }
}
