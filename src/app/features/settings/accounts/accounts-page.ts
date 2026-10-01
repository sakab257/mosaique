import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ACCOUNT_TYPE_DESCRIPTIONS, ACCOUNT_TYPE_ICONS, Account } from '../../../core/models';
import { AccountsStore } from '../../../core/state/accounts.store';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { Button, IconButton } from '../../../shared/ui/button/button';
import { Card } from '../../../shared/ui/card/card';
import { Icon } from '../../../shared/ui/icon/icon';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { SheetService } from '../../../shared/ui/sheet/sheet.service';
import { AccountEditorData, AccountEditorSheet } from './account-editor-sheet';

@Component({
  selector: 'app-accounts-page',
  imports: [PageHeader, Card, Icon, Button, IconButton, MoneyPipe],
  template: `
    <app-page-header title="Comptes" backLink="/parametres">
      <button type="button" appButton (click)="open()">
        <app-icon name="add" [size]="18" />
        Compte
      </button>
    </app-page-header>
    <p class="text-caption text-pretty text-muted">
      Le solde initial est le point de départ du calcul : solde actuel = solde initial + revenus −
      dépenses ± virements.
    </p>

    <ul class="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-4">
      @for (row of rows(); track row.account.id) {
        <li>
          <app-card padding="sm">
            <div class="flex items-center gap-3">
              <span
                class="flex size-11 items-center justify-center rounded-control bg-primary/16 text-primary-soft"
                aria-hidden="true"
              >
                <app-icon [name]="row.icon" [size]="20" />
              </span>
              <div class="min-w-0 flex-1">
                <h2 class="truncate text-[0.9375rem] font-semibold">{{ row.account.name }}</h2>
                <p class="text-xs text-muted">{{ row.description }}</p>
              </div>
              <button
                type="button"
                [appIconButton]="'Modifier le compte ' + row.account.name"
                (click)="open(row.account)"
              >
                <app-icon name="edit" [size]="18" />
              </button>
            </div>
            <dl class="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3.5">
              <div>
                <dt class="text-xs text-muted">Solde initial</dt>
                <dd class="mt-0.5 font-semibold">{{ row.account.initialBalance | money }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted">Solde actuel</dt>
                <dd class="mt-0.5 text-base font-semibold" [class.text-expense]="row.balance < 0">
                  {{ row.balance | money }}
                </dd>
              </div>
            </dl>
          </app-card>
        </li>
      }
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4' },
})
export default class AccountsPage {
  private readonly accounts = inject(AccountsStore);
  private readonly sheets = inject(SheetService);

  protected readonly rows = computed(() =>
    this.accounts.accounts().map((account) => ({
      account,
      icon: ACCOUNT_TYPE_ICONS[account.type],
      description: ACCOUNT_TYPE_DESCRIPTIONS[account.type],
      balance: this.accounts.balanceOf(account.id),
    })),
  );

  protected open(account?: Account): void {
    this.sheets.open<AccountEditorSheet, AccountEditorData>(AccountEditorSheet, {
      ariaLabel: account ? `Modifier le compte ${account.name}` : 'Nouveau compte',
      data: { account },
    });
  }
}
