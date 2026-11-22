// Full-screen moments over the map: the title, the briefing before each job, the caught card,
// the getaway payout and the final tally after the third job.
import { MAP_HEIGHT, PALETTE, VIEW } from './config.js';
import { LEVELS } from './levels.js';

const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

function veil(ctx, alpha, height = VIEW.height) {
  ctx.fillStyle = `rgba(8, 9, 20, ${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, height);
}

function panel(ctx, x, y, w, h, edge) {
  ctx.fillStyle = 'rgba(13, 16, 36, 0.94)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function text(ctx, value, x, y, { size = 16, color = PALETTE.text, bold = false, align = 'center' } = {}) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
}

/** The logo: the title in cream with a teal underline of "hush" marks. */
export function drawLogo(ctx, x, y, size) {
  text(ctx, 'GILDED HUSH', x, y, { size, bold: true, color: PALETTE.wallTop });
  ctx.fillStyle = PALETTE.scarf;
  const w = size * 6.2;
  for (let i = 0; i < 9; i += 1) ctx.fillRect(x - w / 2 + (i * w) / 9, y + size * 0.25, w / 9 - 8, 4);
}

export function drawTitle(ctx, time, best) {
  veil(ctx, 0.72);
  drawLogo(ctx, VIEW.width / 2, 210, 72);
  text(ctx, 'Three nights. Three vaults. Not one alarm.', VIEW.width / 2, 290, { size: 22, color: PALETTE.muted });
  panel(ctx, 360, 330, 560, 230, '#343a66');
  const lines = [
    ['WASD / Arrows', 'sneak through the building'],
    ['Shift', 'sprint - fast, but guards hear it'],
    ['Violet hatched floor', 'shadow: you are noticed 3x slower'],
    ['E (hold)', 'crack the display case'],
    ['1 2 3 + Click', 'smoke, coin lure, camera jammer'],
    ['Tab', 'plan view: every patrol route'],
  ];
  lines.forEach(([k, v], i) => {
    text(ctx, k, 600, 368 + i * 32, { size: 16, bold: true, color: PALETTE.loot, align: 'right' });
    text(ctx, v, 620, 368 + i * 32, { size: 16, align: 'left' });
  });
  const blink = Math.sin(time * 4) > -0.2;
  if (blink) text(ctx, 'Press ENTER or click to begin', VIEW.width / 2, 610, { size: 24, bold: true, color: PALETTE.scarf });
  if (best > 0) text(ctx, `Best haul $${best.toLocaleString('en-US')}`, VIEW.width / 2, 650, { size: 16, color: PALETTE.muted });
}

export function drawBrief(ctx, world) {
  veil(ctx, 0.3, MAP_HEIGHT);
  // Sit the card on the side away from the thief, so you can see where you start.
  const x = world.thief.x < VIEW.width / 2 ? VIEW.width - 590 : 40;
  const y = MAP_HEIGHT - 196;
  panel(ctx, x, y, 550, 170, PALETTE.loot);
  text(ctx, `JOB ${world.levelIndex + 1}: ${world.level.name.toUpperCase()}`, x + 22, y + 36, { size: 22, bold: true, align: 'left', color: PALETTE.loot });
  text(ctx, world.level.brief, x + 22, y + 66, { size: 13, align: 'left' });
  text(ctx, `Prize: ${world.level.prize}  ($${world.level.value.toLocaleString('en-US')})`, x + 22, y + 94, { size: 14, align: 'left', color: PALETTE.text });
  text(ctx, `${world.guards.length} guards, ${world.cameras.length} cameras. Dotted lines: their routes and sweeps.`, x + 22, y + 120, { size: 13, align: 'left', color: PALETTE.muted });
  text(ctx, 'Plan your way in. Press ENTER to go.', x + 22, y + 150, { size: 16, bold: true, align: 'left', color: PALETTE.scarf });
  text(ctx, 'YOU', world.thief.x, world.thief.y - 20, { size: 13, bold: true, color: PALETTE.scarf });
}

export function drawCaught(ctx, world) {
  veil(ctx, 0.45, MAP_HEIGHT);
  ctx.strokeStyle = PALETTE.danger;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, VIEW.width - 6, MAP_HEIGHT - 6);
  panel(ctx, 390, 170, 500, 230, PALETTE.danger);
  text(ctx, 'CAUGHT', 640, 230, { size: 56, bold: true, color: PALETTE.danger });
  text(ctx, world.caughtBy, 640, 274, { size: 20 });
  text(ctx, `You were in sight ${world.spottedCount} time${world.spottedCount === 1 ? '' : 's'} over ${world.time.toFixed(1)}s.`, 640, 308, { size: 16, color: PALETTE.muted });
  text(ctx, 'Shadows slow them down. Smoke blinds them. Timing beats both.', 640, 338, { size: 14, color: PALETTE.muted });
  text(ctx, 'Press R to retry the job', 640, 375, { size: 20, bold: true, color: PALETTE.scarf });
}

export function drawEscaped(ctx, world, take) {
  veil(ctx, 0.55, MAP_HEIGHT);
  panel(ctx, 380, 90, 520, 420, PALETTE.exit);
  text(ctx, 'CLEAN GETAWAY', 640, 150, { size: 44, bold: true, color: PALETTE.exit });
  text(ctx, `${world.level.name} - ${world.time.toFixed(1)}s`, 640, 184, { size: 16, color: PALETTE.muted });
  const rows = [
    [world.level.prize, `+$${take.prize.toLocaleString('en-US')}`, PALETTE.loot],
    ['Trinkets', `+$${take.bonus.toLocaleString('en-US')}`, PALETTE.trinket],
    ['Kit used', `-$${take.tools.toLocaleString('en-US')}`, PALETTE.text],
    [`Heat (peak alarm ${Math.round(world.peakAlarm)}%)`, `-$${take.heat.toLocaleString('en-US')}`, PALETTE.danger],
  ];
  rows.forEach(([k, v, c], i) => {
    text(ctx, k, 420, 236 + i * 36, { size: 18, align: 'left' });
    text(ctx, v, 860, 236 + i * 36, { size: 18, bold: true, align: 'right', color: c });
  });
  ctx.fillStyle = '#343a66';
  ctx.fillRect(420, 370, 440, 2);
  text(ctx, 'TAKE', 420, 408, { size: 22, bold: true, align: 'left' });
  text(ctx, `$${take.total.toLocaleString('en-US')}`, 860, 408, { size: 30, bold: true, align: 'right', color: PALETTE.loot });
  text(ctx, `Rating: ${take.rank.toUpperCase()}`, 640, 452, { size: 22, bold: true, color: PALETTE.scarf });
  const next = world.levelIndex + 1 < LEVELS.length ? 'Press ENTER for the next job' : 'Press ENTER for the final tally';
  text(ctx, next, 640, 490, { size: 16, color: PALETTE.muted });
}

export function drawFinale(ctx, total, time) {
  veil(ctx, 0.8);
  drawLogo(ctx, VIEW.width / 2, 220, 56);
  text(ctx, 'All three vaults are empty and nobody knows your name.', VIEW.width / 2, 300, { size: 22 });
  text(ctx, `Total haul $${total.toLocaleString('en-US')}`, VIEW.width / 2, 370, { size: 40, bold: true, color: PALETTE.loot });
  if (Math.sin(time * 4) > -0.2) text(ctx, 'Press ENTER to plan another run', VIEW.width / 2, 450, { size: 20, color: PALETTE.scarf });
}

export function drawPause(ctx) {
  veil(ctx, 0.6, MAP_HEIGHT);
  text(ctx, 'PAUSED', 640, 290, { size: 48, bold: true });
  text(ctx, 'Esc to resume  -  R to restart the job', 640, 330, { size: 18, color: PALETTE.muted });
}
