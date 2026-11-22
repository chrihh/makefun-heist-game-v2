// The low-tide simulation: thief, wardens and cameras on the tile floor.
// Pure logic, no DOM — the dev tests drive this same module headlessly.
// Detection is a cone test cut by walls: range, half-angle and a sampled
// line of sight, so a crate stack between you and a warden really hides you.

import { ALARM, BOTTLES_PER_LEVEL, CAMERA, GUARD, LEVEL_TIME, START_LIVES, THIEF } from './config.js';
import { LEVELS, buildGrid, tileCentre } from './levels.js';

export const EV_NONE = 0;
export const EV_PICKUP = 1;
export const EV_KEY = 2;
export const EV_CAUGHT = 3;
export const EV_LEVEL_DONE = 4;
export const EV_GAME_OVER = 5;
export const EV_WIN = 6;
export const EV_NOISE = 7;

function solidAt(grid, px, py) {
  const tx = Math.floor(px / 40);
  const ty = Math.floor((py - 72) / 40);
  if (tx < 0 || ty < 0 || tx >= 32 || ty >= 16) return true;
  return grid[ty][tx] !== null;
}

export function lineOfSight(grid, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.floor(dist / 9));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (solidAt(grid, x1 + dx * t, y1 + dy * t)) return false;
  }
  return true;
}

function moveCircle(state, e, dx, dy) {
  const grid = state.grid;
  let nx = e.x + dx;
  if (!solidAt(grid, nx + Math.sign(dx) * e.r, e.y) && !solidAt(grid, nx + Math.sign(dx) * e.r, e.y - e.r + 3) && !solidAt(grid, nx + Math.sign(dx) * e.r, e.y + e.r - 3)) e.x = nx;
  nx = e.x;
  let ny = e.y + dy;
  if (!solidAt(grid, e.x, ny + Math.sign(dy) * e.r) && !solidAt(grid, e.x - e.r + 3, ny + Math.sign(dy) * e.r) && !solidAt(grid, e.x + e.r - 3, ny + Math.sign(dy) * e.r)) e.y = ny;
}

export function createWorld() {
  const state = {
    levelIndex: 0, score: 0, lives: START_LIVES, time: 0,
    alarm: 0, alarmPeak: 0, bottles: BOTTLES_PER_LEVEL,
    hasKey: false, doorOpen: false, lootTaken: 0, lootValue: 0,
    over: false, won: false, message: '', messageT: 0,
    thief: null, guards: [], cameras: [], loot: [], grid: null,
    keyPos: null, keyTaken: false, noise: null, levelTime: LEVEL_TIME,
    seen: false, level: null,
  };
  loadLevel(state, 0);
  return state;
}

export function loadLevel(state, index) {
  const level = LEVELS[index];
  state.level = level;
  state.levelIndex = index;
  state.hasKey = false;
  state.doorOpen = false;
  state.keyTaken = false;
  state.lootTaken = 0;
  state.lootValue = 0;
  state.bottles = BOTTLES_PER_LEVEL;
  state.alarm = 0;
  state.alarmPeak = 0;
  state.levelTime = LEVEL_TIME;
  state.noise = null;
  state.grid = buildGrid(level, false);
  const s = tileCentre(level.start.x, level.start.y);
  state.thief = { x: s.x, y: s.y, r: THIEF.radius, face: -Math.PI / 2, moving: false, sneak: false, sprint: false };
  state.guards = level.guards.map((path, i) => {
    const p = tileCentre(path[0].x, path[0].y);
    return { x: p.x, y: p.y, r: GUARD.radius, path, wp: 1 % path.length, face: i * 1.7, mode: 'patrol', wait: 0, ix: 0, iy: 0, heard: 0 };
  });
  state.cameras = level.cameras.map((c) => {
    const p = tileCentre(c.x, c.y);
    return { x: p.x, y: p.y, base: c.base, range: c.range, phase: c.x * 0.7 + c.y, angle: c.base };
  });
  state.loot = level.loot.map((l) => ({ ...tileCentre(l.x, l.y), label: l.label, value: l.value, taken: false }));
  const k = tileCentre(level.key.x, level.key.y);
  state.keyPos = { x: k.x, y: k.y };
}

function guardTarget(state, g) {
  if (g.mode === 'chase') return state.thief;
  if (g.mode === 'investigate') return { x: g.ix, y: g.iy };
  const wp = g.path[g.wp];
  return tileCentre(wp.x, wp.y);
}

function stepGuard(state, g, dt) {
  const speeds = { patrol: GUARD.patrol, chase: GUARD.chase, investigate: GUARD.investigate };
  const target = guardTarget(state, g);
  const dx = target.x - g.x;
  const dy = target.y - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 4) {
    const sp = speeds[g.mode];
    moveCircle(state, g, (dx / dist) * sp * dt, (dy / dist) * sp * dt);
    g.face = Math.atan2(dy, dx);
  } else if (g.mode === 'patrol') {
    g.wp = (g.wp + 1) % g.path.length;
  } else if (g.mode === 'investigate') {
    g.wait += dt;
    if (g.wait > 2.2) { g.mode = 'patrol'; g.wait = 0; }
  }
}

function coneSees(state, ox, oy, face, range, half, tx, ty) {
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range || dist < 1) return 0;
  let diff = Math.atan2(dy, dx) - face;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > half) return 0;
  if (!lineOfSight(state.grid, ox, oy, tx, ty)) return 0;
  return 1 - dist / range;
}

