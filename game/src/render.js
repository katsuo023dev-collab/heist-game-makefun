// Drawing the building and everyone in it: ink-blue floors, cream walls, violet shadow cover,
// amber guard cones, teal camera cones that flush red the moment they see you, and gold loot.
import { CAMERA, COLS, GUARD, MAP_HEIGHT, PALETTE, ROWS, THIEF, TILE, TOOLS, VIEW } from './config.js';
import { CARPET, EXIT, SHADOW, WALL, tileAt } from './grid.js';
import { conePolygon } from './vision.js';
import { isJammed } from './cameras.js';
import { CHASE, INVESTIGATE, SEARCH } from './guards.js';

function drawFloor(ctx, grid) {
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, 0, VIEW.width, MAP_HEIGHT);
  ctx.strokeStyle = PALETTE.floorLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= COLS; x += 1) { ctx.moveTo(x * TILE + 0.5, 0); ctx.lineTo(x * TILE + 0.5, MAP_HEIGHT); }
  for (let y = 0; y <= ROWS; y += 1) { ctx.moveTo(0, y * TILE + 0.5); ctx.lineTo(VIEW.width, y * TILE + 0.5); }
  ctx.stroke();
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      const kind = tileAt(grid, tx, ty);
      const x = tx * TILE;
      const y = ty * TILE;
      if (kind === CARPET) {
        ctx.fillStyle = PALETTE.carpet;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = PALETTE.carpetEdge;
        ctx.strokeRect(x + 4.5, y + 4.5, TILE - 9, TILE - 9);
      } else if (kind === SHADOW) {
        drawShadowTile(ctx, x, y);
      } else if (kind === EXIT) {
        ctx.fillStyle = 'rgba(62, 240, 176, 0.16)';
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }
}

/** Shadow cover: near-black violet with a faint hatch, so safe ground reads at a glance. */
function drawShadowTile(ctx, x, y) {
  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, TILE, TILE);
  ctx.clip();
  ctx.strokeStyle = PALETTE.shadowHatch;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let k = -TILE; k < TILE; k += 8) { ctx.moveTo(x + k, y + TILE); ctx.lineTo(x + k + TILE, y); }
  ctx.stroke();
  ctx.restore();
}

function drawWalls(ctx, grid) {
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      if (tileAt(grid, tx, ty) !== WALL) continue;
      const x = tx * TILE;
      const y = ty * TILE;
      ctx.fillStyle = PALETTE.wallShade;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(x, y, TILE, TILE - 6);
      if (tileAt(grid, tx, ty - 1) !== WALL) {
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(x, y, TILE, 4);
      }
      if (tileAt(grid, tx, ty + 1) !== WALL) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x, y + TILE, TILE, 6);
      }
    }
  }
}

function drawExit(ctx, grid, time) {
  if (!grid.exits.length) return;
  const xs = grid.exits.map((e) => e.x);
  const ys = grid.exits.map((e) => e.y);
  const x0 = Math.min(...xs) - TILE / 2;
  const y0 = Math.min(...ys) - TILE / 2;
  const w = Math.max(...xs) - Math.min(...xs) + TILE;
  const h = Math.max(...ys) - Math.min(...ys) + TILE;
  ctx.save();
  ctx.setLineDash([6, 5]);
  ctx.lineDashOffset = -time * 20;
  ctx.strokeStyle = PALETTE.exit;
  ctx.lineWidth = 2;
  ctx.strokeRect(x0 + 2, y0 + 2, w - 4, h - 4);
  ctx.restore();
  ctx.fillStyle = PALETTE.exit;
  ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VAN', x0 + w / 2, y0 - 6);
}

