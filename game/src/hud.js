// Marisol City — HUD: health, cash, wanted stars, ammo, speed, mission
// objective, dialog box and the minimap.

import { CFG, PAL } from './config.js';
import { currentDialog } from './missions.js';

function bar(ctx, x, y, w, h, frac, colour, bg) {
  ctx.fillStyle = bg || 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
}

function drawStars(ctx, x, y, level, max) {
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < max; i++) {
    ctx.fillStyle = i < level ? PAL.star : PAL.starEmpty;
    ctx.fillText('★', x + i * 24, y);
  }
}

function drawMinimap(G, ctx) {
  const size = CFG.MINIMAP;
  const x0 = CFG.VIEW_W - size - 14;
  const y0 = 14;
  const scale = size / CFG.WORLD_W;
  ctx.save();
  ctx.fillStyle = PAL.hudBg;
  ctx.fillRect(x0 - 6, y0 - 6, size + 12, size + 12);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.strokeRect(x0 - 5.5, y0 - 5.5, size + 11, size + 11);
  ctx.beginPath();
  ctx.rect(x0, y0, size, size);
  ctx.clip();
  // Water + sand.
  ctx.fillStyle = PAL.waterDeep;
  ctx.fillRect(x0, y0, size, size);
  ctx.fillStyle = PAL.grassDark;
  ctx.fillRect(x0, y0, size, size * 0.84);
  ctx.fillStyle = PAL.sand;
  ctx.fillRect(x0, y0 + size * 0.84, size, size * 0.04);
  // Roads.
  ctx.fillStyle = '#5a5a58';
  for (const r of G.world.roadsH) ctx.fillRect(x0, y0 + r.y * scale, size, r.h * scale);
  for (const r of G.world.roadsV) ctx.fillRect(x0 + r.x * scale, y0, r.w * scale, size);
  // Waypoint.
  const mission = G.mission;
  if (mission && mission.waypoint) {
    const wx = x0 + mission.waypoint.x * scale;
    const wy = y0 + mission.waypoint.y * scale;
    const pulse = 5 + Math.sin(G.now * 5) * 2;
    ctx.fillStyle = PAL.waypoint;
    ctx.beginPath();
    ctx.moveTo(wx, wy - pulse);
    ctx.lineTo(wx + pulse, wy);
    ctx.lineTo(wx, wy + pulse);
    ctx.lineTo(wx - pulse, wy);
    ctx.closePath();
    ctx.fill();
  }
  // Police dots.
  ctx.fillStyle = '#ff4a4a';
  for (const c of G.policeCars) {
    ctx.beginPath();
    ctx.arc(x0 + c.x * scale, y0 + c.y * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow.
  const p = G.player;
  const px = x0 + p.x * scale;
  const py = y0 + p.y * scale;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

export function drawHud(G, ctx) {
  const p = G.player;
  ctx.save();
  ctx.textBaseline = 'middle';

  // Top-left block: health, cash, stars, ammo.
  ctx.fillStyle = PAL.hudBg;
  ctx.fillRect(12, 12, 250, 108);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(12.5, 12.5, 250, 108);
  ctx.fillStyle = PAL.hudText;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('JAX MORENO', 24, 28);
  bar(ctx, 24, 40, 180, 12, p.health / CFG.PLAYER_HEALTH, p.health > 30 ? '#4ac74a' : '#d83a2e');
  ctx.font = '15px sans-serif';
  ctx.fillStyle = PAL.hudGold;
  ctx.fillText(`$${p.cash.toLocaleString('en-US')}`, 24, 66);
  drawStars(ctx, 24, 90, G.wanted.level, CFG.WANTED_MAX);
  ctx.fillStyle = PAL.hudText;
  ctx.font = '14px sans-serif';
  ctx.fillText(`Ammo ${p.ammo}`, 150, 66);
  ctx.fillText(p.onFoot ? 'ON FOOT' : (p.car ? p.car.model.toUpperCase() : '—'), 150, 90);

  // Speed, bottom-left, while driving.
  if (!p.onFoot && p.car) {
    const kmh = Math.round(Math.abs(p.car.speed) * 0.22);
    ctx.fillStyle = PAL.hudBg;
    ctx.fillRect(12, CFG.VIEW_H - 58, 150, 44);
    ctx.fillStyle = PAL.hudText;
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`${kmh}`, 24, CFG.VIEW_H - 36);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#c8c8bc';
    ctx.fillText('km/h', 74, CFG.VIEW_H - 34);
    ctx.fillText(p.car.model, 24, CFG.VIEW_H - 18);
  }

  drawMinimap(G, ctx);

  // Clock, top-centre. G.clock counts game minutes (1 per real second).
  const hh = String((17 + Math.floor(G.clock / 60)) % 24).padStart(2, '0');
  const mm = String(Math.floor(G.clock) % 60).padStart(2, '0');
  ctx.fillStyle = PAL.hudBg;
  ctx.fillRect(CFG.VIEW_W / 2 - 52, 12, 104, 30);
  ctx.fillStyle = PAL.hudText;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${hh}:${mm}`, CFG.VIEW_W / 2, 28);

  // Mission objective, bottom-centre.
  const mission = G.mission;
  if (mission) {
    let line = `${mission.name} — ${mission.objective}`;
    if (mission.waypoint) {
      const d = Math.round(Math.hypot(p.x - mission.waypoint.x, p.y - mission.waypoint.y));
      line += `  •  ${d}m`;
    }
    if (mission.timerMax > 0 && mission.timer > 0) {
      line += `  •  ${Math.ceil(mission.timer)}s`;
    }
    ctx.font = '15px sans-serif';
    const w = ctx.measureText(line).width + 28;
    ctx.fillStyle = PAL.hudBg;
    ctx.fillRect((CFG.VIEW_W - w) / 2, CFG.VIEW_H - 84, w, 30);
    ctx.fillStyle = PAL.mission;
    ctx.fillText(line, CFG.VIEW_W / 2, CFG.VIEW_H - 69);
  }

  // Dialog box, above the objective line.
  const dialog = currentDialog(G);
  if (dialog) {
    ctx.fillStyle = PAL.dialogBg;
    ctx.fillRect(190, CFG.VIEW_H - 168, CFG.VIEW_W - 380, 62);
    ctx.strokeStyle = 'rgba(125,227,255,0.5)';
    ctx.strokeRect(190.5, CFG.VIEW_H - 167.5, CFG.VIEW_W - 380, 62);
    ctx.fillStyle = '#e8f6ff';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'left';
    wrapText(ctx, dialog, 210, CFG.VIEW_H - 148, CFG.VIEW_W - 420, 19);
    ctx.fillStyle = '#9a9a92';
    ctx.font = '12px sans-serif';
    ctx.fillText('E — continue', CFG.VIEW_W - 300, CFG.VIEW_H - 116);
  }

  // Banner (mission complete / event text), top-centre below the clock.
  if (G.banner && G.now < G.banner.until) {
    ctx.font = 'bold 18px sans-serif';
    const w = ctx.measureText(G.banner.text).width + 32;
    ctx.fillStyle = 'rgba(20, 40, 20, 0.85)';
    ctx.fillRect((CFG.VIEW_W - w) / 2, 52, w, 34);
    ctx.fillStyle = '#b8f2b8';
    ctx.textAlign = 'center';
    ctx.fillText(G.banner.text, CFG.VIEW_W / 2, 70);
  }

  // Hurt flash.
  if (p.hurtFlash > 0) {
    ctx.fillStyle = `rgba(200, 30, 30, ${p.hurtFlash * 0.45})`;
    ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
  }
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}
