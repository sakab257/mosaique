import { createSampleData } from '../data/sample-data';
import { generateDueTransactions } from '../domain/recurrence';
import { InvalidDataError, SchemaVersionError } from './errors';
import { backupFileName, parseBackup, serializeBackup } from './backup';

describe('sauvegarde JSON', () => {
  const today = '2026-10-01';
  let n = 0;
  const data = generateDueTransactions(createSampleData(today), today, () => `g-${++n}`).data;

  it('aller-retour export → import sans perte (règles incluses)', () => {
    const restored = parseBackup(serializeBackup(data, '2026-10-01T10:00:00.000Z'));
    expect(restored).toEqual(data);
    expect(restored.rules.length).toBeGreaterThan(0);
    expect(restored.transactions.some((t) => t.recurringRuleId)).toBe(true);
  });

  it('rejette un fichier qui n’est pas du JSON', () => {
    expect(() => parseBackup('pas du json')).toThrow('Le fichier n’est pas un JSON valide.');
  });

  it('rejette un JSON étranger ou incomplet', () => {
    expect(() => parseBackup('{"foo": 1}')).toThrow(InvalidDataError);
    expect(() => parseBackup('[]')).toThrow(InvalidDataError);
  });

  it('rejette une sauvegarde d’une version plus récente', () => {
    const future = JSON.stringify({ ...data, schemaVersion: 7 });
    expect(() => parseBackup(future)).toThrow(SchemaVersionError);
  });

  it('nom de fichier daté', () => {
    expect(backupFileName('2026-10-01')).toBe('mosaique-sauvegarde-2026-10-01.json');
  });
});

describe('données d’exemple', () => {
  it('sont valides et produisent des échéances récurrentes jusqu’à aujourd’hui', () => {
    const today = '2026-10-01';
    const sample = createSampleData(today);
    expect(() => parseBackup(JSON.stringify(sample))).not.toThrow();
    expect(sample.transactions.every((t) => t.date.slice(0, 10) <= today)).toBe(true);

    const { created } = generateDueTransactions(sample, today, () => crypto.randomUUID());
    const salaires = created.filter((t) => t.note === 'Salaire').map((t) => t.occurrenceDate);
    expect(salaires).toEqual(['2026-08-01', '2026-09-01', '2026-10-01']);
    expect(created.some((t) => t.note === 'Cours de yoga')).toBe(false); // règle en pause
  });
});
