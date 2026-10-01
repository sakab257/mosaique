import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { Cents, IsoDate, Transaction } from '../../core/models';
import { DateLabelPipe } from '../../shared/pipes/date-label.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { SwipeRow } from '../../shared/ui/swipe-row/swipe-row';
import { TransactionRow } from './transaction-row';
import { TransactionView } from './transaction-view';

export interface DayView {
  date: IsoDate;
  total: Cents;
  items: TransactionView[];
}

/** Liste mobile groupée par jour ; balayage vers la gauche pour supprimer. */
@Component({
  selector: 'app-transaction-day-list',
  imports: [SwipeRow, TransactionRow, MoneyPipe, DateLabelPipe],
  template: `
    @for (day of days(); track day.date) {
      <section class="flex flex-col gap-2" [attr.aria-labelledby]="'jour-' + day.date">
        <header class="flex justify-between gap-3 px-1 pt-1 text-xs text-muted">
          <h2 class="font-medium" [id]="'jour-' + day.date">{{ day.date | dateLabel: 'day' }}</h2>
          <span>{{ day.total | money: 'always' }}</span>
        </header>
        <ul class="flex flex-col gap-px overflow-hidden rounded-card border border-line bg-line">
          @for (t of day.items; track t.id) {
            <li>
              <app-swipe-row
                [open]="openId() === t.id"
                (openChange)="openId.set($event ? t.id : null)"
                (action)="remove.emit(t.tx)"
              >
                <button
                  type="button"
                  class="block w-full px-3.5 py-3 focus-visible:-outline-offset-2"
                  (click)="edit.emit(t.tx)"
                >
                  <app-transaction-row [view]="t" />
                </button>
              </app-swipe-row>
            </li>
          }
        </ul>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4' },
})
export class TransactionDayList {
  readonly days = input.required<readonly DayView[]>();
  readonly edit = output<Transaction>();
  readonly remove = output<Transaction>();

  /** Une seule ligne ouverte à la fois. */
  protected readonly openId = signal<string | null>(null);
}
