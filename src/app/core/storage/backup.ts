import { AppData } from '../models';
import { parseAppData } from './app-data.validator';
import { InvalidDataError, SchemaVersionError } from './errors';
import { migrate } from './migrations';

export const BACKUP_APP = 'mosaique';

/**
 * Sauvegarde JSON complète (comptes, catégories, transactions, règles récurrentes,
 * enveloppes, paramètres). Les métadonnées `app` et `exportedAt` sont ignorées à l'import.
 */
export function serializeBackup(data: AppData, exportedAt: string): string {
  return JSON.stringify({ app: BACKUP_APP, exportedAt, ...data }, null, 2);
}

/** Lit une sauvegarde : JSON → migrations → validation. Messages d'erreur en français. */
export function parseBackup(text: string): AppData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new InvalidDataError('Le fichier n’est pas un JSON valide.');
  }
  try {
    return parseAppData(migrate(raw));
  } catch (error) {
    if (error instanceof InvalidDataError || error instanceof SchemaVersionError) throw error;
    throw new InvalidDataError('Le fichier ne ressemble pas à une sauvegarde Mosaïque.');
  }
}

export function backupFileName(today: string): string {
  return `mosaique-sauvegarde-${today}.json`;
}
