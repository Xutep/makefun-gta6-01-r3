// Marisol City — headless play-test (my own script, written this session).
// Serves the game, loads it in headless Chrome, plays it with the keyboard
// and mouse, and asserts the core loop works with zero console errors.
// Usage: node tools/playtest.mjs [port]

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core');

const REPO = '/home/hatch/workspace/makefun/entries/gta6-01-r3';
const PORT = process.argv[2] || '8901';

const policyPath = '/var/lib/hatch-browser/rootfs-base/usr/share/hatch/chromium/webgl-allowed-domains.txt';
const sha = createHash('sha256').update(readFileSync(policyPath)).digest('hex');

const server = spawn('node', ['serve.ts', '--port', PORT], { cwd: REPO, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1200));

const browser = await chromium.launch({
  executablePath: '/opt/meta-chromium/chrome',
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-gpu',
    '--allow-file-access-from-files',
    `--hatch-webgl-allowed-domains-file=${policyPath}`,
    `--hatch-webgl-allowed-domains-sha256=${sha}`,
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
const failed = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('requestfailed', (r) => failed.push(r.url()));

async function openGame(url) {
  // This VM's Chrome blocks http://localhost navigation, so file:// goes first.
  try {
    await page.goto(`file://${REPO}/game/index.html?seed=1`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1200);
    if (await page.evaluate(() => !!window.__marisol)) return 'file';
  } catch (e) {
    console.log('file:// load failed:', String(e).slice(0, 150));
  }
  await page.goto(url, { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(800);
  if (!(await page.evaluate(() => !!window.__marisol))) throw new Error('game did not boot under file:// or http');
  return 'http';
}

const via = await openGame(`http://localhost:${PORT}/?seed=1`);
console.log('loaded via', via);

const state = () => page.evaluate(() => {
  const G = window.__marisol;
  return {
    state: G.state,
    x: G.player.x, y: G.player.y,
    onFoot: G.player.onFoot,
    ammo: G.player.ammo,
    mission: G.mission ? G.mission.name : null,
    wanted: G.wanted.level,
    cars: G.parkedCars.length,
    traffic: G.trafficCars.length,
    peds: G.peds.length,
  };
});

let s = await state();
console.log('boot:', JSON.stringify(s));
if (s.state !== 'title') throw new Error('expected title screen, got ' + s.state);

// Start the game.
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
s = await state();
console.log('after Enter:', JSON.stringify(s));
if (s.state !== 'play') throw new Error('expected play state, got ' + s.state);

// Walk toward the nearest parked car (direct WASD steering).
const start = { x: s.x, y: s.y };
let entered = false;
for (let i = 0; i < 120; i++) {
  const target = await page.evaluate(() => {
    const G = window.__marisol;
    let best = null;
    let bd = Infinity;
    for (const c of G.parkedCars) {
      const d = (c.x - G.player.x) ** 2 + (c.y - G.player.y) ** 2;
      if (d < bd) { bd = d; best = { x: c.x, y: c.y }; }
    }
    return best;
  });
  if (!target) break;
  const cur = await state();
  const dx = target.x - cur.x;
  const dy = target.y - cur.y;
  if (Math.hypot(dx, dy) < 70) break;
  await page.keyboard.down(dx > 8 ? 'KeyD' : dx < -8 ? 'KeyA' : 'KeyW');
  if (dy > 8) await page.keyboard.down('KeyS');
  if (dy < -8) await page.keyboard.down('KeyW');
  await page.waitForTimeout(100);
  await page.keyboard.up('KeyD');
  await page.keyboard.up('KeyA');
  await page.keyboard.up('KeyW');
  await page.keyboard.up('KeyS');
  if (i % 20 === 0) {
    const now = await state();
    console.log(`walk step ${i}: dist to car ${Math.round(Math.hypot(target.x - now.x, target.y - now.y))}`);
  }
}
s = await state();
console.log('walked:', Math.round(Math.hypot(s.x - start.x, s.y - start.y)), 'units; at', Math.round(s.x), Math.round(s.y));

// Enter the car. E first dismisses the mission dialog (up to 2 lines),
// so press it until the player is actually in a car.
for (let tries = 0; tries < 5; tries++) {
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(400);
  s = await state();
  if (!s.onFoot) break;
}
console.log('after E:', JSON.stringify(s));
if (s.onFoot) throw new Error('failed to enter a car');
entered = true;

// Drive for 5 seconds, steering gently toward the east.
await page.keyboard.down('KeyW');
for (let i = 0; i < 50; i++) {
  const cur = await page.evaluate(() => {
    const G = window.__marisol;
    return { angle: G.player.car.angle, speed: G.player.car.speed };
  });
  // Steer toward heading east (angle 0).
  let diff = 0 - cur.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > 0.15) await page.keyboard.down('KeyD');
  else await page.keyboard.up('KeyD');
  if (diff < -0.15) await page.keyboard.down('KeyA');
  else await page.keyboard.up('KeyA');
  await page.waitForTimeout(100);
}
await page.keyboard.up('KeyW');
await page.keyboard.up('KeyA');
await page.keyboard.up('KeyD');
const drove = await state();
const driveDist = Math.round(Math.hypot(drove.x - s.x, drove.y - s.y));
console.log('drove', driveDist, 'units in 5s; at', Math.round(drove.x), Math.round(drove.y));
if (driveDist < 300) throw new Error('car barely moved: ' + driveDist + ' units');

// Exit the car and shoot once.
await page.keyboard.press('KeyE');
await page.waitForTimeout(300);
const exitState = await page.evaluate(() => { const G = window.__marisol; return { onFoot: G.player.onFoot, state: G.state, x: Math.round(G.player.x), y: Math.round(G.player.y), dlg: G.mission ? G.mission.dialogIdx : null }; });
console.log('exit state:', JSON.stringify(exitState));
const ammoBefore = (await state()).ammo;
await page.mouse.click(900, 300);
await page.waitForTimeout(300);
const clickState = await page.evaluate(() => { const G = window.__marisol; return { ammo: G.player.ammo, cd: G.player.shootCd.toFixed(3), bullets: G.bullets.length, down: G.input.mouse.down, clicked: G.input.mouse.clicked }; });
console.log('click state:', JSON.stringify(clickState));
const ammoAfter = (await state()).ammo;
console.log('ammo before/after shot:', ammoBefore, ammoAfter);
if (ammoAfter !== ammoBefore - 1) throw new Error('shooting did not consume ammo');

console.log('console errors:', errors.length, errors.slice(0, 5));
console.log('failed requests:', failed.length, failed.slice(0, 5));
if (errors.length > 0) throw new Error('console errors present');
if (failed.length > 0) throw new Error('failed requests present');

await browser.close();
server.kill();
console.log('PLAYTEST OK — entered car:', entered, '| drove:', driveDist, 'units');
process.exit(0);
