import {
  addDays,
  addMonths,
  clampedDate,
  combineDateTime,
  dayOfWeek,
  daysInMonth,
  daysLeftInMonth,
  diffDays,
  isValidIsoDate,
  isValidMonthKey,
  monthBounds,
  monthOf,
  timeOf,
  toDate,
  toIsoDate,
  toIsoDateTime,
} from './dates';

describe('dates', () => {
  it('daysInMonth gère les années bissextiles', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it('clampedDate ramène au dernier jour du mois', () => {
    expect(clampedDate(2026, 4, 31)).toBe('2026-04-30');
    expect(clampedDate(2026, 2, 31)).toBe('2026-02-28');
    expect(clampedDate(2027, 2, 29)).toBe('2027-02-28');
    expect(clampedDate(2028, 2, 29)).toBe('2028-02-29');
    expect(clampedDate(2026, 1, 15)).toBe('2026-01-15');
  });

  it('addDays traverse mois, années et changements d’heure', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30'); // passage à l'heure d'été
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('diffDays', () => {
    expect(diffDays('2026-08-28', '2026-09-27')).toBe(30);
    expect(diffDays('2026-09-27', '2026-08-28')).toBe(-30);
  });

  it('dayOfWeek (0 = dimanche)', () => {
    expect(dayOfWeek('2026-09-30')).toBe(3); // mercredi
    expect(dayOfWeek('2026-09-06')).toBe(0);
  });

  it('addMonths', () => {
    expect(addMonths('2026-08', 1)).toBe('2026-09');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-03', -15)).toBe('2024-12');
  });

  it('monthBounds / monthOf / daysLeftInMonth', () => {
    expect(monthBounds('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(monthOf('2026-08-28T18:42')).toBe('2026-08');
    expect(daysLeftInMonth('2026-08-29')).toBe(3);
    expect(daysLeftInMonth('2026-08-31')).toBe(1);
  });

  it('validation des formats', () => {
    expect(isValidIsoDate('2026-02-29')).toBe(false);
    expect(isValidIsoDate('2028-02-29')).toBe(true);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('26-01-01')).toBe(false);
    expect(isValidMonthKey('2026-08')).toBe(true);
    expect(isValidMonthKey('2026-13')).toBe(false);
    expect(isValidMonthKey(null)).toBe(false);
  });

  it('conversions Date ↔ ISO locales', () => {
    const date = new Date(2026, 7, 28, 18, 42);
    expect(toIsoDate(date)).toBe('2026-08-28');
    expect(toIsoDateTime(date)).toBe('2026-08-28T18:42');
    expect(toDate('2026-08-28T18:42').getTime()).toBe(date.getTime());
    expect(toDate('2026-08-28').getDate()).toBe(28);
    expect(combineDateTime('2026-08-28', '07:05')).toBe('2026-08-28T07:05');
    expect(timeOf('2026-08-28T07:05')).toBe('07:05');
  });
});
