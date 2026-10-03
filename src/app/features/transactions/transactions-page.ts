import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { isInMonth } from '../../core/domain/dates';
import { formatMoney } from '../../core/domain/money';
import { groupByDay, matchesFilters } from '../../core/domain/transaction-query';
import { Id, Transaction, TransactionType } from '../../core/models';
import { LayoutService } from '../../core/services/layout.service';
import { MonthService } from '../../core/services/month.service';
import { AccountsStore } from '../../core/state/accounts.store';
import { CategoriesStore } from '../../core/state/categories.store';
import { RecurringStore } from '../../core/state/recurring.store';
import { TransactionsStore } from '../../core/state/transactions.store';
import { DateLabelPipe } from '../../shared/pipes/date-label.pipe';
import { Button, IconButton } from '../../shared/ui/button/button';
import { Card } from '../../shared/ui/card/card';
import { ConfirmService } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { Icon } from '../../shared/ui/icon/icon';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { DayView, TransactionDayList } from './transaction-day-list';
import { TransactionEditor } from './transaction-editor.service';
import { TransactionFilters } from './transaction-filters';
import { TransactionTable } from './transaction-table';
import { toTransactionView } from './transaction-view';
import { UpcomingBanner } from './upcoming-banner';
import { toUpcomingView, upcomingTotal } from './upcoming-view';

