import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ALL_ICON_NAMES } from './icons';

describe('icônes', () => {
  it('la police auto-hébergée contient exactement les icônes déclarées', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), 'src/fonts/material-symbols-rounded.json'), 'utf8'),
    ) as { icons: string[] };
    // Si ce test échoue après l'ajout d'une icône : npm run fonts
    expect(manifest.icons).toEqual([...ALL_ICON_NAMES]);
  });
});
