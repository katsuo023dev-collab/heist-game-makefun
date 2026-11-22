// Laser tripwires: a beam across a doorway that switches on and off on a timer. Walking through a
// live beam is never quiet: it adds a burst of alarm and pulls every nearby guard to the spot.
import { TILE } from './config.js';

export const LASER = {
  /** Alarm added the instant a live beam is broken. */
  trip: 22,
  /** Guards inside this many pixels come to look. */
  callRadius: 420,
  /** Seconds of flicker before a beam comes back on: the tell a careful player reads. */
  warn: 0.45,
  /** A broken beam cannot trip again for this long. */
  rearm: 1.5,
};

/** `from` and `to` are tiles on one row or one column; the beam runs edge to edge across them. */
export function createLaser({ from, to, on, off, phase = 0 }, id) {
  const horizontal = from[1] === to[1];
  const x0 = Math.min(from[0], to[0]);
  const x1 = Math.max(from[0], to[0]);
  const y0 = Math.min(from[1], to[1]);
  const y1 = Math.max(from[1], to[1]);
  const a = horizontal ? { x: x0 * TILE, y: (y0 + 0.5) * TILE } : { x: (x0 + 0.5) * TILE, y: y0 * TILE };
  const b = horizontal ? { x: (x1 + 1) * TILE, y: (y0 + 0.5) * TILE } : { x: (x0 + 0.5) * TILE, y: (y1 + 1) * TILE };
  return { id, a, b, on, off, phase, live: true, warning: false, cooldown: 0, jammed: 0 };
}

export function updateLaser(laser, time, dt) {
  const cycle = laser.on + laser.off;
  const t = (((time + laser.phase * cycle) % cycle) + cycle) % cycle;
  laser.jammed = Math.max(0, laser.jammed - dt);
  laser.live = t < laser.on && laser.jammed <= 0;
  laser.warning = !laser.live && laser.jammed <= 0 && t > cycle - LASER.warn;
  laser.cooldown = Math.max(0, laser.cooldown - dt);
}

/** Distance from a point to the beam's segment. */
export function distanceToBeam(laser, x, y) {
  const { a, b } = laser;
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const k = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(a.x + vx * k - x, a.y + vy * k - y);
}

/** True when the thief (a circle of `radius`) breaks this live, armed beam. */
export function breaksBeam(laser, x, y, radius) {
  return laser.live && laser.cooldown <= 0 && distanceToBeam(laser, x, y) < radius;
}
