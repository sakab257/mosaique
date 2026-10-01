import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { addMonths, isValidMonthKey } from '../domain/dates';
import { MonthKey } from '../models';
import { ClockService } from './clock.service';

export const MONTH_QUERY_PARAM = 'mois';

/**
 * Mois consulté, partagé entre Accueil, Transactions et Budget. Il est porté par l'URL
 * (`?mois=2026-08`) : partageable, conservé au rechargement et par l'historique.
 * Le mois courant n'apparaît pas dans l'URL.
 */
@Injectable({ providedIn: 'root' })
export class MonthService {
  private readonly router = inject(Router);
  private readonly clock = inject(ClockService);

  private readonly param = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.readParam()),
    ),
    { initialValue: this.readParam() },
  );

  readonly month = computed<MonthKey>(() => {
    const value = this.param();
    return isValidMonthKey(value) ? value : this.clock.currentMonth();
  });

  readonly isCurrentMonth = computed(() => this.month() === this.clock.currentMonth());

  set(month: MonthKey): void {
    const value = month === this.clock.currentMonth() ? null : month;
    const tree = this.router.createUrlTree([], {
      queryParams: { [MONTH_QUERY_PARAM]: value },
      queryParamsHandling: 'merge',
    });
    void this.router.navigateByUrl(tree, { replaceUrl: true });
  }

  shift(months: number): void {
    this.set(addMonths(this.month(), months));
  }

  private readParam(): string | null {
    return this.router.parseUrl(this.router.url).queryParamMap.get(MONTH_QUERY_PARAM);
  }
}
