import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SEMANTIC } from '../../core/data/palette';
import { daysLeftInMonth } from '../../core/domain/dates';
import { formatPercent } from '../../core/domain/money';
import { ClockService } from '../../core/services/clock.service';
import { MonthService } from '../../core/services/month.service';
import { BudgetStore } from '../../core/state/budget.store';
import { MoneyPipe, RatioPercentPipe } from '../../shared/pipes/money.pipe';
import { Button } from '../../shared/ui/button/button';
import { Card, CardTitle } from '../../shared/ui/card/card';
import { Chip } from '../../shared/ui/chip/chip';
import { Icon } from '../../shared/ui/icon/icon';
import { IconNamePipe } from '../../shared/ui/icon/icon-name.pipe';
import { ProgressBar } from '../../shared/ui/progress-bar/progress-bar';

/** « Budget du mois » : reste à dépenser, barre, enveloppes les plus consommées. */
@Component({
  selector: 'app-budget-card',
  imports: [
    RouterLink,
    Card,
    CardTitle,
    Chip,
    Icon,
    IconNamePipe,
    ProgressBar,
    Button,
    MoneyPipe,
    RatioPercentPipe,
  ],
  template: `
    @let b = budget.summary();
    <app-card [tone]="b.over ? 'danger' : 'default'">
      <div class="flex items-center justify-between">
        <app-card-title>Budget du mois</app-card-title>
        @if (b.envelopes.length) {
          <span
            appChip
            size="sm"
            tinted
            [selected]="true"
            [color]="color()"
            class="h-6! font-semibold"
          >
            {{ b.consumed | ratioPercent }}
          </span>
        }
      </div>

      @if (b.envelopes.length) {
        <p class="mt-2.5 text-xs text-muted">{{ b.over ? 'Dépassement' : 'Reste à dépenser' }}</p>
        <p class="mt-0.5 text-[1.75rem] font-semibold tracking-tight" [class.text-expense]="b.over">
          {{ (b.over ? b.overBy : b.remaining) | money }}
        </p>
        <p class="mt-0.5 text-xs text-muted">sur {{ b.allocated | money }} · {{ periodLabel() }}</p>
        <app-progress-bar
          class="mt-3.5"
          [value]="b.consumed"
          [color]="color()"
          label="Budget du mois consommé"
        />
        @if (b.over) {
          <p
            class="mt-3 flex items-center gap-2 rounded-item bg-expense/12 px-2.5 py-2 text-caption font-medium text-expense"
            role="status"
          >
            <app-icon name="error" [size]="16" />
            Dépassement de {{ b.overBy | money }} sur le budget total
          </p>
        }
        <p class="mt-3.5 text-xs text-muted">Enveloppes les plus consommées</p>
        <ul class="mt-2 flex flex-wrap gap-1.5">
          @for (e of top(); track e.envelope.id) {
            <li>
              <span appChip size="sm" [selected]="true" [color]="e.color">
                <app-icon [name]="e.icon | iconName" [size]="14" />
                {{ e.name }} {{ e.percent }}
              </span>
            </li>
          }
        </ul>
      } @else {
        <p class="mt-2 text-caption leading-relaxed text-muted">
          Répartissez votre revenu en enveloppes pour suivre ce qu’il vous reste à dépenser.
        </p>
        <a
          appButton="secondary"
          size="sm"
          class="mt-3"
          routerLink="/budget"
          queryParamsHandling="preserve"
        >
          <app-icon name="add" [size]="16" />
          Créer une enveloppe
        </a>
      }
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetCard {
  protected readonly budget = inject(BudgetStore);
  private readonly months = inject(MonthService);
  private readonly clock = inject(ClockService);

  protected readonly color = computed(() =>
    this.budget.summary().over ? SEMANTIC.expense : SEMANTIC.primary,
  );

  protected readonly periodLabel = computed(() => {
    const month = this.months.month();
    const current = this.clock.currentMonth();
    if (month < current) return 'mois terminé';
    if (month > current) return 'mois à venir';
    const days = daysLeftInMonth(this.clock.today());
    return `${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`;
  });

  protected readonly top = computed(() =>
    [...this.budget.summary().envelopes]
      .sort((a, b) => b.consumed - a.consumed)
      .slice(0, 3)
      .map((e) => ({
        ...e,
        name: e.group?.name ?? 'Catégorie supprimée',
        icon: e.group?.icon ?? 'more_horiz',
        color: e.over ? SEMANTIC.expense : (e.group?.color ?? SEMANTIC.primary),
        percent: Number.isFinite(e.consumed) ? formatPercent(e.consumed) : '—',
      })),
  );
}
