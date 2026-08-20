// นิยามเมซทั้งหมด + parser
//
// เมซถูกเขียนเป็น "ครึ่งซ้าย" กว้าง 14 ช่อง สูง 31 แถว แล้ว parser จะ mirror
// ให้เป็น 28x31 อัตโนมัติ — ช่วยให้เมซสมมาตรสวยงามและลดงานเขียนลงครึ่งหนึ่ง
//
// สัญลักษณ์:  # กำแพง   . เม็ดถั่ว   o power pellet   (ช่องว่าง) พื้นเปล่า

export const COLS = 28;
export const ROWS = 31;
const HALF = COLS / 2;

export const T = {
  EMPTY: 0,
  WALL: 1,
  PELLET: 2,
  POWER: 3,
  DOOR: 4,   // ประตูบ้านผี — ผีผ่านได้ ผู้เล่นผ่านไม่ได้
  HOUSE: 5,  // ในบ้านผี — ผีผ่านได้ ผู้เล่นผ่านไม่ได้
};

// บ้านผีถูก "ปั๊ม" ทับลงทุกเมซด้วยรูปแบบเดียวกัน เพื่อให้ AI ผีทำงานได้แน่นอน
const HOUSE = {
  doorRow: 12,
  top: 13,
  bottom: 15,
  left: 11,
  right: 16,
  doorCols: [13, 14],
};
export const TUNNEL_ROW = 14;

