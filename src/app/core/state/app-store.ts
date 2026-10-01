import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { createDefaultData } from '../data/defaults';
import { AppData } from '../models';
import { StorageService } from '../storage/storage.service';

/**
 * Source de vérité unique : un signal contenant tout l'`AppData`, persisté à chaque
 * changement. Les stores de domaine (comptes, transactions…) exposent des sélecteurs
 * `computed` et des mutations immuables construites sur `update`.
 */
@Injectable({ providedIn: 'root' })
export class AppStore {
  private readonly storage = inject(StorageService);
  private readonly state = signal<AppData>(this.storage.load() ?? createDefaultData());

  readonly data = this.state.asReadonly();
  readonly accounts = computed(() => this.state().accounts);
  readonly groups = computed(() => this.state().groups);
  readonly subcategories = computed(() => this.state().subcategories);
  readonly transactions = computed(() => this.state().transactions);
  readonly rules = computed(() => this.state().rules);
  readonly envelopes = computed(() => this.state().envelopes);
  readonly settings = computed(() => this.state().settings);

  /** Erreur de persistance courante (lecture ou écriture). */
  readonly storageError = this.storage.lastError.asReadonly();

  constructor() {
    effect(() => this.storage.save(this.state()));
  }

  /** Applique une transformation immuable de l'état. */
  update(recipe: (data: AppData) => AppData): void {
    this.state.update(recipe);
  }

  /** Remplace tout l'état (import, données d'exemple). */
  replace(data: AppData): void {
    this.state.set(data);
  }

  /** Revient à une installation neuve. */
  reset(): void {
    this.state.set(createDefaultData());
  }
}
