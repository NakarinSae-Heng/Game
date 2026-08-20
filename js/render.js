// วาดสิ่งที่เปลี่ยนทุกเฟรม: เม็ดถั่ว, ผู้เล่น, ผี, power-up, ผลไม้, เอฟเฟกต์
// พิกัดทุกอย่างเป็น "หน่วยช่อง" แล้วคูณด้วย tile ตอนวาด

import { T } from './maze.js';
import { G } from './entities/ghost.js';

export const SKINS = {
  classic: { name: 'คลาสสิก', color: '#ffd93d', cost: 0 },
  mint: { name: 'มินต์', color: '#5ef2c0', cost: 30 },
  candy: { name: 'ลูกกวาด', color: '#ff7ad1', cost: 40 },
  ice: { name: 'น้ำแข็ง', color: '#7fd4ff', cost: 60 },
  ember: { name: 'ถ่านไฟ', color: '#ff7a3d', cost: 80 },
  void: { name: 'เงามืด', color: '#c7a3ff', cost: 120 },
};

export function drawPellets(g, maze, tile, time) {
  const r = tile * 0.11;
  const pulse = 0.72 + Math.sin(time * 6) * 0.28;

  g.fillStyle = maze.theme.pellet;
  g.beginPath();
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      if (maze.grid[y * maze.cols + x] !== T.PELLET) continue;
      const cx = (x + 0.5) * tile;
      const cy = (y + 0.5) * tile;
      g.moveTo(cx + r, cy);
      g.arc(cx, cy, r, 0, Math.PI * 2);
    }
  }
  g.fill();

  // power pellet เต้นเป็นจังหวะและเรืองแสง
  g.save();
  g.shadowColor = maze.theme.pellet;
  g.shadowBlur = tile * 0.9 * pulse;
  g.fillStyle = '#ffffff';
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      if (maze.grid[y * maze.cols + x] !== T.POWER) continue;
      g.beginPath();
      g.arc((x + 0.5) * tile, (y + 0.5) * tile, tile * (0.2 + 0.12 * pulse), 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
}

