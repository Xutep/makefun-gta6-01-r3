// Marisol City — the player: Jax Moreno, on foot and behind the wheel.

import { CFG } from './config.js';
import { keyDown, keyPressed } from './input.js';
import { circleHitsSolid } from './world.js';
import { nearestCar, enterCar, exitCar } from './vehicles.js';
import { punch, shoot } from './combat.js';

export function createPlayer(x, y) {
  return {
    x, y,
    angle: -Math.PI / 2, // facing up (north) at spawn
    onFoot: true,
    car: null,
    health: CFG.PLAYER_HEALTH,
    ammo: CFG.PISTOL_AMMO,
    cash: 0,
    punchCd: 0,
    shootCd: 0,
    hurtFlash: 0,
    moving: false,
  };
}

export function damagePlayer(G, amount) {
  const p = G.player;
  if (p.hurtFlash > 0 || G.state !== 'play') return;
  p.health -= amount;
  p.hurtFlash = 0.4;
  if (p.health <= 0) {
    p.health = 0;
    G.state = 'gameover';
    G.stateTimer = 0;
  }
}

export function updatePlayer(G, dt) {
  const p = G.player;
  const input = G.input;
  p.punchCd = Math.max(0, p.punchCd - dt);
  p.shootCd = Math.max(0, p.shootCd - dt);
  p.hurtFlash = Math.max(0, p.hurtFlash - dt);

  if (p.onFoot) {
    // Movement: WASD / arrows, Shift to run.
    let mx = 0;
    let my = 0;
    if (keyDown(input, 'KeyW', 'ArrowUp')) my -= 1;
    if (keyDown(input, 'KeyS', 'ArrowDown')) my += 1;
    if (keyDown(input, 'KeyA', 'ArrowLeft')) mx -= 1;
    if (keyDown(input, 'KeyD', 'ArrowRight')) mx += 1;
    const len = Math.hypot(mx, my);
    p.moving = len > 0;
    if (len > 0) {
      const speed = keyDown(input, 'ShiftLeft', 'ShiftRight') ? CFG.RUN_SPEED : CFG.WALK_SPEED;
      mx /= len;
      my /= len;
      p.angle = Math.atan2(my, mx);
      const nx = p.x + mx * speed * dt;
      const ny = p.y + my * speed * dt;
      if (!circleHitsSolid(G.world, nx, p.y, CFG.PLAYER_R)) p.x = nx;
      if (!circleHitsSolid(G.world, p.x, ny, CFG.PLAYER_R)) p.y = ny;
    }
    // Aim follows the mouse while on foot.
    const mw = G.screenToWorld(input.mouse.x, input.mouse.y);
    if (Math.hypot(mw.x - p.x, mw.y - p.y) > 4) p.angle = Math.atan2(mw.y - p.y, mw.x - p.x);

    // E: enter the nearest car. F: punch. Click: shoot the pistol.
    if (keyPressed(input, 'KeyE')) {
      const car = nearestCar(G, p.x, p.y, 78);
      if (car) enterCar(G, car);
    }
    if (keyPressed(input, 'KeyF') && p.punchCd <= 0) punch(G);
    // clicked catches a quick tap; down keeps firing while held.
    if ((input.mouse.clicked || input.mouse.down) && p.shootCd <= 0) shoot(G);
  } else if (p.car) {
    // In a car: E exits, Space is the handbrake (physics reads the keys).
    if (keyPressed(input, 'KeyE')) {
      exitCar(G);
      return; // on foot now; exitCar already placed the player
    }
    if ((input.mouse.clicked || input.mouse.down) && p.shootCd <= 0) shoot(G);
    p.x = p.car.x;
    p.y = p.car.y;
    p.angle = p.car.angle;
  }
}
