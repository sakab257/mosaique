import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { createId } from '../domain/id';
import { generateDueTransactions } from '../domain/recurrence';
import { Transaction } from '../models';
import { AppStore } from '../state/app-store';
import { ClockService } from './clock.service';

/**
 * Crée automatiquement, sans confirmation, les transactions dues des règles récurrentes.
 * Exécuté au démarrage, à chaque retour au premier plan et après chaque modification
 * de règle. Idempotent : sans échéance nouvelle, l'état n'est pas modifié.
 */
@Injectable({ providedIn: 'root' })
export class RecurrenceService {
  private readonly app = inject(AppStore);
  private readonly clock = inject(ClockService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private started = false;

  /** Lance une première génération puis écoute le retour au premier plan. */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.run();
    const onVisibility = () => {
      if (this.document.visibilityState !== 'visible') return;
      this.clock.refresh();
      this.run();
    };
    this.document.addEventListener('visibilitychange', onVisibility);
    this.destroyRef.onDestroy(() =>
      this.document.removeEventListener('visibilitychange', onVisibility),
    );
  }

  /** Génère les occurrences manquantes jusqu'à aujourd'hui ; renvoie les transactions créées. */
  run(): Transaction[] {
    const { data, created } = generateDueTransactions(
      this.app.data(),
      this.clock.today(),
      createId,
    );
    if (data !== this.app.data()) this.app.replace(data);
    return created;
  }
}
