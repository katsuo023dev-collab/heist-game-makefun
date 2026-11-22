// Security cameras: fixed eyes that sweep back and forth on a timer and can be jammed blind.
import { TILE } from './config.js';

const RAD = Math.PI / 180;

export function createCamera(def, id) {
  return {
    id,
    x: (def.tile[0] + 0.5) * TILE,
    y: (def.tile[1] + 0.5) * TILE,
    base: def.angle * RAD,
    sweep: def.sweep * RAD,
    period: def.period,
    facing: def.angle * RAD,
    jammed: 0,
    seesThief: false,
  };
}

/** Sweep on the shared clock so the same time always gives the same angle. */
export function updateCamera(camera, time, dt) {
  camera.facing = camera.base + Math.sin((time / camera.period) * Math.PI * 2) * camera.sweep;
  if (camera.jammed > 0) camera.jammed = Math.max(0, camera.jammed - dt);
}

export function isJammed(camera) {
  return camera.jammed > 0;
}
