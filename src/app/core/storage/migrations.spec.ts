import { InvalidDataError, SchemaVersionError } from './errors';
import { Migration, migrate } from './migrations';

describe('migrate', () => {
  it('laisse inchangé un document déjà à jour', () => {
    const doc = { schemaVersion: 1, accounts: [] };
    expect(migrate(doc, {}, 1)).toBe(doc);
  });

  it('applique les migrations successives dans l’ordre', () => {
    const migrations: Record<number, Migration> = {
      1: (doc) => ({ ...doc, renamed: doc['old'], old: undefined }),
      2: (doc) => ({ ...doc, count: (doc['renamed'] as number[]).length }),
    };
    const result = migrate({ schemaVersion: 1, old: [1, 2, 3] }, migrations, 3);
    expect(result).toEqual({ schemaVersion: 3, renamed: [1, 2, 3], old: undefined, count: 3 });
  });

  it('refuse des données d’une version plus récente', () => {
    expect(() => migrate({ schemaVersion: 4 }, {}, 1)).toThrow(SchemaVersionError);
  });

  it('signale une migration manquante', () => {
    expect(() => migrate({ schemaVersion: 1 }, {}, 2)).toThrow(/v1 vers v2/);
  });

  it.each([null, [], 'texte', { schemaVersion: '1' }, { schemaVersion: 0 }, {}])(
    'rejette un document invalide : %j',
    (doc) => {
      expect(() => migrate(doc, {}, 1)).toThrow(InvalidDataError);
    },
  );
});
