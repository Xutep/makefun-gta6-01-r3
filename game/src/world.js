// Marisol City — city generation and collision.
// The city is a 3200x3200 grid: roads every 640 px, blocks of 512 px between
// them. Districts: downtown (centre, tall buildings), a park, a beach along
// the south edge and a harbour along the east edge.

import { CFG, PAL, ROAD_BANDS } from './config.js';

const BLOCK = 512; // block size between road bands
const INSET = 44; // sidewalk ring inside each block

function bandRects() {
  const h = [];
  const v = [];
  for (const o of ROAD_BANDS) {
    h.push({ x: 0, y: o, w: CFG.WORLD_W, h: CFG.ROAD_W });
    v.push({ x: o, y: 0, w: CFG.ROAD_W, h: CFG.WORLD_H });
  }
  return { h, v };
}

function blockRect(col, row) {
  return {
    x: ROAD_BANDS[col] + CFG.ROAD_W,
    y: ROAD_BANDS[row] + CFG.ROAD_W,
    w: BLOCK,
    h: BLOCK,
  };
}

function districtOf(col, row) {
  if (row === 4) return 'beach';
  if (col === 4) return 'harbour';
  if (col === 1 && row === 3) return 'park';
  if (col >= 1 && col <= 3 && row >= 1 && row <= 2) return 'downtown';
  return 'residential';
}

export function createWorld(rng) {
  const { h: roadsH, v: roadsV } = bandRects();
  const blocks = [];
  const trees = [];
  const crates = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const r = blockRect(col, row);
      const district = districtOf(col, row);
      const block = { col, row, x: r.x, y: r.y, w: r.w, h: r.h, district, buildings: [] };

      if (district === 'beach') {
        // Palm trees dotted along the sand.
        for (let i = 0; i < 9; i++) {
          trees.push({
            x: r.x + 40 + rng.range(0, r.w - 80),
            y: r.y + 30 + rng.range(0, 130),
            s: rng.range(0.8, 1.3),
            palm: true,
          });
        }
      } else if (district === 'harbour') {
        // Crates stacked near the piers.
        for (let i = 0; i < 7; i++) {
          crates.push({
            x: r.x + 30 + rng.range(0, 120),
            y: r.y + 40 + rng.range(0, r.h - 120),
            w: rng.range(26, 44),
            h: rng.range(26, 44),
          });
        }
      } else if (district === 'park') {
        for (let i = 0; i < 16; i++) {
          trees.push({
            x: r.x + 30 + rng.range(0, r.w - 60),
            y: r.y + 30 + rng.range(0, r.h - 60),
            s: rng.range(0.9, 1.5),
            palm: false,
          });
        }
      } else {
        // Residential / downtown: 2-3 buildings per block, seeded placement.
        const count = district === 'downtown' ? 3 : rng.int(1, 2);
        const slots = [];
        for (let i = 0; i < count; i++) {
          const bw = district === 'downtown' ? rng.range(150, 240) : rng.range(130, 230);
          const bh = district === 'downtown' ? rng.range(140, 220) : rng.range(110, 190);
          const bx = r.x + INSET + rng.range(0, Math.max(1, r.w - 2 * INSET - bw));
          const by = r.y + INSET + rng.range(0, Math.max(1, r.h - 2 * INSET - bh));
          const roof = district === 'downtown'
            ? rng.pick(PAL.downtownRoof)
            : rng.pick(PAL.buildingRoof);
          const b = { x: bx, y: by, w: bw, h: bh, hgt: district === 'downtown' ? rng.range(56, 120) : rng.range(18, 46), roof };
          // Keep buildings from overlapping each other.
          if (slots.some((s) => b.x < s.x + s.w + 24 && b.x + b.w + 24 > s.x && b.y < s.y + s.h + 24 && b.y + b.h + 24 > s.y)) continue;
          slots.push(b);
          block.buildings.push(b);
        }
        for (let i = 0; i < rng.int(2, 4); i++) {
          trees.push({
            x: r.x + 20 + rng.range(0, r.w - 40),
            y: r.y + 20 + rng.range(0, r.h - 40),
            s: rng.range(0.7, 1.1),
            palm: false,
          });
        }
      }
      blocks.push(block);
    }
  }

  // Water: south strip (below the beach sand) and east strip (the harbour).
  const water = [
    { x: 0, y: 2960, w: CFG.WORLD_W, h: 240 },
    { x: 2960, y: 0, w: 240, h: 2960 },
  ];
  // Sand: the beach strip above the south water.
  const sand = { x: 0, y: 2700, w: CFG.WORLD_W, h: 260 };
  // Piers jutting east into the harbour water (walkable).
  const piers = [
    { x: 2900, y: 760, w: 250, h: 34 },
    { x: 2900, y: 1520, w: 250, h: 34 },
  ];

  // Parked cars along road edges — stealable. The first is the red sports car
  // the "Hot Wheels" mission targets.
  const parked = [];
  const models = ['sedan', 'sedan', 'taxi', 'van', 'sedan', 'taxi', 'sports', 'sedan', 'van', 'sedan', 'taxi', 'sports', 'sedan', 'van'];
  const colours = ['#c23b2e', '#3a6ea8', '#d8c33a', '#7a7a72', '#4a8a4f', '#8a4a7a', '#d8d8d8', '#2e2e33'];
  for (let i = 0; i < 14; i++) {
    const horizontal = rng.chance(0.5);
    const band = rng.pick([640, 1280, 1920, 2560]);
    const along = rng.range(220, CFG.WORLD_W - 220);
    const laneOff = rng.chance(0.5) ? 34 : -34;
    const x = horizontal ? along : band + 64 + laneOff;
    const y = horizontal ? band + 64 + laneOff : along;
    const angle = horizontal ? (laneOff > 0 ? 0 : Math.PI) : (laneOff > 0 ? Math.PI / 2 : -Math.PI / 2);
    parked.push({
      model: i === 0 ? 'sports' : models[i % models.length],
      x, y, angle,
      color: i === 0 ? '#d02020' : rng.pick(colours),
      hot: i === 0,
    });
  }

  return {
    roadsH, roadsV, blocks, trees, crates, water, sand, piers, parked,
    playerSpawn: { x: 1344, y: 1344 },
  };
}

