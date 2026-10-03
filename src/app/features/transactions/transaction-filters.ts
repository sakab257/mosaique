import { CdkMenu, CdkMenuGroup, CdkMenuItemRadio, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { Account, CategoryGroup, Id, MonthKey, TransactionType } from '../../core/models';
import { Chip } from '../../shared/ui/chip/chip';
import { Icon } from '../../shared/ui/icon/icon';
import { IconNamePipe } from '../../shared/ui/icon/icon-name.pipe';
import { MonthSwitcher } from '../../shared/ui/month-switcher/month-switcher';

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Sorties d’argent' },
  { value: 'income', label: 'Entrées d’argent' },
  { value: 'transfer', label: 'Virements' },
];

/** Barre de filtres : période (mois), compte, catégorie, type. Défile horizontalement sur mobile. */
@Component({
  selector: 'app-transaction-filters',
  imports: [
    CdkMenu,
    CdkMenuGroup,
    CdkMenuItemRadio,
    CdkMenuTrigger,
    Chip,
    Icon,
    IconNamePipe,
    MonthSwitcher,
  ],
  template: `
    <app-month-switcher appearance="accent" [(month)]="month" />

    <button
      type="button"
      appChip
      variant="outline"
      size="lg"
      [toggle]="false"
      [selected]="!!accountId()"
      [cdkMenuTriggerFor]="accountMenu"
    >
      <app-icon name="account_balance_wallet" [size]="16" />
      {{ accountLabel() }}
      <app-icon name="expand_more" [size]="16" class="opacity-60" />
    </button>
    <ng-template #accountMenu>
      <div cdkMenu class="menu-panel">
        <div cdkMenuGroup>
          <button
            cdkMenuItemRadio
            class="menu-item"
            [cdkMenuItemChecked]="!accountId()"
            (cdkMenuItemTriggered)="accountId.set(null)"
          >
            Tous les comptes
            @if (!accountId()) {
              <app-icon name="check" [size]="18" class="ml-auto text-primary-soft!" />
            }
          </button>
          @for (account of accounts(); track account.id) {
            <button
              cdkMenuItemRadio
              class="menu-item"
              [cdkMenuItemChecked]="accountId() === account.id"
              (cdkMenuItemTriggered)="accountId.set(account.id)"
            >
              {{ account.name }}
              @if (accountId() === account.id) {
                <app-icon name="check" [size]="18" class="ml-auto text-primary-soft!" />
              }
            </button>
          }
        </div>
      </div>
    </ng-template>

    <button
      type="button"
      appChip
      variant="outline"
      size="lg"
      [toggle]="false"
      [selected]="!!groupId()"
      [cdkMenuTriggerFor]="groupMenu"
    >
      <app-icon name="sell" [size]="16" />
      {{ groupLabel() }}
      <app-icon name="expand_more" [size]="16" class="opacity-60" />
    </button>
    <ng-template #groupMenu>
      <div cdkMenu class="menu-panel max-h-80 overflow-y-auto">
        <div cdkMenuGroup>
          <button
            cdkMenuItemRadio
            class="menu-item"
            [cdkMenuItemChecked]="!groupId()"
            (cdkMenuItemTriggered)="groupId.set(null)"
          >
            Toutes les catégories
            @if (!groupId()) {
              <app-icon name="check" [size]="18" class="ml-auto text-primary-soft!" />
            }
          </button>
          @for (group of groups(); track group.id) {
            <button
              cdkMenuItemRadio
              class="menu-item"
              [cdkMenuItemChecked]="groupId() === group.id"
              (cdkMenuItemTriggered)="groupId.set(group.id)"
            >
              <app-icon
                [name]="group.icon | iconName"
                [size]="18"
                class="text-tint!"
                [style.--tint]="group.color"
              />
              {{ group.name }}
              @if (groupId() === group.id) {
                <app-icon name="check" [size]="18" class="ml-auto text-primary-soft!" />
              }
            </button>
          }
        </div>
      </div>
    </ng-template>

    <button
      type="button"
      appChip
      variant="outline"
      size="lg"
      [toggle]="false"
      [selected]="!!type()"
      [cdkMenuTriggerFor]="typeMenu"
    >
      <app-icon name="swap_vert" [size]="16" />
      {{ typeLabel() }}
      <app-icon name="expand_more" [size]="16" class="opacity-60" />
    </button>
    <ng-template #typeMenu>
      <div cdkMenu class="menu-panel">
        <div cdkMenuGroup>
          <button
            cdkMenuItemRadio
            class="menu-item"
            [cdkMenuItemChecked]="!type()"
            (cdkMenuItemTriggered)="type.set(null)"
          >
            Tous les types
            @if (!type()) {
              <app-icon name="check" [size]="18" class="ml-auto text-primary-soft!" />
            }
          </button>
          @for (option of typeOptions; track option.value) {
            <button
              cdkMenuItemRadio
              class="menu-item"
              [cdkMenuItemChecked]="type() === option.value"
              (cdkMenuItemTriggered)="type.set(option.value)"
            >
              {{ option.label }}
              @if (type() === option.value) {
                <app-icon name="check" [size]="18" class="ml-auto text-primary-soft!" />
              }
            </button>
          }
        </div>
      </div>
    </ng-template>

    @if (active()) {
      <button type="button" appChip size="lg" [toggle]="false" (click)="reset.emit()">
        <app-icon name="close" [size]="16" />
        Effacer les filtres
      </button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0',
    role: 'group',
    'aria-label': 'Filtres',
  },
})
export class TransactionFilters {
  readonly accounts = input.required<readonly Account[]>();
  readonly groups = input.required<readonly CategoryGroup[]>();
  readonly month = model.required<MonthKey>();
  readonly accountId = model<Id | null>(null);
  readonly groupId = model<Id | null>(null);
  readonly type = model<TransactionType | null>(null);
  /** Au moins un filtre (hors période) ou une recherche est actif. */
  readonly active = input(false);
  readonly reset = output();

  protected readonly typeOptions = TYPE_OPTIONS;

  protected readonly accountLabel = computed(
    () => this.accounts().find((a) => a.id === this.accountId())?.name ?? 'Tous les comptes',
  );
  protected readonly groupLabel = computed(
    () => this.groups().find((g) => g.id === this.groupId())?.name ?? 'Toutes les catégories',
  );
  protected readonly typeLabel = computed(
    () => TYPE_OPTIONS.find((o) => o.value === this.type())?.label ?? 'Tous les types',
  );
}
