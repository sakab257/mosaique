import { IsoDate, IsoDateTime, MonthKey } from '../models';

/**
 * Utilitaires de dates calendaires locales. Toutes les dates sont manipulées sous forme
 * de chaînes `YYYY-MM-DD` : pas de fuseau, pas de changement d'heure, comparables
 * lexicographiquement.
 */

const pad2 = (n: number) => String(n).padStart(2, '0');

export function makeIsoDate(year: number, month: number, day: number): IsoDate {
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;
}

/** Date locale d'un objet Date. */
export function toIsoDate(date: Date): IsoDate {
  return makeIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function toIsoDateTime(date: Date): IsoDateTime {
  return `${toIsoDate(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function combineDateTime(date: IsoDate, time: string): IsoDateTime {
  return `${date}T${time || '00:00'}`;
}

export function splitIso(iso: IsoDate | IsoDateTime): { year: number; month: number; day: number } {
  return {
    year: Number(iso.slice(0, 4)),
    month: Number(iso.slice(5, 7)),
    day: Number(iso.slice(8, 10)),
  };
}

/** Objet Date local (midi pour les dates seules, afin d'éviter tout basculement de jour). */
export function toDate(iso: IsoDate | IsoDateTime): Date {
  const { year, month, day } = splitIso(iso);
  if (iso.length > 10) {
    const [h, m] = timeOf(iso).split(':').map(Number);
    return new Date(year, month - 1, day, h, m);
  }
  return new Date(year, month - 1, day, 12);
}

export function dateOf(iso: IsoDate | IsoDateTime): IsoDate {
  return iso.slice(0, 10);
}

export function timeOf(iso: IsoDateTime): string {
  return iso.length >= 16 ? iso.slice(11, 16) : '00:00';
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const { year, month, day } = splitIso(value);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Construit une date en ramenant le jour au dernier jour du mois si nécessaire (31 → 30, 29/02 → 28/02). */
export function clampedDate(year: number, month: number, day: number): IsoDate {
  return makeIsoDate(year, month, Math.min(day, daysInMonth(year, month)));
}

const toUtcDays = (iso: IsoDate) => {
  const { year, month, day } = splitIso(iso);
  return Date.UTC(year, month - 1, day) / 86_400_000;
};

export function addDays(iso: IsoDate, days: number): IsoDate {
  const date = new Date((toUtcDays(iso) + days) * 86_400_000);
  return makeIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Nombre de jours de `from` à `to` (positif si `to` est après). */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return toUtcDays(to) - toUtcDays(from);
}

/** Jour de la semaine, 0 = dimanche. */
export function dayOfWeek(iso: IsoDate): number {
  return new Date(toUtcDays(iso) * 86_400_000).getUTCDay();
}

export function minDate(a: IsoDate, b: IsoDate): IsoDate {
  return a <= b ? a : b;
}

export function maxDate(a: IsoDate, b: IsoDate): IsoDate {
  return a >= b ? a : b;
}

// --- Mois -----------------------------------------------------------------

export function monthOf(iso: IsoDate | IsoDateTime): MonthKey {
  return iso.slice(0, 7);
}

export function isValidMonthKey(value: string | null | undefined): value is MonthKey {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function addMonths(key: MonthKey, months: number): MonthKey {
  const { year, month } = splitIso(`${key}-01`);
  const index = year * 12 + (month - 1) + months;
  return `${String(Math.floor(index / 12)).padStart(4, '0')}-${pad2((index % 12) + 1)}`;
}

export function monthBounds(key: MonthKey): { start: IsoDate; end: IsoDate } {
  const { year, month } = splitIso(`${key}-01`);
  return { start: `${key}-01`, end: makeIsoDate(year, month, daysInMonth(year, month)) };
}

export function isInMonth(iso: IsoDate | IsoDateTime, key: MonthKey): boolean {
  return iso.startsWith(key);
}

/** Jours restants dans le mois, aujourd'hui inclus. */
export function daysLeftInMonth(today: IsoDate): number {
  return diffDays(today, monthBounds(monthOf(today)).end) + 1;
}
