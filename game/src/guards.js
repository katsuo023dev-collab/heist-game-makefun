// Guard behaviour: walk a route, pause and glance at corners, go check noises, chase what they
// see and search where they lost it, then find their way back to the route.
import { GUARD, TILE } from './config.js';
import { findPath, moveWithWalls } from './grid.js';
import { angleDiff } from './vision.js';

export const PATROL = 'patrol';
export const INVESTIGATE = 'investigate';
export const CHASE = 'chase';
export const SEARCH = 'search';
export const RETURN = 'return';

const toPixels = ([tx, ty]) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });

export function createGuard(def, id) {
  const route = def.route.map(toPixels);
  const legs = def.loop ? route.length : Math.max(1, (route.length - 1) * 2);
  const startLeg = Math.floor((def.phase ?? 0) * legs) % legs;
  const guard = {
    id,
    route,
    loop: def.loop,
    x: 0,
    y: 0,
    facing: 0,
    target: 0,
    dir: 1,
    state: PATROL,
    wait: 0,
    path: [],
    lookTimer: 0,
    lastSeen: null,
    seesThief: false,
    stride: 0,
  };
  // Walk the route's legs up to the phase so guards start spread out.
  let index = 0;
  for (let leg = 0; leg < startLeg; leg += 1) index = advanceIndex(guard, index);
  const here = route[index];
  guard.x = here.x;
  guard.y = here.y;
  guard.target = advanceIndex(guard, index);
  const next = route[guard.target];
  guard.facing = Math.atan2(next.y - here.y, next.x - here.x) || 0;
  return guard;
}

/** The next route index after `index`, bouncing at the ends of an open route. */
function advanceIndex(guard, index) {
  const n = guard.route.length;
  if (n < 2) return 0;
  if (guard.loop) return (index + 1) % n;
  let next = index + guard.dir;
  if (next < 0 || next >= n) {
    guard.dir = -guard.dir;
    next = index + guard.dir;
  }
  return next;
}

function turnToward(guard, angle, dt, rate = GUARD.turnRate) {
  const d = angleDiff(angle, guard.facing);
  const max = rate * dt;
  guard.facing += Math.max(-max, Math.min(max, d));
}

/** Step toward a point; true once there. */
function walkTo(guard, grid, point, speed, dt) {
  const dx = point.x - guard.x;
  const dy = point.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 3) return true;
  const stepLength = Math.min(dist, speed * dt);
  turnToward(guard, Math.atan2(dy, dx), dt, GUARD.turnRate * 1.6);
  moveWithWalls(grid, guard, (dx / dist) * stepLength, (dy / dist) * stepLength, GUARD.radius);
  guard.stride += stepLength;
  return false;
}

function followPath(guard, grid, speed, dt) {
  if (!guard.path.length) return true;
  if (walkTo(guard, grid, guard.path[0], speed, dt)) guard.path.shift();
  return guard.path.length === 0;
}

/** A noise at (x, y): the guard heads over to look, unless already chasing. */
export function hearNoise(guard, grid, x, y) {
  if (guard.state === CHASE) return;
  guard.state = INVESTIGATE;
  guard.path = findPath(grid, guard.x, guard.y, x, y);
  guard.lookTimer = GUARD.lookAround;
}

function nearestRouteIndex(guard) {
  let best = 0;
  let bestDist = Infinity;
  guard.route.forEach((p, i) => {
    const d = Math.hypot(p.x - guard.x, p.y - guard.y);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}

function startReturn(guard, grid) {
  guard.state = RETURN;
  guard.target = nearestRouteIndex(guard);
  const p = guard.route[guard.target];
  guard.path = findPath(grid, guard.x, guard.y, p.x, p.y);
}

/**
 * One tick of a guard. `thief` is where the thief is; `spotted` says whether this guard sees
 * them this tick; `lockdown` makes everyone move with purpose.
 */
export function updateGuard(guard, grid, thief, spotted, lockdown, dt) {
  guard.seesThief = spotted;
  if (spotted) {
    guard.lastSeen = { x: thief.x, y: thief.y };
    if (guard.state !== CHASE) guard.path = [];
    guard.state = CHASE;
  }
  const hurry = lockdown ? GUARD.hurry * 1.15 : GUARD.hurry;
  switch (guard.state) {
    case PATROL: {
      if (guard.wait > 0) {
        guard.wait -= dt;
        const next = guard.route[guard.target];
        // Glance one way then turn to the next leg: the pause a careful player times.
        const glance = Math.atan2(next.y - guard.y, next.x - guard.x) + Math.sin(guard.wait * 3) * 0.6;
        turnToward(guard, glance, dt);
        break;
      }
      const speed = lockdown ? GUARD.patrol * 1.3 : GUARD.patrol;
      if (walkTo(guard, grid, guard.route[guard.target], speed, dt)) {
        guard.target = advanceIndex(guard, guard.target);
        guard.wait = 0.9;
      }
      break;
    }
    case CHASE: {
      if (spotted) {
        walkTo(guard, grid, thief, GUARD.chase, dt);
      } else {
        guard.state = SEARCH;
        guard.path = guard.lastSeen ? findPath(grid, guard.x, guard.y, guard.lastSeen.x, guard.lastSeen.y) : [];
        guard.lookTimer = GUARD.lookAround * 1.4;
      }
      break;
    }
    case INVESTIGATE:
    case SEARCH: {
      if (followPath(guard, grid, hurry, dt)) {
        guard.lookTimer -= dt;
        guard.facing += dt * 2.1 * Math.sin(guard.lookTimer * 1.7 + 1);
        if (guard.lookTimer <= 0) startReturn(guard, grid);
      }
      break;
    }
    case RETURN: {
      if (followPath(guard, grid, GUARD.patrol * 1.2, dt)) {
        guard.state = PATROL;
        guard.wait = 0.5;
        guard.target = advanceIndex(guard, guard.target);
      }
      break;
    }
    default:
      guard.state = PATROL;
  }
}
