import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { AppData } from '../models';
import { parseAppData } from './app-data.validator';
import { migrate } from './migrations';

/** Clé unique du document persisté. Le numéro de schéma est porté par `schemaVersion`. */
export const STORAGE_KEY = 'app:v1';

/** Stockage navigateur injectable (remplacé par un double en test ; `null` si indisponible). */
export const BROWSER_STORAGE = new InjectionToken<Storage | null>('BROWSER_STORAGE', {
  providedIn: 'root',
  factory: () => {
    try {
      return globalThis.localStorage ?? null;
    } catch {
      return null; // navigation privée stricte, iframe sandboxée…
    }
  },
});

/**
 * Persistance versionnée de l'état complet dans le localStorage.
 * Au chargement : parse → migrations → validation. Un document illisible n'est jamais
 * écrasé silencieusement : il est d'abord sauvegardé sous une clé de secours.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly storage = inject(BROWSER_STORAGE);

  /** Dernier problème de persistance, à afficher à l'utilisateur. */
  readonly lastError = signal<string | null>(null);

  load(): AppData | null {
    const raw = this.read();
    if (raw === null) {
      return null;
    }
    try {
      const doc = JSON.parse(raw) as unknown;
      const data = parseAppData(migrate(doc));
      if ((doc as { schemaVersion?: unknown }).schemaVersion !== data.schemaVersion) {
        this.save(data);
      }
      return data;
    } catch (error) {
      const backupKey = `${STORAGE_KEY}:backup:${Date.now()}`;
      this.write(backupKey, raw);
      this.lastError.set(
        `Vos données enregistrées n’ont pas pu être lues (${messageOf(error)}). ` +
          `Une copie a été conservée sous « ${backupKey} ».`,
      );
      return null;
    }
  }

  save(data: AppData): void {
    if (this.write(STORAGE_KEY, JSON.stringify(data))) {
      this.lastError.set(null);
    }
  }

  clear(): void {
    this.storage?.removeItem(STORAGE_KEY);
  }

  private read(): string | null {
    try {
      return this.storage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): boolean {
    if (!this.storage) {
      this.lastError.set(
        'Le stockage local est indisponible : vos données ne seront pas conservées.',
      );
      return false;
    }
    try {
      this.storage.setItem(key, value);
      return true;
    } catch {
      this.lastError.set(
        'Espace de stockage insuffisant : la dernière modification n’a pas été enregistrée.',
      );
      return false;
    }
  }
}

function messageOf(error: unknown): string {
  if (error instanceof SyntaxError) {
    return 'JSON invalide';
  }
  return error instanceof Error ? error.message : String(error);
}
