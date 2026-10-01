/**
 * Génère les icônes PWA à partir de public/logo.svg, via Chrome headless (protocole DevTools).
 *   npm run icons            (CHROME_PATH pour un autre emplacement de Chrome)
 *
 * - icon-*.png           : « any », logo sur une tuile sombre arrondie
 * - icon-maskable-*.png  : « maskable », fond plein, logo dans la zone sûre (cercle de 80 %)
 * - apple-touch-icon.png : 180 px, fond plein (iOS arrondit lui-même)
 * - favicon-32.png       : repli du favicon SVG
 */
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BACKGROUND = '#07080C';
const TILE = '#141519';

const logo = (await readFile(join(root, 'public', 'logo.svg'), 'utf8')).trim();

/** [fichier, taille, style] — `scale` : largeur du logo rapportée à l'icône. */
const ICONS = [
  ['icon-192.png', 192, { scale: 0.62, tile: true }],
  ['icon-512.png', 512, { scale: 0.62, tile: true }],
  ['icon-maskable-192.png', 192, { scale: 0.5, tile: false }],
  ['icon-maskable-512.png', 512, { scale: 0.5, tile: false }],
  ['apple-touch-icon.png', 180, { scale: 0.58, tile: false }],
  ['favicon-32.png', 32, { scale: 0.86, tile: false, transparent: true }],
];

function page(size, { scale, tile, transparent }) {
  const radius = tile ? size * 0.22 : 0;
  const background = transparent ? 'transparent' : tile ? 'transparent' : BACKGROUND;
  return `<!doctype html><html><body style="margin:0;background:${background}">
    <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
      background:${tile ? TILE : 'transparent'};border-radius:${radius}px;box-sizing:border-box;
      ${tile ? `border:${Math.max(1, size / 192)}px solid #23242B;` : ''}">
      <div style="width:${size * scale}px;display:flex">${logo.replace('<svg', '<svg style="width:100%;height:auto"')}</div>
    </div></body></html>`;
}

const profile = await mkdtemp(join(tmpdir(), 'mosaique-icons-'));
const port = 9334;
const proc = spawn(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(
      (t) => t.type === 'page',
    );
  } catch {}
}
if (!target) throw new Error(`Chrome introuvable ou injoignable (${chrome}).`);

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  pending.get(msg.id)?.(msg);
  pending.delete(msg.id);
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const i = ++id;
    pending.set(i, resolve);
    ws.send(JSON.stringify({ id: i, method, params }));
  });

await send('Page.enable');
await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
for (const [file, size, style] of ICONS) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: size,
    height: size,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const html = join(profile, 'icon.html');
  await writeFile(html, page(size, style));
  await send('Page.navigate', { url: `file:///${html.replace(/\\/g, '/')}` });
  await sleep(400);
  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: size, height: size, scale: 1 },
  });
  await writeFile(join(root, 'public', 'icons', file), Buffer.from(shot.result.data, 'base64'));
  console.log(`  icons/${file}`);
}

ws.close();
proc.kill();
await sleep(300);
await rm(profile, { recursive: true, force: true }).catch(() => {});
process.exit(0);
