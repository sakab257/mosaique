import { CURRENT_SCHEMA_VERSION } from '../models';
import { InvalidDataError, SchemaVersionError } from './errors';

export type RawDocument = Record<string, unknown>;

/** Transforme un document de version `n` en document de version `n + 1`. */
export type Migration = (doc: RawDocument) => RawDocument;

/**
 * Migrations successives, indexées par version de départ.
 * Exemple, pour passer au schéma v2 :
 *   1: (doc) => ({ ...doc, transactions: (doc.transactions as any[]).map(...) }),
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export const isRecord = (value: unknown): value is RawDocument =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Amène un document brut à la version cible en appliquant les migrations dans l'ordre.
 * Ne valide pas le contenu : voir `parseAppData`.
 */
export function migrate(
  raw: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  target: number = CURRENT_SCHEMA_VERSION,
): RawDocument {
  if (!isRecord(raw)) {
    throw new InvalidDataError('Le document n’est pas un objet JSON.');
  }
  let version = raw['schemaVersion'];
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new InvalidDataError('Version de schéma absente ou invalide.');
  }
  if (version > target) {
    throw new SchemaVersionError(
      `Ces données proviennent d’une version plus récente de l’application (schéma v${version}).`,
    );
  }
  let doc = raw;
  while (version < target) {
    const step = migrations[version];
    if (!step) {
      throw new SchemaVersionError(
        `Migration manquante du schéma v${version} vers v${version + 1}.`,
      );
    }
    version += 1;
    doc = { ...step(doc), schemaVersion: version };
  }
  return doc;
}
