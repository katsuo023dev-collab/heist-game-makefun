// Keyboard and mouse, read into a per-tick snapshot. Mouse positions are mapped from the
// stretched canvas back into the game's 1280 x 720 coordinates.
import { VIEW } from './config.js';

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const clicks = [];
  const aim = { x: VIEW.width / 2, y: VIEW.height / 2, inside: false };

  window.addEventListener('keydown', (e) => {
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (!held.has(e.code)) pressed.add(e.code);
    held.add(e.code);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());

  const toGame = (e) => {
    const rect = canvas.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * VIEW.width, y: ((e.clientY - rect.top) / rect.height) * VIEW.height };
  };
  canvas.addEventListener('mousemove', (e) => Object.assign(aim, toGame(e), { inside: true }));
  canvas.addEventListener('mouseleave', () => { aim.inside = false; });
  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    clicks.push(toGame(e));
    pressed.add('Click');
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    aim,
    isHeld: (code) => held.has(code),
    /** True once per key press; cleared by endTick. */
    wasPressed: (code) => pressed.has(code),
    takeClicks: () => clicks.splice(0, clicks.length),
    endTick: () => pressed.clear(),
    anyPressed: () => pressed.size > 0,
  };
}

/** The movement and action part of a tick, as the world wants it. */
export function readControls(input) {
  const h = input.isHeld;
  const dx = (h('KeyD') || h('ArrowRight') ? 1 : 0) - (h('KeyA') || h('ArrowLeft') ? 1 : 0);
  const dy = (h('KeyS') || h('ArrowDown') ? 1 : 0) - (h('KeyW') || h('ArrowUp') ? 1 : 0);
  let select = -1;
  if (input.wasPressed('Digit1')) select = 0;
  if (input.wasPressed('Digit2')) select = 1;
  if (input.wasPressed('Digit3')) select = 2;
  return {
    dx,
    dy,
    sprint: h('ShiftLeft') || h('ShiftRight'),
    interact: h('KeyE') || h('Space'),
    select,
    clicks: [],
  };
}
