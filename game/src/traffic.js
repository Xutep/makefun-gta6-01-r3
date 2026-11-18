// Marisol City — civilian traffic: cars that follow the road network,
// keep to their lane, turn at intersections and queue behind each other.

import { CFG, ROAD_BANDS } from './config.js';
import { createCar } from './vehicles.js';

const TRAFFIC_COLOURS = ['#c23b2e', '#3a6ea8', '#d8c33a', '#7a7a72', '#4a8a4f', '#8a4a7a', '#d8d8d8', '#2e2e33', '#b0703a'];
const TRAFFIC_MODELS = ['sedan', 'sedan', 'taxi', 'van', 'sedan'];

// Right-hand traffic: eastbound takes the south lane, westbound the north;
// southbound the west lane, northbound the east lane.
function laneOffset(axis, dir) {
  return axis === 'h' ? dir * 32 : -dir * 32;
}

function bandCentre(band) {
  return band + CFG.ROAD_W / 2;
}

export function createTraffic(world, rng, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const axis = rng.chance(0.5) ? 'h' : 'v';
    const band = rng.pick(ROAD_BANDS);
    const dir = rng.chance(0.5) ? 1 : -1;
    const pos = rng.range(200, CFG.WORLD_W - 200);
    const car = createCar(rng.pick(TRAFFIC_MODELS), 0, 0, 0, rng.pick(TRAFFIC_COLOURS), 'traffic');
    car.traffic = { axis, band, dir, pos, speed: rng.range(120, 210), cruise: 0 };
    car.traffic.cruise = car.traffic.speed;
    placeOnRoad(car);
    cars.push(car);
  }
  return cars;
}

function placeOnRoad(car) {
  const t = car.traffic;
  if (t.axis === 'h') {
    car.x = t.pos;
    car.y = bandCentre(t.band) + laneOffset('h', t.dir);
    car.angle = t.dir > 0 ? 0 : Math.PI;
  } else {
    car.x = bandCentre(t.band) + laneOffset('v', t.dir);
    car.y = t.pos;
    car.angle = t.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
}

// The car ahead in the same lane, if any.
function carAhead(cars, car) {
  const t = car.traffic;
  let best = null;
  let bestGap = Infinity;
  for (const other of cars) {
    if (other === car || !other.traffic) continue;
    const o = other.traffic;
    if (o.axis !== t.axis || o.band !== t.band || o.dir !== t.dir) continue;
    const gap = (o.pos - t.pos) * t.dir;
    if (gap > 0 && gap < bestGap) { bestGap = gap; best = other; }
  }
  return best ? { car: best, gap: bestGap } : null;
}

export function updateTraffic(G, dt) {
  const cars = G.trafficCars;
  for (const car of cars) {
    const t = car.traffic;
    // Queue behind the car ahead.
    const ahead = carAhead(cars, car);
    let target = t.cruise;
    if (ahead && ahead.gap < 110) target = ahead.gap < 60 ? 0 : ahead.car.traffic.speed * 0.85;
    t.speed += (target - t.speed) * Math.min(1, dt * 2.2);
    t.pos += t.speed * t.dir * dt;

    // Turn at an intersection: when crossing a cross-road centre, sometimes
    // swing onto it (seeded, so replays match).
    for (const band of ROAD_BANDS) {
      const centre = bandCentre(band);
      const crossed = t.dir > 0
        ? (t.pos - t.speed * t.dir * dt < centre && t.pos >= centre)
        : (t.pos - t.speed * t.dir * dt > centre && t.pos <= centre);
      if (crossed && G.rng.chance(0.22)) {
        if (t.axis === 'h') {
          t.axis = 'v';
          t.band = band;
          t.pos = car.y;
          t.dir = G.rng.chance(0.5) ? 1 : -1;
        } else {
          t.axis = 'h';
          t.band = band;
          t.pos = car.x;
          t.dir = G.rng.chance(0.5) ? 1 : -1;
        }
        break;
      }
    }
    // Wrap around the far edge so the streets stay busy.
    if (t.pos > CFG.WORLD_W + 80) t.pos = -80;
    if (t.pos < -80) t.pos = CFG.WORLD_W + 80;
    placeOnRoad(car);
  }
}
