// แกนกลางการเล่น: รวมผู้เล่น ผี เม็ดถั่ว power-up คอมโบ และกฎทั้งหมดเข้าด้วยกัน

import {
  CFG, TICK, frightenedTimeFor, modePhasesFor, ghostSpeedFor,
  elroyFor, fruitPointsFor, fruitIconFor,
} from './config.js';
import { DIR, opposite } from './dir.js';
import { buildMaze, mazeForLevel, tileAt, setTile, T } from './maze.js';
import { tileDistance } from './movement.js';
import { Pacman } from './entities/pacman.js';
import { Ghost, G } from './entities/ghost.js';
import { GHOSTS, elroyStage } from './ghostAI.js';
import { PowerupManager, PU, magnetHarvest } from './powerups.js';
import { Combo } from './combo.js';

export const S = {
  READY: 'ready',
  PLAY: 'play',
  DYING: 'dying',
  CLEAR: 'clear',
  OVER: 'over',
};

function blankStats() {
  return {
    score: 0, ghostsEaten: 0, bestCombo: 1, levelReached: 1,
    powerups: 0, flawlessLevels: 0, fruit: 0, pellets: 0, deaths: 0,
  };
}

export class Game {
  constructor({ fx, audio, emit }) {
    this.fx = fx;
    this.audio = audio;
    this.emit = emit || (() => {});
    this.rand = Math.random;

    this.pac = new Pacman();
    this.ghosts = GHOSTS.map((spec, i) => new Ghost(spec, i));
    this.powerups = new PowerupManager(this.rand);
    this.combo = new Combo();

    this.maze = null;
    this.state = S.READY;
    this.level = 1;
    this.score = 0;
    this.lives = CFG.lives;
    this.time = 0;
    this.skinColor = '#ffd93d';
    this.nextExtraLife = CFG.score.extraLifeEvery;
    this.stats = blankStats();
  }

  // ── เริ่มเกมใหม่ ────────────────────────────────────────
  newGame() {
    this.level = 1;
    this.score = 0;
    this.lives = CFG.lives;
    this.nextExtraLife = CFG.score.extraLifeEvery;
    this.time = 0;
    this.stats = blankStats();
    this.powerups.reset(true);
    this.loadLevel(1);
  }

  loadLevel(level) {
    this.level = level;
    this.maze = buildMaze(mazeForLevel(level));
    this.pelletsLeft = this.maze.pelletTotal;
    this.pelletsEaten = 0;
    this.ghostSpeed = ghostSpeedFor(level);
    this.frightTime = frightenedTimeFor(level);
    this.phases = modePhasesFor(level);
    this.phaseIndex = 0;
    this.phaseTimer = this.phases[0];
    this.mode = 'scatter';
    this.ghostChain = 0;
    this.fruit = null;
    this.fruitsSpawned = 0;
    this.lostLifeThisLevel = false;
    this.elroyThresholds = elroyFor(level);
    this.powerups.reset(false);
    this.resetActors();
    this.stats.levelReached = Math.max(this.stats.levelReached, level);
    this.emit('level', { level, name: this.maze.name });
  }

  /** วางผู้เล่นและผีกลับจุดเริ่ม (ใช้ทั้งตอนเริ่มด่านและตอนเสียชีวิต) */
  resetActors() {
    this.pac.reset(this.maze);
    for (const g of this.ghosts) g.reset(this.maze, this.level);
    this.combo.reset();
    this.powerups.clearField();
    this.state = S.READY;
    this.stateTimer = CFG.readyDuration;
    this.fx.clear();
  }

  get blinky() {
    return this.ghosts[0];
  }

  get pelletProgress() {
    return this.maze ? 1 - this.pelletsLeft / this.maze.pelletTotal : 0;
  }

  get anyFrightened() {
    return this.ghosts.some((g) => g.state === G.FRIGHT);
  }

  // ── ลูปหลัก ─────────────────────────────────────────────
  /** @param {number} dt เวลาเกม (ถูกปรับด้วยสโลโมชันแล้ว) */
  update(dt) {
    this.time += dt;

    switch (this.state) {
      case S.READY:
        this.stateTimer -= dt;
        // ผีเริ่มขยับก่อนผู้เล่นเล็กน้อย ให้ดูมีชีวิต
        if (this.stateTimer <= 0) {
          this.state = S.PLAY;
          this.emit('go');
        }
        return;

      case S.DYING:
        this.stateTimer -= dt;
        this.pac.deathT += dt;
        if (this.stateTimer <= 0) this.afterDeath();
        return;

      case S.CLEAR:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this.loadLevel(this.level + 1);
        return;

      case S.OVER:
        return;

      default:
        break;
    }

    this.updateModeTimer(dt);
    this.combo.update(dt);
    this.powerups.update(dt, this.maze, this.pac);
    this.updateFruit(dt);
    this.updateElroy();

    this.pac.update(dt, this.maze, this.powerups.pacSpeedMul());
    this.eatAtPac();

    const ctx = {
      maze: this.maze,
      pac: this.pac,
      blinky: this.blinky,
      level: this.level,
      mode: this.mode,
      rand: this.rand,
      ghostSpeed: this.ghostSpeed,
      ghostSpeedMul: this.powerups.ghostSpeedMul(),
      forceRelease: this.pelletsEaten > 30 + this.level * 4,
    };
    for (const g of this.ghosts) g.update(dt, ctx);

    this.checkGhostCollisions();

    if (this.pelletsLeft <= 0) this.clearLevel();
  }

