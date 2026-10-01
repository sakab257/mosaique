import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SEMANTIC } from '../../core/data/palette';
import { BudgetSummary } from '../../core/domain/budget';
import { formatPercent } from '../../core/domain/money';
import { MonthKey } from '../../core/models';
import { DateLabelPipe } from '../../shared/pipes/date-label.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { Card, CardTitle } from '../../shared/ui/card/card';
import { Chip } from '../../shared/ui/chip/chip';
import { EnvelopeView } from './envelope-view';

/** Budget total du mois : alloué, barre mosaïque des enveloppes, dépensé / restant. */
@Component({
  selector: 'app-budget-total-card',
  imports: [RouterLink, Card, CardTitle, Chip, MoneyPipe, DateLabelPipe],
  template: `
    @let b = summary();
    <app-card padding="lg" [tone]="b.over ? 'danger' : 'default'">
      <div class="flex items-center justify-between gap-3">
        <app-card-title>Budget total du mois · {{ month() | dateLabel: 'month' }}</app-card-title>
        <span
          appChip
          size="sm"
          [selected]="true"
          [color]="b.over ? danger : primary"
          class="h-6! font-semibold"
        >
          {{ consumedLabel() }} consommé
        </span>
      </div>
      <p class="mt-2 text-display font-semibold">{{ b.allocated | money }}</p>
      <p class="mt-0.5 text-xs text-muted">
        @if (b.income > 0) {
          {{ shareLabel() }}
          {{
            b.incomeSource === 'reference' ? 'de votre revenu de référence' : 'des revenus du mois'
          }}
          ({{ b.income | money }}) · {{ envelopes().length }} enveloppe{{
            envelopes().length > 1 ? 's' : ''
          }}
        } @else {
          Aucun revenu connu ce mois-ci ·
          <a routerLink="/parametres" class="text-primary-soft hover:underline"
            >définir un revenu de référence</a
          >
        }
      </p>

      <div class="mt-4.5 flex h-3 gap-1" aria-hidden="true">
        @for (e of envelopes(); track e.id) {
          <div
            class="min-w-1.5 overflow-hidden rounded-md"
            [style.flex]="e.allocated + ' 1 0'"
            [style.background]="'color-mix(in srgb, ' + e.color + ' 15%, transparent)'"
          >
            <div
              class="h-full rounded-md"
              [style.width.%]="e.consumed > 1 ? 100 : e.consumed * 100"
              [style.background]="e.stateColor"
            ></div>
          </div>
        }
        @if (b.unallocated > 0) {
          <div
            class="rounded-md border border-dashed border-line-dashed"
            [style.flex]="b.unallocated + ' 1 0'"
          ></div>
        }
      </div>
      <div class="mt-2 flex justify-between text-xs text-muted">
        <span>Alloué {{ b.allocated | money }}</span>
        <span>Non alloué {{ b.unallocated | money }}</span>
      </div>

      <dl class="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3.5">
        <div>
          <dt class="text-xs text-muted">Dépensé</dt>
          <dd class="mt-0.5 text-[1.0625rem] font-semibold">{{ b.spent | money }}</dd>
        </div>
        <div>
          <dt class="text-xs text-muted">{{ b.over ? 'Dépassement' : 'Restant' }}</dt>
          <dd class="mt-0.5 text-[1.0625rem] font-semibold" [class.text-expense]="b.over">
            {{ (b.over ? b.overBy : b.remaining) | money }}
          </dd>
        </div>
      </dl>
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetTotalCard {
  readonly summary = input.required<BudgetSummary>();
  readonly envelopes = input.required<readonly EnvelopeView[]>();
  readonly month = input.required<MonthKey>();

  protected readonly primary = SEMANTIC.primary;
  protected readonly danger = SEMANTIC.expense;
  protected readonly consumedLabel = computed(() => formatPercent(this.summary().consumed));
  protected readonly shareLabel = computed(() => formatPercent(this.summary().allocatedShare));
}
