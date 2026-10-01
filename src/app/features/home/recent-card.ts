import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { isInMonth } from '../../core/domain/dates';
import { MonthService } from '../../core/services/month.service';
import { TransactionsStore } from '../../core/state/transactions.store';
import { Button } from '../../shared/ui/button/button';
import { Card, CardTitle } from '../../shared/ui/card/card';
import { TransactionEditor } from '../transactions/transaction-editor.service';
import { TransactionRow } from '../transactions/transaction-row';
import { toTransactionView } from '../transactions/transaction-view';

/** « Dernières transactions » du mois affiché. */
@Component({
  selector: 'app-recent-card',
  imports: [RouterLink, Card, CardTitle, Button, TransactionRow],
  template: `
    <app-card>
      <div class="flex items-center justify-between">
        <app-card-title>Dernières transactions</app-card-title>
        <a
          appButton="link"
          class="text-caption"
          routerLink="/transactions"
          queryParamsHandling="preserve"
        >
          Tout voir
        </a>
      </div>
      @if (rows().length) {
        <ul class="mt-1.5 flex flex-col">
          @for (row of rows(); track row.id) {
            <li>
              <button
                type="button"
                class="block w-full rounded-item py-2.5"
                (click)="editor.openEdit(row.tx)"
              >
                <app-transaction-row [view]="row" meta="date" />
              </button>
            </li>
          }
        </ul>
      } @else {
        <p class="mt-2 text-caption text-muted">Aucune transaction ce mois-ci.</p>
      }
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentCard {
  protected readonly editor = inject(TransactionEditor);
  private readonly transactions = inject(TransactionsStore);
  private readonly months = inject(MonthService);

  protected readonly rows = computed(() => {
    const catalog = this.transactions.catalog();
    const month = this.months.month();
    return this.transactions
      .sorted()
      .filter((tx) => isInMonth(tx.date, month))
      .slice(0, 5)
      .map((tx) => toTransactionView(tx, catalog));
  });
}
