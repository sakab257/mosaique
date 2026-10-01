import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { monthTotals } from '../../core/domain/stats';
import { ACCOUNT_TYPE_DESCRIPTIONS, ACCOUNT_TYPE_ICONS } from '../../core/models';
import { MonthService } from '../../core/services/month.service';
import { AccountsStore } from '../../core/state/accounts.store';
import { TransactionsStore } from '../../core/state/transactions.store';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { Card, CardTitle } from '../../shared/ui/card/card';
import { Icon } from '../../shared/ui/icon/icon';

/** Solde total, dépliable par compte, et variation du mois. */
@Component({
  selector: 'app-balance-card',
  imports: [Card, CardTitle, Icon, MoneyPipe],
  template: `
    <app-card>
      <div class="flex items-center justify-between">
        <app-card-title>Solde total</app-card-title>
        <button
          type="button"
          class="flex h-7 items-center gap-1 rounded-full border border-line-strong px-2.5 text-xs text-ink-3 transition-colors hover:bg-surface-3"
          [attr.aria-expanded]="open()"
          aria-controls="balance-accounts"
          (click)="open.set(!open())"
        >
          Par compte
          <app-icon [name]="open() ? 'expand_less' : 'expand_more'" [size]="16" />
        </button>
      </div>
      <p class="mt-2 text-display font-semibold">{{ accounts.totalBalance() | money }}</p>
      <p class="mt-1 text-caption" [class]="netClass()">
        @if (totals().count === 0) {
          Aucun mouvement ce mois-ci
        } @else {
          {{ totals().net | money: 'always' }} ce mois-ci
        }
      </p>
      @if (open()) {
        <ul id="balance-accounts" class="mt-3.5 flex flex-col border-t border-line pt-1.5">
          @for (account of rows(); track account.id) {
            <li class="flex items-center gap-3 py-2">
              <span
                class="flex size-9 items-center justify-center rounded-item bg-primary/16 text-primary-soft"
                aria-hidden="true"
              >
                <app-icon [name]="account.icon" [size]="18" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium">{{ account.name }}</span>
                <span class="block text-xs text-muted">{{ account.description }}</span>
              </span>
              <span class="font-semibold">{{ account.balance | money }}</span>
            </li>
          }
        </ul>
      }
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BalanceCard {
  protected readonly accounts = inject(AccountsStore);
  private readonly transactions = inject(TransactionsStore);
  private readonly months = inject(MonthService);

  protected readonly open = signal(false);
  protected readonly totals = computed(() =>
    monthTotals(this.transactions.all(), this.months.month()),
  );
  protected readonly netClass = computed(() => {
    const { count, net } = this.totals();
    return count === 0 ? 'text-muted' : net >= 0 ? 'text-income' : 'text-expense';
  });
  protected readonly rows = computed(() =>
    this.accounts.accounts().map((a) => ({
      id: a.id,
      name: a.name,
      icon: ACCOUNT_TYPE_ICONS[a.type],
      description: ACCOUNT_TYPE_DESCRIPTIONS[a.type],
      balance: this.accounts.balanceOf(a.id),
    })),
  );
}
