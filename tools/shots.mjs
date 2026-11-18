// Marisol City — screenshot taker (my own script, written this session).
// Serves the game, opens each ?shot= pose, waits for it to settle, and saves
// a 1280x720 JPEG into screenshots/. Usage: node tools/shots.mjs [port]

import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core');

const REPO = '/home/hatch/workspace/makefun/entries/gta6-01-r3';
const PORT = process.argv[2] || '8902';
const SHOTS = [
  { name: '1-cover.jpg', shot: 'cover' },
  { name: '2-foot.jpg', shot: 'foot' },
  { name: '3-chase.jpg', shot: 'chase' },
  { name: '4-mission.jpg', shot: 'mission' },
];

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
page.on('console', (m) => { if (m.type() === 'error') errors.push(`${m.text()}`); });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('requestfailed', (r) => failed.push(r.url()));

async function openShot(shot) {
  // This VM's Chrome blocks http://localhost navigation, so file:// goes first.
  try {
    await page.goto(`file://${REPO}/game/index.html?shot=${shot}&seed=1`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(900);
    if (await page.evaluate(() => !!window.__marisol)) return 'file';
  } catch (e) {
    console.log(`shot ${shot}: file:// failed, trying http`);
  }
  const httpUrl = `http://localhost:${PORT}/?shot=${shot}&seed=1`;
  await page.goto(httpUrl, { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(900);
  if (!(await page.evaluate(() => !!window.__marisol))) throw new Error(`shot ${shot} did not boot`);
  return 'http';
}

for (const s of SHOTS) {
  const via = await openShot(s.shot);
  const path = `${REPO}/screenshots/${s.name}`;
  await page.screenshot({ path, type: 'jpeg', quality: 80 });
  const bytes = statSync(path).size;
  console.log(`${s.name} via ${via}: ${bytes} bytes (${(bytes / 1024).toFixed(1)} KiB)${bytes > 262144 ? ' — OVER 256 KiB!' : ''}`);
}

console.log('console errors:', errors.length, errors.slice(0, 5));
console.log('failed requests:', failed.length, failed.slice(0, 5));
await browser.close();
server.kill();
if (errors.length > 0) { console.log('SHOTS DONE WITH CONSOLE ERRORS'); process.exit(1); }
console.log('SHOTS OK');
process.exit(0);
