// The thief, Wren: movement from the keyboard, sprint noise, and the footprints left behind.
import { THIEF } from './config.js';
import { moveWithWalls } from './grid.js';

export function createThief(start) {
  return { x: start.x, y: start.y, facing: 0, moving: false, sprinting: false, stride: 0, steps: [], carrying: false };
}

/**
 * Move by the held direction (dx, dy in -1..1). Returns the noise radius made this tick
 * (0 when walking quietly).
 */
export function moveThief(thief, grid, dx, dy, sprint, dt) {
  const len = Math.hypot(dx, dy);
  thief.moving = len > 0;
  thief.sprinting = sprint && thief.moving;
  if (!thief.moving) return 0;
  const speed = (thief.sprinting ? THIEF.sprint : THIEF.walk) * (thief.carrying ? 0.9 : 1);
  const before = { x: thief.x, y: thief.y };
  moveWithWalls(grid, thief, (dx / len) * speed * dt, (dy / len) * speed * dt, THIEF.radius);
  thief.facing = Math.atan2(dy, dx);
  thief.stride += Math.hypot(thief.x - before.x, thief.y - before.y);
  if (thief.stride > 22) {
    thief.stride = 0;
    thief.steps.push({ x: thief.x, y: thief.y, age: 0, loud: thief.sprinting });
    if (thief.steps.length > 14) thief.steps.shift();
  }
  return thief.sprinting ? THIEF.sprintNoise : 0;
}

export function ageSteps(thief, dt) {
  for (const s of thief.steps) s.age += dt;
  while (thief.steps.length && thief.steps[0].age > 3) thief.steps.shift();
}
