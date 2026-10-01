import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-4.5',
  lg: 'p-5',
};

/** Surface de base (#141519, rayon 20 px). `tone="danger"` pour les états de dépassement. */
@Component({
  selector: 'app-card',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class Card {
  readonly padding = input<CardPadding>('md');
  readonly tone = input<'default' | 'danger'>('default');

  protected readonly classes = computed(
    () =>
      `block min-w-0 rounded-card border bg-surface ${PADDING[this.padding()]} ` +
      (this.tone() === 'danger' ? 'border-expense/40' : 'border-line'),
  );
}

/** Libellé de carte (« Solde total », « Budget du mois »…). */
@Component({
  selector: 'app-card-title',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'text-caption font-medium text-muted' },
})
export class CardTitle {}
