/**
 * Sert le build de production (dist/mosaique/browser) pour tester la PWA en local :
 * le service worker n'est actif qu'en production. Les routes de l'app (/budget…)
 * renvoient index.html, comme le ferait l'hébergement final.
 *   npm run serve:prod      → http://localhost:8080
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/mosaique/browser/', import.meta.url));
const port = Number(process.env.PORT ?? 8080);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  let file = normalize(join(root, path));
  if (!file.startsWith(normalize(root))) {
    res.writeHead(403).end();
    return;
  }
  const exists = await stat(file)
    .then((s) => s.isFile())
    .catch(() => false);
  if (!exists) {
    if (extname(path)) {
      res.writeHead(404).end();
      return;
    }
    file = join(root, 'index.html'); // route de l'app
  }
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Mosaïque (production) : http://localhost:${port}`));