export const MAZES = [
  {
    name: 'คลาสสิก',
    theme: { wall: '#2b3ff5', glow: '#5b6bff', pellet: '#ffdfa8' },
    pac: [13.5, 23],
    half: [
      '##############',
      '#............#',
      '#.####.#####.#',
      '#o####.#####.#',
      '#.####.#####.#',
      '#.............',
      '#.####.##.####',
      '#.####.##.####',
      '#......##....#',
      '######.#####.#',
      '######.#####.#',
      '######.##.....',
      '######.##.###.',
      '######.##.#...',
      '..........#...',
      '######.##.#...',
      '######.##.####',
      '######.##.....',
      '######.##.####',
      '######.##.####',
      '#............#',
      '#.####.#####.#',
      '#.####.#####.#',
      '#o..##........',
      '###.##.##.####',
      '###.##.##.####',
      '#......##....#',
      '#.##########.#',
      '#.##########.#',
      '#.............',
      '##############',
    ],
  },
  {
    name: 'หอคอยคู่',
    theme: { wall: '#00a3a3', glow: '#26e0d5', pellet: '#d8fff6' },
    pac: [13.5, 23],
    half: [
      '##############',
      '#............#',
      '#.##.####.##.#',
      '#o##.####.##.#',
      '#.##......##.#',
      '#.............',
      '#.####.##.####',
      '#......##.....',
      '#.####....####',
      '#.####.##.#..#',
      '#......##.#..#',
      '######.##.....',
      '######.##.###.',
      '######.##.#...',
      '..........#...',
      '######.##.#...',
      '######.##.####',
      '#......##.....',
      '#.####.##.####',
      '#.####....#..#',
      '#o##...##.#..#',
      '#.##.#.##.#..#',
      '#....#....#..#',
      '#.####.##.....',
      '#.####.##.#..#',
      '#.........#..#',
      '####.####.#..#',
      '#....#....#..#',
      '#.##.#.##.####',
      '#.............',
      '##############',
    ],
  },
  {
    name: 'สี่แยกมรณะ',
    theme: { wall: '#c02a86', glow: '#ff5ab8', pellet: '#ffd9f0' },
    pac: [13.5, 23],
    half: [
      '##############',
      '#......#.....#',
      '#o####.#.###.#',
      '#.####.#.###.#',
      '#......#.....#',
      '#.####.#####.#',
      '#.####.......#',
      '#......#####.#',
      '####.#.......#',
      '####.#.#####.#',
      '#....#.##....#',
      '#.####.##.....',
      '#.####.##.###.',
      '#......##.#...',
      '..........#...',
      '#.####.##.#...',
      '#.####.##.####',
      '#.####.##.....',
      '#......##.####',
      '####.#....#..#',
      '####.#.##.#..#',
      '#o...#.##....#',
      '#.####.#####.#',
      '#......#......',
      '#.####.#.###.#',
      '#.####.#.###.#',
      '#......#.....#',
      '#.##########.#',
      '#.##########.#',
      '#.............',
      '##############',
    ],
  },
  {
    name: 'เกลียวอสูร',
    theme: { wall: '#7a3ad6', glow: '#b07cff', pellet: '#e9dcff' },
    pac: [13.5, 23],
    half: [
      '##############',
      '#............#',
      '#.##########.#',
      '#o##......##.#',
      '#.##.####.##.#',
      '#....#..#....#',
      '#.####..####.#',
      '#......##.....',
      '####.#.##.####',
      '#....#.##....#',
      '#.####.##.##.#',
      '#......##.....',
      '######.##.###.',
      '######.##.#...',
      '..........#...',
      '######.##.#...',
      '######.##.####',
      '#......##.....',
      '#.####.##.##.#',
      '#....#.##....#',
      '####.#.##.####',
      '#o.....##.....',
      '#.####..####.#',
      '#....#..#.....',
      '#.##.####.##.#',
      '#.##......##.#',
      '#.##########.#',
      '#............#',
      '#.####.###.#.#',
      '#.............',
      '##############',
    ],
  },
  {
    name: 'ห้องขังผี',
    theme: { wall: '#1f7a34', glow: '#4ee06a', pellet: '#dcffe2' },
    pac: [13.5, 23],
    half: [
      '##############',
      '#.....##.....#',
      '#o###.##.###.#',
      '#.###.##.###.#',
      '#.....##.....#',
      '#.##.......##.',
      '#.##.###.#.##.',
      '#......#......',
      '####.#.##.####',
      '#....#.##....#',
      '#.##.#.##.##.#',
      '#.##.#....##.#',
      '#....####.##.#',
      '#.##......##..',
      '..........#...',
      '#.####.##.#...',
      '#......##.....',
      '#.####.##.....',
      '#.####.##.####',
      '#......##.....',
      '####.#.##.####',
      '#o...#....#..#',
      '#.##.####.#..#',
      '#....#..#.....',
      '#.####..####.#',
      '#......##.....',
      '#.####.##.####',
      '#....#.##....#',
      '#.##.#....##.#',
      '#.............',
      '##############',
    ],
  },
  {
    name: 'ด่านหฤโหด',
    theme: { wall: '#b3341f', glow: '#ff7a4d', pellet: '#ffe3d1' },
    pac: [13.5, 24],
    half: [
      '##############',
      '#............#',
      '#.##.#####.#.#',
      '#o##.#####.#.#',
      '#.##.......#.#',
      '#.............',
      '#.####.##.###.',
      '#.####.##.###.',
      '#......##.....',
      '####.#.##.####',
      '#....#.##....#',
      '#.##.......##.',
      '#.##.#.##.##..',
      '#....#.##.....',
      '..........#...',
      '#.####.##.#...',
      '#......##.....',
      '#.####.##.####',
      '#.####.##....#',
      '#......##.##..',
      '#.####.##.##..',
      '#o...........#',
      '#.####.####.##',
      '#.####.####.##',
      '#......##.....',
      '####.#.##.#..#',
      '#....#.##....#',
      '#.##.......##.',
      '#.##.#####.##.',
      '#.............',
      '##############',
    ],
  },
];

const DIRS = [
  [0, -1],
  [-1, 0],
  [0, 1],
  [1, 0],
];

