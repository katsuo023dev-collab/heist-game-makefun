// Gilded Hush: the screen flow (title, briefing, play, pause, caught, getaway, finale), the
// fixed-step loop, and the canvas that scales to fit the window.
import { STEP, VIEW } from './config.js';
import { LEVELS } from './levels.js';
import { createWorld, stepWorld, takeOf, RUNNING, CAUGHT, ESCAPED } from './world.js';
import { drawWorld } from './render.js';
import { drawHud } from './hud.js';
import { drawTitle, drawBrief, drawCaught, drawEscaped, drawFinale, drawPause } from './screens.js';
import { createInput, readControls } from './input.js';
import { unlockAudio, playCue, heartbeat } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const status = document.getElementById('status');

function fit() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  canvas.style.width = `${VIEW.width * scale}px`;
  canvas.style.height = `${VIEW.height * scale}px`;
}
window.addEventListener('resize', fit);
fit();

const game = {
  screen: 'title',
  world: createWorld(0),
  plan: false,
  total: 0,
  best: Number(localStorage.getItem('gilded-hush-best') || 0),
  clock: 0,
};

function announce(textValue) {
  if (status) status.textContent = textValue;
}

function startJob(index) {
  game.world = createWorld(index);
  game.screen = 'brief';
  announce(`Job ${index + 1}: ${LEVELS[index].name}. Press Enter to begin.`);
}

/** Title-screen attract mode: the guards walk the first job behind the menu. */
function idleStep(world) {
  stepWorld(world, { dx: 0, dy: 0, sprint: false, interact: false, select: -1, clicks: [] }, STEP);
  world.alarm = 0;
}

function tick(input) {
  const go = input.wasPressed('Enter') || input.wasPressed('NumpadEnter');
  const clicked = input.wasPressed('Click');
  if (input.anyPressed()) unlockAudio();
  const world = game.world;
  switch (game.screen) {
    case 'title':
      idleStep(world);
      if (go || clicked) { game.total = 0; input.takeClicks(); startJob(0); }
      break;
    case 'brief':
      input.takeClicks();
      if (go) game.screen = 'play';
      break;
    case 'pause':
      input.takeClicks();
      if (input.wasPressed('Escape')) game.screen = 'play';
      if (input.wasPressed('KeyR')) startJob(world.levelIndex);
      break;
    case 'play': {
      if (input.wasPressed('Escape')) { game.screen = 'pause'; break; }
      if (input.wasPressed('KeyR')) { startJob(world.levelIndex); break; }
      game.plan = input.isHeld('Tab');
      const controls = readControls(input);
      controls.clicks = input.takeClicks().filter((c) => c.y < VIEW.height - 112);
      const events = stepWorld(world, controls, STEP);
      events.forEach(playCue);
      heartbeat(world.alarm, STEP);
      if (world.status === CAUGHT) { game.screen = 'caught'; announce(`Caught: ${world.caughtBy}. Press R to retry.`); }
      if (world.status === ESCAPED) {
        game.screen = 'escaped';
        game.total += takeOf(world).total;
        announce(`Clean getaway with $${takeOf(world).total}. Press Enter.`);
      }
      break;
    }
    case 'caught':
      input.takeClicks();
      if (input.wasPressed('KeyR') || go) startJob(world.levelIndex);
      break;
    case 'escaped':
      input.takeClicks();
      if (go) {
        if (world.levelIndex + 1 < LEVELS.length) startJob(world.levelIndex + 1);
        else {
          game.screen = 'finale';
          game.best = Math.max(game.best, game.total);
          localStorage.setItem('gilded-hush-best', String(game.best));
        }
      }
      break;
    case 'finale':
      input.takeClicks();
      if (go) { game.world = createWorld(0); game.screen = 'title'; }
      break;
    default:
      game.screen = 'title';
  }
}

function draw(screen, world, { aim = null, plan = false, time = game.clock } = {}) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  const showPlan = plan || screen === 'brief';
  drawWorld(ctx, world, { time, aim: screen === 'play' ? aim : null, plan: showPlan });
  drawHud(ctx, world, time);
  if (screen === 'title') drawTitle(ctx, time, game.best);
  else if (screen === 'brief') drawBrief(ctx, world);
  else if (screen === 'pause') drawPause(ctx);
  else if (screen === 'caught') drawCaught(ctx, world);
  else if (screen === 'escaped') drawEscaped(ctx, world, takeOf(world));
  else if (screen === 'finale') drawFinale(ctx, game.total, time);
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  // A screenshot scene: stage it, draw one frame, and stop.
  const scene = stageShot(shot);
  draw(scene.screen, scene.world, scene);
  document.body.dataset.ready = '1';
} else {
  const input = createInput(canvas);
  let last = performance.now();
  let acc = 0;
  const frame = (now) => {
    acc = Math.min(acc + (now - last) / 1000, 0.25);
    last = now;
    while (acc >= STEP) {
      tick(input);
      input.endTick();
      game.clock += STEP;
      acc -= STEP;
    }
    const aim = input.aim.inside ? input.aim : null;
    draw(game.screen, game.world, { aim, plan: game.plan });
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  announce('Gilded Hush. Press Enter to begin.');
}
