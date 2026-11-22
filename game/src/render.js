// Canvas painting for Harbourlight. Every gameplay frame shows the whole
// brief at once: the thief crossing the shed, warden cones cut by the crate
// stacks, sweeping camera cones, a loot target, and the ALARM meter in the
// harbour-office HUD strip across the top.

import { FLOOR_Y, FONT, PALETTE, STAGE, TILE } from './config.js';
import { tileCentre } from './levels.js';
import { lineOfSight } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function conePath(ctx, state, ox, oy, face, range, half) {
  const rays = 26;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  for (let i = 0; i <= rays; i += 1) {
    const a = face - half + (2 * half * i) / rays;
    let d = range;
    const step = 8;
    for (let r = step; r <= range; r += step) {
      const px = ox + Math.cos(a) * r;
      const py = oy + Math.sin(a) * r;
      const tx = Math.floor(px / TILE);
      const ty = Math.floor((py - FLOOR_Y) / TILE);
      if (tx < 0 || ty < 0 || tx >= 32 || ty >= 16 || state.grid[ty][tx] !== null) { d = r - step / 2; break; }
    }
    ctx.lineTo(ox + Math.cos(a) * d, oy + Math.sin(a) * d);
  }
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = STAGE.width;
  canvas.height = STAGE.height;

  function drawFloor(state) {
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 32; x += 1) {
        ctx.fillStyle = (x + y) % 2 ? PALETTE.floor : PALETTE.floorAlt;
        ctx.fillRect(x * TILE, FLOOR_Y + y * TILE, TILE, TILE);
        ctx.fillStyle = PALETTE.plank;
        ctx.fillRect(x * TILE, FLOOR_Y + y * TILE + TILE - 3, TILE, 2);
      }
    }
    // Tide water lapping the bottom dock edge
    ctx.fillStyle = '#0d3742';
    ctx.fillRect(0, FLOOR_Y + 16 * TILE - 6, STAGE.width, 6);
    ctx.fillStyle = '#2f7d8c';
    for (let x = 12; x < STAGE.width; x += 64) ctx.fillRect(x + ((state.time * 14) % 32), FLOOR_Y + 16 * TILE - 5, 22, 2);
  }

  function drawObstacles(state) {
    for (const o of state.level.obstacles) {
      const px = o.x * TILE; const py = FLOOR_Y + o.y * TILE;
      const w = o.w * TILE; const h = o.h * TILE;
      if (o.kind === 'wall') {
        ctx.fillStyle = PALETTE.wall; ctx.fillRect(px, py, w, h);
        ctx.fillStyle = PALETTE.wallTop; ctx.fillRect(px, py, w, 6);
      } else if (o.kind === 'rack') {
        ctx.fillStyle = '#274b57'; ctx.fillRect(px, py, w, h);
        ctx.fillStyle = '#7fd4e6'; ctx.fillRect(px + 4, py + 5, w - 8, 4);
        ctx.fillStyle = '#bfeaf2';
        for (let x = px + 8; x < px + w - 8; x += 18) ctx.fillRect(x, py + 14, 10, h - 20);
      } else {
        ctx.fillStyle = PALETTE.crate; ctx.fillRect(px, py, w, h);
        ctx.fillStyle = PALETTE.crateTop; ctx.fillRect(px, py, w, 6);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        for (let x = px + TILE; x < px + w; x += TILE) { ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x, py + h); ctx.stroke(); }
        ctx.strokeRect(px + 3.5, py + 3.5, w - 7, h - 7);
      }
    }
    // Rim walls
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, FLOOR_Y, STAGE.width, 4); ctx.fillRect(0, FLOOR_Y + 16 * TILE - 4, STAGE.width, 4);
    ctx.fillRect(0, FLOOR_Y, 4, 16 * TILE); ctx.fillRect(STAGE.width - 4, FLOOR_Y, 4, 16 * TILE);
  }

  function drawDoorAndExit(state) {
    const d = tileCentre(state.level.door.x, state.level.door.y);
    ctx.fillStyle = state.doorOpen ? PALETTE.doorOpen : PALETTE.door;
    ctx.fillRect(d.x - 19, d.y - 19, 38, 38);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 17px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(state.doorOpen ? 'OPEN' : 'LOCK', d.x, d.y + 6);
    const e = tileCentre(state.level.exit.x, state.level.exit.y);
    ctx.fillStyle = '#123f2a';
    ctx.fillRect(e.x - 20, e.y - 20, 40, 40);
    ctx.strokeStyle = PALETTE.exit; ctx.lineWidth = 3; ctx.strokeRect(e.x - 18, e.y - 18, 36, 36);
    ctx.fillStyle = PALETTE.exit;
    ctx.font = `bold 11px ${FONT}`;
    ctx.fillText('BOAT', e.x, e.y - 1);
    ctx.fillText(state.lootTaken >= 3 ? 'GO!' : `${state.lootTaken}/3`, e.x, e.y + 13);
    ctx.lineWidth = 1;
  }

  function drawLoot(state) {
    for (const l of state.loot) {
      if (l.taken) continue;
      const pulse = 3 + Math.sin(state.time * 3 + l.x) * 1.5;
      ctx.fillStyle = 'rgba(255,217,77,0.22)';
      ctx.beginPath(); ctx.arc(l.x, l.y, 17 + pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.loot;
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-8, -8, 16, 16); ctx.restore();
      ctx.fillStyle = '#7a5b00';
      ctx.font = `bold 11px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText('£', l.x, l.y + 4);
    }
    if (!state.keyTaken) {
      const k = state.keyPos;
      ctx.fillStyle = PALETTE.key;
      ctx.beginPath(); ctx.arc(k.x - 5, k.y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(k.x - 2, k.y - 2.5, 16, 5);
      ctx.fillRect(k.x + 9, k.y + 2, 4, 6);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `10px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText('MANIFEST KEY', k.x, k.y + 24);
    }
  }

  function drawActors(state) {
    for (const c of state.cameras) {
      ctx.fillStyle = PALETTE.coneCamera;
      conePath(ctx, state, c.x, c.y, c.angle, 178, 0.5); ctx.fill();
    }
    for (const g of state.guards) {
      ctx.fillStyle = g.mode === 'chase' ? PALETTE.coneHot : PALETTE.coneGuard;
      conePath(ctx, state, g.x, g.y, g.face, 196, 0.62); ctx.fill();
    }
    for (const c of state.cameras) {
      ctx.fillStyle = PALETTE.camera;
      ctx.beginPath(); ctx.arc(c.x, c.y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5b6d72';
      ctx.beginPath(); ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x + Math.cos(c.angle) * 15, c.y + Math.sin(c.angle) * 15); ctx.stroke();
      ctx.fillStyle = state.seen ? PALETTE.alarm : '#59d977';
      ctx.beginPath(); ctx.arc(c.x, c.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    for (const g of state.guards) {
      ctx.fillStyle = PALETTE.guardDark;
      ctx.beginPath(); ctx.arc(g.x, g.y, g.r + 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.guard;
      ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe9c9';
      ctx.beginPath(); ctx.arc(g.x + Math.cos(g.face) * 5, g.y + Math.sin(g.face) * 5, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.guardDark;
      ctx.fillRect(g.x - 8, g.y - 13, 16, 5);
      if (g.mode !== 'patrol') {
        ctx.fillStyle = g.mode === 'chase' ? PALETTE.alarm : PALETTE.loot;
        ctx.font = `bold 16px ${FONT}`; ctx.textAlign = 'center';
        ctx.fillText(g.mode === 'chase' ? '!' : '?', g.x, g.y - 20);
      }
    }
    const t = state.thief;
    if (state.noise) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(state.noise.x, state.noise.y, 16 + (3 - state.noise.t) * 10, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#cfd8dc';
      ctx.beginPath(); ctx.arc(state.noise.x, state.noise.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(t.x, t.y + 12, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.thiefCoat;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r + 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.thief;
    ctx.beginPath(); ctx.arc(t.x + Math.cos(t.face) * 4, t.y + Math.sin(t.face) * 4, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(t.x - 8, t.y - 15, 16, 5);
  }

  function drawHud(state, screen) {
    ctx.fillStyle = PALETTE.hud;
    ctx.fillRect(0, 0, STAGE.width, FLOOR_Y);
    ctx.fillStyle = PALETTE.hudEdge;
    ctx.fillRect(0, FLOOR_Y - 3, STAGE.width, 3);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 19px ${FONT}`; ctx.textAlign = 'left';
    ctx.fillText(`HARBOURLIGHT — ${state.level.name}`, 16, 30);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `12.5px ${FONT}`;
    ctx.fillText(state.level.sub, 16, 52);
    // Alarm meter — always on screen
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'left';
    ctx.fillText('ALARM', 560, 28);
    ctx.fillStyle = PALETTE.alarmBg;
    ctx.fillRect(560, 36, 250, 16);
    ctx.fillStyle = state.alarm > 0.66 ? PALETTE.alarm : state.alarm > 0.33 ? '#f0b429' : '#43d17c';
    ctx.fillRect(560, 36, 250 * Math.min(1, state.alarm), 16);
    ctx.strokeStyle = PALETTE.hudEdge; ctx.strokeRect(560.5, 36.5, 250, 16);
    if (state.seen) { ctx.fillStyle = PALETTE.alarm; ctx.fillText('SPOTTED!', 560, 66 - 4); }
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(`Loot ${state.lootTaken}/5  £${state.lootValue}`, 850, 30);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `12.5px ${FONT}`;
    const mm = Math.max(0, Math.floor(state.levelTime / 60));
    const ss = Math.max(0, Math.floor(state.levelTime % 60)).toString().padStart(2, '0');
    ctx.fillText(`Tide ${mm}:${ss}   Lives ${'♥'.repeat(Math.max(0, state.lives))}   Bottles ${state.bottles}   Score ${state.score}`, 850, 52);
    ctx.fillStyle = state.hasKey ? PALETTE.key : PALETTE.muted;
    ctx.font = `bold 12.5px ${FONT}`;
    ctx.fillText(state.hasKey ? 'KEY ✓' : 'KEY —', 1210, 30);
    if (state.messageT > 0 && state.message) {
      ctx.fillStyle = 'rgba(10,18,22,0.82)';
      ctx.fillRect(340, FLOOR_Y + 8, 600, 30);
      ctx.fillStyle = PALETTE.loot;
      ctx.font = `bold 14px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText(state.message, 640, FLOOR_Y + 28);
    }
    if (screen === SCREEN_PLAY) {
      ctx.fillStyle = 'rgba(238,244,242,0.65)';
      ctx.font = `11.5px ${FONT}`; ctx.textAlign = 'right';
      ctx.fillText('WASD/arrows move · Shift sneak · Space sprint · Click: throw bottle · P pause', 1264, STAGE.height - 8);
    }
  }

  function panel(title, lines) {
    ctx.fillStyle = 'rgba(8, 15, 19, 0.78)';
    ctx.fillRect(290, 190, 700, 330);
    ctx.strokeStyle = PALETTE.hudEdge; ctx.lineWidth = 2; ctx.strokeRect(290, 190, 700, 330); ctx.lineWidth = 1;
    ctx.fillStyle = PALETTE.loot;
    ctx.font = `bold 40px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(title, 640, 258);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `16.5px ${FONT}`;
    lines.forEach((line, i) => ctx.fillText(line, 640, 306 + i * 27));
  }

  function draw(state, screen, best = 0) {
    drawFloor(state);
    drawObstacles(state);
    drawDoorAndExit(state);
    drawLoot(state);
    drawActors(state);
    drawHud(state, screen);
    if (screen === SCREEN_TITLE) {
      panel('HARBOURLIGHT', [
        'The Low-Tide Job — three sheds, one boat, no witnesses.',
        'Wren the dock-thief empties the customs warehouses before dawn.',
        'Lift at least 3 treasures, take the manifest key, reach the BOAT.',
        'Wardens and cameras raise the ALARM — full meter, or a hand on',
        'your collar while it runs hot, and the job is blown.',
        '',
        'WASD / arrows move · Shift sneak · Space sprint',
        'Mouse click throws a bottle to draw wardens away',
        '',
        'Press Enter to slip inside',
      ]);
    } else if (screen === SCREEN_PAUSED) {
      panel('PAUSED', ['The tide waits for no one — but it waits for you, briefly.', '', 'Press P to keep going']);
    } else if (screen === SCREEN_OVER) {
      panel('JOB BLOWN', [`The wardens keep the harbour tonight.`, `Final score ${state.score} · Best ${Math.max(best, state.score)}`, '', 'Press Enter to try the night again']);
    } else if (screen === SCREEN_WIN) {
      panel('CLEAN GETAWAY', [`The boat slides out on the low tide, holds full.`, `Final score ${state.score} · Best ${Math.max(best, state.score)}`, '', 'Press Enter to run the night again']);
    }
  }

  return { draw };
}
