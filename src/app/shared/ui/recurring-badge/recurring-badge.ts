import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../icon/icon';

/** Badge ↻ des transactions issues d'une règle récurrente. */
@Component({
  selector: 'app-recurring-badge',
  imports: [Icon],
  template: '<app-icon name="autorenew" [size]="12" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'inline-flex size-[18px] shrink-0 items-center justify-center rounded-badge bg-primary/18 text-primary-soft',
    role: 'img',
    'aria-label': 'Transaction récurrente',
    title: 'Transaction récurrente',
  },
})
export class RecurringBadge {}