  updateModeTimer(dt) {
    if (this.anyFrightened) return; // โหมดกลัวหยุดนาฬิกา scatter/chase ไว้
    this.phaseTimer -= dt;
    if (this.phaseTimer > 0) return;
    this.phaseIndex = Math.min(this.phaseIndex + 1, this.phases.length - 1);
    this.phaseTimer = this.phases[this.phaseIndex];
    this.mode = this.phaseIndex % 2 === 0 ? 'scatter' : 'chase';
    // สลับโหมดแล้วผีต้องกลับหลังหันทันที (กฎของต้นฉบับ)
    for (const g of this.ghosts) {
      if (g.state === G.ROAM) g.dir = opposite(g.dir) || g.dir;
    }
    this.emit('mode', this.mode);
  }

  updateElroy() {
    const stage = elroyStage(this.pelletsLeft, this.elroyThresholds);
    if (stage !== this.blinky.elroy) {
      this.blinky.elroy = stage;
      if (stage > 0) this.emit('elroy', stage);
    }
  }

  // ── การกิน ──────────────────────────────────────────────
  eatAtPac() {
    const tx = Math.round(this.pac.x);
    const ty = Math.round(this.pac.y);
    const t = tileAt(this.maze, tx, ty);

    if (t === T.PELLET) {
      this.consumePellet(tx, ty, false);
    } else if (t === T.POWER) {
      this.consumePellet(tx, ty, true);
    }

    // แม่เหล็ก: ดูดเม็ดถั่วรอบตัว
    if (this.powerups.has(PU.MAGNET.id)) {
      for (const p of magnetHarvest(this.maze, this.pac, 3)) {
        this.consumePellet(p.x, p.y, false, true);
        this.fx.spark(p.x, p.y, this.maze.theme.pellet);
      }
    }

    // power-up ที่วางอยู่
    const got = this.powerups.pickupAt(tx, ty);
    if (got) this.onPowerup(got, tx, ty);

    // ผลไม้
    if (this.fruit && tileDistance(this.pac.x, this.pac.y, this.fruit.x, this.fruit.y) < 0.8) {
      this.onFruit();
    }
  }

  consumePellet(tx, ty, isPower, silent = false) {
    setTile(this.maze, tx, ty, T.EMPTY);
    this.pelletsLeft--;
    this.pelletsEaten++;
    this.stats.pellets++;

    const mul = this.combo.hit() * this.powerups.scoreMul();
    this.addScore((isPower ? CFG.score.power : CFG.score.pellet) * mul);

    if (this.combo.justUp && this.combo.mul > 1) {
      this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo.mul);
      this.fx.text(this.pac.x, this.pac.y - 0.8, `COMBO x${this.combo.mul}`, '#46e0ff', 0.85);
      this.fx.addFlash('#46e0ff', 0.22);
      this.audio.combo(this.combo.mul);
      this.fx.vibrate(12);
    }

    if (!silent) this.audio.waka();

