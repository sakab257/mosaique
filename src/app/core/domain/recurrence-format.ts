import { FREQUENCY_LABELS, Frequency, IsoDate, IsoDateTime } from '../models';
import { dateOf, dayOfWeek, splitIso } from './dates';

export const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
export const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** « 1er », « 2 », … « 31 ». */
export function dayNumberLabel(day: number): string {
  return day === 1 ? '1er' : String(day);
}

/** « 31 décembre 2026 », « 1er mars 2027 ». */
export function longDateLabel(iso: IsoDate): string {
  const { year, month, day } = splitIso(iso);
  return `${dayNumberLabel(day)} ${MONTHS[month - 1]} ${year}`;
}

/** Jour de récurrence : « le mardi », « le 5 », « le 14 mars ». */
export function recurrenceDayLabel(frequency: Frequency, start: IsoDate | IsoDateTime): string {
  const date = dateOf(start);
  const { month, day } = splitIso(date);
  switch (frequency) {
    case 'weekly':
      return `le ${WEEKDAYS[dayOfWeek(date)]}`;
    case 'monthly':
      return `le ${dayNumberLabel(day)}`;
    case 'yearly':
      return `le ${dayNumberLabel(day)} ${MONTHS[month - 1]}`;
  }
}

/** Ligne courte des listes : « Chaque mois · le 5 ». */
export function frequencyLine(frequency: Frequency, start: IsoDate | IsoDateTime): string {
  return `${FREQUENCY_LABELS[frequency]} · ${recurrenceDayLabel(frequency, start)}`;
}

/**
 * Résumé en langage naturel :
 * « Se répète le 5 de chaque mois, sans fin. »
 * « Se répète chaque mardi, jusqu’au 31 décembre 2026. »
 */
export function describeRecurrence(
  frequency: Frequency,
  start: IsoDate | IsoDateTime,
  endDate?: IsoDate | null,
): string {
  const date = dateOf(start);
  const { month, day } = splitIso(date);
  let base: string;
  switch (frequency) {
    case 'weekly':
      base = `Se répète chaque ${WEEKDAYS[dayOfWeek(date)]}`;
      break;
    case 'monthly':
      base = `Se répète le ${dayNumberLabel(day)} de chaque mois`;
      if (day > 28) base += ' (ou le dernier jour des mois plus courts)';
      break;
    case 'yearly':
      base = `Se répète chaque année le ${dayNumberLabel(day)} ${MONTHS[month - 1]}`;
      if (month === 2 && day === 29) base += ' (le 28 février les années non bissextiles)';
      break;
  }
  return `${base}, ${endDate ? `jusqu’au ${longDateLabel(endDate)}` : 'sans fin'}.`;
}