@Component({
  selector: 'app-transactions-page',
  imports: [
    PageHeader,
    Card,
    EmptyState,
    Button,
    IconButton,
    Icon,
    TransactionFilters,
    TransactionDayList,
    TransactionTable,
    UpcomingBanner,
    DateLabelPipe,
  ],
  template: `
    <app-page-header title="Transactions">
      <button type="button" appButton (click)="editor.openCreate()">
        <app-icon name="add" [size]="18" />
        Ajouter
      </button>
    </app-page-header>

    <div
      class="flex h-11 items-center gap-2.5 rounded-control border border-line bg-surface pr-1.5 pl-3.5 focus-within:border-primary/60"
    >
      <app-icon name="search" [size]="18" class="text-faint" />
      <input
        #searchInput
        type="search"
        class="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
        placeholder="Rechercher une transaction, une note…"
        aria-label="Rechercher une transaction"
        enterkeyhint="search"
        [value]="search()"
        (input)="search.set(searchInput.value)"
      />
      @if (search()) {
        <button type="button" appIconButton="Effacer la recherche" (click)="search.set('')">
          <app-icon name="close" [size]="18" />
        </button>
      }
    </div>

    <app-transaction-filters
      [accounts]="accounts.accounts()"
      [groups]="categories.groups()"
      [month]="months.month()"
      (monthChange)="months.set($event)"
      [(accountId)]="accountId"
      [(groupId)]="groupId"
      [(type)]="type"
      [active]="hasFilters()"
      (reset)="resetFilters()"
    />

    @if (showUpcoming()) {
      <app-upcoming-banner
        [items]="upcoming()"
        [total]="upcomingTotal()"
        [(open)]="upcomingOpen"
        (editRule)="editor.openEditRule($event)"
      />
    }

    @if (monthCount() === 0) {
      <app-card padding="none" class="px-6 py-10">
        <app-empty-state
          icon="receipt_long"
          size="md"
          [title]="'Aucune transaction en ' + (months.month() | dateLabel: 'month').toLowerCase()"
          description="Vos entrées et sorties d’argent et vos virements s’afficheront ici, groupés par jour."
        >
          <button type="button" appButton (click)="editor.openCreate()">
            <app-icon name="add" [size]="18" />
            Ajouter une transaction
          </button>
        </app-empty-state>
      </app-card>
    } @else if (views().length === 0) {
      <app-card padding="none" class="px-6 py-10">
        <app-empty-state
          icon="search"
          size="md"
          title="Aucun résultat"
          description="Aucune transaction de ce mois ne correspond à votre recherche ou à vos filtres."
        >
          <button type="button" appButton="secondary" (click)="resetFilters()">
            Effacer les filtres
          </button>
        </app-empty-state>
      </app-card>
    } @else {
      <p class="sr-only" aria-live="polite">{{ views().length }} transactions affichées</p>
      @if (layout.isDesktop()) {
        <app-transaction-table
          [rows]="views()"
          (edit)="editor.openEdit($event)"
          (remove)="confirmRemove($event)"
        />
      } @else {
        <app-transaction-day-list
          [days]="days()"
          (edit)="editor.openEdit($event)"
          (remove)="removeWithUndo($event)"
        />
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4' },
})
export default class TransactionsPage {
  protected readonly months = inject(MonthService);
  protected readonly editor = inject(TransactionEditor);
  protected readonly layout = inject(LayoutService);
  protected readonly accounts = inject(AccountsStore);
  protected readonly categories = inject(CategoriesStore);
  private readonly transactions = inject(TransactionsStore);
  private readonly recurring = inject(RecurringStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toasts = inject(ToastService);

  protected readonly search = signal('');
  protected readonly accountId = signal<Id | null>(null);
  protected readonly groupId = signal<Id | null>(null);
  protected readonly type = signal<TransactionType | null>(null);
  protected readonly upcomingOpen = signal(true);

  protected readonly upcoming = computed(() => {
    const catalog = this.transactions.catalog();
    return this.recurring.upcoming().map((o) => toUpcomingView(o, catalog));
  });
  protected readonly upcomingTotal = computed(() => upcomingTotal(this.recurring.upcoming()));
  /** « À venir » : mois courant, sans recherche ni filtre. */
  protected readonly showUpcoming = computed(
    () => this.months.isCurrentMonth() && !this.hasFilters() && this.upcoming().length > 0,
  );

  protected readonly hasFilters = computed(
    () => !!(this.search().trim() || this.accountId() || this.groupId() || this.type()),
  );

  protected readonly monthCount = computed(
    () => this.transactions.all().filter((tx) => isInMonth(tx.date, this.months.month())).length,
  );

  private readonly filtered = computed(() => {
    const filters = {
      month: this.months.month(),
      search: this.search(),
      accountId: this.accountId(),
      groupId: this.groupId(),
      type: this.type(),
    };
    const catalog = this.transactions.catalog();
    return this.transactions.sorted().filter((tx) => matchesFilters(tx, filters, catalog));
  });

  protected readonly views = computed(() => {
    const catalog = this.transactions.catalog();
    return this.filtered().map((tx) => toTransactionView(tx, catalog));
  });

  protected readonly days = computed<DayView[]>(() => {
    const byId = new Map(this.views().map((v) => [v.id, v]));
    return groupByDay(this.filtered()).map((day) => ({
      date: day.date,
      total: day.total,
      items: day.transactions.map((tx) => byId.get(tx.id)!),
    }));
  });

  protected resetFilters(): void {
    this.search.set('');
    this.accountId.set(null);
    this.groupId.set(null);
    this.type.set(null);
  }

  protected removeWithUndo(tx: Transaction): void {
    const removed = this.transactions.remove(tx.id);
    if (removed) {
      this.toasts.show('Transaction supprimée', {
        actionLabel: 'Annuler',
        action: () => this.transactions.restore(removed),
      });
    }
  }

  protected async confirmRemove(tx: Transaction): Promise<void> {
    const view = toTransactionView(tx, this.transactions.catalog());
    const confirmed = await this.confirm.ask({
      title: 'Supprimer la transaction ?',
      message:
        `« ${view.title} » (${formatMoney(view.amount, view.sign)}) sera supprimée.` +
        (tx.recurringRuleId ? ' Cette échéance ne sera pas recréée par sa récurrence.' : ''),
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (confirmed) this.removeWithUndo(tx);
  }
}