    if (isPower) {
      this.ghostChain = 0;
      for (const g of this.ghosts) g.frighten(this.frightTime);
      this.fx.ring(tx, ty, '#ffffff', 4.5);
      this.fx.addShake(0.35);
      this.fx.addFlash('#8fa2ff', 0.5);
      this.audio.powerPellet();
      this.fx.vibrate([18, 28, 18]);
      this.emit('frightened', this.frightTime);
    }
  }

  onPowerup(def, tx, ty) {
    this.stats.powerups++;
    this.addScore(CFG.score.powerupPickup * this.powerups.scoreMul());
    this.fx.burst(tx, ty, def.color, 18, 7);
    this.fx.ring(tx, ty, def.color, 3.4);
    this.fx.text(tx, ty - 0.7, def.label, def.color, 0.9);
    this.fx.addShake(0.3);
    this.fx.addFlash(def.color, 0.25);
    this.audio.powerup();
    this.fx.vibrate([14, 20, 14]);
    if (def.id === PU.FREEZE.id) this.fx.addSlowMo(0.2);
    this.emit('powerup', def);
  }

  updateFruit(dt) {
    if (this.fruit) {
      this.fruit.life -= dt;
      if (this.fruit.life <= 0) this.fruit = null;
      return;
    }
    const next = CFG.fruit.thresholds[this.fruitsSpawned];
    if (next !== undefined && this.pelletsEaten >= next) {
      this.fruitsSpawned++;
      this.fruit = {
        x: this.maze.house.centerX,
        y: this.maze.house.bottom + 2,
        icon: fruitIconFor(this.level),
        points: fruitPointsFor(this.level),
        life: CFG.fruit.lifetime,
      };
      this.emit('fruit', this.fruit);
    }
  }

  onFruit() {
    const f = this.fruit;
    this.fruit = null;
    this.stats.fruit++;
    const pts = f.points * this.powerups.scoreMul();
    this.addScore(pts);
    this.fx.burst(f.x, f.y, '#ff5470', 22, 8);
    this.fx.text(f.x, f.y - 0.8, `+${pts}`, '#ffd93d', 1.1);
    this.fx.addShake(0.35);
    this.audio.fruit();
    this.fx.vibrate([16, 24, 16]);
  }

  // ── ชนกับผี ─────────────────────────────────────────────
  checkGhostCollisions() {
    for (const g of this.ghosts) {
      if (g.isEyes || g.state === G.HOUSE || g.state === G.LEAVING) continue;
      if (tileDistance(this.pac.x, this.pac.y, g.x, g.y) > CFG.hitDistance) continue;

      if (g.edible) {
        this.eatGhost(g);
      } else if (this.powerups.consumeShield()) {
        // เกราะรับไว้หนึ่งครั้ง แล้วผลักผีตัวนั้นให้ถอยและกลัวชั่วครู่
        g.frighten(2.2);
        this.fx.burst(g.x, g.y, '#4ee06a', 24, 9);
        this.fx.ring(this.pac.x, this.pac.y, '#4ee06a', 4);
        this.fx.addShake(0.7);
        this.fx.addFlash('#4ee06a', 0.5);
        this.fx.addHitstop(0.08);
        this.fx.text(this.pac.x, this.pac.y - 1, 'เกราะแตก!', '#4ee06a', 1);
        this.audio.shieldBreak();
        this.fx.vibrate([40, 30, 40]);
        this.emit('shield');
      } else {
        this.die();
        return;
      }
    }
  }

  eatGhost(g) {
    const pts = CFG.score.ghostChain[Math.min(this.ghostChain, 3)] * this.powerups.scoreMul();
    this.ghostChain++;
    this.stats.ghostsEaten++;
    this.addScore(pts);
    g.eat();

    this.fx.burst(g.x, g.y, '#8fa2ff', 26, 9);
    this.fx.ring(g.x, g.y, '#ffffff', 3.6);
    this.fx.text(g.x, g.y - 0.9, `+${pts}`, '#46e0ff', 1.15);
    this.fx.addShake(0.62);
    this.fx.addFlash('#ffffff', 0.6);
    this.fx.addHitstop(0.07);
    this.fx.addSlowMo();
    this.audio.eatGhost(this.ghostChain - 1);
    this.fx.vibrate([26, 18, 26]);
    this.emit('eatghost', { ghost: g.name, points: pts, chain: this.ghostChain });
  }

  die() {
    this.state = S.DYING;
    this.stateTimer = CFG.deathDuration;
    this.pac.dead = true;
    this.pac.deathT = 0;
    this.lostLifeThisLevel = true;
    this.stats.deaths++;
    this.combo.reset();
    this.fx.addShake(0.85);
    this.fx.addFlash('#ff5470', 0.55);
    this.fx.addHitstop(0.1);
    this.audio.death();
    this.fx.vibrate([70, 40, 90]);
    this.emit('death');
  }

  afterDeath() {
    this.lives--;
    if (this.lives <= 0) {
      this.state = S.OVER;
      this.audio.gameOver();
      this.emit('gameover', this.finish());
      return;
    }
    this.resetActors();
  }

  clearLevel() {
    this.state = S.CLEAR;
    this.stateTimer = CFG.levelClearDuration;
    this.addScore(CFG.score.levelClearBonus * this.level);
    if (!this.lostLifeThisLevel) this.stats.flawlessLevels++;
    this.fx.addFlash('#ffd93d', 0.6);
    this.fx.addShake(0.4);
    this.audio.levelUp();
    this.fx.vibrate([30, 40, 30, 40, 60]);
    this.emit('levelclear', { level: this.level, flawless: !this.lostLifeThisLevel });
  }

  addScore(n) {
    this.score += Math.round(n);
    this.stats.score = this.score;
    if (this.score >= this.nextExtraLife) {
      this.nextExtraLife += CFG.score.extraLifeEvery;
      if (this.lives < CFG.maxLives) {
        this.lives++;
        this.fx.text(this.pac.x, this.pac.y - 1.4, 'ชีวิตพิเศษ!', '#4ee06a', 1.1);
        this.audio.extraLife();
        this.emit('extralife', this.lives);
      }
    }
  }

  /** สรุปผลตอนจบเกม สำหรับภารกิจและตารางคะแนน */
  finish() {
    return { ...this.stats, score: this.score, level: this.level };
  }
}

export { TICK };
