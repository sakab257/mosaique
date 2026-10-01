import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { formatDateLabel } from './date-label.pipe';

registerLocaleData(localeFr);

describe('formatDateLabel', () => {
  const label = (iso: string, format: Parameters<typeof formatDateLabel>[1]) =>
    formatDateLabel(iso, format, 'fr-FR', 2026);

  it('formate les dates en français', () => {
    expect(label('2023-09-16', 'long')).toBe('16 septembre 2023');
    expect(label('2026-08-28T18:42', 'day')).toBe('Vendredi 28 août 2026');
    expect(label('2026-08-28', 'short')).toBe('28 août');
    expect(label('2026-08-28', 'month')).toBe('Août 2026');
    expect(label('2026-09', 'month')).toBe('Septembre 2026');
  });

  it('écrit « 1er » pour le premier du mois', () => {
    expect(label('2026-09-01', 'day')).toBe('Mardi 1er septembre 2026');
    expect(label('2026-09-01', 'short')).toBe('1er sept.');
    expect(label('2026-10-01', 'long')).toBe('1er octobre 2026');
  });

  it('ajoute l’année au format court si elle diffère', () => {
    expect(label('2027-03-14', 'short')).toBe('14 mars 2027');
  });
});
