import { HexColor } from '../models';

/** Palette des catégories et comptes — miroir des tokens `--color-cat-*` de styles.css. */
export const PALETTE = {
  mint: '#5EE6C0',
  orange: '#FF9F43',
  sky: '#4FC3F7',
  pink: '#F472B6',
  yellow: '#FACC15',
  green: '#34D07F',
  red: '#FF5A5F',
  violet: '#A29BFF',
  lime: '#A3E635',
  slate: '#94A3B8',
} as const satisfies Record<string, HexColor>;

export const SWATCHES: readonly HexColor[] = Object.values(PALETTE);

/** Couleurs sémantiques utilisées côté TypeScript (graphiques, états). */
export const SEMANTIC = {
  primary: '#6C63FF',
  income: '#34D07F',
  expense: '#FF5A5F',
  transfer: '#A29BFF',
  track: '#23242B',
} as const;

/** Nom des couleurs du nuancier, pour les lecteurs d'écran. */
export const SWATCH_LABELS: Record<string, string> = {
  [PALETTE.mint]: 'Menthe',
  [PALETTE.orange]: 'Orange',
  [PALETTE.sky]: 'Bleu ciel',
  [PALETTE.pink]: 'Rose',
  [PALETTE.yellow]: 'Jaune',
  [PALETTE.green]: 'Vert',
  [PALETTE.red]: 'Rouge',
  [PALETTE.violet]: 'Violet',
  [PALETTE.lime]: 'Vert citron',
  [PALETTE.slate]: 'Ardoise',
};