/**
 * แปลงนิยามเมซครึ่งซ้ายเป็นโครงสร้างพร้อมใช้
 * ขั้นตอน: mirror → ปั๊มบ้านผี/อุโมงค์/ทางเดินรอบบ้าน → flood fill → ปิดช่องที่เดินไปไม่ถึง
 */
export function buildMaze(def) {
  if (def.half.length !== ROWS) {
    throw new Error(`เมซ "${def.name}" มี ${def.half.length} แถว (ต้องเป็น ${ROWS})`);
  }

  // 1) mirror ครึ่งซ้ายเป็นเมซเต็ม
  const chars = [];
  for (let y = 0; y < ROWS; y++) {
    const left = def.half[y];
    if (left.length !== HALF) {
      throw new Error(`เมซ "${def.name}" แถว ${y} ยาว ${left.length} (ต้องเป็น ${HALF})`);
    }
    chars.push((left + [...left].reverse().join('')).split(''));
  }

  const set = (x, y, ch) => {
    chars[y][x] = ch;
  };
  const openIfWall = (x, y, ch = '.') => {
    if (chars[y][x] === '#') chars[y][x] = ch;
  };

  // 2) ขอบนอกต้องเป็นกำแพงเสมอ (ยกเว้นแถวอุโมงค์)
  for (let x = 0; x < COLS; x++) {
    set(x, 0, '#');
    set(x, ROWS - 1, '#');
  }
  for (let y = 0; y < ROWS; y++) {
    if (y === TUNNEL_ROW) continue;
    set(0, y, '#');
    set(COLS - 1, y, '#');
  }

  // 3) ปั๊มบ้านผีลงไปให้เหมือนกันทุกเมซ (AI ผีพึ่งพารูปทรงนี้)
  for (let x = HOUSE.left - 1; x <= HOUSE.right + 1; x++) {
    set(x, HOUSE.doorRow, HOUSE.doorCols.includes(x) ? '-' : '#');
    set(x, HOUSE.bottom + 1, '#');
  }
  for (let y = HOUSE.top; y <= HOUSE.bottom; y++) {
    set(HOUSE.left - 1, y, '#');
    set(HOUSE.right + 1, y, '#');
    for (let x = HOUSE.left; x <= HOUSE.right; x++) set(x, y, '=');
  }

  // 4) อุโมงค์แถว TUNNEL_ROW: เปิดโล่งถึงขอบทั้งสองข้าง ไม่มีเม็ดถั่ว
  for (let x = 0; x < HOUSE.left - 1; x++) {
    set(x, TUNNEL_ROW, ' ');
    set(COLS - 1 - x, TUNNEL_ROW, ' ');
  }

  // 5) รับประกันทางเดินรอบบ้านผี: แถวเหนือประตู, ใต้บ้าน และคอลัมน์ข้างบ้าน
  for (let x = HOUSE.left - 2; x <= HOUSE.right + 2; x++) {
    openIfWall(x, HOUSE.doorRow - 1);
    openIfWall(x, HOUSE.bottom + 2);
  }
  for (let y = HOUSE.doorRow - 1; y <= HOUSE.bottom + 2; y++) {
    openIfWall(HOUSE.left - 2, y);
    openIfWall(HOUSE.right + 2, y);
  }

  // 6) แปลงตัวอักษรเป็นตัวเลข
  const grid = new Uint8Array(COLS * ROWS);
  const CH = { '#': T.WALL, '.': T.PELLET, o: T.POWER, ' ': T.EMPTY, '-': T.DOOR, '=': T.HOUSE };
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = CH[chars[y][x]];
      if (t === undefined) throw new Error(`เมซ "${def.name}" มีอักษรที่ไม่รู้จัก "${chars[y][x]}" ที่ (${x},${y})`);
      grid[y * COLS + x] = t;
    }
  }

  // 7) flood fill จากจุดเกิดผู้เล่น แล้วปิดทุกช่องที่เดินไปไม่ถึง
  //    (ตาข่ายนิรภัย: ด่านจะเก็บครบได้เสมอ แม้เขียนเมซพลาด)
  const pacTile = [Math.floor(def.pac[0]), def.pac[1]];
  const reach = floodFill(grid, pacTile);
  let sealed = 0;
  for (let i = 0; i < grid.length; i++) {
    const t = grid[i];
    if (t === T.WALL || t === T.DOOR || t === T.HOUSE) continue;
    if (!reach[i]) {
      grid[i] = T.WALL;
      sealed++;
    }
  }

  let pellets = 0;
  let powers = 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === T.PELLET) pellets++;
    else if (grid[i] === T.POWER) powers++;
  }

  return {
    name: def.name,
    theme: def.theme,
    cols: COLS,
    rows: ROWS,
    grid,
    original: Uint8Array.from(grid),
    pelletTotal: pellets + powers,
    pelletCount: pellets,
    powerCount: powers,
    sealed,
    pacStart: { x: def.pac[0], y: def.pac[1] },
    house: { ...HOUSE, centerX: (HOUSE.left + HOUSE.right + 1) / 2, centerY: HOUSE.top + 1 },
    tunnelRow: TUNNEL_ROW,
  };
}

