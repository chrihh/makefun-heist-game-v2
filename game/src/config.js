// Harbourlight: The Low-Tide Job — tuning and palette in one place.
// The playfield is a fixed 1280x720 logical stage: a 72px harbour-office HUD
// strip on top and a 32x16 tile warehouse floor (40px tiles) below it.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 16;
export const FLOOR_Y = 72;
export const STAGE = { width: 1280, height: 720 };

/** Fixed simulation step: 60 updates a second at any display rate. */
export const STEP = 1 / 60;

export const THIEF = {
  radius: 13,
  walk: 148,
  sneak: 74,
  sprint: 228,
  noiseWalk: 46,
  noiseSprint: 118,
};

export const GUARD = {
  radius: 14,
  patrol: 62,
  chase: 158,
  investigate: 104,
  viewRange: 196,
  viewHalfAngle: 0.62,
};

export const CAMERA = {
  viewRange: 178,
  viewHalfAngle: 0.5,
  sweep: 0.55,
};

export const ALARM = {
  guardRate: 0.85,
  cameraRate: 0.55,
  decay: 0.075,
  catchAt: 1,
};

export const LEVEL_TIME = 240;
export const START_LIVES = 3;
export const BOTTLES_PER_LEVEL = 3;

export const PALETTE = {
  night: '#0a1216',
  hud: '#0e1c22',
  hudEdge: '#2b4a52',
  floor: '#1d2f33',
  floorAlt: '#21363b',
  plank: '#16262b',
  wall: '#3d5a52',
  wallTop: '#527a6e',
  crate: '#6e5636',
  crateTop: '#8a6d43',
  barrel: '#31556b',
  door: '#a03d2d',
  doorOpen: '#274b3a',
  thief: '#f0b429',
  thiefCoat: '#274156',
  guard: '#d95d43',
  guardDark: '#8c3524',
  camera: '#cfd8dc',
  coneGuard: 'rgba(240, 178, 66, 0.20)',
  coneCamera: 'rgba(120, 200, 235, 0.16)',
  coneHot: 'rgba(235, 70, 50, 0.30)',
  loot: '#ffd94d',
  key: '#ffdf6b',
  exit: '#43d17c',
  text: '#eef4f2',
  muted: '#93a8a4',
  alarm: '#e5534b',
  alarmBg: '#3a2326',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'harbourlight-low-tide-best';