export function drawPowerups(g, items, tile, time) {
  for (const it of items) {
    const cx = (it.x + 0.5) * tile;
    const cy = (it.y + 0.5) * tile;
    // กระพริบเตือนเมื่อใกล้หมดอายุ
    if (it.life < 3.5 && Math.floor(it.life * 6) % 2 === 0) continue;
    const bounce = Math.sin(time * 4 + it.x) * tile * 0.08;

    g.save();
    g.translate(cx, cy + bounce);
    g.shadowColor = it.def.color;
    g.shadowBlur = tile * 0.8;
    g.fillStyle = 'rgba(10,12,26,0.85)';
    g.beginPath();
    g.arc(0, 0, tile * 0.52, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = Math.max(1.2, tile * 0.09);
    g.strokeStyle = it.def.color;
    g.stroke();
    g.shadowBlur = 0;
    g.font = `${Math.round(tile * 0.62)}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(it.def.icon, 0, tile * 0.04);
    g.restore();
  }
}

export function drawFruit(g, fruit, tile, time) {
  if (!fruit) return;
  const cx = (fruit.x + 0.5) * tile;
  const cy = (fruit.y + 0.5) * tile;
  const s = 1 + Math.sin(time * 5) * 0.08;
  g.save();
  g.translate(cx, cy);
  g.scale(s, s);
  g.font = `${Math.round(tile * 0.95)}px system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = '#ff5470';
  g.shadowBlur = tile * 0.7;
  g.fillText(fruit.icon, 0, tile * 0.06);
  g.restore();
}

export function drawPac(g, pac, tile, color, dying = 0) {
  const cx = (pac.x + 0.5) * tile;
  const cy = (pac.y + 0.5) * tile;
  const r = tile * 0.47;

  g.save();
  g.translate(cx, cy);

  if (dying > 0) {
    // ตอนตาย: อ้าปากกว้างขึ้นเรื่อยๆ จนหายไป
    const t = Math.min(1, dying);
    const open = t * Math.PI;
    g.rotate(pac.dir.angle);
    g.fillStyle = color;
    g.globalAlpha = 1 - t * 0.9;
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, r * (1 - t * 0.25), open, Math.PI * 2 - open);
    g.closePath();
    g.fill();
    g.restore();
    return;
  }

  g.rotate(pac.dir.angle);
  const open = Math.abs(Math.sin(pac.mouth * Math.PI)) * 0.34 * Math.PI + 0.04;
  g.shadowColor = color;
  g.shadowBlur = tile * 0.55;
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, 0);
  g.arc(0, 0, r, open, Math.PI * 2 - open);
  g.closePath();
  g.fill();
  g.shadowBlur = 0;
  // ตา
  g.fillStyle = 'rgba(20,20,30,0.85)';
  g.beginPath();
  g.arc(r * 0.1, -r * 0.5, r * 0.13, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function ghostBody(g, r) {
  const top = -r * 0.15;
  g.beginPath();
  g.arc(0, top, r, Math.PI, 0);
  g.lineTo(r, r * 0.72);
  // ชายกระโปรงหยัก 4 ลอน
  const steps = 4;
  const w = (r * 2) / steps;
  for (let i = 0; i < steps; i++) {
    const x0 = r - i * w;
    g.quadraticCurveTo(x0 - w * 0.25, r * 0.72 - r * 0.34, x0 - w * 0.5, r * 0.72);
    g.quadraticCurveTo(x0 - w * 0.75, r * 0.72 + r * 0.3, x0 - w, r * 0.72);
  }
  g.closePath();
}

export function drawGhost(g, gh, tile, opts = {}) {
  const cx = (gh.x + 0.5) * tile;
  const cy = (gh.y + 0.5) * tile;
  const r = tile * 0.47;
  const frightened = gh.state === G.FRIGHT;
  const flashing = frightened && gh.frightT < 2 && Math.floor(gh.frightT * 6) % 2 === 0;

  g.save();
  g.translate(cx, cy);

  if (!gh.isEyes) {
    let body = gh.color;
    if (frightened) body = flashing ? '#ffffff' : '#2b41ff';
    if (opts.frozen) body = '#8fd8ff';
    g.shadowColor = body;
    g.shadowBlur = tile * (frightened ? 0.7 : 0.45);
    g.fillStyle = body;
    ghostBody(g, r);
    g.fill();
    g.shadowBlur = 0;

    if (gh.elroy > 0 && !frightened) {
      // บลิงกี้ตอนดุ: มีวงแหวนไฟรอบตัว
      g.strokeStyle = 'rgba(255,255,255,0.65)';
      g.lineWidth = Math.max(1, tile * 0.06);
      ghostBody(g, r * 1.04);
      g.stroke();
    }
  }

  if (frightened && !gh.isEyes) {
    // หน้ากลัว: ตาเหลี่ยม + ปากหยัก
    const c = flashing ? '#2b41ff' : '#ffffff';
    g.fillStyle = c;
    g.fillRect(-r * 0.52, -r * 0.38, r * 0.32, r * 0.32);
    g.fillRect(r * 0.2, -r * 0.38, r * 0.32, r * 0.32);
    g.strokeStyle = c;
    g.lineWidth = Math.max(1, tile * 0.07);
    g.beginPath();
    const y = r * 0.34;
    for (let i = 0; i <= 6; i++) {
      const x = -r * 0.62 + (i * r * 1.24) / 6;
      const yy = y + (i % 2 === 0 ? -r * 0.11 : r * 0.11);
      if (i === 0) g.moveTo(x, yy);
      else g.lineTo(x, yy);
    }
    g.stroke();
  } else {
    // ตาปกติ — มองไปทางที่กำลังเดิน
    const dx = gh.dir.x * r * 0.2;
    const dy = gh.dir.y * r * 0.2;
    g.fillStyle = '#ffffff';
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.ellipse(sx * r * 0.34, -r * 0.22, r * 0.27, r * 0.33, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#1b2ad0';
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.arc(sx * r * 0.34 + dx, -r * 0.22 + dy, r * 0.14, 0, Math.PI * 2);
      g.fill();
    }
  }

  g.restore();
}

export function drawFx(g, fx, tile) {
  for (const r of fx.rings) {
    const a = Math.max(0, r.life / r.max);
    g.strokeStyle = r.color;
    g.globalAlpha = a * 0.7;
    g.lineWidth = Math.max(1, tile * 0.12 * a);
    g.beginPath();
    g.arc((r.x + 0.5) * tile, (r.y + 0.5) * tile, r.r * tile, 0, Math.PI * 2);
    g.stroke();
  }
  g.globalAlpha = 1;

  for (const p of fx.particles) {
    const a = Math.max(0, p.life / p.max);
    g.globalAlpha = a;
    g.fillStyle = p.color;
    g.beginPath();
    g.arc((p.x + 0.5) * tile, (p.y + 0.5) * tile, p.r * tile * (0.5 + a), 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const t of fx.texts) {
    const a = Math.max(0, t.life / t.max);
    g.globalAlpha = a;
    const size = Math.round(tile * 0.72 * t.size);
    g.font = `bold ${size}px 'Trebuchet MS', system-ui, sans-serif`;
    g.lineWidth = Math.max(2, size * 0.16);
    g.strokeStyle = 'rgba(4,5,12,0.85)';
    g.strokeText(t.str, (t.x + 0.5) * tile, (t.y + 0.5) * tile);
    g.fillStyle = t.color;
    g.fillText(t.str, (t.x + 0.5) * tile, (t.y + 0.5) * tile);
  }
  g.globalAlpha = 1;
}

/** ข้อความกลางสนาม เช่น READY! / คอมโบ */
export function drawBanner(g, maze, tile, lines) {
  const cx = (maze.cols / 2) * tile;
  const cy = (maze.rows / 2 + 3.2) * tile;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let y = cy;
  for (const line of lines) {
    const size = Math.round(tile * line.size);
    g.font = `bold ${size}px 'Trebuchet MS', system-ui, sans-serif`;
    g.lineWidth = Math.max(3, size * 0.18);
    g.strokeStyle = 'rgba(4,5,12,0.9)';
    g.strokeText(line.text, cx, y);
    g.fillStyle = line.color;
    g.fillText(line.text, cx, y);
    y += size * 1.15;
  }
}