function floodFill(grid, start) {
  const seen = new Uint8Array(grid.length);
  const stack = [start[1] * COLS + start[0]];
  seen[stack[0]] = 1;
  while (stack.length) {
    const i = stack.pop();
    const x = i % COLS;
    const y = (i - x) / COLS;
    for (const [dx, dy] of DIRS) {
      const ny = y + dy;
      if (ny < 0 || ny >= ROWS) continue;
      const nx = (x + dx + COLS) % COLS; // อุโมงค์วนซ้าย-ขวา
      const ni = ny * COLS + nx;
      if (seen[ni]) continue;
      const t = grid[ni];
      if (t === T.WALL) continue;
      seen[ni] = 1;
      stack.push(ni);
    }
  }
  return seen;
}

// ── ตัวช่วยที่ใช้ทั่วเกม ────────────────────────────────────

export function wrapX(x) {
  return ((x % COLS) + COLS) % COLS;
}

export function tileAt(maze, x, y) {
  if (y < 0 || y >= ROWS) return T.WALL;
  return maze.grid[y * COLS + wrapX(x)];
}

export function setTile(maze, x, y, v) {
  maze.grid[y * COLS + wrapX(x)] = v;
}

/** ผู้เล่นเดินได้ไหม (บ้านผีเข้าไม่ได้) */
export function passablePac(maze, x, y) {
  const t = tileAt(maze, x, y);
  return t !== T.WALL && t !== T.DOOR && t !== T.HOUSE;
}

/** ผีเดินได้ไหม — ประตู/ในบ้านเข้าได้เฉพาะตอนที่ได้รับอนุญาต */
export function passableGhost(maze, x, y, allowHouse) {
  const t = tileAt(maze, x, y);
  if (t === T.WALL) return false;
  if (t === T.DOOR || t === T.HOUSE) return !!allowHouse;
  return true;
}

export function inHouse(maze, x, y) {
  const t = tileAt(maze, Math.round(x), Math.round(y));
  return t === T.HOUSE || t === T.DOOR;
}

export function isTunnel(maze, x, y) {
  return Math.round(y) === maze.tunnelRow && (x < 6 || x > COLS - 7);
}

/** ช่องว่างที่ยังเดินได้ทั้งหมด — ใช้สุ่มตำแหน่งเกิด power-up */
export function walkableTiles(maze, filter) {
  const out = [];
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      const t = maze.grid[y * COLS + x];
      if (t === T.WALL || t === T.DOOR || t === T.HOUSE) continue;
      if (filter && !filter(x, y, t)) continue;
      out.push({ x, y });
    }
  }
  return out;
}

export function mazeForLevel(level) {
  return MAZES[(level - 1) % MAZES.length];
}
