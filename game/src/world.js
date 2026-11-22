// One heist in progress: the level, the thief, guards, cameras, the kit and the alarm meter,
// stepped at a fixed rate. Detection fills the alarm; a full alarm or a guard's hand ends the run.
import { ALARM, CAMERA, GUARD, THIEF } from './config.js';
import { LEVELS } from './levels.js';
import { isShadowAt, kindAt, EXIT, parseMap } from './grid.js';
import { sightStrength } from './vision.js';
import { createGuard, updateGuard, hearNoise, CHASE } from './guards.js';
import { createCamera, updateCamera, isJammed } from './cameras.js';
import { createThief, moveThief, ageSteps } from './thief.js';
import { createKit, updateSmokes, useTool } from './tools.js';
import { LASER, breaksBeam, createLaser, updateLaser } from './lasers.js';

/** A small seeded generator (mulberry32) so a replayed run hears the same noises. */
function nextRandom(world) {
  world.seed = (world.seed + 0x6d2b79f5) >>> 0;
  let t = world.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const RUNNING = 'running';
export const CAUGHT = 'caught';
export const ESCAPED = 'escaped';

export function createWorld(levelIndex) {
  const level = LEVELS[levelIndex];
  const grid = parseMap(level.map);
  return {
    levelIndex,
    seed: 12345 + levelIndex,
    level,
    grid,
    thief: createThief(grid.start),
    guards: level.guards.map(createGuard),
    cameras: level.cameras.map(createCamera),
    lasers: (level.lasers ?? []).map(createLaser),
    trips: 0,
    kit: createKit(),
    smokes: [],
    pings: [],
    trinkets: grid.trinkets.map((t) => ({ ...t, taken: false })),
    loot: { ...grid.loot, taken: false, crack: 0 },
    alarm: 0,
    peakAlarm: 0,
    unseen: 0,
    spottedCount: 0,
    wasSeen: false,
    bonus: 0,
    time: 0,
    status: RUNNING,
    caughtBy: '',
    message: { text: '', life: 0 },
  };
}

function say(world, text) {
  world.message = { text, life: 2.2 };
}

/** Every eye on the thief this tick, and the strongest of them. */
function detect(world) {
  const { grid, thief, smokes } = world;
  const lockdown = world.alarm >= ALARM.lockdown;
  const reach = lockdown ? 1.15 : 1;
  let rate = 0;
  let source = '';
  for (const guard of world.guards) {
    const s = sightStrength(grid, guard, GUARD.fov, GUARD.range * reach, thief.x, thief.y, smokes);
    guard.spotted = s > 0;
    if (s * ALARM.guardRate > rate) { rate = s * ALARM.guardRate; source = `Guard ${guard.id + 1}`; }
  }
  for (const camera of world.cameras) {
    const s = isJammed(camera) ? 0 : sightStrength(grid, camera, CAMERA.fov, CAMERA.range * reach, thief.x, thief.y, smokes);
    camera.seesThief = s > 0;
    if (s * ALARM.cameraRate > rate) { rate = s * ALARM.cameraRate; source = `Camera ${camera.id + 1}`; }
  }
  if (isShadowAt(grid, thief.x, thief.y) && !thief.sprinting) rate *= ALARM.shadowFactor;
  return { rate, source, lockdown };
}

/**
 * Advance the heist by dt. `input` holds dx, dy, sprint, interact (held), select (a tool index
 * or -1) and clicks (aim points this tick). Returns the names of what happened, for sound and HUD.
 */
export function stepWorld(world, input, dt) {
  const events = [];
  if (world.status !== RUNNING) return events;
  world.time += dt;
  const { grid, thief, kit } = world;

  if (input.select >= 0) kit.selected = input.select;
  for (const click of input.clicks) {
    const result = useTool(kit, world, click.x, click.y);
    say(world, result.text);
    events.push(result.ok ? 'tool' : 'toolFail');
  }

  const noise = moveThief(thief, grid, input.dx, input.dy, input.sprint, dt);
  ageSteps(thief, dt);
  if (noise > 0) {
    for (const guard of world.guards) {
      if (guard.state !== CHASE && Math.hypot(guard.x - thief.x, guard.y - thief.y) < noise && nextRandom(world) < dt * 3) {
        hearNoise(guard, grid, thief.x, thief.y);
        events.push('noise');
      }
    }
  }

  for (const camera of world.cameras) updateCamera(camera, world.time, dt);
  for (const laser of world.lasers) {
    updateLaser(laser, world.time, dt);
    if (breaksBeam(laser, thief.x, thief.y, THIEF.radius)) {
      laser.cooldown = LASER.rearm;
      world.trips += 1;
      world.alarm = Math.min(ALARM.max, world.alarm + LASER.trip);
      world.unseen = 0;
      world.lastSource = 'A laser tripwire';
      for (const guard of world.guards) {
        if (Math.hypot(guard.x - thief.x, guard.y - thief.y) < LASER.callRadius) hearNoise(guard, grid, thief.x, thief.y);
      }
      say(world, 'Laser tripped! +22% alarm');
      events.push('laser');
    }
  }
  const seen = detect(world);
  for (const guard of world.guards) updateGuard(guard, grid, thief, guard.spotted, seen.lockdown, dt);
  // A camera that sees you calls the nearest guards over.
  if (world.cameras.some((c) => c.seesThief) && nextRandom(world) < dt * 0.8) {
    for (const guard of world.guards) if (Math.hypot(guard.x - thief.x, guard.y - thief.y) < 320) hearNoise(guard, grid, thief.x, thief.y);
  }
  updateSmokes(world, dt);

  if (seen.rate > 0) {
    world.alarm = Math.min(ALARM.max, world.alarm + seen.rate * dt);
    world.unseen = 0;
    if (!world.wasSeen) { world.spottedCount += 1; events.push('spotted'); }
    world.wasSeen = true;
    world.lastSource = seen.source;
  } else {
    world.wasSeen = false;
    world.unseen += dt;
    if (world.unseen > ALARM.decayDelay) world.alarm = Math.max(0, world.alarm - ALARM.decay * dt);
  }
  world.peakAlarm = Math.max(world.peakAlarm, world.alarm);

  for (const guard of world.guards) {
    if (guard.state === CHASE && Math.hypot(guard.x - thief.x, guard.y - thief.y) < GUARD.catchDistance) {
      world.status = CAUGHT;
      world.caughtBy = `Guard ${guard.id + 1} grabbed you`;
      events.push('caught');
      return events;
    }
  }
  if (world.alarm >= ALARM.max) {
    world.status = CAUGHT;
    world.caughtBy = `${world.lastSource ?? 'Someone'} raised the alarm`;
    events.push('caught');
    return events;
  }

  for (const t of world.trinkets) {
    if (!t.taken && Math.hypot(t.x - thief.x, t.y - thief.y) < 20) {
      t.taken = true;
      world.bonus += 500;
      say(world, 'Trinket +$500');
      events.push('trinket');
    }
  }

  const loot = world.loot;
  if (!loot.taken) {
    const near = Math.hypot(loot.x - thief.x, loot.y - thief.y) < THIEF.reach;
    if (near && input.interact) {
      loot.crack += dt / THIEF.crackSeconds;
      if (loot.crack >= 1) {
        loot.taken = true;
        thief.carrying = true;
        say(world, `${world.level.prize} taken - get to the van!`);
        events.push('loot');
      }
    } else {
      loot.crack = Math.max(0, loot.crack - dt * 0.5);
    }
  }

  if (thief.carrying && kindAt(grid, thief.x, thief.y) === EXIT) {
    world.status = ESCAPED;
    events.push('escaped');
  }
  if (world.message.life > 0) world.message.life -= dt;
  return events;
}

/** The payout: prize plus trinkets, minus the kit you burned and a fee for every scare. */
export function takeOf(world) {
  const prize = world.loot.taken ? world.level.value : 0;
  const heat = Math.round(world.peakAlarm) * 10;
  const total = Math.max(0, prize + world.bonus - world.kit.spent - heat);
  let rank = 'Smash & Grab';
  if (world.peakAlarm < 1) rank = 'Ghost';
  else if (world.peakAlarm < 35) rank = 'Shadow';
  else if (world.peakAlarm < 70) rank = 'Close Shave';
  return { prize, bonus: world.bonus, tools: world.kit.spent, heat, total, rank };
}
