// ตรวจเมซทุกด่าน: mirror ถูกต้อง, เดินถึงทุกเม็ด, ทางตัน, บ้านผีใช้งานได้
// รัน: node tools/validate-mazes.mjs [--print]
import { MAZES, buildMaze, T, COLS, ROWS, passablePac, passableGhost } from '../js/maze.js';

const PRINT = process.argv.includes('--print');
const DIRS = [[0, -1], [-1, 0], [0, 1], [1, 0]];
let failed = 0;

const glyph = (t) => ({ [T.WALL]: '█', [T.PELLET]: '·', [T.POWER]: 'O', [T.EMPTY]: ' ', [T.DOOR]: '=', [T.HOUSE]: ' ' })[t];

for (const def of MAZES) {
  const m = buildMaze(def);
  const problems = [];
  const warnings = [];

  if (m.sealed > 0) warnings.push(`ปิดช่องที่เดินไปไม่ถึง ${m.sealed} ช่อง`);
  if (m.sealed > 12) problems.push(`ปิดช่องเยอะเกินไป (${m.sealed}) — แบบเมซน่าจะผิด`);
  if (m.powerCount !== 4) problems.push(`power pellet มี ${m.powerCount} เม็ด (ควรมี 4)`);
  if (m.pelletTotal < 150) problems.push(`เม็ดถั่วน้อยเกินไป: ${m.pelletTotal}`);

  // จุดเกิดผู้เล่นต้องเดินได้
  const px = Math.floor(m.pacStart.x);
  if (!passablePac(m, px, m.pacStart.y) || !passablePac(m, px + 1, m.pacStart.y)) {
    problems.push(`จุดเกิดผู้เล่น (${m.pacStart.x},${m.pacStart.y}) ติดกำแพง`);
  }

  // ผีต้องออกจากบ้านและกลับเข้าบ้านได้
  const doorTop = { x: m.house.doorCols[0], y: m.house.doorRow - 1 };
  if (!passablePac(m, doorTop.x, doorTop.y)) problems.push('ช่องเหนือประตูบ้านผีเป็นกำแพง');

  // ทางตัน (ช่องเดินได้ที่มีทางออกทางเดียว) — ในเกมจริงถือว่าไม่แฟร์
  const deadEnds = [];
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!passablePac(m, x, y)) continue;
      let exits = 0;
      for (const [dx, dy] of DIRS) if (passablePac(m, x + dx, y + dy)) exits++;
      if (exits <= 1) deadEnds.push(`${x},${y}`);
    }
  }
  if (deadEnds.length) problems.push(`มีทางตัน ${deadEnds.length} จุด: ${deadEnds.join(' ')}`);

  // ผีเดินจากในบ้านไปได้ทุกช่องที่ผู้เล่นไปได้ไหม
  const seen = new Uint8Array(COLS * ROWS);
  const start = m.house.doorCols[0] + m.house.top * COLS;
  const stack = [start];
  seen[start] = 1;
  while (stack.length) {
    const i = stack.pop();
    const x = i % COLS, y = (i - x) / COLS;
    for (const [dx, dy] of DIRS) {
      const ny = y + dy;
      if (ny < 0 || ny >= ROWS) continue;
      const nx = ((x + dx) % COLS + COLS) % COLS;
      const ni = ny * COLS + nx;
      if (seen[ni] || !passableGhost(m, nx, ny, true)) continue;
      seen[ni] = 1;
      stack.push(ni);
    }
  }
  let unreachedByGhost = 0;
  for (let i = 0; i < seen.length; i++) {
    if (!seen[i] && m.grid[i] !== T.WALL) unreachedByGhost++;
  }
  if (unreachedByGhost) problems.push(`ผีเดินไปไม่ถึง ${unreachedByGhost} ช่อง`);

  const ok = problems.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ด่าน "${m.name}" — เม็ด ${m.pelletTotal} (power ${m.powerCount})`);
  for (const w of warnings) console.log(`   ⚠  ${w}`);
  for (const p of problems) console.log(`   ✗  ${p}`);

  if (PRINT || !ok) {
    for (let y = 0; y < ROWS; y++) {
      let line = '';
      for (let x = 0; x < COLS; x++) line += glyph(m.grid[y * COLS + x]);
      console.log('   ' + line);
    }
  }
}

console.log(failed ? `\n${failed} ด่านมีปัญหา` : '\nเมซทุกด่านผ่าน');
process.exit(failed ? 1 : 0);
