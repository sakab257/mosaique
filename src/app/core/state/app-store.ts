import { Injectable, computed, inject, signal } from '@angular/core';
import { createDefaultData } from '../data/defaults';
import { AppData } from '../models';
import { StorageService } from '../storage/storage.service';

/**
 * Source de vérité unique : un signal contenant tout l'`AppData`. Les stores de domaine
 * (comptes, transactions…) exposent des sélecteurs `computed` et des mutations immuables
 * construites sur `update`.
 *
 * Chaque mutation est écrite **immédiatement et de façon synchrone** dans le stockage :
 * l'action est sauvegardée avant même le rafraîchissement de l'écran, ce qui la protège
 * d'une fermeture brutale de l'app (balayage sur iPhone, onglet fermé…).
 */
@Injectable({ providedIn: 'root' })
export class AppStore {
  private readonly storage = inject(StorageService);
  private readonly loaded = this.storage.load();
  private readonly state = signal<AppData>(this.loaded ?? createDefaultData());

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
    // Première ouverture (ou document illisible, sauvegardé à part) : état initial persisté.
    if (!this.loaded) this.storage.save(this.state());
  }

  /** Applique une transformation immuable de l'état. */
  update(recipe: (data: AppData) => AppData): void {
    this.commit(recipe(this.state()));
  }

  /** Remplace tout l'état (import, données d'exemple). */
  replace(data: AppData): void {
    this.commit(data);
  }

  /** Revient à une installation neuve. */
  reset(): void {
    this.commit(createDefaultData());
  }

  private commit(next: AppData): void {
    if (next === this.state()) return;
    this.state.set(next);
    this.storage.save(next);
  }
}
