import { CFG } from '../config.js';
import { DIR, opposite } from '../dir.js';
import { advance, moveToward } from '../movement.js';
import { passableGhost, isTunnel } from '../maze.js';
import { targetFor, chooseDir, chooseRandomDir, SCATTER_CORNERS } from '../ghostAI.js';

// สถานะของผี
export const G = {
  HOUSE: 'house',       // นอนรออยู่ในบ้าน
  LEAVING: 'leaving',   // กำลังออกจากบ้าน (เดินตามเส้นทางที่กำหนด)
  ROAM: 'roam',         // เดินตาม AI ปกติ (scatter หรือ chase)
  FRIGHT: 'fright',     // กลัว — สุ่มเดินและถูกกินได้
  EATEN: 'eaten',       // ถูกกินแล้ว เหลือแต่ตา วิ่งกลับบ้าน
  ENTERING: 'entering', // ถึงประตูแล้ว กำลังมุดเข้าบ้าน
};

export class Ghost {
  constructor(spec, index) {
    this.id = spec.id;
    this.name = spec.name;
    this.color = spec.color;
    this.index = index;
    this.releaseAt = spec.release;
    this.x = 0;
    this.y = 0;
    this.dir = DIR.left;
    this.state = G.HOUSE;
    this.blocked = false;
    this.frightT = 0;
    this.bob = 0;
    this.elroy = 0;
    this.homeSlot = { x: 0, y: 0 };
    this.exit = { x: 0, y: 0 };
  }

  get tileX() { return Math.round(this.x); }
  get tileY() { return Math.round(this.y); }

  reset(maze, level) {
    const h = maze.house;
    // ช่องนอนในบ้าน: บลิงกี้เริ่มนอกบ้าน, อีกสามตัวเรียงกันข้างใน
    const slots = [
      { x: h.centerX, y: h.doorRow - 1 },
      { x: h.centerX, y: h.centerY },
      { x: h.left + 0.5, y: h.centerY },
      { x: h.right - 0.5, y: h.centerY },
    ];
    const slot = slots[this.index] || slots[1];
    this.homeSlot = { x: slots[Math.max(1, this.index)].x, y: slots[Math.max(1, this.index)].y };
    this.exit = { x: h.centerX, y: h.doorRow - 1 };
    this.x = slot.x;
    this.y = slot.y;
    this.dir = this.index === 0 ? DIR.left : DIR.up;
    this.state = this.index === 0 ? G.ROAM : G.HOUSE;
    this.blocked = false;
    this.frightT = 0;
    this.bob = 0;
    this.elroy = 0;
    // ด่านสูงขึ้น ผีออกจากบ้านไวขึ้น
    this.timer = this.releaseAt / (1 + (level - 1) * 0.16);
    this.path = null;
  }

  get frightened() {
    return this.state === G.FRIGHT;
  }

  get edible() {
    return this.state === G.FRIGHT;
  }

  get isEyes() {
    return this.state === G.EATEN || this.state === G.ENTERING;
  }

  /** เข้าโหมดกลัว — กลับหลังหันทันทีเหมือนต้นฉบับ */
  frighten(duration) {
    if (this.state === G.EATEN || this.state === G.ENTERING) return;
    if (this.state === G.HOUSE || this.state === G.LEAVING) {
      this.frightT = duration; // จะติดโหมดกลัวทันทีที่ออกจากบ้าน
      return;
    }
    if (this.state !== G.FRIGHT) this.dir = opposite(this.dir) || this.dir;
    this.state = G.FRIGHT;
    this.frightT = duration;
  }

  /** ถูกกิน */
  eat() {
    this.state = G.EATEN;
    this.frightT = 0;
  }

  currentSpeed(ctx) {
    const { level, maze } = ctx;
    switch (this.state) {
      case G.EATEN:
        return CFG.ghost.eatenSpeed;
      case G.ENTERING:
      case G.LEAVING:
        return CFG.ghost.houseSpeed;
      case G.FRIGHT:
        return CFG.ghost.frightSpeed;
      default: {
        let s = ctx.ghostSpeed;
        if (this.elroy > 0) s += CFG.ghost.elroySpeedBonus[this.elroy - 1];
        if (isTunnel(maze, this.x, this.y)) s = Math.min(s, CFG.ghost.tunnelSpeed);
        return s * ctx.ghostSpeedMul;
      }
    }
  }

