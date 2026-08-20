import { CFG } from '../config.js';
import { DIR, isOpposite, sameDir } from '../dir.js';
import { advance } from '../movement.js';
import { passablePac, isTunnel } from '../maze.js';

export class Pacman {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.dir = DIR.left;
    this.want = null;      // ทิศที่ผู้เล่นสั่งไว้ (รอถึงทางแยก)
    this.wantAge = 0;
    this.blocked = false;
    this.mouth = 0;        // เฟสอนิเมชันปากอ้า-หุบ
    this.dead = false;
    this.deathT = 0;
    this.speedMul = 1;
  }

  reset(maze) {
    this.x = maze.pacStart.x;
    this.y = maze.pacStart.y;
    this.dir = DIR.left;
    this.want = null;
    this.wantAge = 0;
    this.blocked = false;
    this.mouth = 0;
    this.dead = false;
    this.deathT = 0;
  }

  /** ผู้เล่นสั่งทิศ — เก็บไว้แล้วค่อยใช้เมื่อถึงจุดที่เลี้ยวได้ */
  steer(dir) {
    if (!dir || dir === DIR.none) return;
    this.want = dir;
    this.wantAge = 0;
  }

  get tile() {
    return { x: Math.round(this.x), y: Math.round(this.y) };
  }

  update(dt, maze, speedMul = 1) {
    if (this.dead) {
      this.deathT += dt;
      return;
    }

    this.wantAge += dt;
    if (this.want && this.wantAge > CFG.pac.turnBuffer && !this.blocked) {
      this.want = null; // ทิศที่สั่งไว้นานเกินไป ทิ้งไป เพื่อไม่ให้เลี้ยวแบบไม่คาดคิด
    }

    this.tryTurn(maze);

    const tunnel = isTunnel(maze, this.x, this.y);
    const speed = CFG.pac.speed * speedMul * this.speedMul * (tunnel ? 0.92 : 1);
    const before = { x: this.x, y: this.y };

    advance(this, speed * dt, (x, y) => passablePac(maze, x, y), () => {
      this.tryTurn(maze);
    });

    const moved = Math.abs(this.x - before.x) + Math.abs(this.y - before.y);
    // ปากขยับตามระยะที่เดินจริง — หยุดเดินแล้วปากค้าง
    this.mouth = (this.mouth + moved * 3.4) % 1;
  }

  /**
   * พยายามเลี้ยวไปทิศที่สั่งไว้
   * - กลับหลัง: ทำได้ทันทีทุกที่ (แกนตั้งฉากจัดแนวอยู่แล้ว)
   * - เลี้ยว 90°: ทำได้เมื่ออยู่ใกล้กลางช่องพอ แล้ว snap เข้ากลางช่อง (ตัดมุม)
   */
  tryTurn(maze) {
    const want = this.want;
    if (!want) return;

    if (isOpposite(want, this.dir)) {
      this.dir = want;
      this.want = null;
      return;
    }
    if (sameDir(want, this.dir)) {
      this.want = null;
      return;
    }

    const tx = Math.round(this.x);
    const ty = Math.round(this.y);
    const offAxis = this.dir.x ? Math.abs(this.x - tx) : Math.abs(this.y - ty);
    const stopped = this.blocked || this.dir === DIR.none;

    if (offAxis <= CFG.pac.cornerSlack || stopped) {
      if (passablePac(maze, tx + want.x, ty + want.y)) {
        this.x = tx;
        this.y = ty;
        this.dir = want;
        this.want = null;
      }
    }
  }
}