function drawRoutes(ctx, world) {
  ctx.save();
  ctx.setLineDash([3, 7]);
  ctx.lineWidth = 2;
  for (const guard of world.guards) {
    ctx.strokeStyle = 'rgba(255, 200, 90, 0.75)';
    ctx.beginPath();
    guard.route.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    if (guard.loop) ctx.closePath();
    ctx.stroke();
    for (const p of guard.route) {
      ctx.fillStyle = 'rgba(255, 200, 90, 0.9)';
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
  }
  for (const camera of world.cameras) {
    ctx.strokeStyle = 'rgba(79, 230, 220, 0.7)';
    ctx.beginPath();
    ctx.moveTo(camera.x, camera.y);
    ctx.arc(camera.x, camera.y, CAMERA.range, camera.base - camera.sweep - CAMERA.fov / 2, camera.base + camera.sweep + CAMERA.fov / 2);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function fillCone(ctx, points, fill, edge) {
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawCones(ctx, world) {
  for (const camera of world.cameras) {
    if (isJammed(camera)) continue;
    const pts = conePolygon(world.grid, camera, CAMERA.fov, CAMERA.range, world.smokes);
    fillCone(ctx, pts, camera.seesThief ? PALETTE.spotted : PALETTE.cameraCone, camera.seesThief ? PALETTE.spottedEdge : PALETTE.cameraConeEdge);
  }
  for (const guard of world.guards) {
    const pts = conePolygon(world.grid, guard, GUARD.fov, GUARD.range, world.smokes);
    fillCone(ctx, pts, guard.seesThief ? PALETTE.spotted : PALETTE.guardCone, guard.seesThief ? PALETTE.spottedEdge : PALETTE.guardConeEdge);
  }
}

function drawTrinkets(ctx, world, time) {
  for (const t of world.trinkets) {
    if (t.taken) continue;
    const bob = Math.sin(time * 3 + t.x) * 2;
    ctx.fillStyle = PALETTE.trinket;
    ctx.beginPath();
    ctx.moveTo(t.x, t.y - 7 + bob);
    ctx.lineTo(t.x + 6, t.y + bob);
    ctx.lineTo(t.x, t.y + 7 + bob);
    ctx.lineTo(t.x - 6, t.y + bob);
    ctx.closePath();
    ctx.fill();
  }
}

function drawLoot(ctx, world, time) {
  const loot = world.loot;
  if (!loot || loot.taken) return;
  const pulse = 0.5 + 0.5 * Math.sin(time * 2.5);
  const glow = ctx.createRadialGradient(loot.x, loot.y, 2, loot.x, loot.y, 34 + pulse * 8);
  glow.addColorStop(0, PALETTE.lootGlow);
  glow.addColorStop(1, 'rgba(255, 216, 74, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(loot.x, loot.y, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6b5a3a';
  ctx.fillRect(loot.x - 11, loot.y - 11, 22, 22);
  ctx.strokeStyle = '#e9dfc7';
  ctx.strokeRect(loot.x - 11.5, loot.y - 11.5, 23, 23);
  ctx.fillStyle = PALETTE.loot;
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + time * 0.6;
    ctx.lineTo(loot.x + Math.cos(a) * 8, loot.y + Math.sin(a) * 8);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff8d0';
  ctx.fillRect(loot.x - 2, loot.y - 5, 3, 3);
  if (loot.crack > 0) {
    ctx.strokeStyle = PALETTE.loot;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(loot.x, loot.y, 20, -Math.PI / 2, -Math.PI / 2 + loot.crack * Math.PI * 2);
    ctx.stroke();
  }
}

/** The prize name floats above walls so it is never hidden. */
function drawLootLabel(ctx, world) {
  const loot = world.loot;
  if (!loot || loot.taken) return;
  ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  const w = ctx.measureText(world.level.prize.toUpperCase()).width + 12;
  ctx.fillStyle = 'rgba(11, 13, 26, 0.8)';
  ctx.fillRect(loot.x - w / 2, loot.y - 40, w, 18);
  ctx.fillStyle = PALETTE.loot;
  ctx.fillText(world.level.prize.toUpperCase(), loot.x, loot.y - 26);
}

function drawEffects(ctx, world) {
  for (const s of world.smokes) {
    const fade = Math.min(1, s.life / 1.2);
    ctx.fillStyle = `rgba(190, 196, 220, ${0.75 * fade})`;
    for (let k = 0; k < 7; k += 1) {
      const a = (k / 7) * Math.PI * 2 + s.life * 0.4;
      ctx.beginPath();
      ctx.arc(s.x + Math.cos(a) * s.radius * 0.45, s.y + Math.sin(a) * s.radius * 0.45, s.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const p of world.pings) {
    ctx.strokeStyle = `rgba(255, 216, 74, ${p.life})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (1 - p.life) * p.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const step of world.thief.steps) {
    ctx.fillStyle = step.loud ? `rgba(255, 120, 120, ${0.6 - step.age / 5})` : `rgba(62, 240, 176, ${0.35 - step.age / 9})`;
    ctx.beginPath();
    ctx.arc(step.x, step.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCamera(ctx, camera) {
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.fillStyle = '#20263f';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(camera.facing);
  ctx.fillStyle = isJammed(camera) ? '#5a5f7a' : PALETTE.camera;
  ctx.fillRect(-4, -5, 15, 10);
  ctx.fillStyle = isJammed(camera) ? '#888' : camera.seesThief ? PALETTE.danger : '#e8fffd';
  ctx.beginPath();
  ctx.arc(11, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (isJammed(camera)) {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`JAMMED ${camera.jammed.toFixed(0)}s`, camera.x, camera.y - 14);
  }
}

function drawGuard(ctx, guard) {
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.rotate(guard.facing);
  const swing = Math.sin(guard.stride * 0.25) * 3;
  ctx.fillStyle = PALETTE.guardDark;
  ctx.fillRect(-4, -9 + swing, 8, 5);
  ctx.fillRect(-4, 4 - swing, 8, 5);
  ctx.fillStyle = PALETTE.guard;
  ctx.beginPath();
  ctx.ellipse(0, 0, GUARD.radius - 2, GUARD.radius + 1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a1a05';
  ctx.beginPath();
  ctx.arc(1, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff2c0';
  ctx.fillRect(7, -2, 6, 4);
  ctx.restore();
  let mark = '';
  if (guard.state === CHASE) mark = '!';
  else if (guard.state === INVESTIGATE || guard.state === SEARCH) mark = '?';
  if (mark) {
    ctx.fillStyle = mark === '!' ? PALETTE.danger : PALETTE.loot;
    ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mark, guard.x, guard.y - 16);
  }
}

function drawThief(ctx, thief, time) {
  ctx.save();
  ctx.translate(thief.x, thief.y);
  // A soft teal halo so the thief never gets lost in the dark.
  ctx.fillStyle = 'rgba(62, 240, 176, 0.18)';
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(thief.facing);
  const flap = Math.sin(time * 14) * (thief.moving ? 3 : 1);
  ctx.strokeStyle = PALETTE.scarf;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-3, 0);
  ctx.quadraticCurveTo(-12, flap, -18, flap * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath();
  ctx.arc(0, 0, THIEF.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.scarf;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#e8fff6';
  ctx.fillRect(3, -4, 4, 3);
  ctx.fillRect(3, 1, 4, 3);
  if (thief.carrying) {
    ctx.fillStyle = PALETTE.loot;
    ctx.beginPath();
    ctx.arc(-9, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawAim(ctx, world, aim) {
  if (!aim) return;
  const tool = TOOLS[world.kit.selected];
  const t = world.thief;
  const inReach = Math.hypot(aim.x - t.x, aim.y - t.y) <= tool.range;
  ctx.save();
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = 'rgba(244, 236, 216, 0.25)';
  ctx.beginPath();
  ctx.arc(t.x, t.y, tool.range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = inReach ? PALETTE.text : PALETTE.danger;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(aim.x, aim.y, 10, 0, Math.PI * 2);
  ctx.moveTo(aim.x - 15, aim.y); ctx.lineTo(aim.x - 6, aim.y);
  ctx.moveTo(aim.x + 6, aim.y); ctx.lineTo(aim.x + 15, aim.y);
  ctx.stroke();
  ctx.restore();
}

/** Draw the whole map area. `plan` overlays every patrol route and camera arc. */
export function drawWorld(ctx, world, { time, aim = null, plan = false }) {
  drawFloor(ctx, world.grid);
  drawExit(ctx, world.grid, time);
  drawTrinkets(ctx, world, time);
  drawLoot(ctx, world, time);
  drawCones(ctx, world);
  drawEffects(ctx, world);
  drawWalls(ctx, world.grid);
  if (plan) drawRoutes(ctx, world);
  for (const camera of world.cameras) drawCamera(ctx, camera);
  for (const guard of world.guards) drawGuard(ctx, guard);
  drawThief(ctx, world.thief, time);
  drawLootLabel(ctx, world);
  drawAim(ctx, world, aim);
}
