// Marisol City — rendering: camera, the city, cars, people, effects and the
// menu screens (title, pause, mission complete, busted, game over).

import { CFG, PAL } from './config.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCarShape(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const len = 52;
  const wid = 26;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(ctx, -len / 2 + 3, -wid / 2 + 4, len, wid, 7);
  ctx.fill();
  // Body.
  ctx.fillStyle = car.color;
  rr(ctx, -len / 2, -wid / 2, len, wid, 7);
  ctx.fill();
  // Cabin + windshield.
  ctx.fillStyle = 'rgba(20, 30, 44, 0.85)';
  rr(ctx, -8, -wid / 2 + 4, 18, wid - 8, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(180, 220, 255, 0.5)';
  ctx.fillRect(len / 2 - 12, -wid / 2 + 4, 6, wid - 8);
  // Headlights + brake lights.
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(len / 2 - 2, -wid / 2 + 2, 3, 4);
  ctx.fillRect(len / 2 - 2, wid / 2 - 6, 3, 4);
  if (car.brakeLight) {
    ctx.fillStyle = '#ff2a2a';
    ctx.fillRect(-len / 2 - 1, -wid / 2 + 2, 3, 4);
    ctx.fillRect(-len / 2 - 1, wid / 2 - 6, 3, 4);
  }
  // Police livery + light bar.
  if (car.model === 'police' || car.kind === 'police') {
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(-6, -wid / 2, 12, wid);
    ctx.fillStyle = '#1a1a22';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 3);
    const phase = Math.floor(car.siren * 4) % 2 === 0;
    ctx.fillStyle = phase ? '#ff2a2a' : '#2a6aff';
    ctx.fillRect(-4, -wid / 2 - 4, 8, 4);
    ctx.fillStyle = phase ? '#2a6aff' : '#ff2a2a';
    ctx.fillRect(-4, wid / 2, 8, 4);
  }
  // Taxi sign.
  if (car.model === 'taxi') {
    ctx.fillStyle = '#f2c14e';
    ctx.fillRect(-6, -5, 12, 10);
    ctx.fillStyle = '#1a1a22';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 3);
  }
  // Smoke from a wreck.
  if (car.health <= 0 || car.smoke > 0) {
    ctx.fillStyle = 'rgba(90,90,90,0.5)';
    ctx.beginPath();
    ctx.arc(-10, -6, 9, 0, Math.PI * 2);
    ctx.arc(4, 4, 11, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, shirt, bob, scale) {
  const s = scale || 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const wob = Math.sin(bob) * 2 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(1, 2, 11 * s, 9 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Legs (two dots that swing while walking).
  ctx.fillStyle = '#2a2a30';
  ctx.beginPath();
  ctx.arc(-4 * s + wob, -5 * s, 3.4 * s, 0, Math.PI * 2);
  ctx.arc(-4 * s - wob, 5 * s, 3.4 * s, 0, Math.PI * 2);
  ctx.fill();
  // Body + head.
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.arc(0, 0, 9 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8b88a';
  ctx.beginPath();
  ctx.arc(8 * s, 0, 5.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawWorld(G, ctx) {
  const world = G.world;
  const cam = G.camera;
  ctx.save();
  ctx.translate(CFG.VIEW_W / 2, CFG.VIEW_H / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  const vx = cam.x - CFG.VIEW_W / 2 / cam.zoom - 60;
  const vy = cam.y - CFG.VIEW_H / 2 / cam.zoom - 60;
  const vw = CFG.VIEW_W / cam.zoom + 120;
  const vh = CFG.VIEW_H / cam.zoom + 120;

  // Ground.
  ctx.fillStyle = PAL.grass;
  ctx.fillRect(vx, vy, vw, vh);
  // Sand + water.
  ctx.fillStyle = PAL.sand;
  ctx.fillRect(world.sand.x, world.sand.y, world.sand.w, world.sand.h);
  for (const w of world.water) {
    ctx.fillStyle = PAL.water;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = PAL.waterDeep;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const yy = w.y + 30 + i * 44;
      ctx.beginPath();
      for (let xx = w.x + 20; xx < w.x + w.w - 20; xx += 60) {
        ctx.moveTo(xx, yy);
        ctx.quadraticCurveTo(xx + 30, yy - 6, xx + 60, yy);
      }
      ctx.stroke();
    }
  }
  // Piers.
  for (const p of world.piers) {
    ctx.fillStyle = PAL.pier;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  }

  // Roads.
  for (const r of world.roadsH) {
    ctx.fillStyle = PAL.road;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = PAL.lane;
    for (let x = 20; x < r.w; x += 90) ctx.fillRect(x, r.y + r.h / 2 - 2, 44, 4);
  }
  for (const r of world.roadsV) {
    ctx.fillStyle = PAL.road;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = PAL.lane;
    for (let y = 20; y < r.h; y += 90) ctx.fillRect(r.x + r.w / 2 - 2, y, 4, 44);
  }
  // Crosswalks at intersections.
  ctx.fillStyle = PAL.crosswalk;
  for (const bx of [0, 640, 1280, 1920, 2560]) {
    for (const by of [0, 640, 1280, 1920, 2560]) {
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(bx + 8 + i * 24, by + 52, 12, 24);
        ctx.fillRect(bx + 52, by + 8 + i * 24, 24, 12);
      }
    }
  }

  // Blocks: sidewalk ring, park grass, buildings, trees, crates.
  for (const b of world.blocks) {
    if (b.district === 'park') {
      ctx.fillStyle = PAL.park;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#3a7d8a';
      ctx.beginPath();
      ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, 90, 60, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.district !== 'beach' && b.district !== 'harbour') {
      ctx.fillStyle = PAL.sidewalk;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = PAL.grassDark;
      ctx.fillRect(b.x + 20, b.y + 20, b.w - 40, b.h - 40);
    }
    for (const bd of b.buildings) {
      // Drop shadow (fake height) then roof.
      ctx.fillStyle = PAL.buildingSide;
      ctx.fillRect(bd.x + 8, bd.y + bd.hgt * 0.28, bd.w, bd.h);
      ctx.fillStyle = bd.roof;
      ctx.fillRect(bd.x, bd.y, bd.w, bd.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(bd.x, bd.y, bd.w, bd.h);
      // Roof detail: inner rectangle + vents.
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.strokeRect(bd.x + 10, bd.y + 10, bd.w - 20, bd.h - 20);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(bd.x + bd.w / 2 - 14, bd.y + bd.h / 2 - 10, 28, 20);
    }
  }
  for (const t of world.trees) {
    ctx.fillStyle = t.palm ? '#7a5a2a' : '#5a4028';
    ctx.fillRect(t.x - 2, t.y - 2, 4, 4);
    ctx.fillStyle = t.palm ? PAL.treeLight : PAL.tree;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 11 * t.s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(t.x - 3, t.y - 3, 5 * t.s, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const c of world.crates) {
    ctx.fillStyle = '#a8824f';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = '#6a4a22';
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.x + c.w, c.y + c.h);
    ctx.moveTo(c.x + c.w, c.y);
    ctx.lineTo(c.x, c.y + c.h);
    ctx.stroke();
  }

  // Pickups.
  for (const pk of G.pickups) {
    if (pk.taken) continue;
    const pulse = 1 + Math.sin(G.now * 4 + pk.x) * 0.12;
    ctx.save();
    ctx.translate(pk.x, pk.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = pk.kind === 'ammo' ? '#ffd94a' : pk.kind === 'health' ? '#4ac74a' : '#7de3ff';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#14141a';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pk.kind === 'ammo' ? 'A' : pk.kind === 'health' ? '+' : '$', 0, 1);
    ctx.restore();
  }

  // Waypoint beacon.
  const mission = G.mission;
  if (mission && mission.waypoint) {
    const wp = mission.waypoint;
    const pulse = 26 + Math.sin(G.now * 4) * 6;
    ctx.strokeStyle = PAL.waypoint;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(wp.x, wp.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PAL.waypoint;
    ctx.beginPath();
    ctx.moveTo(wp.x, wp.y - 34);
    ctx.lineTo(wp.x + 12, wp.y - 12);
    ctx.lineTo(wp.x - 12, wp.y - 12);
    ctx.closePath();
    ctx.fill();
    // Light pillar.
    const grad = ctx.createLinearGradient(wp.x, wp.y - 260, wp.x, wp.y);
    grad.addColorStop(0, 'rgba(255,217,74,0)');
    grad.addColorStop(1, 'rgba(255,217,74,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(wp.x - 10, wp.y - 260, 20, 260);
  }

  // Cars: parked, traffic, police, then the player's car on top.
  for (const car of G.parkedCars) drawCarShape(ctx, car);
  for (const car of G.trafficCars) drawCarShape(ctx, car);
  for (const car of G.policeCars) drawCarShape(ctx, car);
  if (G.player.car) drawCarShape(ctx, G.player.car);

  // People.
  for (const pd of G.peds) drawPerson(ctx, pd.x, pd.y, pd.angle, pd.shirt, pd.bob, 1);
  for (const cop of G.footCops) drawPerson(ctx, cop.x, cop.y, cop.angle, '#2f4a8a', cop.bob, 1.1);

  // Player on foot.
  const p = G.player;
  if (p.onFoot) drawPerson(ctx, p.x, p.y, p.angle, PAL.player, G.now * 8, 1.15);

  // Bullets.
  ctx.fillStyle = '#ffe9a8';
  for (const b of G.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Event flashes (shots, punches, sparks).
  for (const ev of G.events) {
    const age = G.now - ev.at;
    if (age > 0.35) continue;
    if (ev.type === 'shot') {
      ctx.fillStyle = `rgba(255, 220, 120, ${1 - age / 0.35})`;
      ctx.beginPath();
      ctx.arc(ev.x, ev.y, 10 + age * 40, 0, Math.PI * 2);
      ctx.fill();
    } else if (ev.type === 'spark') {
      ctx.fillStyle = `rgba(255, 200, 80, ${1 - age / 0.35})`;
      ctx.beginPath();
      ctx.arc(ev.x, ev.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Dusk tint for the beach chase shot.
  if (G.shot === 'chase') {
    const grad = ctx.createLinearGradient(0, vy, 0, vy + vh);
    grad.addColorStop(0, 'rgba(255, 120, 40, 0.10)');
    grad.addColorStop(1, 'rgba(255, 90, 20, 0.22)');
    ctx.fillStyle = grad;
    ctx.fillRect(vx, vy, vw, vh);
  }
  ctx.restore();
}

function overlay(ctx, title, lines, hint) {
  ctx.fillStyle = 'rgba(8, 10, 16, 0.72)';
  ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = PAL.hudGold;
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(title, CFG.VIEW_W / 2, 190);
  ctx.fillStyle = PAL.hudText;
  ctx.font = '18px sans-serif';
  let y = 250;
  for (const line of lines) {
    ctx.fillText(line, CFG.VIEW_W / 2, y);
    y += 30;
  }
  if (hint) {
    ctx.fillStyle = '#9a9a92';
    ctx.font = '16px sans-serif';
    ctx.fillText(hint, CFG.VIEW_W / 2, CFG.VIEW_H - 90);
  }
}

export function drawScreens(G, ctx) {
  if (G.state === 'title') {
    overlay(ctx, 'MARISOL CITY', [
      'A sun-soaked coastal city. Five jobs. One driver for hire.',
      'Explore on foot and by car — steal cars, outrun the police,',
      'run the missions, and make the big score.',
      '',
      'WASD / arrows — move & drive    E — enter / exit car    F — punch',
      'Mouse — aim    Click — shoot    Space — handbrake    C — zoom    M — mute',
      'Esc / P — pause',
    ], 'Press Enter to start');
  } else if (G.state === 'pause') {
    overlay(ctx, 'PAUSED', ['Take a breath, Jax. The city waits.'], 'Esc / P — resume    R — restart');
  } else if (G.state === 'busted') {
    overlay(ctx, 'BUSTED', [
      'The Marisol City PD finally caught up with you.',
      `You kept $${G.player.cash.toLocaleString('en-US')} — the rest is evidence now.`,
    ], 'Press R to try again');
  } else if (G.state === 'gameover') {
    overlay(ctx, 'WASTED', [
      'Jax went down in the streets of Marisol City.',
      'The city does not forgive. It only forgets.',
    ], 'Press R to try again');
  }
}
