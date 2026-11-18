// Marisol City — combat: fists, pistol, bullets, and pickups.

import { CFG } from './config.js';
import { circleHitsSolid } from './world.js';
import { addCrime } from './police.js';
import { scarePeds } from './pedestrians.js';

export function createPickups(world, rng) {
  const spots = [];
  const kinds = ['ammo', 'ammo', 'health', 'ammo', 'health', 'cash', 'ammo', 'health', 'cash', 'ammo'];
  for (let i = 0; i < kinds.length; i++) {
    // On road edges and sidewalks, spread across the city.
    const band = [640, 1280, 1920, 2560][i % 4];
    const along = 300 + (i * 263) % 2600;
    const horizontal = i % 2 === 0;
    const x = horizontal ? along : band + 64 + (i % 3 === 0 ? 46 : -46);
    const y = horizontal ? band + 64 + (i % 3 === 0 ? 46 : -46) : along;
    spots.push({ kind: kinds[i], x, y, taken: false, respawnAt: 0 });
  }
  return spots;
}

export function shoot(G) {
  const p = G.player;
  if (p.ammo <= 0) {
    G.events.push({ type: 'text', text: 'Out of ammo — find an ammo pickup', at: G.now });
    p.shootCd = CFG.SHOOT_CD;
    return;
  }
  p.ammo -= 1;
  p.shootCd = CFG.SHOOT_CD;
  const mw = G.screenToWorld(G.input.mouse.x, G.input.mouse.y);
  const angle = Math.atan2(mw.y - p.y, mw.x - p.x);
  const ox = p.x + Math.cos(angle) * 22;
  const oy = p.y + Math.sin(angle) * 22;
  G.bullets.push({ x: ox, y: oy, vx: Math.cos(angle) * CFG.BULLET_SPEED, vy: Math.sin(angle) * CFG.BULLET_SPEED, life: CFG.BULLET_LIFE, from: 'player' });
  G.events.push({ type: 'shot', x: ox, y: oy, at: G.now });
  scarePeds(G, ox, oy, 420);
  // A shot the law can hear raises the heat.
  const witness = G.policeCars.some((c) => Math.hypot(c.x - ox, c.y - oy) < 520)
    || G.peds.some((pd) => Math.hypot(pd.x - ox, pd.y - oy) < 320)
    || G.footCops.some((c) => Math.hypot(c.x - ox, c.y - oy) < 520);
  if (witness) addCrime(G, 'shoot', ox, oy);
}

export function punch(G) {
  const p = G.player;
  p.punchCd = CFG.PUNCH_CD;
  const px = p.x + Math.cos(p.angle) * 30;
  const py = p.y + Math.sin(p.angle) * 30;
  G.events.push({ type: 'punch', x: px, y: py, at: G.now });
  // Nearest pedestrian in reach gets knocked down.
  for (let i = G.peds.length - 1; i >= 0; i--) {
    const pd = G.peds[i];
    if (Math.hypot(pd.x - px, pd.y - py) < CFG.PUNCH_RANGE) {
      G.peds.splice(i, 1);
      G.events.push({ type: 'text', text: 'You knocked someone down — witnesses will remember that', at: G.now });
      addCrime(G, 'hitPed', pd.x, pd.y);
      scarePeds(G, pd.x, pd.y, 380);
      return;
    }
  }
}

function bulletHitsCar(b, car) {
  return Math.hypot(b.x - car.x, b.y - car.y) < CFG.CAR_R + 4;
}

export function updateBullets(G, dt) {
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || circleHitsSolid(G.world, b.x, b.y, 2);
    if (!dead) {
      for (const car of [...G.policeCars, ...G.trafficCars, ...G.parkedCars]) {
        if (bulletHitsCar(b, car)) {
          car.health -= 25;
          if (car.health <= 0) car.smoke = 999;
          G.events.push({ type: 'spark', x: b.x, y: b.y, at: G.now });
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (let j = G.peds.length - 1; j >= 0; j--) {
        const pd = G.peds[j];
        if (Math.hypot(b.x - pd.x, b.y - pd.y) < 14) {
          G.peds.splice(j, 1);
          addCrime(G, 'hitPed', pd.x, pd.y);
          scarePeds(G, pd.x, pd.y, 380);
          dead = true;
          break;
        }
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }
}

export function updatePickups(G, dt) {
  const p = G.player;
  for (const pk of G.pickups) {
    if (pk.taken) {
      if (G.now >= pk.respawnAt) pk.taken = false;
      continue;
    }
    if (Math.hypot(p.x - pk.x, p.y - pk.y) < CFG.PICKUP_R + 14) {
      pk.taken = true;
      pk.respawnAt = G.now + 20;
      if (pk.kind === 'ammo') {
        p.ammo = Math.min(48, p.ammo + 12);
        G.events.push({ type: 'text', text: '+12 ammo', at: G.now });
      } else if (pk.kind === 'health') {
        p.health = Math.min(CFG.PLAYER_HEALTH, p.health + 30);
        G.events.push({ type: 'text', text: '+30 health', at: G.now });
      } else {
        p.cash += 50;
        G.events.push({ type: 'text', text: '+$50 found', at: G.now });
      }
    }
  }
}
