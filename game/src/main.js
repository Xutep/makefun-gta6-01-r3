// Marisol City — boot, fixed-timestep loop and the state machine
// (title / play / pause / busted / game over).

import { CFG } from './config.js';
import { makeRng } from './random.js';
import { createWorld } from './world.js';
import { createInput, endFrame, keyPressed, keyDown } from './input.js';
import { createPlayer, updatePlayer } from './player.js';
import { createCar, updatePlayerCar, separateCars } from './vehicles.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createPeds, updatePeds } from './pedestrians.js';
import { createWanted, updatePolice } from './police.js';
import { createPickups, updateBullets, updatePickups } from './combat.js';
import { setupMission, updateMission, currentDialog, MISSIONS } from './missions.js';
import { drawHud } from './hud.js';
import { drawWorld, drawScreens } from './render.js';
import { createAudio, ensureAudio, setMuted, updateAudio, sfx } from './audio.js';
import { loadSave, writeSave } from './save.js';
import { applyShot } from './shots.js';

function buildState(canvas, params) {
  const seed = params.seed || 1;
  const rng = makeRng(seed);
  const world = createWorld(rng);
  const G = {
    canvas,
    rng,
    world,
    seed,
    now: 0,
    clock: 0, // game minutes elapsed (1 per real second)
    state: 'title',
    stateTimer: 0,
    shot: params.shot || null,
    input: createInput(canvas),
    audio: createAudio(),
    player: createPlayer(world.playerSpawn.x, world.playerSpawn.y),
    wanted: createWanted(),
    mission: null,
    parkedCars: [],
    trafficCars: [],
    policeCars: [],
    footCops: [],
    peds: [],
    bullets: [],
    pickups: [],
    events: [],
    banner: null,
    bestWanted: 0,
    camera: { x: world.playerSpawn.x, y: world.playerSpawn.y, zoom: 1 },
    zoomStep: 0,
  };
  // Parked cars from the world (the hot flag marks the mission target).
  for (const def of world.parked) {
    const car = createCar(def.model, def.x, def.y, def.angle, def.color, 'parked');
    car.hot = !!def.hot;
    G.parkedCars.push(car);
  }
  G.trafficCars = createTraffic(world, rng, 14);
  G.peds = createPeds(world, rng, 26);
  G.pickups = createPickups(world, rng);

  // Screen (canvas) pixels -> world pixels, through the camera.
  G.screenToWorld = (sx, sy) => ({
    x: G.camera.x + (sx - CFG.VIEW_W / 2) / G.camera.zoom,
    y: G.camera.y + (sy - CFG.VIEW_H / 2) / G.camera.zoom,
  });

  // Restore a previous save, if one exists.
  const save = loadSave();
  if (save) {
    if (typeof save.cash === 'number') G.player.cash = save.cash;
    if (typeof save.bestWanted === 'number') G.bestWanted = save.bestWanted;
    if (save.muted) G.audio.muted = true;
    const done = Math.max(0, Math.min(MISSIONS.length - 1, save.missionsDone || 0));
    setupMission(G, done);
  } else {
    setupMission(G, 0);
  }
  return G;
}

function resetGame(G) {
  const fresh = buildState(G.canvas, { seed: G.seed, shot: null });
  for (const key of Object.keys(fresh)) G[key] = fresh[key];
  G.state = 'title';
}

function updateCamera(G, dt) {
  const p = G.player;
  const cam = G.camera;
  const tx = p.x;
  const ty = p.y;
  const k = Math.min(1, dt * 5);
  cam.x += (tx - cam.x) * k;
  cam.y += (ty - cam.y) * k;
  const hw = CFG.VIEW_W / 2 / cam.zoom;
  const hh = CFG.VIEW_H / 2 / cam.zoom;
  cam.x = Math.max(hw, Math.min(CFG.WORLD_W - hw, cam.x));
  cam.y = Math.max(hh, Math.min(CFG.WORLD_H - hh, cam.y));
}

