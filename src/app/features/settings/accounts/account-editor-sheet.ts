import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PALETTE } from '../../../core/data/palette';
import { formatAmountInput, formatMoney, parseSignedAmount } from '../../../core/domain/money';
import { ACCOUNT_TYPE_ICONS, Account, AccountType } from '../../../core/models';
import { AccountsStore } from '../../../core/state/accounts.store';
import { Button } from '../../../shared/ui/button/button';
import { ConfirmService } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../../shared/ui/icon/icon';
import { SegmentOption, Segmented } from '../../../shared/ui/segmented/segmented';
import { Sheet } from '../../../shared/ui/sheet/sheet';
import { ToastService } from '../../../shared/ui/toast/toast.service';

export interface AccountEditorData {
  account?: Account;
}

const TYPE_OPTIONS: readonly SegmentOption<AccountType>[] = [
  { value: 'cash', label: 'Espèces', icon: ACCOUNT_TYPE_ICONS.cash },
  { value: 'card', label: 'Carte', icon: ACCOUNT_TYPE_ICONS.card },
  { value: 'bank', label: 'Banque', icon: ACCOUNT_TYPE_ICONS.bank },
];

/** Création / modification d'un compte : nom, type et solde initial. */
@Component({
  selector: 'app-account-editor-sheet',
  imports: [Sheet, Segmented, Icon, Button],
  template: `
    <app-sheet [title]="editing ? 'Modifier le compte' : 'Nouveau compte'">
      <form class="flex flex-col gap-4" (submit)="save($event)" novalidate>
        <div class="flex flex-col gap-px overflow-hidden rounded-field bg-line">
          <label class="block bg-surface-2 px-3.5 py-3">
            <span class="block text-xs text-muted">Nom du compte</span>
            <input
              #nameInput
              class="mt-0.5 block w-full bg-transparent font-medium outline-none placeholder:font-normal placeholder:text-faint"
              placeholder="Ex. : Livret A"
              maxlength="40"
              autocomplete="off"
              [value]="name()"
              [attr.aria-invalid]="errors().name ? true : null"
              (input)="name.set(nameInput.value)"
            />
          </label>
          <div class="flex flex-col gap-2.5 bg-surface-2 px-3.5 py-3">
            <span class="text-xs text-muted">Type</span>
            <app-segmented
              label="Type de compte"
              [options]="typeOptions"
              [value]="type()"
              (valueChange)="type.set($event!)"
            />
          </div>
          <label class="block bg-surface-2 px-3.5 py-3">
            <span class="block text-xs text-muted">Solde initial</span>
            <span class="mt-1 flex items-baseline gap-1 text-2xl font-semibold">
              <input
                #balanceInput
                class="w-full min-w-0 bg-transparent outline-none placeholder:text-faint"
                inputmode="decimal"
                placeholder="0,00"
                autocomplete="off"
                [value]="initial()"
                [attr.aria-invalid]="errors().initial ? true : null"
                (input)="initial.set(balanceInput.value)"
              />
              <span aria-hidden="true">€</span>
            </span>
          </label>
        </div>

        @if (errors().name || errors().initial) {
          <ul class="flex flex-col gap-1 text-caption text-expense" role="alert">
            @if (errors().name) {
              <li>{{ errors().name }}</li>
            }
            @if (errors().initial) {
              <li>{{ errors().initial }}</li>
            }
          </ul>
        }

        @if (editing && preview(); as balance) {
          <p
            class="flex items-start gap-2.5 rounded-item bg-primary/12 px-3 py-2.5 text-caption leading-snug text-primary-ink"
          >
            <app-icon name="info" [size]="16" class="mt-px" />
            Modifier le solde initial recalcule le solde actuel : {{ balance }} aujourd’hui.
          </p>
        }

        <button type="submit" appButton size="lg" block>
          {{ editing ? 'Enregistrer' : 'Créer le compte' }}
        </button>
        @if (editing) {
          <button type="button" appButton="danger-ghost" block class="-mt-2" (click)="delete()">
            Supprimer le compte
          </button>
        }
      </form>
    </app-sheet>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountEditorSheet {
  private readonly data = inject<AccountEditorData | null>(DIALOG_DATA, { optional: true }) ?? {};
  private readonly ref = inject(DialogRef);
  private readonly accounts = inject(AccountsStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toasts = inject(ToastService);

  protected readonly editing = this.data.account ?? null;
  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly name = signal(this.editing?.name ?? '');
  protected readonly type = signal<AccountType>(this.editing?.type ?? 'bank');
  protected readonly initial = signal(
    this.editing ? formatAmountInput(this.editing.initialBalance) : '',
  );
  private readonly submitted = signal(false);

  private readonly parsedInitial = computed(() =>
    this.initial().trim() === '' ? 0 : parseSignedAmount(this.initial()),
  );

  protected readonly errors = computed(() => ({
    name: this.submitted() && !this.name().trim() ? 'Saisissez un nom de compte.' : null,
    initial:
      this.submitted() && this.parsedInitial() === null
        ? 'Solde initial invalide : chiffres uniquement, avec 2 décimales au plus.'
        : null,
  }));

  /** Solde actuel recalculé avec le nouveau solde initial. */
  protected readonly preview = computed(() => {
    const initial = this.parsedInitial();
    if (!this.editing || initial === null) return null;
    const delta = initial - this.editing.initialBalance;
    return formatMoney(this.accounts.balanceOf(this.editing.id) + delta);
  });

  /** Enregistre ; bloque l'envoi natif du formulaire (qui rechargerait la page). */
  protected save(event: SubmitEvent): void {
    event.preventDefault();
    this.submitted.set(true);
    const initial = this.parsedInitial();
    if (!this.name().trim() || initial === null) return;
    this.accounts.save({
      id: this.editing?.id,
      name: this.name(),
      type: this.type(),
      initialBalance: initial,
      color: this.editing?.color ?? PALETTE.violet,
    });
    this.toasts.show(this.editing ? 'Compte modifié' : 'Compte créé');
    this.ref.close(true);
  }

  protected async delete(): Promise<void> {
    if (!this.editing) return;
    const usage = this.accounts.usage(this.editing.id);
    if (usage > 0 || this.accounts.accounts().length <= 1) {
      await this.confirm.ask({
        title: 'Suppression impossible',
        message:
          usage > 0
            ? `« ${this.editing.name} » est utilisé par ${usage} transaction${usage > 1 ? 's' : ''} ou récurrence${usage > 1 ? 's' : ''}. Supprimez-les ou rattachez-les à un autre compte avant de supprimer ce compte.`
            : 'Il faut conserver au moins un compte.',
        confirmLabel: 'Compris',
        tone: 'primary',
      });
      return;
    }
    const confirmed = await this.confirm.ask({
      title: `Supprimer « ${this.editing.name} » ?`,
      message: 'Ce compte n’est utilisé par aucune transaction. Il sera définitivement supprimé.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.accounts.delete(this.editing.id);
    this.toasts.show('Compte supprimé');
    this.ref.close(true);
  }
}
