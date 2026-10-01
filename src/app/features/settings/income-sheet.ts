import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { formatAmountInput, parseAmount } from '../../core/domain/money';
import { BudgetStore } from '../../core/state/budget.store';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { Sheet } from '../../shared/ui/sheet/sheet';
import { ToastService } from '../../shared/ui/toast/toast.service';
import {
  AMOUNT_MESSAGES,
  amountValidator,
} from '../transactions/transaction-form/transaction-form.validators';

/** Saisie du revenu mensuel de référence (base des enveloppes). */
@Component({
  selector: 'app-income-sheet',
  imports: [ReactiveFormsModule, Sheet, Button, Icon],
  template: `
    <app-sheet title="Revenu mensuel de référence">
      <form class="flex flex-col gap-4" (ngSubmit)="save()" novalidate>
        <label class="flex flex-col items-center gap-1 py-2">
          <span class="text-xs text-muted">Montant net par mois</span>
          <span class="flex items-baseline gap-1 text-amount font-semibold">
            <input
              [formControl]="amount"
              inputmode="decimal"
              autocomplete="off"
              placeholder="0,00"
              cdkFocusInitial
              size="1"
              class="w-[6ch] min-w-0 border-b-2 border-transparent bg-transparent text-center outline-none placeholder:text-faint focus:border-primary"
              [attr.aria-invalid]="error() ? true : null"
              aria-describedby="income-help"
            />
            <span aria-hidden="true">€</span>
          </span>
        </label>
        @if (error(); as message) {
          <p class="-mt-2 text-center text-caption text-expense" role="alert">{{ message }}</p>
        }
        <p
          id="income-help"
          class="flex items-start gap-2.5 rounded-item bg-primary/12 px-3 py-2.5 text-caption leading-snug text-primary-ink"
        >
          <app-icon name="info" [size]="16" class="mt-px" />
          Les enveloppes en pourcentage sont calculées sur ce montant. Sans revenu de référence,
          elles se basent sur les revenus réellement perçus dans le mois.
        </p>
        <button type="submit" appButton size="lg" block>Enregistrer</button>
        @if (hasReference) {
          <button type="button" appButton="secondary" size="lg" block (click)="clear()">
            Utiliser les revenus réels du mois
          </button>
        }
      </form>
    </app-sheet>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeSheet {
  private readonly budget = inject(BudgetStore);
  private readonly ref = inject(DialogRef);
  private readonly toasts = inject(ToastService);

  private readonly current = this.budget.settings().monthlyIncomeReference;
  protected readonly hasReference = this.current !== undefined;
  protected readonly amount = new FormControl(
    this.current !== undefined ? formatAmountInput(this.current) : '',
    { nonNullable: true, validators: [amountValidator] },
  );
  protected readonly error = signal<string | null>(null);

  protected save(): void {
    const key = Object.keys(this.amount.errors ?? {})[0];
    if (key) {
      this.error.set(AMOUNT_MESSAGES[key]);
      return;
    }
    this.budget.setIncomeReference(parseAmount(this.amount.value)!);
    this.toasts.show('Revenu de référence enregistré');
    this.ref.close(true);
  }

  protected clear(): void {
    this.budget.setIncomeReference(undefined);
    this.toasts.show('Les enveloppes utilisent désormais les revenus réels du mois');
    this.ref.close(true);
  }
}
