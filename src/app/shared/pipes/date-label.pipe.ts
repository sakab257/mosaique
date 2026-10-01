import { formatDate } from '@angular/common';
import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';
import { toDate } from '../../core/domain/dates';
import { IsoDate, IsoDateTime, MonthKey } from '../../core/models';

export type DateLabelFormat = 'day' | 'short' | 'long' | 'month' | 'dayNumber' | 'monthShort';

const PATTERNS: Record<DateLabelFormat, string> = {
  day: 'EEEE d MMMM y', // « Vendredi 28 août 2026 »
  short: 'd MMM', // « 28 août »
  long: 'd MMMM y', // « 16 septembre 2023 »
  month: 'MMMM y', // « Août 2026 »
  dayNumber: 'd', // « 5 »
  monthShort: 'MMM', // « sept. »
};

/**
 * Libellés de date en français, avec « 1er » pour le premier du mois et une majuscule
 * initiale (« Vendredi 1er août 2026 »). Le format court ajoute l'année si elle diffère
 * de l'année de référence.
 */
export function formatDateLabel(
  iso: IsoDate | IsoDateTime | MonthKey,
  format: DateLabelFormat,
  locale: string,
  referenceYear = new Date().getFullYear(),
): string {
  // Une clé de mois (AAAA-MM) désigne le premier jour du mois.
  const date = toDate(iso.length === 7 ? `${iso}-01` : iso);
  let pattern = PATTERNS[format];
  if (format === 'short' && date.getFullYear() !== referenceYear) pattern += ' y';
  let label = formatDate(date, pattern, locale);
  if (date.getDate() === 1 && (format === 'day' || format === 'short' || format === 'long')) {
    label = label.replace(/(^|\s)1(\s)/, '$11er$2');
  }
  return format === 'day' || format === 'month'
    ? label.charAt(0).toLocaleUpperCase(locale) + label.slice(1)
    : label;
}

/** `{{ tx.date | dateLabel: 'day' }}` */
@Pipe({ name: 'dateLabel' })
export class DateLabelPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(
    value: IsoDate | IsoDateTime | MonthKey | null | undefined,
    format: DateLabelFormat = 'long',
  ): string {
    return value ? formatDateLabel(value, format, this.locale) : '';
  }
}
