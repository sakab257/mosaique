import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PALETTE } from '../../core/data/palette';
import { formatPercent, ratio } from '../../core/domain/money';
import { UNCATEGORIZED, expensesByGroup } from '../../core/domain/stats';
import { MonthService } from '../../core/services/month.service';
import { CategoriesStore } from '../../core/state/categories.store';
import { TransactionsStore } from '../../core/state/transactions.store';
import { DateLabelPipe } from '../../shared/pipes/date-label.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { Card, CardTitle } from '../../shared/ui/card/card';
import { Donut, DonutSegment } from '../../shared/ui/donut/donut';

/** Donut des dépenses du mois par catégorie, avec légende. */
@Component({
  selector: 'app-spending-card',
  imports: [Card, CardTitle, Donut, MoneyPipe, DateLabelPipe],
  template: `
    <app-card class="@container">
      <div class="flex items-center justify-between">
        <app-card-title>Dépenses par catégorie</app-card-title>
        <span class="text-xs text-faint">{{ months.month() | dateLabel: 'month' }}</span>
      </div>
      <!-- Donut au-dessus de la légende quand la carte est étroite, côte à côte sinon. -->
      <div class="mt-3.5 flex flex-col items-center gap-4.5 @[27rem]:flex-row">
        <app-donut [segments]="segments()" label="Dépenses par catégorie">
          <span class="text-2xs text-muted">Dépensé</span>
          <span class="text-[0.9375rem] font-semibold">{{ total() | money }}</span>
        </app-donut>
        @if (segments().length) {
          <ul class="flex w-full min-w-0 flex-1 flex-col gap-2.5">
            @for (s of legend(); track s.id) {
              <li class="flex items-center gap-2 text-caption">
                <span
                  class="size-2 shrink-0 rounded-full"
                  [style.background]="s.color"
                  aria-hidden="true"
                ></span>
                <span
                  class="text-tint min-w-0 flex-1 truncate font-medium"
                  [style.--tint]="s.color"
                >
                  {{ s.label }}
                </span>
                <span class="font-semibold">{{ s.value | money }}</span>
                <span class="w-9 text-right text-xs text-muted">{{ s.share }}</span>
              </li>
            }
          </ul>
        } @else {
          <p class="text-caption text-muted">Aucune dépense ce mois-ci.</p>
        }
      </div>
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpendingCard {
  protected readonly months = inject(MonthService);
  private readonly transactions = inject(TransactionsStore);
  private readonly categories = inject(CategoriesStore);

  protected readonly segments = computed<DonutSegment[]>(() => {
    const groups = this.categories.groupById();
    return [...expensesByGroup(this.transactions.all(), this.months.month())]
      .map(([id, value]) => {
        const group = id === UNCATEGORIZED ? undefined : groups.get(id);
        return {
          id: id || 'sans-categorie',
          label: group?.name ?? 'Sans catégorie',
          color: group?.color ?? PALETTE.slate,
          value,
        };
      })
      .sort((a, b) => b.value - a.value);
  });

  protected readonly total = computed(() => this.segments().reduce((sum, s) => sum + s.value, 0));

  protected readonly legend = computed(() =>
    this.segments().map((s) => ({ ...s, share: formatPercent(ratio(s.value, this.total())) })),
  );
}