  update(dt, ctx) {
    const { maze } = ctx;

    // ── รออยู่ในบ้าน ────────────────────────────────────
    if (this.state === G.HOUSE) {
      // นาฬิกาโหมดกลัวต้องเดินต่อแม้อยู่ในบ้าน ไม่งั้นผีจะโผล่ออกมาแบบกลัว
      // หลังจาก power pellet หมดฤทธิ์ไปนานแล้ว
      if (this.frightT > 0) this.frightT = Math.max(0, this.frightT - dt);
      this.bob += dt * 3.4;
      this.y = this.homeSlot.y + Math.sin(this.bob) * 0.22;
      this.timer -= dt;
      if (this.timer <= 0 || ctx.forceRelease) {
        this.state = G.LEAVING;
        this.path = [
          { x: this.exit.x, y: this.homeSlot.y },
          { x: this.exit.x, y: this.exit.y },
        ];
      }
      return;
    }

    // ── ออกจากบ้าน / มุดเข้าบ้าน (เดินตามเส้นทางที่วางไว้) ──
    if (this.state === G.LEAVING || this.state === G.ENTERING) {
      let dist = this.currentSpeed(ctx) * dt;
      while (dist > 1e-6 && this.path && this.path.length) {
        const wp = this.path[0];
        const before = Math.abs(this.x - wp.x) + Math.abs(this.y - wp.y);
        const done = moveToward(this, wp.x, wp.y, dist);
        const after = Math.abs(this.x - wp.x) + Math.abs(this.y - wp.y);
        dist -= Math.max(0, before - after);
        if (done) this.path.shift();
        else break;
      }
      if (!this.path || !this.path.length) {
        if (this.state === G.LEAVING) {
          // ออกมาถึงเหนือประตูแล้ว: หันข้างและส่งต่อให้ AI คุม
          this.dir = this.index % 2 === 0 ? DIR.left : DIR.right;
          if (!passableGhost(maze, this.tileX + this.dir.x, this.tileY + this.dir.y, false)) {
            this.dir = opposite(this.dir);
          }
          this.state = this.frightT > 0 ? G.FRIGHT : G.ROAM;
        } else {
          // มุดเข้าบ้านครบแล้ว: พักครู่แล้วออกใหม่
          this.state = G.HOUSE;
          this.timer = 0.6;
        }
      }
      return;
    }

    // ── โหมดกลัว: นับเวลาถอยหลัง ────────────────────────
    if (this.state === G.FRIGHT) {
      this.frightT -= dt;
      if (this.frightT <= 0) {
        this.frightT = 0;
        this.state = G.ROAM;
      }
    }

    // ── เดินตาม AI ──────────────────────────────────────
    const allowHouse = this.state === G.EATEN;
    const speed = this.currentSpeed(ctx);

    advance(this, speed * dt, (x, y) => passableGhost(maze, x, y, allowHouse), () => {
      this.decide(ctx);
    });
  }

  /** ตัดสินใจเลี้ยวที่กลางช่อง */
  decide(ctx) {
    const { maze, pac, blinky, level, rand } = ctx;

    if (this.state === G.EATEN) {
      const door = { x: maze.house.doorCols[0], y: maze.house.doorRow - 1 };
      if (this.tileX === door.x && this.tileY === door.y) {
        // ถึงหน้าประตู — เปลี่ยนไปเดินตามเส้นทางเข้าบ้าน
        this.state = G.ENTERING;
        this.path = [
          { x: maze.house.centerX, y: maze.house.doorRow - 1 },
          { x: maze.house.centerX, y: this.homeSlot.y },
          { x: this.homeSlot.x, y: this.homeSlot.y },
        ];
        return;
      }
      this.dir = chooseDir(maze, this, door, true);
      return;
    }

    if (this.state === G.FRIGHT) {
      this.dir = chooseRandomDir(maze, this, rand);
      return;
    }

    // scatter หรือ chase — บลิงกี้ตอน Elroy จะไล่ตลอดไม่ยอม scatter
    const chasing = ctx.mode === 'chase' || (this.id === 'blinky' && this.elroy > 0);
    const target = chasing
      ? targetFor(this, pac, blinky, level)
      : SCATTER_CORNERS[this.id];
    this.dir = chooseDir(maze, this, target, false);
    this.lastTarget = target;
  }
}
