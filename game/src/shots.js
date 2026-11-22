// The screenshot scenes behind ?shot=heist|plan|caught|escape. Each plays the real rules forward
// from a fresh job with a scripted thief, so the frame is the game's own state and the same URL
// always gives the same picture.
import { STEP, TILE } from './config.js';
import { createWorld, stepWorld, RUNNING } from './world.js';
import { useTool } from './tools.js';

// The cover's moment: seconds into the gallery job, where the thief stands, where the smoke lands.
const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
const SHOT_TIME = Number(params.get('t') ?? 12.6);
const SHOT_THIEF = (params.get('at') ?? '9,11').split(',').map(Number);
const SHOT_SMOKE = (params.get('smoke') ?? '8,14').split(',').map(Number);

const idle ={ dx: 0, dy: 0, sprint: false, interact: false, select: -1, clicks: [] };

/** Run the job for `seconds` with the thief walking toward each waypoint in turn. */
function playScript(world, waypoints, seconds, { interact = false } = {}) {
  let i = 0;
  for (let t = 0; t < seconds && world.status === RUNNING; t += STEP) {
    const goal = waypoints[i];
    let dx = 0;
    let dy = 0;
    if (goal) {
      const gx = (goal[0] + 0.5) * TILE - world.thief.x;
      const gy = (goal[1] + 0.5) * TILE - world.thief.y;
      if (Math.hypot(gx, gy) < 4) i += 1;
      else { dx = Math.abs(gx) > 3 ? Math.sign(gx) : 0; dy = Math.abs(gy) > 3 ? Math.sign(gy) : 0; }
    }
    stepWorld(world, { ...idle, dx, dy, interact }, STEP);
  }
}

function place(world, tx, ty) {
  world.thief.x = (tx + 0.5) * TILE;
  world.thief.y = (ty + 0.5) * TILE;
}

export function stageShot(name) {
  if (name === 'plan') {
    const world = createWorld(1);
    playScript(world, [], 2);
    return { screen: 'brief', world, plan: true, aim: null, time: 2 };
  }
  if (name === 'caught') {
    const world = createWorld(2);
    playScript(world, [], 5.2);
    place(world, 31, 4);
    world.alarm = 82;
    world.peakAlarm = 82;
    playScript(world, [[31, 3], [31, 2]], 6);
    return { screen: world.status === RUNNING ? 'play' : 'caught', world, plan: false, aim: null, time: world.time };
  }
  if (name === 'escape') {
    const world = createWorld(0);
    playScript(world, [], 3);
    world.loot.taken = true;
    world.thief.carrying = true;
    world.trinkets[0].taken = true;
    world.bonus = 500;
    world.kit.charges[0] -= 1;
    world.kit.spent = 300;
    world.peakAlarm = 18;
    world.time = 71.2;
    place(world, 37, 16);
    playScript(world, [[38, 16]], 1.5);
    return { screen: 'escaped', world, plan: false, aim: null, time: world.time };
  }
  // The cover: mid-heist in the gallery, a smoke cloud covering the dash past a guard.
  const world = createWorld(0);
  playScript(world, [], SHOT_TIME);
  place(world, SHOT_THIEF[0], SHOT_THIEF[1]);
  world.alarm = 38;
  world.peakAlarm = 38;
  world.kit.selected = 0;
  const smoke = useTool(world.kit, world, SHOT_SMOKE[0] * TILE, SHOT_SMOKE[1] * TILE);
  world.message = { text: smoke.text, life: 1.5 };
  world.kit.selected = 2;
  playScript(world, [[SHOT_THIEF[0] + 1, SHOT_THIEF[1]]], 0.25);
  return { screen: 'play', world, plan: false, aim: { x: 12.5 * TILE, y: 9.5 * TILE }, time: world.time };
}
