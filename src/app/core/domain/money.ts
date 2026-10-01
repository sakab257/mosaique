import { Cents } from '../models';

/** Signe du montant affiché : `auto` (seulement « − »), `always` (« + » / « − »), `never` (valeur absolue). */
export type SignDisplay = 'auto' | 'always' | 'never';

const MINUS = '−';

const currencyFormat = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const signedCurrencyFormat = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  signDisplay: 'exceptZero',
});
const percentFormat = new Intl.NumberFormat('fr-FR', {
  style: 'percent',
  maximumFractionDigits: 0,
});

/**
 * Formate des centimes en euros, locale fr-FR : `1 234,56 €`, `−54,30 €`, `+35,00 €`.
 * Le trait d'union d'Intl est remplacé par le vrai signe moins (U+2212).
 */
export function formatMoney(cents: Cents, sign: SignDisplay = 'auto'): string {
  const euros = cents === 0 ? 0 : cents / 100;
  const value = sign === 'never' ? Math.abs(euros) : euros;
  const format = sign === 'always' ? signedCurrencyFormat : currencyFormat;
  return format.format(value).replace('-', MINUS);
}

/** Formate un ratio (0,19) en pourcentage arrondi : `19 %`. */
export function formatPercent(ratio: number): string {
  return percentFormat.format(Number.isFinite(ratio) ? ratio : 0);
}

/** Ratio part / total, 0 si le total est nul. */
export function ratio(part: number, total: number): number {
  return total === 0 ? 0 : part / total;
}

/** Convertit des euros (nombre) en centimes entiers. */
export function toCents(euros: number): Cents {
  // toPrecision absorbe l'erreur binaire (1.005 * 100 = 100.49999…) avant l'arrondi.
  return Math.round(Number((euros * 100).toPrecision(12)));
}

/** Formate des centimes pour un champ de saisie : `1234,5` → `1234,50`, sans séparateur de milliers. */
export function formatAmountInput(cents: Cents): string {
  const abs = Math.abs(cents);
  const euros = Math.trunc(abs / 100);
  const rest = String(abs % 100).padStart(2, '0');
  return `${cents < 0 ? '-' : ''}${euros},${rest}`;
}

const AMOUNT_PATTERN = /^(\d+)(?:[.,](\d{0,2}))?$/;

/**
 * Analyse une saisie utilisateur (« 1 234,56 », « 12.5 », « 3 € ») en centimes.
 * Travaille sur la chaîne pour éviter les erreurs d'arrondi flottant.
 * Renvoie `null` si la saisie n'est pas un montant positif valide.
 */
export function parseAmount(input: string): Cents | null {
  const normalized = input.replace(/[\s  €]/g, '');
  const match = AMOUNT_PATTERN.exec(normalized);
  if (!match) {
    return null;
  }
  const euros = Number(match[1]);
  const decimals = (match[2] ?? '').padEnd(2, '0');
  const cents = euros * 100 + Number(decimals);
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Comme `parseAmount`, avec un signe moins facultatif (soldes initiaux à découvert). */
export function parseSignedAmount(input: string): Cents | null {
  const trimmed = input.trim().replace(/^[\u2212-]\s*/, '');
  const negative = trimmed.length !== input.trim().length;
  const cents = parseAmount(trimmed);
  return cents === null ? null : negative ? -cents : cents;
}