/** Advance one fixed step. input: {x,y in -1..1, sneak, sprint, bottle:{x,y}|null} */
export function stepWorld(state, input, dt) {
  if (state.over) return EV_NONE;
  let event = EV_NONE;
  state.time += dt;
  state.levelTime -= dt;
  if (state.messageT > 0) state.messageT -= dt;

  // Thief
  const t = state.thief;
  const mag = Math.hypot(input.x, input.y);
  t.moving = mag > 0.05;
  t.sneak = !!input.sneak;
  t.sprint = !!input.sprint && t.moving && !input.sneak;
  if (t.moving) {
    const speed = t.sneak ? THIEF.sneak : t.sprint ? THIEF.sprint : THIEF.walk;
    const nx = (input.x / (mag || 1)) * Math.min(1, mag);
    const ny = (input.y / (mag || 1)) * Math.min(1, mag);
    moveCircle(state, t, nx * speed * dt, 0);
    moveCircle(state, t, 0, ny * speed * dt);
    t.face = Math.atan2(ny, nx);
    const noiseR = t.sprint ? THIEF.noiseSprint : t.sneak ? 10 : THIEF.noiseWalk;
    for (const g of state.guards) {
      if (g.mode === 'patrol' && Math.hypot(g.x - t.x, g.y - t.y) < noiseR + 60) {
        g.mode = 'investigate'; g.ix = t.x; g.iy = t.y; g.wait = 0;
      }
    }
  }

  // Bottle distraction (mouse)
  if (input.bottle && state.bottles > 0) {
    state.bottles -= 1;
    state.noise = { x: input.bottle.x, y: input.bottle.y, t: 3 };
    for (const g of state.guards) {
      if (Math.hypot(g.x - input.bottle.x, g.y - input.bottle.y) < 300) {
        g.mode = 'investigate'; g.ix = input.bottle.x; g.iy = input.bottle.y; g.wait = 0;
      }
    }
    event = EV_NOISE;
  }
  if (state.noise) { state.noise.t -= dt; if (state.noise.t <= 0) state.noise = null; }

  // Cameras sweep
  for (const c of state.cameras) {
    c.angle = c.base + Math.sin(state.time * CAMERA.sweep + c.phase) * c.range;
  }

  // Guards + detection
  let seen = 0;
  for (const g of state.guards) {
    stepGuard(state, g, dt);
    const s = coneSees(state, g.x, g.y, g.face, GUARD.viewRange, GUARD.viewHalfAngle, t.x, t.y);
    if (s > 0) {
      seen = Math.max(seen, s);
      g.mode = 'chase';
    } else if (g.mode === 'chase') {
      g.mode = 'investigate'; g.ix = t.x; g.iy = t.y; g.wait = 0;
    }
    if (Math.hypot(g.x - t.x, g.y - t.y) < g.r + t.r + 2 && state.alarm > 0.25) {
      return caught(state);
    }
  }
  for (const c of state.cameras) {
    const s = coneSees(state, c.x, c.y, c.angle, CAMERA.viewRange, CAMERA.viewHalfAngle, t.x, t.y);
    if (s > 0) seen = Math.max(seen, s * 0.8);
  }
  state.seen = seen > 0;
  if (seen > 0) {
    const rate = seen > 0.55 ? ALARM.guardRate : ALARM.cameraRate;
    state.alarm = Math.min(1, state.alarm + rate * (0.35 + seen) * dt);
  } else {
    state.alarm = Math.max(0, state.alarm - ALARM.decay * dt);
  }
  state.alarmPeak = Math.max(state.alarmPeak, state.alarm);
  if (state.alarm >= ALARM.catchAt) return caught(state);

  // Pickups
  if (!state.keyTaken && Math.hypot(state.keyPos.x - t.x, state.keyPos.y - t.y) < 26) {
    state.keyTaken = true;
    state.hasKey = true;
    state.message = 'Manifest key taken — the customs door will open';
    state.messageT = 3;
    event = EV_KEY;
  }
  if (state.hasKey && !state.doorOpen) {
    const d = tileCentre(state.level.door.x, state.level.door.y);
    if (Math.hypot(d.x - t.x, d.y - t.y) < 46) {
      state.doorOpen = true;
      state.grid = buildGrid(state.level, true);
      state.message = 'The customs door swings open';
      state.messageT = 3;
    }
  }
  for (const l of state.loot) {
    if (!l.taken && Math.hypot(l.x - t.x, l.y - t.y) < 26) {
      l.taken = true;
      state.lootTaken += 1;
      state.lootValue += l.value;
      state.score += l.value;
      state.message = `${l.label} lifted (+${l.value})`;
      state.messageT = 2.5;
      event = EV_PICKUP;
    }
  }

  // Exit: the getaway boat at the dock gate — needs at least 3 loot
  const e = tileCentre(state.level.exit.x, state.level.exit.y);
  if (Math.hypot(e.x - t.x, e.y - t.y) < 28 && state.lootTaken >= 3) {
    state.score += Math.max(0, Math.round(state.levelTime)) + (state.alarmPeak < 0.5 ? 150 : 0);
    if (state.levelIndex + 1 >= LEVELS.length) {
      state.won = true;
      state.over = true;
      return EV_WIN;
    }
    loadLevel(state, state.levelIndex + 1);
    return EV_LEVEL_DONE;
  }

  if (state.levelTime <= 0) return caught(state, true);
  return event;
}

function caught(state, timeout = false) {
  state.lives -= 1;
  state.message = timeout ? 'The tide turned — the job is blown' : 'Caught! The wardens haul you back to the dock gate';
  state.messageT = 3;
  if (state.lives <= 0) {
    state.over = true;
    state.won = false;
    return EV_GAME_OVER;
  }
  const lvl = state.levelIndex;
  const score = state.score;
  loadLevel(state, lvl);
  state.score = score;
  return EV_CAUGHT;
}
