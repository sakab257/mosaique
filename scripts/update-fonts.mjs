/**
 * Télécharge les polices auto-hébergées dans src/fonts/ (fonctionnement hors ligne, aucun
 * appel à un tiers) :
 *   - Inter variable 400–700, sous-ensembles latin et latin-ext ;
 *   - Material Symbols Rounded réduit aux icônes déclarées dans icons.ts.
 *
 * À relancer après tout ajout d'icône :  npm run fonts
 * (le test icons.spec.ts échoue tant que la police ne correspond pas à la liste).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_ICON_NAMES } from '../src/app/shared/ui/icon/icons.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'src', 'fonts');
// Un agent récent obtient des fichiers woff2.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function download(url, file) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  await writeFile(join(out, file), bytes);
  console.log(`  ${file} (${(bytes.length / 1024).toFixed(1)} Ko)`);
}

await mkdir(out, { recursive: true });

// Inter : un bloc @font-face par sous-ensemble, précédé d'un commentaire /* latin */.
const inter = await fetchText(
  'https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap',
);
for (const subset of ['latin', 'latin-ext']) {
  const block = inter.match(new RegExp(`/\\* ${subset} \\*/\\s*@font-face\\s*{[^}]*}`))?.[0];
  const url = block?.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
  if (!url) throw new Error(`Sous-ensemble Inter introuvable : ${subset}`);
  await download(url, `inter-${subset}.woff2`);
}

// Material Symbols : sous-ensemble limité aux icônes de l'app (liste triée exigée).
const icons = [...ALL_ICON_NAMES].sort();
const symbols = await fetchText(
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0..1,0' +
    `&icon_names=${icons.join(',')}&display=block`,
);
const symbolsUrl = symbols.match(/url\((https:[^)]+)\)/)?.[1];
if (!symbolsUrl) throw new Error('Police Material Symbols introuvable');
await download(symbolsUrl, 'material-symbols-rounded.woff2');
await writeFile(
  join(out, 'material-symbols-rounded.json'),
  JSON.stringify({ icons }, null, 2) + '\n',
);
console.log(`  material-symbols-rounded.json (${icons.length} icônes)`);