function updatePlay(G, dt) {
  const p = G.player;
  const input = G.input;

  // Dialog: E advances the line instead of entering a car.
  if (keyPressed(input, 'KeyE') && currentDialog(G)) {
    G.mission.dialogIdx += 1;
    G.mission.dialogUntil = G.now + 5;
    input.pressed.delete('KeyE');
  }
  if (keyPressed(input, 'KeyM')) {
    setMuted(G, !G.audio.muted);
    writeSave({ missionsDone: G.mission ? G.mission.index : 0, cash: p.cash, bestWanted: G.bestWanted, muted: G.audio.muted });
  }
  if (keyPressed(input, 'KeyC')) {
    G.zoomStep = (G.zoomStep + 1) % 3;
    G.camera.zoom = [1, 1.3, 0.8][G.zoomStep];
  }

  if (!p.onFoot && p.car) updatePlayerCar(G, dt);
  updatePlayer(G, dt);
  updateTraffic(G, dt);
  updatePeds(G, dt);
  updatePolice(G, dt);
  updateBullets(G, dt);
  updatePickups(G, dt);
  updateMission(G, dt);
  updateAudio(G);

  // Keep the player's car from overlapping other cars.
  if (p.car) {
    for (const other of [...G.trafficCars, ...G.policeCars, ...G.parkedCars]) {
      separateCars(p.car, other);
    }
  }
  // Police cars push through traffic the same way.
  for (const pc of G.policeCars) {
    for (const other of G.trafficCars) separateCars(pc, other);
  }

  G.bestWanted = Math.max(G.bestWanted, G.wanted.level);
  G.clock += dt; // 1 game minute per real second
  updateCamera(G, dt);

  // Prune old events.
  G.events = G.events.filter((ev) => G.now - ev.at < 5);
}

export function createGame(canvas, params) {
  const G = buildState(canvas, params || {});
  window.__marisol = G;

  if (G.shot) {
    applyShot(G, G.shot);
  }

  let last = 0;
  let acc = 0;
  let frameErrors = 0;
  function frame(t) {
    const input = G.input;
    try {
    const now = t / 1000;
    let dt = last === 0 ? 0.016 : now - last;
    last = now;
    if (dt > 0.1) dt = 0.1;
    if (dt < 0) dt = 0;

    if (G.state === 'title') {
      if (keyPressed(input, 'Enter')) {
        ensureAudio(G);
        G.state = 'play';
        G.stateTimer = 0;
      }
      updateCamera(G, dt);
    } else if (G.state === 'play') {
      acc += dt;
      let steps = 0;
      while (acc >= CFG.STEP && steps < 5) {
        G.now += CFG.STEP;
        updatePlay(G, CFG.STEP);
        acc -= CFG.STEP;
        steps += 1;
        if (G.state !== 'play') break;
      }
      if (acc > CFG.STEP * 5) acc = 0;
      if (keyPressed(input, 'Escape', 'KeyP')) {
        G.state = 'pause';
        G.stateTimer = 0;
      }
    } else if (G.state === 'pause') {
      if (keyPressed(input, 'Escape', 'KeyP', 'Enter')) {
        G.state = 'play';
      }
      if (keyPressed(input, 'KeyR')) resetGame(G);
    } else if (G.state === 'busted' || G.state === 'gameover') {
      G.stateTimer += dt;
      if (keyPressed(input, 'KeyR') && G.stateTimer > 0.6) resetGame(G);
      updateCamera(G, dt);
    }

    const ctx = canvas.getContext('2d');
    drawWorld(G, ctx);
    if (G.state !== 'title') drawHud(G, ctx);
    drawScreens(G, ctx);
    } catch (err) {
      // A single bad frame must never freeze the game; log it and carry on.
      if (frameErrors < 3) { console.error('Marisol City frame error:', err); frameErrors += 1; }
    }
    endFrame(input);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return G;
}

// Boot from the page: read ?seed= and ?shot= from the URL.
const canvas = document.getElementById('game');
if (canvas) {
  const params = new URLSearchParams(window.location.search);
  const seed = parseInt(params.get('seed') || '1', 10) || 1;
  const shot = params.get('shot') || null;
  createGame(canvas, { seed, shot });
}
