import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SEMANTIC } from '../../core/data/palette';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { Card } from '../../shared/ui/card/card';
import { ProgressBar } from '../../shared/ui/progress-bar/progress-bar';
import { EnvelopeMenu } from './envelope-menu';
import { EnvelopeView } from './envelope-view';

/** Carte d'enveloppe (mobile) : alloué, % consommé, barre, restant ou dépassement. */
@Component({
  selector: 'app-envelope-card',
  imports: [Card, ProgressBar, EnvelopeMenu, MoneyPipe],
  template: `
    @let e = envelope();
    <app-card padding="sm" [tone]="e.over ? 'danger' : 'default'">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-tint text-[0.9375rem] font-semibold" [style.--tint]="e.color">
          {{ e.name }}
        </h3>
        <span class="-mr-1.5">
          <app-envelope-menu [name]="e.name" (edit)="edit.emit()" (remove)="remove.emit()" />
        </span>
      </div>
      <div class="mt-1.5 flex items-baseline justify-between gap-3">
        <span class="text-[1.625rem] font-semibold tracking-tight">{{ e.allocated | money }}</span>
        <span class="text-caption font-semibold" [class]="e.over ? 'text-expense' : 'text-muted'">
          {{ e.percent }}
        </span>
      </div>
      <app-progress-bar
        class="mt-3"
        [height]="6"
        [value]="e.consumed"
        [color]="e.over ? danger : primary"
        [label]="'Enveloppe ' + e.name + ' consommée'"
      />
      <div class="mt-2.5 flex justify-between gap-3 text-xs">
        <span class="text-muted">{{ e.spent | money }} dépensés</span>
        @if (e.over) {
          <span class="font-semibold text-expense">Dépassement de {{ e.overBy | money }}</span>
        } @else {
          <span class="font-medium text-ink-2">{{ e.remaining | money }} restants</span>
        }
      </div>
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnvelopeCard {
  readonly envelope = input.required<EnvelopeView>();
  readonly edit = output();
  readonly remove = output();

  protected readonly primary = SEMANTIC.primary;
  protected readonly danger = SEMANTIC.expense;
}
