// Every sound is synthesised with Web Audio at play time: no sound files, no network.
// A low heartbeat that quickens with the alarm, plus short cues for spotted, tools, loot and escape.

let ctx = null;
let master = null;
let beatTimer = 0;

/** Browsers only allow audio after a user gesture, so main calls this on the first key or click. */
export function unlockAudio() {
  if (ctx) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  ctx = new AudioContextClass();
  master = ctx.createGain();
  master.gain.value = 0.25;
  master.connect(ctx.destination);
}

function tone(freq, duration, { type = 'sine', gain = 0.4, slide = 0, delay = 0 } = {}) {
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), start + duration);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp).connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

const CUES = {
  laser: () => { tone(1480, 0.08, { type: 'sawtooth', gain: 0.18 }); tone(740, 0.3, { type: 'sawtooth', gain: 0.18, delay: 0.08 }); },
  spotted: () => { tone(880, 0.12, { type: 'square', gain: 0.2 }); tone(1175, 0.16, { type: 'square', gain: 0.2, delay: 0.1 }); },
  caught: () => { tone(220, 0.6, { type: 'sawtooth', gain: 0.35, slide: -120 }); tone(233, 0.6, { type: 'sawtooth', gain: 0.25, slide: -130 }); },
  tool: () => tone(520, 0.15, { type: 'triangle', gain: 0.3, slide: 260 }),
  toolFail: () => tone(160, 0.12, { type: 'square', gain: 0.15 }),
  trinket: () => tone(1320, 0.12, { type: 'triangle', gain: 0.25 }),
  loot: () => [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.22, { type: 'triangle', gain: 0.3, delay: i * 0.08 })),
  escaped: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, { type: 'triangle', gain: 0.3, delay: i * 0.1 })),
  noise: () => tone(300, 0.08, { type: 'square', gain: 0.08 }),
};

export function playCue(name) {
  const cue = CUES[name];
  if (cue) cue();
}

/** The heartbeat: about 50 bpm when calm, racing near a full alarm. */
export function heartbeat(alarm, dt) {
  if (!ctx) return;
  beatTimer -= dt;
  if (beatTimer > 0) return;
  const t = alarm / 100;
  beatTimer = 1.2 - t * 0.85;
  tone(55 + t * 30, 0.14, { gain: 0.25 + t * 0.3 });
  tone(50 + t * 30, 0.12, { gain: 0.2 + t * 0.25, delay: 0.16 });
}
