// Marisol City — cars: arcade physics, entering/exiting, stealing.

import { CFG } from './config.js';
import { keyDown } from './input.js';
import { circleHitsSolid, onSand } from './world.js';
import { addCrime } from './police.js';

let nextCarId = 1;

export function createCar(model, x, y, angle, color, kind) {
  return {
    id: nextCarId++,
    model, x, y, angle,
    speed: 0,
    color,
    kind: kind || 'parked', // parked | traffic | police | player
    health: 100,
    smoke: 0,
    siren: 0,
    brakeLight: false,
  };
}

export function carMaxSpeed(car) {
  return CFG.CAR_MAX[car.model] || CFG.CAR_MAX.sedan;
}

// Arcade car physics. controls: {throttle: -1..1, steer: -1..1, brake: bool}.
// Returns true when the car moved this step.
export function driveCar(G, car, dt, controls) {
  const max = carMaxSpeed(car) * (onSand(G.world, car.x, car.y) ? 0.55 : 1);
  const accel = controls.throttle > 0 ? CFG.CAR_ACCEL : CFG.CAR_ACCEL * 0.7;
  car.speed += controls.throttle * accel * dt;
  if (controls.brake) {
    car.speed -= Math.sign(car.speed) * CFG.CAR_BRAKE * dt;
    if (Math.abs(car.speed) < 12) car.speed = 0;
  }
  // Drag + rolling resistance.
  car.speed -= car.speed * CFG.CAR_DRAG * dt;
  if (car.speed > max) car.speed = max;
  if (car.speed < -CFG.CAR_REVERSE_MAX) car.speed = -CFG.CAR_REVERSE_MAX;
  if (Math.abs(car.speed) < 2 && controls.throttle === 0) car.speed = 0;

  // Steering bites harder at speed, and reverses when backing up.
  const steerAuthority = Math.min(1, Math.abs(car.speed) / 140);
  car.angle += controls.steer * CFG.CAR_TURN * steerAuthority * dt * Math.sign(car.speed || 1);

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  let moved = false;
  if (!circleHitsSolid(G.world, nx, car.y, CFG.CAR_R)) { car.x = nx; moved = true; }
  else { car.speed *= 0.45; G.events.push({ type: 'crash', x: car.x, y: car.y, at: G.now }); }
  if (!circleHitsSolid(G.world, car.x, ny, CFG.CAR_R)) { car.y = ny; moved = true; }
  else { car.speed *= 0.45; }
  car.brakeLight = controls.brake || controls.throttle < 0;
  return moved;
}

// Player-driven car: reads the keys each step.
export function updatePlayerCar(G, dt) {
  const car = G.player.car;
  if (!car) return;
  const input = G.input;
  const throttle = (keyDown(input, 'KeyW', 'ArrowUp') ? 1 : 0) + (keyDown(input, 'KeyS', 'ArrowDown') ? -0.6 : 0);
  const steer = (keyDown(input, 'KeyA', 'ArrowLeft') ? -1 : 0) + (keyDown(input, 'KeyD', 'ArrowRight') ? 1 : 0);
  driveCar(G, car, dt, { throttle, steer, brake: keyDown(input, 'Space') });
}

// Nearest car to a point (parked, traffic or police — not the player's own).
export function nearestCar(G, x, y, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  const all = [...G.parkedCars, ...G.trafficCars, ...G.policeCars];
  for (const c of all) {
    if (c === G.player.car) continue;
    const d = (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

// Steal / enter a car. Witnessed theft raises the wanted level.
export function enterCar(G, car) {
  const p = G.player;
  const witnessed = car.kind === 'parked' && car.hot === false
    ? G.peds.some((pd) => Math.hypot(pd.x - car.x, pd.y - car.y) < 320)
    : false;
  const wasParked = car.kind === 'parked';
  // Remove it from its old list; it is the player's car now.
  G.parkedCars = G.parkedCars.filter((c) => c !== car);
  G.trafficCars = G.trafficCars.filter((c) => c !== car);
  car.kind = 'player';
  p.car = car;
  p.onFoot = false;
  p.x = car.x;
  p.y = car.y;
  if (wasParked && (car.hot || witnessed)) {
    addCrime(G, 'steal', car.x, car.y);
  }
  if (car.hot) G.events.push({ type: 'text', text: 'Hot car taken — lose the heat!', at: G.now });
}

// Step out beside the car; it becomes parked again.
export function exitCar(G) {
  const p = G.player;
  const car = p.car;
  if (!car) return;
  const side = { x: car.x - Math.sin(car.angle) * 44, y: car.y + Math.cos(car.angle) * 44 };
  if (circleHitsSolid(G.world, side.x, side.y, CFG.PLAYER_R)) {
    side.x = car.x + Math.sin(car.angle) * 44;
    side.y = car.y - Math.cos(car.angle) * 44;
  }
  p.x = side.x;
  p.y = side.y;
  p.onFoot = true;
  p.car = null;
  car.kind = 'parked';
  car.speed = 0;
  G.parkedCars.push(car);
}

// Push two overlapping cars apart (player car vs traffic / police).
export function separateCars(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const min = CFG.CAR_R * 2 - 4;
  if (d > 0.01 && d < min) {
    const push = (min - d) / 2;
    const nx = dx / d;
    const ny = dy / d;
    a.x -= nx * push;
    a.y -= ny * push;
    b.x += nx * push;
    b.y += ny * push;
    a.speed *= 0.7;
    b.speed *= 0.7;
  }
}
