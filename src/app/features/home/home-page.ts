import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { isInMonth } from '../../core/domain/dates';
import { MonthService } from '../../core/services/month.service';
import { AppStore } from '../../core/state/app-store';
import { DateLabelPipe } from '../../shared/pipes/date-label.pipe';
import { Button } from '../../shared/ui/button/button';
import { Card } from '../../shared/ui/card/card';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { Icon } from '../../shared/ui/icon/icon';
import { MonthSwitcher } from '../../shared/ui/month-switcher/month-switcher';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { TransactionEditor } from '../transactions/transaction-editor.service';
import { BalanceCard } from './balance-card';
import { BudgetCard } from './budget-card';
import { RecentCard } from './recent-card';
import { SpendingCard } from './spending-card';
import { UpcomingCard } from './upcoming-card';

@Component({
  selector: 'app-home-page',
  imports: [
    RouterLink,
    PageHeader,
    MonthSwitcher,
    Card,
    EmptyState,
    Button,
    Icon,
    BalanceCard,
    BudgetCard,
    SpendingCard,
    UpcomingCard,
    RecentCard,
    DateLabelPipe,
  ],
  template: `
    <app-page-header title="Accueil">
      <app-month-switcher [month]="months.month()" (monthChange)="months.set($event)" />
    </app-page-header>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(min(310px,100%),1fr))] items-start gap-4">
      <app-balance-card />

      @if (empty()) {
        <app-card padding="none" class="px-6 py-10 lg:col-span-2">
          <app-empty-state
            icon="eco"
            [title]="'Aucune donnée pour ' + (months.month() | dateLabel: 'month').toLowerCase()"
            description="Ajoutez votre première transaction ou créez une enveloppe de budget : vos soldes, graphiques et échéances apparaîtront ici."
          >
            <button type="button" appButton class="h-11!" (click)="editor.openCreate()">
              <app-icon name="add" [size]="18" />
              Ajouter une transaction
            </button>
            <a
              appButton="secondary"
              class="h-11!"
              routerLink="/budget"
              queryParamsHandling="preserve"
            >
              Créer une enveloppe
            </a>
          </app-empty-state>
        </app-card>
      } @else {
        <app-budget-card />
        <app-spending-card />
        <app-upcoming-card />
        <app-recent-card class="lg:col-span-2" />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4' },
})
export default class HomePage {
  protected readonly months = inject(MonthService);
  protected readonly editor = inject(TransactionEditor);
  private readonly app = inject(AppStore);

  /** Rien à montrer pour ce mois : ni transaction, ni enveloppe, ni récurrence. */
  protected readonly empty = computed(() => {
    const month = this.months.month();
    return (
      !this.app.transactions().some((tx) => isInMonth(tx.date, month)) &&
      this.app.envelopes().length === 0 &&
      this.app.rules().length === 0
    );
  });
}
