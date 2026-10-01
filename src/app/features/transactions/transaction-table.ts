import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Transaction } from '../../core/models';
import { formatMoney } from '../../core/domain/money';
import { DateLabelPipe } from '../../shared/pipes/date-label.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { IconButton } from '../../shared/ui/button/button';
import { CategoryAvatar } from '../../shared/ui/category-avatar/category-avatar';
import { Icon } from '../../shared/ui/icon/icon';
import { RecurringBadge } from '../../shared/ui/recurring-badge/recurring-badge';
import { TransactionView } from './transaction-view';

const COLUMNS =
  'grid grid-cols-[130px_minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_130px_44px] items-center gap-4 px-4.5';

/**
 * Tableau desktop. Toute la ligne ouvre l'édition (bouton étiré sous le contenu),
 * le bouton corbeille reste au-dessus.
 */
@Component({
  selector: 'app-transaction-table',
  imports: [CategoryAvatar, RecurringBadge, Icon, IconButton, MoneyPipe, DateLabelPipe],
  template: `
    <div role="rowgroup">
      <div role="row" [class]="columns + ' bg-table-head py-3 text-xs font-medium text-muted'">
        <span role="columnheader">Date</span>
        <span role="columnheader">Libellé</span>
        <span role="columnheader">Catégorie</span>
        <span role="columnheader">Compte</span>
        <span role="columnheader" class="text-right">Montant</span>
        <span role="columnheader"><span class="sr-only">Actions</span></span>
      </div>
    </div>
    <div role="rowgroup" class="flex flex-col gap-px">
      @for (t of rows(); track t.id) {
        <div
          role="row"
          [class]="columns + ' relative bg-surface py-2.5 transition-colors hover:bg-surface-hover'"
        >
          <span role="cell">
            <button
              type="button"
              class="absolute inset-0 focus-visible:-outline-offset-2"
              [attr.aria-label]="'Modifier ' + t.title + ', ' + amountLabel(t)"
              (click)="edit.emit(t.tx)"
            ></button>
            <span class="block font-medium">{{ t.date | dateLabel: 'short' }}</span>
            <span class="block text-xs text-faint">{{ t.time }}</span>
          </span>
          <span role="cell" class="flex min-w-0 items-center gap-3">
            <app-category-avatar [icon]="t.icon" [color]="t.color" size="sm" />
            <span class="truncate font-medium">{{ t.title }}</span>
            @if (t.recurring) {
              <app-recurring-badge />
            }
          </span>
          <span role="cell" class="truncate text-caption">
            <span class="text-tint font-medium" [style.--tint]="t.color">{{ t.category }}</span>
            @if (t.detail && t.type !== 'transfer') {
              <span class="text-muted"> · {{ t.detail }}</span>
            }
          </span>
          <span role="cell" class="truncate text-caption text-ink-3">{{ t.account }}</span>
          <span role="cell" class="text-right font-semibold" [class]="t.amountClass">
            {{ t.amount | money: t.sign }}
          </span>
          <span role="cell" class="relative">
            <button
              type="button"
              [appIconButton]="'Supprimer ' + t.title"
              variant="danger"
              (click)="remove.emit(t.tx)"
            >
              <app-icon name="delete" [size]="18" />
            </button>
          </span>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'table',
    'aria-label': 'Transactions',
    class: 'flex flex-col gap-px overflow-hidden rounded-card border border-line bg-line',
  },
})
export class TransactionTable {
  readonly rows = input.required<readonly TransactionView[]>();
  readonly edit = output<Transaction>();
  readonly remove = output<Transaction>();

  protected readonly columns = COLUMNS;

  protected amountLabel(t: TransactionView): string {
    return formatMoney(t.amount, t.sign);
  }
}
