// Boot and the one loop for Harbourlight: input every frame, the world in
// fixed 1/60 steps, the renderer painting what is there. Screens: title,
// play, paused, blown and the clean getaway.
//
// ?shot=shed|coldstore|vault|title stages a real scene for a screenshot and
// sets window.__shotReady once it has painted twice.

import { BEST_KEY, STEP } from './config.js';
import { createWorld, stepWorld, EV_CAUGHT, EV_GAME_OVER, EV_KEY, EV_LEVEL_DONE, EV_NOISE, EV_PICKUP, EV_WIN } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld();
world.__step = stepWorld;
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveBest(v) {
  try { window.localStorage.setItem(BEST_KEY, String(v)); } catch { /* private window: best lasts the visit */ }
}

if (shot) {
  const scene = stageShot(shot, world);
  let painted = 0;
  const paint = () => {
    renderer.draw(world, scene.screen, readBest());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  };
  requestAnimationFrame(paint);
} else {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let acc = 0;
  let last = performance.now();

  function announce() {
    status.textContent = `${world.level.name}: loot ${world.lootTaken} of 5, alarm ${Math.round(world.alarm * 100)} percent, lives ${world.lives}`;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    if (input.takePause() && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED)) {
      screen = screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
    }
    if (screen === SCREEN_TITLE && input.takeConfirm()) { audio.unlock(); screen = SCREEN_PLAY; }
    else if ((screen === SCREEN_OVER || screen === SCREEN_WIN) && input.takeConfirm()) {
      const fresh = createWorld();
      Object.assign(world, fresh);
      screen = SCREEN_PLAY;
    }
    if (screen === SCREEN_PLAY) {
      acc += dt;
      while (acc >= STEP) {
        acc -= STEP;
        const ev = stepWorld(world, input.read(), STEP);
        if (ev === EV_PICKUP) audio.pickup();
        else if (ev === EV_KEY) audio.key();
        else if (ev === EV_NOISE) audio.noise();
        else if (ev === EV_CAUGHT) audio.caught();
        else if (ev === EV_LEVEL_DONE) audio.done();
        else if (ev === EV_WIN) { audio.done(); screen = SCREEN_WIN; }
        else if (ev === EV_GAME_OVER) { audio.caught(); screen = SCREEN_OVER; }
        if (world.score > best) { best = world.score; saveBest(best); }
      }
      announce();
    }
    renderer.draw(world, screen, best);
  }
  requestAnimationFrame(frame);
}
