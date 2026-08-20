// ทิศทางทั้งสี่ + ลำดับการตัดสินใจของผี (ขึ้น, ซ้าย, ลง, ขวา — เหมือนต้นฉบับ)

export const DIR = {
  none: { x: 0, y: 0, name: 'none', angle: 0 },
  up: { x: 0, y: -1, name: 'up', angle: -Math.PI / 2 },
  left: { x: -1, y: 0, name: 'left', angle: Math.PI },
  down: { x: 0, y: 1, name: 'down', angle: Math.PI / 2 },
  right: { x: 1, y: 0, name: 'right', angle: 0 },
};

export const TURN_ORDER = [DIR.up, DIR.left, DIR.down, DIR.right];

export function opposite(d) {
  if (d === DIR.up) return DIR.down;
  if (d === DIR.down) return DIR.up;
  if (d === DIR.left) return DIR.right;
  if (d === DIR.right) return DIR.left;
  return DIR.none;
}

export function isOpposite(a, b) {
  return !!a && !!b && a.x === -b.x && a.y === -b.y && (a.x !== 0 || a.y !== 0);
}

export function sameDir(a, b) {
  return !!a && !!b && a.x === b.x && a.y === b.y;
}
