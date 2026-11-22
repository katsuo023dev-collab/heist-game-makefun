// The bottom bar: the job and objective, the segmented ALARM meter, the tool kit with charges
// and costs, and the running take. Plus the toast line for short messages.
import { ALARM, HUD_HEIGHT, MAP_HEIGHT, PALETTE, TOOLS, VIEW } from './config.js';
import { takeOf } from './world.js';

const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

function objective(world) {
  if (!world.loot.taken) return world.loot.crack > 0 ? 'Hold E to crack the case...' : `Steal the ${world.level.prize}`;
  return 'Get to the VAN!';
}

function drawAlarm(ctx, world, x, y, w, h, time) {
  const level = world.alarm / ALARM.max;
  const hot = world.alarm >= ALARM.lockdown;
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', x, y - 8);
  ctx.textAlign = 'right';
  ctx.fillStyle = hot ? PALETTE.danger : PALETTE.text;
  ctx.fillText(hot ? `LOCKDOWN ${Math.round(world.alarm)}%` : `${Math.round(world.alarm)}%`, x + w, y - 8);
  const segments = 20;
  const gap = 3;
  const sw = (w - gap * (segments - 1)) / segments;
  for (let i = 0; i < segments; i += 1) {
    const filled = (i + 1) / segments <= level + 0.001 || (i / segments < level);
    const t = i / (segments - 1);
    const r = Math.round(62 + t * (255 - 62));
    const g = Math.round(240 - t * (240 - 74));
    const b = Math.round(176 - t * (176 - 94));
    ctx.fillStyle = filled ? `rgb(${r},${g},${b})` : '#22274a';
    if (filled && hot && Math.sin(time * 12) > 0.3) ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + i * (sw + gap), y, sw, h);
  }
  const lock = x + w * (ALARM.lockdown / ALARM.max);
  ctx.fillStyle = PALETTE.danger;
  ctx.fillRect(lock - 1, y - 4, 2, h + 8);
}

function drawTools(ctx, world, x, y) {
  TOOLS.forEach((tool, i) => {
    const bx = x + i * 118;
    const selected = world.kit.selected === i;
    const left = world.kit.charges[i];
    ctx.fillStyle = selected ? '#2b3266' : '#171b38';
    ctx.fillRect(bx, y, 108, 62);
    ctx.strokeStyle = selected ? PALETTE.scarf : '#343a66';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 1, y + 1, 106, 60);
    ctx.textAlign = 'left';
    ctx.fillStyle = left > 0 ? PALETTE.text : PALETTE.muted;
    ctx.font = `bold 14px ${FONT}`;
    ctx.fillText(`${tool.key} ${tool.name}`, bx + 8, y + 19);
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(tool.hint, bx + 8, y + 36);
    ctx.fillStyle = PALETTE.loot;
    ctx.fillText(`$${tool.cost}`, bx + 8, y + 53);
    for (let c = 0; c < tool.charges; c += 1) {
      ctx.fillStyle = c < left ? PALETTE.scarf : '#343a66';
      ctx.fillRect(bx + 96 - c * 10, y + 46, 7, 7);
    }
  });
}

export function drawHud(ctx, world, time) {
  const y = MAP_HEIGHT;
  ctx.fillStyle = PALETTE.hud;
  ctx.fillRect(0, y, VIEW.width, HUD_HEIGHT);
  ctx.fillStyle = '#2a2f5a';
  ctx.fillRect(0, y, VIEW.width, 2);

  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `12px ${FONT}`;
  ctx.fillText(`JOB ${world.levelIndex + 1} / 3`, 22, y + 26);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText(world.level.name, 22, y + 50);
  ctx.fillStyle = world.loot.taken ? PALETTE.exit : PALETTE.loot;
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText(objective(world), 22, y + 76);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `12px ${FONT}`;
  ctx.fillText('WASD move  Shift sprint (loud)  E crack  1-3 tool  Click use  Tab plan', 22, y + 100);

  drawAlarm(ctx, world, 420, y + 44, 420, 30, time);
  const take = takeOf(world);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `12px ${FONT}`;
  ctx.fillText(`Take $${(world.loot.taken ? take.total : take.bonus).toLocaleString('en-US')}   Kit spent $${world.kit.spent}   Time ${world.time.toFixed(1)}s`, 420, y + 98);

  drawTools(ctx, world, 880, y + 26);

  if (world.message.life > 0 && world.message.text) {
    ctx.globalAlpha = Math.min(1, world.message.life * 2);
    ctx.font = `bold 18px ${FONT}`;
    const w = ctx.measureText(world.message.text).width + 36;
    ctx.fillStyle = 'rgba(11, 13, 26, 0.85)';
    ctx.fillRect(VIEW.width / 2 - w / 2, 14, w, 34);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'center';
    ctx.fillText(world.message.text, VIEW.width / 2, 37);
    ctx.globalAlpha = 1;
  }
}
