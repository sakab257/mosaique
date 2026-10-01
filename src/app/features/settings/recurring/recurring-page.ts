import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, LOCALE_ID, computed, inject } from '@angular/core';
import { frequencyLine } from '../../../core/domain/recurrence-format';
import { IsoDate, RecurringRule } from '../../../core/models';
import { RecurringStore } from '../../../core/state/recurring.store';
import { TransactionsStore } from '../../../core/state/transactions.store';
import { formatDateLabel } from '../../../shared/pipes/date-label.pipe';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { Button, IconButton } from '../../../shared/ui/button/button';
import { Card } from '../../../shared/ui/card/card';
import { CategoryAvatar } from '../../../shared/ui/category-avatar/category-avatar';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../shared/ui/icon/icon';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Toggle } from '../../../shared/ui/toggle/toggle';
import { RuleActions } from '../../transactions/rule-actions.service';
import { TransactionEditor } from '../../transactions/transaction-editor.service';
import { TransactionView, toTransactionView } from '../../transactions/transaction-view';
import { transactionFromRule } from '../../../core/domain/recurrence';

interface RuleView {
  rule: RecurringRule;
  view: TransactionView;
  frequency: string;
  next: IsoDate | null;
  status: string;
  statusClass: string;
}

@Component({
  selector: 'app-recurring-page',
  imports: [
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    PageHeader,
    Card,
    EmptyState,
    CategoryAvatar,
    Toggle,
    Icon,
    Button,
    IconButton,
    MoneyPipe,
  ],
  template: `
    <app-page-header title="Transactions récurrentes" backLink="/parametres" />

    @if (rows().length) {
      <p class="text-caption text-muted">{{ summary() }}</p>
      <ul class="grid grid-cols-[repeat(auto-fill,minmax(min(420px,100%),1fr))] gap-x-4 gap-y-2">
        @for (row of rows(); track row.rule.id) {
          <li
            class="relative flex items-center gap-3 rounded-card border border-line bg-surface py-3 pr-3 pl-3.5 transition-colors hover:bg-surface-hover"
          >
            <button
              type="button"
              class="absolute inset-0 rounded-card focus-visible:-outline-offset-2"
              [attr.aria-label]="'Modifier la récurrence ' + row.view.title"
              (click)="editor.openEditRule(row.rule)"
            ></button>
            <app-category-avatar
              [icon]="row.view.icon"
              [color]="row.view.color"
              [class.opacity-45]="!row.rule.active"
            />
            <div class="min-w-0 flex-1" [class.opacity-45]="!row.rule.active">
              <p class="truncate font-medium">{{ row.view.title }}</p>
              <p class="mt-0.5 truncate text-xs text-muted">
                {{ row.frequency }} · {{ row.view.account }}
              </p>
              <p class="mt-0.5 text-xs" [class]="row.statusClass">{{ row.status }}</p>
            </div>
            <div class="relative flex flex-col items-end gap-2">
              <span
                class="font-semibold"
                [class]="row.view.amountClass"
                [class.opacity-45]="!row.rule.active"
              >
                {{ row.view.amount | money: row.view.sign }}
              </span>
              <div class="flex items-center gap-1">
                <app-toggle
                  [checked]="row.rule.active"
                  [label]="(row.rule.active ? 'Mettre en pause ' : 'Réactiver ') + row.view.title"
                  (checkedChange)="actions.toggleActive(row.rule)"
                />
                <button
                  type="button"
                  [appIconButton]="'Actions pour ' + row.view.title"
                  size="sm"
                  [cdkMenuTriggerFor]="menu"
                >
                  <app-icon name="more_vert" [size]="18" />
                </button>
                <ng-template #menu>
                  <div cdkMenu class="menu-panel">
                    <button
                      cdkMenuItem
                      class="menu-item"
                      (cdkMenuItemTriggered)="editor.openEditRule(row.rule)"
                    >
                      <app-icon name="edit" [size]="18" />
                      Modifier
                    </button>
                    <button
                      cdkMenuItem
                      class="menu-item"
                      (cdkMenuItemTriggered)="actions.toggleActive(row.rule)"
                    >
                      <app-icon [name]="row.rule.active ? 'pause' : 'play_arrow'" [size]="18" />
                      {{ row.rule.active ? 'Mettre en pause' : 'Réactiver' }}
                    </button>
                    <button
                      cdkMenuItem
                      class="menu-item menu-item--danger"
                      (cdkMenuItemTriggered)="actions.delete(row.rule)"
                    >
                      <app-icon name="delete" [size]="18" />
                      Supprimer
                    </button>
                  </div>
                </ng-template>
              </div>
            </div>
          </li>
        }
      </ul>
      <button
        type="button"
        appButton="outline"
        size="lg"
        class="h-12! w-full max-w-105 rounded-control!"
        (click)="editor.openCreateRule()"
      >
        <app-icon name="add" [size]="18" />
        Ajouter une récurrence
      </button>
    } @else {
      <app-card padding="none" class="max-w-140 px-6 py-10">
        <app-empty-state
          icon="autorenew"
          title="Aucune transaction récurrente"
          description="Automatisez le loyer, les abonnements, le salaire ou l’épargne : chaque échéance apparaîtra dans « À venir » avant d’être enregistrée."
        >
          <button type="button" appButton class="h-11!" (click)="editor.openCreateRule()">
            <app-icon name="add" [size]="18" />
            Ajouter une récurrence
          </button>
        </app-empty-state>
      </app-card>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4' },
})
export default class RecurringPage {
  protected readonly editor = inject(TransactionEditor);
  protected readonly actions = inject(RuleActions);
  private readonly recurring = inject(RecurringStore);
  private readonly transactions = inject(TransactionsStore);
  private readonly locale = inject(LOCALE_ID);

  protected readonly rows = computed<RuleView[]>(() => {
    const catalog = this.transactions.catalog();
    const nextDates = this.recurring.nextDates();
    return this.recurring
      .rules()
      .map((rule) => {
        const next = nextDates.get(rule.id) ?? null;
        const view = toTransactionView(
          transactionFromRule(rule, next ?? rule.startDate.slice(0, 10), rule.id),
          catalog,
        );
        const [status, statusClass] = !rule.active
          ? ['En pause', 'text-warning']
          : next
            ? [`Prochaine : ${formatDateLabel(next, 'short', this.locale)}`, 'text-primary-soft']
            : ['Terminée', 'text-muted'];
        return {
          rule,
          view,
          frequency: frequencyLine(rule.frequency, rule.startDate),
          next,
          status,
          statusClass,
        };
      })
      .sort(
        (a, b) =>
          Number(b.rule.active) - Number(a.rule.active) ||
          (a.next ?? '9999').localeCompare(b.next ?? '9999'),
      );
  });

  protected readonly summary = computed(() => {
    const rows = this.rows();
    const active = rows.filter((r) => r.rule.active);
    const next = active
      .map((r) => r.next)
      .filter((d): d is IsoDate => !!d)
      .sort()[0];
    const parts = [
      `${rows.length} règle${rows.length > 1 ? 's' : ''}`,
      `${active.length} active${active.length > 1 ? 's' : ''}`,
    ];
    if (next) parts.push(`prochaine échéance le ${formatDateLabel(next, 'short', this.locale)}`);
    return parts.join(' · ');
  });
}
