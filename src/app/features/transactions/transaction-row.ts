import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DateLabelPipe } from '../../shared/pipes/date-label.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { CategoryAvatar } from '../../shared/ui/category-avatar/category-avatar';
import { RecurringBadge } from '../../shared/ui/recurring-badge/recurring-badge';
import { TransactionView } from './transaction-view';

/** Contenu d'une ligne de transaction (liste mobile, dernières transactions). */
@Component({
  selector: 'app-transaction-row',
  imports: [CategoryAvatar, RecurringBadge, MoneyPipe, DateLabelPipe],
  template: `
    @let t = view();
    <app-category-avatar [icon]="t.icon" [color]="t.color" />
    <span class="min-w-0 flex-1 text-left">
      <span class="flex min-w-0 items-center gap-1.5 font-medium">
        <span class="truncate">{{ t.title }}</span>
        @if (t.recurring) {
          <app-recurring-badge />
        }
      </span>
      <span class="mt-0.5 block truncate text-xs text-muted">
        <span class="text-tint" [style.--tint]="t.color">{{ t.category }}</span>
        · {{ t.account }}
      </span>
    </span>
    <span class="shrink-0 text-right">
      <span class="block font-semibold" [class]="t.amountClass">{{
        t.amount | money: t.sign
      }}</span>
      <span class="mt-0.5 block text-xs text-faint">
        {{ meta() === 'time' ? t.time : (t.date | dateLabel: 'short') }}
      </span>
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-w-0 items-center gap-3' },
})
export class TransactionRow {
  readonly view = input.required<TransactionView>();
  /** Information sous le montant : l'heure (liste groupée par jour) ou la date. */
  readonly meta = input<'time' | 'date'>('time');
}
