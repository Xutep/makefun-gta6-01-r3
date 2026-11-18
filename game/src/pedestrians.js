// Marisol City — pedestrians: sidewalk walkers who flee gunshots and fast cars.

import { CFG } from './config.js';
import { circleHitsSolid } from './world.js';

const SHIRTS = ['#c23b2e', '#3a6ea8', '#d8c33a', '#7a7a72', '#4a8a4f', '#8a4a7a', '#d8d8d8', '#b0703a', '#5a8a8a'];

export function createPeds(world, rng, count) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const block = rng.pick(world.blocks);
    const x = block.x + 20 + rng.range(0, block.w - 40);
    const y = block.y + 20 + rng.range(0, block.h - 40);
    peds.push({
      x, y,
      angle: rng.range(0, Math.PI * 2),
      speed: rng.range(48, 78),
      tx: x, ty: y,
      state: 'walk',
      fleeUntil: 0,
      fx: 0, fy: 0,
      shirt: rng.pick(SHIRTS),
      bob: rng.range(0, Math.PI * 2),
    });
    pickTarget(peds[peds.length - 1], world, rng);
  }
  return peds;
}

function pickTarget(ped, world, rng) {
  // A point on the sidewalk ring of a nearby block.
  const block = rng.pick(world.blocks);
  const side = rng.int(0, 3);
  const m = 22;
  if (side === 0) { ped.tx = block.x + m + rng.range(0, block.w - 2 * m); ped.ty = block.y + m; }
  else if (side === 1) { ped.tx = block.x + m + rng.range(0, block.w - 2 * m); ped.ty = block.y + block.h - m; }
  else if (side === 2) { ped.tx = block.x + m; ped.ty = block.y + m + rng.range(0, block.h - 2 * m); }
  else { ped.tx = block.x + block.w - m; ped.ty = block.y + m + rng.range(0, block.h - 2 * m); }
}

export function scarePeds(G, x, y, radius) {
  for (const ped of G.peds) {
    const d = Math.hypot(ped.x - x, ped.y - y);
    if (d < radius) {
      ped.state = 'flee';
      ped.fleeUntil = G.now + 2.5;
      ped.fx = x;
      ped.fy = y;
    }
  }
}

export function updatePeds(G, dt) {
  for (const ped of G.peds) {
    ped.bob += dt * 8;
    let tx = ped.tx;
    let ty = ped.ty;
    let speed = ped.speed;
    if (ped.state === 'flee' && G.now < ped.fleeUntil) {
      // Run directly away from the scare point.
      const dx = ped.x - ped.fx;
      const dy = ped.y - ped.fy;
      const d = Math.hypot(dx, dy) || 1;
      tx = ped.x + (dx / d) * 100;
      ty = ped.y + (dy / d) * 100;
      speed = 185;
    } else {
      ped.state = 'walk';
    }
    const dx = tx - ped.x;
    const dy = ty - ped.y;
    const d = Math.hypot(dx, dy);
    if (d < 8) {
      pickTarget(ped, G.world, G.rng);
      continue;
    }
    const vx = (dx / d) * speed;
    const vy = (dy / d) * speed;
    ped.angle = Math.atan2(vy, vx);
    const nx = ped.x + vx * dt;
    const ny = ped.y + vy * dt;
    if (!circleHitsSolid(G.world, nx, ped.y, 10)) ped.x = nx;
    if (!circleHitsSolid(G.world, ped.x, ny, 10)) ped.y = ny;
  }
}
