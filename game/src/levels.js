// The three jobs of the low-tide night, described as tile data: solid
// rectangles (walls of the bonded sheds, crate stacks, coldstore racks), one
// locked customs door per shed, the brass manifest key that opens it, loot
// worth lifting, guard patrol loops and the sweep of each harbour camera.
// Coordinates are tiles on the 32x16 floor; the outer rim is always wall.

function shed(name, sub, obstacles, door, key, exit, loot, guards, cameras, start) {
  return { name, sub, obstacles, door, key, exit, loot, guards, cameras, start };
}
const wall = (x, y, w, h) => ({ x, y, w, h, kind: 'wall' });
const crate = (x, y, w, h) => ({ x, y, w, h, kind: 'crate' });
const rack = (x, y, w, h) => ({ x, y, w, h, kind: 'rack' });
const item = (x, y, label, value) => ({ x, y, label, value });
const loop = (...pts) => pts.map(([x, y]) => ({ x, y }));
const cam = (x, y, base, range) => ({ x, y, base, range });

export const LEVELS = [
  shed(
    'Bonded Shed No. 9',
    'Tea chests and chronometers, out before the tide turns',
    [
      wall(10, 1, 1, 5), wall(10, 8, 1, 7),
      wall(21, 1, 1, 7), wall(21, 11, 1, 4),
      crate(3, 4, 5, 1), crate(3, 10, 5, 1),
      crate(13, 4, 5, 1), crate(13, 11, 6, 1),
      crate(24, 5, 4, 1), crate(24, 12, 5, 1),
    ],
    { x: 10, y: 6 },
    { x: 5, y: 13 },
    { x: 30, y: 14 },
    [
      item(5, 2, 'Ceylon tea chest', 120),
      item(16, 8, 'Ships chronometer', 200),
      item(26, 3, 'Ivory-handled sextant', 260),
      item(28, 13, 'Case of harbour gin', 140),
      item(14, 13, 'Bolt of indigo silk', 180),
    ],
    [
      loop([4, 8], [8, 8], [8, 13], [4, 13]),
      loop([14, 2], [19, 2], [19, 9], [14, 9]),
      loop([24, 8], [29, 8], [29, 13], [24, 13]),
    ],
    [cam(16, 1, Math.PI / 2, 1.15), cam(27, 14, -Math.PI / 2, 1.0), cam(5, 1, Math.PI / 2, 0.9)],
    { x: 1, y: 14 },
  ),
  shed(
    'The Coldstore Annex',
    'Chilled vaults, warm loot — mind the frost wardens',
    [
      wall(1, 5, 11, 1), wall(20, 5, 11, 1),
      wall(1, 10, 7, 1), wall(16, 10, 15, 1),
      rack(4, 2, 4, 1), rack(12, 2, 4, 1), rack(24, 2, 4, 1),
      rack(5, 7, 4, 1), rack(19, 7, 4, 1), rack(27, 7, 3, 1),
      rack(4, 13, 4, 1), rack(20, 13, 5, 1),
    ],
    { x: 14, y: 10 },
    { x: 28, y: 8 },
    { x: 1, y: 1 },
    [
      item(6, 3, 'Frozen saffron tin', 220),
      item(14, 8, 'Smoked eel crate', 110),
      item(29, 13, 'Vintage ice wine', 240),
      item(10, 13, 'Sealed medicine chest', 300),
      item(25, 3, 'Pearl oyster box', 280),
    ],
    [
      loop([3, 3], [10, 3], [10, 8], [3, 8]),
      loop([22, 3], [29, 3], [29, 8], [22, 8]),
      loop([6, 12], [14, 12], [24, 12], [24, 14], [6, 14]),
    ],
    [cam(16, 14, -Math.PI / 2, 1.2), cam(2, 14, -Math.PI / 2, 0.85), cam(30, 1, Math.PI / 2, 0.9)],
    { x: 30, y: 14 },
  ),
  shed(
    'The Tide Vault',
    'The customs strongroom itself — one key, one boat, no second chances',
    [
      wall(8, 1, 1, 6), wall(8, 9, 1, 6),
      wall(23, 1, 1, 6), wall(23, 9, 1, 6),
      crate(11, 7, 3, 1), crate(19, 7, 3, 1),
      crate(3, 4, 3, 1), crate(26, 4, 3, 1),
      crate(3, 11, 3, 1), crate(26, 11, 3, 1),
      crate(13, 3, 6, 1), crate(13, 12, 6, 1),
      crate(15, 9, 2, 1),
    ],
    { x: 8, y: 8 },
    { x: 16, y: 14 },
    { x: 30, y: 1 },
    [
      item(16, 5, 'The Meridian Astrolabe', 500),
      item(4, 2, 'Customs seal press', 260),
      item(28, 13, 'Ransom pearls', 340),
      item(28, 2, 'Harbourmaster ledger', 220),
      item(4, 13, 'Sunken gold ingot', 420),
    ],
    [
      loop([3, 7], [6, 7], [6, 12], [3, 12]),
      loop([11, 5], [20, 5], [20, 10], [11, 10]),
      loop([26, 7], [29, 7], [29, 12], [26, 12]),
    ],
    [cam(16, 1, Math.PI / 2, 1.25), cam(1, 7, 0, 0.95), cam(30, 8, Math.PI, 0.95)],
    { x: 1, y: 1 },
  ),
];

/** Tile centre in stage pixels. */
export function tileCentre(x, y) {
  return { x: x * 40 + 20, y: 72 + y * 40 + 20 };
}

/** A fresh solid-grid for a level: rim, obstacles, and the door while locked. */
export function buildGrid(level, doorOpen) {
  const grid = [];
  for (let y = 0; y < 16; y += 1) {
    const row = [];
    for (let x = 0; x < 32; x += 1) {
      row.push(x === 0 || y === 0 || x === 31 || y === 15 ? 'wall' : null);
    }
    grid.push(row);
  }
  for (const o of level.obstacles) {
    for (let y = o.y; y < o.y + o.h; y += 1) {
      for (let x = o.x; x < o.x + o.w; x += 1) {
        if (x > 0 && y > 0 && x < 31 && y < 15) grid[y][x] = o.kind;
      }
    }
  }
  if (!doorOpen) grid[level.door.y][level.door.x] = 'door';
  return grid;
}
