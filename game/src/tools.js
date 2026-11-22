// The heist kit: smoke that blocks sight, a coin that lures guards, a jammer that blinds a
// camera or kills a laser. Every use costs cash out of the final take, so the cheapest plan pays best.
import { TOOLS } from './config.js';
import { hearNoise } from './guards.js';
import { distanceToBeam } from './lasers.js';

export function createKit() {
  return { selected: 0, charges: TOOLS.map((t) => t.charges), spent: 0, used: 0 };
}

export function selectedTool(kit) {
  return TOOLS[kit.selected];
}

/**
 * Use the selected tool at the aim point. Returns a short message on success, or a reason it
 * could not be used (out of charges, out of reach, nothing to jam).
 */
export function useTool(kit, world, aimX, aimY) {
  const tool = TOOLS[kit.selected];
  if (kit.charges[kit.selected] <= 0) return { ok: false, text: `No ${tool.name} left` };
  const thief = world.thief;
  if (Math.hypot(aimX - thief.x, aimY - thief.y) > tool.range) return { ok: false, text: 'Out of reach' };
  if (tool.id === 'smoke') {
    world.smokes.push({ x: aimX, y: aimY, radius: tool.radius, life: tool.seconds, max: tool.seconds });
  } else if (tool.id === 'coin') {
    world.pings.push({ x: aimX, y: aimY, radius: tool.radius, life: 1 });
    for (const guard of world.guards) {
      if (Math.hypot(guard.x - aimX, guard.y - aimY) < tool.radius) hearNoise(guard, world.grid, aimX, aimY);
    }
  } else if (tool.id === 'jammer') {
    let best = null;
    let bestDist = tool.radius;
    for (const camera of world.cameras) {
      const d = Math.hypot(camera.x - aimX, camera.y - aimY);
      if (d < bestDist) { best = camera; bestDist = d; }
    }
    for (const laser of world.lasers ?? []) {
      const d = distanceToBeam(laser, aimX, aimY);
      if (d < bestDist) { best = laser; bestDist = d; }
    }
    if (!best) return { ok: false, text: 'Aim at a camera or laser' };
    best.jammed = tool.seconds;
  }
  kit.charges[kit.selected] -= 1;
  kit.spent += tool.cost;
  kit.used += 1;
  return { ok: true, text: `${tool.name} -$${tool.cost}` };
}

export function updateSmokes(world, dt) {
  for (const s of world.smokes) s.life -= dt;
  world.smokes = world.smokes.filter((s) => s.life > 0);
  for (const p of world.pings) p.life -= dt;
  world.pings = world.pings.filter((p) => p.life > 0);
}
