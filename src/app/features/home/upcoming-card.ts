import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MONTHS } from '../../core/domain/recurrence-format';
import { splitIso } from '../../core/domain/dates';
import { ClockService } from '../../core/services/clock.service';
import { RecurringStore } from '../../core/state/recurring.store';
import { TransactionsStore } from '../../core/state/transactions.store';
import { DateLabelPipe } from '../../shared/pipes/date-label.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { Button } from '../../shared/ui/button/button';
import { Card, CardTitle } from '../../shared/ui/card/card';
import { RecurringBadge } from '../../shared/ui/recurring-badge/recurring-badge';
import { TransactionEditor } from '../transactions/transaction-editor.service';
import { toUpcomingView, upcomingTotal } from '../transactions/upcoming-view';

/** « Prochaines échéances » : 5 prochaines occurrences et total attendu ce mois-ci. */
@Component({
  selector: 'app-upcoming-card',
  imports: [RouterLink, Card, CardTitle, RecurringBadge, Button, MoneyPipe, DateLabelPipe],
  template: `
    <app-card>
      <div class="flex items-center justify-between">
        <app-card-title>Prochaines échéances</app-card-title>
        <a appButton="link" class="text-caption" routerLink="/transactions">Tout voir</a>
      </div>
      @if (items().length) {
        <ul class="mt-2 flex flex-col">
          @for (item of items(); track item.id) {
            <li>
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-item py-2 text-left"
                [attr.aria-label]="'Modifier la récurrence ' + item.title"
                (click)="editor.openEditRule(item.rule)"
              >
                <span class="w-10 shrink-0 text-center" aria-hidden="true">
                  <span class="block text-base leading-tight font-semibold">
                    {{ item.date | dateLabel: 'dayNumber' }}
                  </span>
                  <span class="block text-2xs text-muted">{{
                    item.date | dateLabel: 'monthShort'
                  }}</span>
                </span>
                <span class="min-w-0 flex-1">
                  <span class="flex items-center gap-1.5 font-medium">
                    <span class="truncate">{{ item.title }}</span>
                    <app-recurring-badge />
                  </span>
                  <span class="text-tint mt-px block truncate text-xs" [style.--tint]="item.color">
                    {{ item.category }}
                  </span>
                </span>
                <span class="shrink-0 font-semibold" [class]="item.amountClass">
                  {{ item.amount | money: item.sign }}
                </span>
              </button>
            </li>
          }
        </ul>
        <div class="mt-2 flex items-center justify-between border-t border-line pt-3">
          <span class="text-caption text-muted">Encore attendu en {{ monthName() }}</span>
          <span class="font-semibold" [class]="expected() >= 0 ? 'text-income' : 'text-expense'">
            {{ expected() | money: 'always' }}
          </span>
        </div>
      } @else {
        <p class="mt-2 text-caption leading-relaxed text-muted">
          Aucune échéance dans les 30 prochains jours.
        </p>
        <a appButton="secondary" size="sm" class="mt-3" routerLink="/parametres/recurrentes">
          Gérer les récurrences
        </a>
      }
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingCard {
  protected readonly editor = inject(TransactionEditor);
  private readonly recurring = inject(RecurringStore);
  private readonly transactions = inject(TransactionsStore);
  private readonly clock = inject(ClockService);

  protected readonly items = computed(() => {
    const catalog = this.transactions.catalog();
    return this.recurring
      .upcoming()
      .slice(0, 5)
      .map((o) => toUpcomingView(o, catalog));
  });

  protected readonly expected = computed(() => upcomingTotal(this.recurring.remainingThisMonth()));
  protected readonly monthName = computed(() => MONTHS[splitIso(this.clock.today()).month - 1]);
}