// Is a point on a road band?
export function isRoadAt(world, x, y) {
  for (const r of world.roadsH) {
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return true;
  }
  for (const r of world.roadsV) {
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return true;
  }
  return false;
}

function inRect(x, y, r) {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

function onPier(world, x, y) {
  return world.piers.some((p) => inRect(x, y, p));
}

// Solid for movement: buildings, crates, water (except piers), world edge.
export function solidAt(world, x, y) {
  if (x < 8 || y < 8 || x > CFG.WORLD_W - 8 || y > CFG.WORLD_H - 8) return true;
  if (onPier(world, x, y)) return false;
  for (const w of world.water) if (inRect(x, y, w)) return true;
  for (const b of world.blocks) {
    for (const bd of b.buildings) if (inRect(x, y, bd)) return true;
  }
  for (const c of world.crates) if (inRect(x, y, c)) return true;
  return false;
}

// Circle vs solid: sample the centre and four rim points.
export function circleHitsSolid(world, x, y, r) {
  if (solidAt(world, x, y)) return true;
  if (solidAt(world, x + r, y)) return true;
  if (solidAt(world, x - r, y)) return true;
  if (solidAt(world, x, y + r)) return true;
  if (solidAt(world, x, y - r)) return true;
  return false;
}

// A point on sand (cars drive slowly there).
export function onSand(world, x, y) {
  return inRect(x, y, world.sand) && !world.water.some((w) => inRect(x, y, w));
}

// Nearest point on a road to (x, y): used for waypoint placement.
export function nearestRoadPoint(world, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const r of world.roadsH) {
    const cy = r.y + CFG.ROAD_W / 2;
    const cx = Math.max(r.x, Math.min(r.x + r.w, x));
    const d = (cx - x) * (cx - x) + (cy - y) * (cy - y);
    if (d < bestD) { bestD = d; best = { x: cx, y: cy }; }
  }
  for (const r of world.roadsV) {
    const cx = r.x + CFG.ROAD_W / 2;
    const cy = Math.max(r.y, Math.min(r.y + r.h, y));
    const d = (cx - x) * (cx - x) + (cy - y) * (cy - y);
    if (d < bestD) { bestD = d; best = { x: cx, y: cy }; }
  }
  return best;
}
