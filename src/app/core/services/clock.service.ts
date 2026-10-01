import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { monthOf, toIsoDate, toIsoDateTime } from '../domain/dates';
import { IsoDate, IsoDateTime, MonthKey } from '../models';

/** Source de l'heure courante — remplaçable en test pour figer « aujourd'hui ». */
export const NOW = new InjectionToken<() => Date>('NOW', {
  providedIn: 'root',
  factory: () => () => new Date(),
});

/**
 * Date du jour sous forme de signal. Rafraîchie au retour au premier plan pour que
 * les calculs dépendant de « aujourd'hui » suivent un onglet resté ouvert la nuit.
 */
@Injectable({ providedIn: 'root' })
export class ClockService {
  private readonly now = inject(NOW);
  private readonly todayState = signal<IsoDate>(toIsoDate(this.now()));

  readonly today = this.todayState.asReadonly();
  readonly currentMonth = computed<MonthKey>(() => monthOf(this.today()));

  constructor() {
    const document = inject(DOCUMENT);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') this.refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    inject(DestroyRef).onDestroy(() =>
      document.removeEventListener('visibilitychange', onVisibility),
    );
  }

  nowDateTime(): IsoDateTime {
    return toIsoDateTime(this.now());
  }

  refresh(): void {
    this.todayState.set(toIsoDate(this.now()));
  }
}
