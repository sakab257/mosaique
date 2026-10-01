import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { Cents, RecurringRule } from '../../core/models';
import { DateLabelPipe } from '../../shared/pipes/date-label.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { CategoryAvatar } from '../../shared/ui/category-avatar/category-avatar';
import { Icon } from '../../shared/ui/icon/icon';
import { RecurringBadge } from '../../shared/ui/recurring-badge/recurring-badge';
import { UpcomingView } from './upcoming-view';

let nextId = 0;

/** Bandeau repliable « À venir · 30 prochains jours » (échéances non encore créées). */
@Component({
  selector: 'app-upcoming-banner',
  imports: [Icon, CategoryAvatar, RecurringBadge, MoneyPipe, DateLabelPipe],
  template: `
    <button
      type="button"
      class="flex w-full items-center gap-2.5 px-4 py-3.5 text-left"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="panelId"
      (click)="open.set(!open())"
    >
      <span
        class="flex size-7 items-center justify-center rounded-lg bg-primary/18 text-primary-soft"
        aria-hidden="true"
      >
        <app-icon name="autorenew" [size]="15" />
      </span>
      <span class="font-semibold">À venir</span>
      <span class="min-w-0 flex-1 truncate text-xs text-muted"
        >{{ countLabel() }} · 30 prochains jours</span
      >
      <span
        class="text-caption font-semibold"
        [class]="total() >= 0 ? 'text-income' : 'text-expense'"
      >
        {{ total() | money: 'always' }}
      </span>
      <app-icon [name]="open() ? 'expand_less' : 'expand_more'" [size]="18" class="text-muted" />
    </button>
    @if (open()) {
      <ul [id]="panelId" class="flex flex-col border-t border-line px-4 pt-1 pb-2">
        @for (item of items(); track item.id) {
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-item py-2 text-left opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100"
              [attr.aria-label]="'Modifier la récurrence ' + item.title"
              (click)="editRule.emit(item.rule)"
            >
              <span class="w-10 shrink-0 text-center" aria-hidden="true">
                <span class="block text-[0.9375rem] leading-tight font-semibold">{{
                  item.date | dateLabel: 'dayNumber'
                }}</span>
                <span class="block text-2xs text-muted">{{
                  item.date | dateLabel: 'monthShort'
                }}</span>
              </span>
              <app-category-avatar [icon]="item.icon" [color]="item.color" size="sm" />
              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-1.5 font-medium">
                  <span class="truncate">{{ item.title }}</span>
                  <app-recurring-badge />
                </span>
                <span class="block truncate text-xs text-muted">
                  {{ item.category }} · {{ item.account }}
                </span>
              </span>
              <span class="shrink-0 font-semibold" [class]="item.amountClass">
                {{ item.amount | money: item.sign }}
              </span>
            </button>
          </li>
        }
      </ul>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block rounded-card border border-line bg-surface' },
})
export class UpcomingBanner {
  readonly items = input.required<readonly UpcomingView[]>();
  readonly total = input.required<Cents>();
  readonly open = model(true);
  readonly editRule = output<RecurringRule>();

  protected readonly panelId = `upcoming-panel-${nextId++}`;
  protected readonly countLabel = computed(() => {
    const n = this.items().length;
    return `${n} échéance${n > 1 ? 's' : ''}`;
  });
}
