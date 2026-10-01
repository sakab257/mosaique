import { describeRecurrence, frequencyLine, longDateLabel } from './recurrence-format';

describe('résumé des récurrences', () => {
  it('mensuelle sans fin', () => {
    expect(describeRecurrence('monthly', '2026-09-05T08:00')).toBe(
      'Se répète le 5 de chaque mois, sans fin.',
    );
  });

  it('écrit « 1er » et signale les jours absents de certains mois', () => {
    expect(describeRecurrence('monthly', '2026-10-01')).toBe(
      'Se répète le 1er de chaque mois, sans fin.',
    );
    expect(describeRecurrence('monthly', '2026-10-31')).toBe(
      'Se répète le 31 de chaque mois (ou le dernier jour des mois plus courts), sans fin.',
    );
  });

  it('hebdomadaire avec date de fin', () => {
    expect(describeRecurrence('weekly', '2026-09-29', '2026-12-31')).toBe(
      'Se répète chaque mardi, jusqu’au 31 décembre 2026.',
    );
  });

  it('annuelle, y compris le 29 février', () => {
    expect(describeRecurrence('yearly', '2027-03-14')).toBe(
      'Se répète chaque année le 14 mars, sans fin.',
    );
    expect(describeRecurrence('yearly', '2028-02-29')).toContain(
      'le 28 février les années non bissextiles',
    );
  });

  it('ligne courte et date longue', () => {
    expect(frequencyLine('monthly', '2026-09-01')).toBe('Chaque mois · le 1er');
    expect(frequencyLine('weekly', '2026-09-29')).toBe('Chaque semaine · le mardi');
    expect(frequencyLine('yearly', '2027-03-14')).toBe('Chaque année · le 14 mars');
    expect(longDateLabel('2027-03-01')).toBe('1er mars 2027');
  });
});
