// Marisol City — the wanted level and the police who answer it.

import { CFG } from './config.js';
import { createCar, driveCar } from './vehicles.js';
import { damagePlayer } from './player.js';
import { nearestRoadPoint } from './world.js';

const CRIME_WEIGHT = { steal: 1, hitPed: 1, shoot: 1, ram: 1 };

export function createWanted() {
  return {
    level: 0,
    lastCrime: -999,
    bustTimer: 0,
    roadblockAt: -999,
    roadblock: null,
  };
}

// A crime the law noticed: raise the wanted level and make sure the streets
// answer with that many police cars.
export function addCrime(G, kind, x, y) {
  const w = G.wanted;
  const weight = CRIME_WEIGHT[kind] || 1;
  w.level = Math.min(CFG.WANTED_MAX, w.level + weight);
  w.lastCrime = G.now;
  G.events.push({ type: 'text', text: `Wanted level ${w.level} — the law is coming`, at: G.now });
}

export function setWanted(G, level) {
  G.wanted.level = Math.max(0, Math.min(CFG.WANTED_MAX, level));
  G.wanted.lastCrime = G.now;
}

function spawnPoliceCar(G, x, y) {
  const car = createCar('police', x, y, 0, '#2f4a8a', 'police');
  car.health = 120;
  G.policeCars.push(car);
  return car;
}

function spawnPointNear(G, dist) {
  const p = G.player;
  const a = G.rng.range(0, Math.PI * 2);
  const x = Math.max(80, Math.min(CFG.WORLD_W - 80, p.x + Math.cos(a) * dist));
  const y = Math.max(80, Math.min(CFG.WORLD_H - 80, p.y + Math.sin(a) * dist));
  const rp = nearestRoadPoint(G.world, x, y);
  return rp || { x, y };
}

export function updatePolice(G, dt) {
  const w = G.wanted;
  const p = G.player;

  // Wanted decays when the player lays low: no crime for a while and no
  // police car close enough to see them.
  const policeNear = G.policeCars.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < 420);
  if (w.level > 0 && G.now - w.lastCrime > CFG.CRIME_DECAY_S && !policeNear) {
    w.level -= 1;
    w.lastCrime = G.now;
    G.events.push({ type: 'text', text: `Heat cooling off — wanted level ${w.level}`, at: G.now });
  }

  // Keep the right number of police cars on the street.
  const want = Math.min(CFG.POLICE_MAX, w.level * CFG.POLICE_PER_STAR);
  while (G.policeCars.length < want) {
    const s = spawnPointNear(G, 900);
    spawnPoliceCar(G, s.x, s.y);
  }
  // Despawn police that fell far behind once the heat is gone.
  if (w.level === 0) {
    G.policeCars = G.policeCars.filter((c) => Math.hypot(c.x - p.x, c.y - p.y) < 1400);
  }

  // Roadblocks at 3+ stars: two police cars parked across the road ahead.
  if (w.level >= 3 && G.now - w.roadblockAt > 40) {
    w.roadblockAt = G.now;
    const ahead = { x: p.x + Math.cos(p.angle) * 620, y: p.y + Math.sin(p.angle) * 620 };
    const rp = nearestRoadPoint(G.world, ahead.x, ahead.y) || ahead;
    const px = -Math.sin(p.angle);
    const py = Math.cos(p.angle);
    spawnPoliceCar(G, rp.x + px * 46, rp.y + py * 46);
    spawnPoliceCar(G, rp.x - px * 46, rp.y - py * 46);
    const last = G.policeCars[G.policeCars.length - 1];
    const prev = G.policeCars[G.policeCars.length - 2];
    last.angle = p.angle + Math.PI / 2;
    prev.angle = p.angle + Math.PI / 2;
    last.speed = 0;
    prev.speed = 0;
    last.holdUntil = G.now + 6;
    prev.holdUntil = G.now + 6;
    G.events.push({ type: 'text', text: 'Roadblock ahead!', at: G.now });
  }

  // Pursuit: each police car steers at the player and rams.
  for (const car of G.policeCars) {
    const dx = p.x - car.x;
    const dy = p.y - car.y;
    const dist = Math.hypot(dx, dy) || 1;
    const wantAngle = Math.atan2(dy, dx);
    let diff = wantAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    // Roadblock cars hold their post for a few seconds before joining the chase.
    const holding = car.holdUntil && G.now < car.holdUntil;
    const steer = holding ? 0 : Math.max(-1, Math.min(1, diff * 2.2));
    const throttle = holding ? 0 : (dist > 90 ? 1 : 0.4);
    driveCar(G, car, dt, { throttle, steer, brake: false });
    car.siren = (car.siren + dt) % 1;

    // Ramming the player's car hurts it; leaning on a player on foot
    // builds the bust timer.
    if (dist < 56) {
      if (!p.onFoot) {
        damagePlayer(G, 12);
        car.speed *= 0.6;
      } else {
        w.bustTimer += dt;
        if (w.bustTimer > CFG.BUST_TIME) {
          G.state = 'busted';
          G.stateTimer = 0;
        }
      }
    } else {
      w.bustTimer = Math.max(0, w.bustTimer - dt * 2);
    }
    // Smoking wrecks stop pursuing.
    if (car.health <= 0) {
      car.speed *= 0.9;
    }
  }

  // Foot cops join the chase at 2+ stars while the player is on foot.
  const wantCops = p.onFoot && w.level >= 2 ? Math.min(2, w.level - 1) : 0;
  while (G.footCops.length < wantCops) {
    const s = spawnPointNear(G, 520);
    G.footCops.push({ x: s.x, y: s.y, angle: 0, speed: 0, shirt: '#2f4a8a', bob: 0 });
  }
  if (wantCops === 0) G.footCops.length = 0;
  for (const cop of G.footCops) {
    const dx = p.x - cop.x;
    const dy = p.y - cop.y;
    const d = Math.hypot(dx, dy) || 1;
    cop.angle = Math.atan2(dy, dx);
    const speed = 205;
    cop.x += (dx / d) * speed * dt;
    cop.y += (dy / d) * speed * dt;
    cop.bob += dt * 10;
    if (d < 40) {
      w.bustTimer += dt;
      if (w.bustTimer > CFG.BUST_TIME) {
        G.state = 'busted';
        G.stateTimer = 0;
      }
    }
  }
}
