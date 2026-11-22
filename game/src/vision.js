// Vision cones shared by guards and cameras: whether a point is seen, how strongly, and the
// wall-clipped polygon the renderer fills so what you see on screen is exactly what they see.
import { castRay, lineOfSight } from './grid.js';

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * How clearly a viewer sees the point: 0 when outside the cone or behind cover, else from about
 * 0.45 at the cone's tip-far edge up to 1.5 right in front of the viewer.
 */
export function sightStrength(grid, viewer, fov, range, px, py, smokes) {
  const dist = Math.hypot(px - viewer.x, py - viewer.y);
  if (dist > range) return 0;
  const toward = Math.atan2(py - viewer.y, px - viewer.x);
  if (Math.abs(angleDiff(toward, viewer.facing)) > fov / 2 && dist > 14) return 0;
  if (!lineOfSight(grid, viewer.x, viewer.y, px, py, smokes)) return 0;
  return 0.45 + 1.05 * (1 - dist / range);
}

/** The cone as a fan of points clipped by walls and smoke, origin first. */
export function conePolygon(grid, viewer, fov, range, smokes, rays = 36) {
  const points = [{ x: viewer.x, y: viewer.y }];
  for (let i = 0; i <= rays; i += 1) {
    const a = viewer.facing - fov / 2 + (fov * i) / rays;
    const d = castRay(grid, viewer.x, viewer.y, a, range, smokes);
    points.push({ x: viewer.x + Math.cos(a) * d, y: viewer.y + Math.sin(a) * d });
  }
  return points;
}
