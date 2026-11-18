// Marisol City — deterministic screenshot poses for ?shot=<name>&seed=1.
// Each pose sets up a fixed, readable scene from the world geometry alone
// (no RNG): a chase for the cover, on-foot downtown, the beach pursuit at
// dusk, and a mission dialog at a pickup point.

import { setupMission } from './missions.js';
import { setWanted } from './police.js';
import { createCar } from './vehicles.js';

function placePolice(G, spots) {
  for (const s of spots) {
    const car = createCar('police', s.x, s.y, s.angle, '#2f4a8a', 'police');
    car.speed = s.speed || 0;
    G.policeCars.push(car);
  }
}

export function applyShot(G, name) {
  const p = G.player;
  G.shot = name;
  G.state = 'play';

  if (name === 'cover') {
    // Player in the red sports car mid-chase, 3 stars, two police behind.
    const hot = G.parkedCars.find((c) => c.hot);
    if (hot) {
      G.parkedCars = G.parkedCars.filter((c) => c !== hot);
      hot.kind = 'player';
      hot.x = 1500;
      hot.y = 704;
      hot.angle = 0;
      hot.speed = 420;
      p.car = hot;
      p.onFoot = false;
      p.x = hot.x;
      p.y = hot.y;
      p.angle = 0;
    }
    // Clear the road ahead so the chase reads as motion, not a traffic jam.
    G.trafficCars = G.trafficCars.filter((c) => Math.hypot(c.x - p.x, c.y - p.y) > 800);
    G.parkedCars = G.parkedCars.filter((c) => Math.hypot(c.x - p.x, c.y - p.y) > 800);
    setWanted(G, 3);
    placePolice(G, [
      { x: 1180, y: 704, angle: 0, speed: 380 },
      { x: 1290, y: 736, angle: 0, speed: 360 },
    ]);
    setupMission(G, 1);
    G.mission.dialogIdx = 1;
  } else if (name === 'foot') {
    // On foot downtown, pedestrians and traffic around, waypoint ahead.
    p.x = 1408;
    p.y = 1344;
    p.angle = -Math.PI / 2;
    p.onFoot = true;
    p.car = null;
    setupMission(G, 0);
    G.mission.dialogIdx = 1;
  } else if (name === 'chase') {
    // Police pursuit near the beach at dusk, 4 stars.
    const hot = G.parkedCars.find((c) => c.hot);
    if (hot) {
      G.parkedCars = G.parkedCars.filter((c) => c !== hot);
      hot.kind = 'player';
      hot.x = 1500;
      hot.y = 2624;
      hot.angle = 0;
      hot.speed = 480;
      p.car = hot;
      p.onFoot = false;
      p.x = hot.x;
      p.y = hot.y;
      p.angle = 0;
    }
    // Clear the road ahead so the chase reads as motion, not a traffic jam.
    G.trafficCars = G.trafficCars.filter((c) => Math.hypot(c.x - p.x, c.y - p.y) > 800);
    G.parkedCars = G.parkedCars.filter((c) => Math.hypot(c.x - p.x, c.y - p.y) > 800);
    placePolice(G, [
      { x: 950, y: 2624, angle: 0, speed: 430 },
      { x: 1100, y: 2656, angle: 0, speed: 410 },
      { x: 1250, y: 2592, angle: 0, speed: 400 },
    ]);
    setupMission(G, 3);
    setWanted(G, 4);
    G.mission.timer = 24;
    G.mission.dialogIdx = 1;
  } else if (name === 'mission') {
    // Mission dialog open, car at the first pickup point.
    setupMission(G, 2);
    const wp = G.mission.waypoint;
    const hot = G.parkedCars.find((c) => c.hot);
    if (hot) {
      G.parkedCars = G.parkedCars.filter((c) => c !== hot);
      hot.kind = 'player';
      hot.x = wp.x + 90;
      hot.y = wp.y;
      hot.angle = Math.PI;
      hot.speed = 0;
      p.car = hot;
      p.onFoot = false;
      p.x = hot.x;
      p.y = hot.y;
      p.angle = Math.PI;
    }
    G.mission.dialogIdx = 0;
    G.mission.dialogUntil = G.now + 5;
  }

  // Camera sits on the player for every shot.
  G.camera.x = p.x;
  G.camera.y = p.y;
}
