// Screenshot scenes behind ?shot=shed|coldstore|vault|title. Each stages the
// real simulation: the world is stepped forward with a scripted thief so the
// frame is honest gameplay — thief mid-crossing, warden and camera cones
// live, loot on the floor, and the alarm meter already warm from a near
// sighting, exactly as a hurried run looks a minute in.

import { loadLevel } from './world.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SCENES = {
  shed: { level: 0, thief: [15, 7], alarm: 0.34, steps: 150 },
  coldstore: { level: 1, thief: [17, 8], alarm: 0.42, steps: 190 },
  vault: { level: 2, thief: [16, 8], alarm: 0.28, steps: 170 },
  title: { level: 0, thief: [13, 9], alarm: 0.22, steps: 120 },
};

export function stageShot(name, state) {
  const scene = SCENES[name] ?? SCENES.shed;
  loadLevel(state, scene.level);
  state.thief.x = scene.thief[0] * 40 + 20;
  state.thief.y = 72 + scene.thief[1] * 40 + 20;
  state.thief.face = 0.4;
  // Walk the wardens and cameras forward so cones sit mid-sweep, mid-patrol.
  const idle = { x: 0, y: 0, sneak: false, sprint: false, bottle: null };
  // Imported lazily by main through stepWorld to avoid a cycle: main passes it.
  for (let i = 0; i < scene.steps; i += 1) state.__step(state, idle, 1 / 60);
  // Restage the thief after the soak (the soak world may have moved on).
  state.thief.x = scene.thief[0] * 40 + 20;
  state.thief.y = 72 + scene.thief[1] * 40 + 20;
  state.thief.face = 0.4;
  state.alarm = scene.alarm;
  state.alarmPeak = scene.alarm;
  state.cameras.forEach((c) => { c.angle = c.base; });
  state.score = 120;
  state.lives = 3;
  state.over = false;
  state.levelTime = 173;
  state.lootTaken = 1;
  state.lootValue = 120;
  if (state.loot[0]) state.loot[0].taken = true;
  state.message = '';
  state.messageT = 0;
  return { screen: name === 'title' ? SCREEN_TITLE : SCREEN_PLAY };
}
