import { formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
  input,
  model,
} from '@angular/core';
import { addMonths, toDate } from '../../../core/domain/dates';
import { MonthKey } from '../../../core/models';
import { IconButton } from '../button/button';
import { Icon } from '../icon/icon';

export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('fr-FR') + text.slice(1);
}

/** Sélecteur « ‹ Août 2026 › ». */
@Component({
  selector: 'app-month-switcher',
  imports: [Icon, IconButton],
  template: `
    <button type="button" appIconButton="Mois précédent" class="rounded-full!" (click)="shift(-1)">
      <app-icon name="chevron_left" />
    </button>
    <span class="min-w-24 px-1 text-center font-semibold" aria-live="polite">{{ label() }}</span>
    <button type="button" appIconButton="Mois suivant" class="rounded-full!" (click)="shift(1)">
      <app-icon name="chevron_right" />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses()',
    role: 'group',
    'aria-label': 'Mois affiché',
  },
})
export class MonthSwitcher {
  readonly month = model.required<MonthKey>();
  /** `accent` : version pastille violette (filtre de période). */
  readonly appearance = input<'pill' | 'accent'>('pill');

  protected readonly hostClasses = computed(
    () =>
      'inline-flex shrink-0 items-center gap-0.5 rounded-full border px-[3px] ' +
      (this.appearance() === 'accent'
        ? 'h-9 border-primary/40 bg-primary/16 text-primary-ink [&_button]:size-7 [&_button]:text-primary-ink'
        : 'h-[38px] border-line bg-surface'),
  );

  private readonly locale = inject(LOCALE_ID);
  protected readonly label = computed(() =>
    capitalize(formatDate(toDate(`${this.month()}-01`), 'MMMM y', this.locale)),
  );

  protected shift(delta: number): void {
    this.month.set(addMonths(this.month(), delta));
  }
}
