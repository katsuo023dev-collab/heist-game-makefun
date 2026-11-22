// Gilded Hush: every tuning number and colour in one place, so balance and look change here only.

export const VIEW = { width: 1280, height: 720 };
export const TILE = 32;
export const COLS = 40;
export const ROWS = 19;
/** The map is drawn from y = 0 to MAP_HEIGHT; the HUD bar fills the rest. */
export const MAP_HEIGHT = TILE * ROWS;
export const HUD_HEIGHT = VIEW.height - MAP_HEIGHT;
export const STEP = 1 / 60;

export const THIEF = {
  radius: 9,
  walk: 118,
  sprint: 185,
  /** Sprinting is loud: guards inside this radius turn to look. */
  sprintNoise: 150,
  crackSeconds: 1.6,
  reach: 34,
};

export const GUARD = {
  radius: 10,
  patrol: 58,
  hurry: 96,
  chase: 128,
  fov: (70 * Math.PI) / 180,
  range: 200,
  turnRate: 3.2,
  /** How long a guard stares at a spot it went to check. */
  lookAround: 2.4,
  catchDistance: 22,
};

export const CAMERA = {
  fov: (50 * Math.PI) / 180,
  range: 230,
};

export const ALARM = {
  max: 100,
  /** Alarm per second while a guard sees you at point-blank range; far away it is ~45% of this. */
  guardRate: 62,
  cameraRate: 44,
  /** Standing in shadow cuts the rate you are noticed at. */
  shadowFactor: 0.35,
  decay: 9,
  decayDelay: 1.4,
  /** Above this the whole building is on edge: guards hurry and cones grow. */
  lockdown: 65,
};

export const TOOLS = [
  { id: 'smoke', key: '1', name: 'Smoke', cost: 300, charges: 2, range: 240, radius: 62, seconds: 6.5, hint: 'blocks sight' },
  { id: 'coin', key: '2', name: 'Coin', cost: 60, charges: 3, range: 300, radius: 250, seconds: 0, hint: 'lures guards' },
  { id: 'jammer', key: '3', name: 'Jammer', cost: 220, charges: 2, range: 520, radius: 70, seconds: 7, hint: 'blinds a camera' },
];

export const PALETTE = {
  ink: '#0b0d1a',
  floor: '#1a1f3a',
  floorLine: '#232a4d',
  carpet: '#3a1d3f',
  carpetEdge: '#5a2a5c',
  wall: '#e9dfc7',
  wallShade: '#b9a985',
  wallTop: '#fff6dd',
  shadow: '#0e0a24',
  shadowHatch: '#2c2560',
  guardCone: 'rgba(255, 186, 50, 0.30)',
  guardConeEdge: 'rgba(255, 214, 120, 0.9)',
  cameraCone: 'rgba(79, 230, 220, 0.24)',
  cameraConeEdge: 'rgba(120, 255, 240, 0.7)',
  spotted: 'rgba(255, 70, 90, 0.38)',
  spottedEdge: 'rgba(255, 90, 110, 0.95)',
  guard: '#f2b33d',
  guardDark: '#7a4c10',
  camera: '#4fe6dc',
  thief: '#141726',
  scarf: '#3ef0b0',
  loot: '#ffd84a',
  lootGlow: 'rgba(255, 216, 74, 0.35)',
  trinket: '#ffb0e0',
  exit: '#3ef0b0',
  smoke: 'rgba(190, 196, 220, 0.82)',
  text: '#f4ecd8',
  muted: '#8f93b8',
  danger: '#ff4a5e',
  hud: '#0d1024',
};
