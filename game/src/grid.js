// The building as a tile grid: parsing a level map, what blocks movement and sight, shadow cover,
// ray casts for vision cones and breadth-first paths for guards that leave their routes.
import { COLS, ROWS, TILE } from './config.js';

export const FLOOR = 0;
export const WALL = 1;
export const SHADOW = 2;
export const CARPET = 3;
export const EXIT = 4;

/** Turn a level's ASCII map into tiles plus the points of interest it marks. */
export function parseMap(rows) {
  const tiles = new Uint8Array(COLS * ROWS);
  let start = { x: TILE * 1.5, y: TILE * 1.5 };
  let loot = null;
  const trinkets = [];
  const exits = [];
  for (let ty = 0; ty < ROWS; ty += 1) {
    const row = rows[ty] ?? '';
    for (let tx = 0; tx < COLS; tx += 1) {
      const ch = row[tx] ?? '#';
      const centre = { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
      let kind = FLOOR;
      if (ch === '#') kind = WALL;
      else if (ch === ',') kind = SHADOW;
      else if (ch === '=') kind = CARPET;
      else if (ch === 'E') { kind = EXIT; exits.push(centre); }
      else if (ch === 'S') start = centre;
      else if (ch === '$') { kind = CARPET; loot = centre; }
      else if (ch === '*') trinkets.push(centre);
      tiles[ty * COLS + tx] = kind;
    }
  }
  return { tiles, start, loot, trinkets, exits };
}

export function tileAt(grid, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return WALL;
  return grid.tiles[ty * COLS + tx];
}

export function kindAt(grid, x, y) {
  return tileAt(grid, Math.floor(x / TILE), Math.floor(y / TILE));
}

export function isWallAt(grid, x, y) {
  return kindAt(grid, x, y) === WALL;
}

export function isShadowAt(grid, x, y) {
  return kindAt(grid, x, y) === SHADOW;
}

/** Does a circle at (x, y) overlap any wall tile? */
export function circleHitsWall(grid, x, y, r) {
  const x0 = Math.floor((x - r) / TILE);
  const x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE);
  const y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      if (tileAt(grid, tx, ty) !== WALL) continue;
      const nx = Math.max(tx * TILE, Math.min(x, (tx + 1) * TILE));
      const ny = Math.max(ty * TILE, Math.min(y, (ty + 1) * TILE));
      if ((nx - x) ** 2 + (ny - y) ** 2 < r * r) return true;
    }
  }
  return false;
}

/** Move a body by (dx, dy), one axis at a time, sliding along walls. */
export function moveWithWalls(grid, body, dx, dy, r) {
  if (!circleHitsWall(grid, body.x + dx, body.y, r)) body.x += dx;
  if (!circleHitsWall(grid, body.x, body.y + dy, r)) body.y += dy;
}

function smokeBlocks(smokes, x, y) {
  for (let i = 0; i < smokes.length; i += 1) {
    const s = smokes[i];
    if ((s.x - x) ** 2 + (s.y - y) ** 2 < s.radius * s.radius) return true;
  }
  return false;
}

/**
 * March a ray from (x, y) along `angle` and return how far it gets before a wall or smoke,
 * at most `range`. Smoke only blocks once the ray has left the origin's own cloud edge.
 */
export function castRay(grid, x, y, angle, range, smokes) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const step = 4;
  for (let d = step; d <= range; d += step) {
    const px = x + dx * d;
    const py = y + dy * d;
    if (isWallAt(grid, px, py)) return d - step / 2;
    if (smokes.length && smokeBlocks(smokes, px, py)) return d;
  }
  return range;
}

/** True when nothing solid or smoky lies between the two points. */
export function lineOfSight(grid, x0, y0, x1, y1, smokes) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  return castRay(grid, x0, y0, Math.atan2(y1 - y0, x1 - x0), dist, smokes) >= dist - 1;
}

/** Breadth-first path over open tiles, returned as pixel waypoints (excluding the start tile). */
export function findPath(grid, fromX, fromY, toX, toY) {
  const sx = Math.floor(fromX / TILE);
  const sy = Math.floor(fromY / TILE);
  const gx = Math.floor(toX / TILE);
  const gy = Math.floor(toY / TILE);
  if (tileAt(grid, gx, gy) === WALL) return [];
  const prev = new Int32Array(COLS * ROWS).fill(-1);
  const startIndex = sy * COLS + sx;
  const goalIndex = gy * COLS + gx;
  prev[startIndex] = startIndex;
  const queue = [startIndex];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head];
    if (index === goalIndex) break;
    const cx = index % COLS;
    const cy = (index - cx) / COLS;
    for (const [ox, oy] of dirs) {
      const nx = cx + ox;
      const ny = cy + oy;
      if (tileAt(grid, nx, ny) === WALL) continue;
      const next = ny * COLS + nx;
      if (prev[next] !== -1) continue;
      prev[next] = index;
      queue.push(next);
    }
  }
  if (prev[goalIndex] === -1) return [];
  const path = [];
  for (let index = goalIndex; index !== startIndex; index = prev[index]) {
    const tx = index % COLS;
    path.push({ x: (tx + 0.5) * TILE, y: ((index - tx) / COLS + 0.5) * TILE });
  }
  path.reverse();
  if (path.length) path[path.length - 1] = { x: toX, y: toY };
  return path;
}
