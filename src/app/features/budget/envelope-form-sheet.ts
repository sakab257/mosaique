import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { map } from 'rxjs';
import { envelopeAllocation } from '../../core/domain/budget';
import { formatAmountInput, formatPercent, parseAmount, ratio } from '../../core/domain/money';
import { BudgetEnvelope } from '../../core/models';
import { BudgetStore, EnvelopeDraft } from '../../core/state/budget.store';
import { CategoriesStore } from '../../core/state/categories.store';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { Button } from '../../shared/ui/button/button';
import { Chip } from '../../shared/ui/chip/chip';
import { ConfirmService } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../shared/ui/icon/icon';
import { IconNamePipe } from '../../shared/ui/icon/icon-name.pipe';
import { SegmentOption, Segmented } from '../../shared/ui/segmented/segmented';
import { Sheet } from '../../shared/ui/sheet/sheet';
import { ToastService } from '../../shared/ui/toast/toast.service';
import {
  AMOUNT_MESSAGES,
  amountValidator,
} from '../transactions/transaction-form/transaction-form.validators';

export interface EnvelopeFormData {
  envelope?: BudgetEnvelope;
}

type Mode = 'auto' | 'manual';

const MODE_OPTIONS: readonly SegmentOption<Mode>[] = [
  { value: 'auto', label: '% du revenu' },
  { value: 'manual', label: 'Montant fixe' },
];

/** Pourcentage saisi « 7 », « 7,5 » → nombre entre 0 et 100. */
function parsePercent(value: string): number | null {
  const normalized = value.replace(/[\s%]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const n = Number(normalized);
  return n >= 0 && n <= 100 ? n : null;
}

function formatPercentInput(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',');
}

/** Création / modification d'une enveloppe (bottom sheet / modale). */
@Component({
  selector: 'app-envelope-form-sheet',
  imports: [ReactiveFormsModule, Sheet, Segmented, Chip, Icon, IconNamePipe, Button, MoneyPipe],
  template: `
    <app-sheet [title]="editing ? 'Modifier l’enveloppe' : 'Nouvelle enveloppe'">
      <form class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="flex flex-col items-center py-1 text-center" aria-live="polite">
          <span class="text-xs text-muted">Montant alloué par mois</span>
          <span class="text-amount font-semibold">{{ preview().amount | money }}</span>
          <span class="mt-0.5 text-xs text-primary-soft">{{ preview().hint }}</span>
        </div>

        <div class="flex flex-col gap-px overflow-hidden rounded-field bg-line">
          <div class="flex flex-col gap-2.5 bg-surface-2 px-3.5 py-3">
            <span id="env-group-label" class="text-xs text-muted">Catégorie suivie</span>
            @if (groups().length) {
              <div class="flex flex-wrap gap-1.5" role="group" aria-labelledby="env-group-label">
                @for (group of groups(); track group.id) {
                  <button
                    type="button"
                    appChip
                    [color]="group.color"
                    [selected]="state().groupId === group.id"
                    (click)="form.controls.groupId.setValue(group.id)"
                  >
                    <app-icon [name]="group.icon | iconName" [size]="16" />
                    {{ group.name }}
                  </button>
                }
              </div>
            } @else {
              <p class="text-caption text-muted">
                Toutes les catégories de dépenses ont déjà une enveloppe.
              </p>
            }
          </div>

          <div class="flex flex-col gap-2.5 bg-surface-2 px-3.5 py-3">
            <span class="text-xs text-muted">Calcul du montant</span>
            <app-segmented
              formControlName="mode"
              [options]="modeOptions"
              label="Calcul du montant"
            />
            @if (state().mode === 'auto') {
              <label class="flex items-center justify-between gap-3">
                <span class="font-medium">Part du revenu</span>
                <span
                  class="flex items-center gap-1 rounded-item bg-surface-4 px-3 focus-within:outline-2 focus-within:outline-primary"
                >
                  <input
                    formControlName="percent"
                    inputmode="decimal"
                    autocomplete="off"
                    class="h-9 w-14 bg-transparent text-right font-semibold outline-none"
                    [attr.aria-invalid]="errors().percent ? true : null"
                  />
                  <span class="text-muted">%</span>
                </span>
              </label>
            } @else {
              <label class="flex items-center justify-between gap-3">
                <span class="font-medium">Montant mensuel</span>
                <span
                  class="flex items-center gap-1 rounded-item bg-surface-4 px-3 focus-within:outline-2 focus-within:outline-primary"
                >
                  <input
                    formControlName="amount"
                    inputmode="decimal"
                    autocomplete="off"
                    class="h-9 w-24 bg-transparent text-right font-semibold outline-none"
                    [attr.aria-invalid]="errors().amount ? true : null"
                  />
                  <span class="text-muted">€</span>
                </span>
              </label>
            }
          </div>
        </div>

        @if (incomeHint(); as hint) {
          <p
            class="flex items-start gap-2.5 rounded-item bg-primary/12 px-3 py-2.5 text-caption leading-snug text-primary-ink"
          >
            <app-icon name="info" [size]="16" class="mt-px" />
            {{ hint }}
          </p>
        }

        @let e = errors();
        @if (e.group || e.percent || e.amount) {
          <ul class="flex flex-col gap-1 text-caption text-expense" role="alert">
            @if (e.group) {
              <li>{{ e.group }}</li>
            }
            @if (e.percent) {
              <li>{{ e.percent }}</li>
            }
            @if (e.amount) {
              <li>{{ e.amount }}</li>
            }
          </ul>
        }

        <button type="submit" appButton size="lg" block>
          {{ editing ? 'Enregistrer' : 'Créer l’enveloppe' }}
        </button>
        @if (editing) {
          <button type="button" appButton="danger-ghost" block class="-mt-2" (click)="delete()">
            Supprimer l’enveloppe
          </button>
        }
      </form>
    </app-sheet>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnvelopeFormSheet {
  private readonly data = inject<EnvelopeFormData | null>(DIALOG_DATA, { optional: true }) ?? {};
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly budget = inject(BudgetStore);
  private readonly categories = inject(CategoriesStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toasts = inject(ToastService);

  protected readonly editing = this.data.envelope ?? null;
  protected readonly modeOptions = MODE_OPTIONS;
  private readonly income = this.budget.summary().income;
  private readonly incomeSource = this.budget.summary().incomeSource;

  protected readonly form = new FormGroup(
    {
      groupId: new FormControl(this.editing?.groupId ?? '', { nonNullable: true }),
      mode: new FormControl<Mode>(this.editing?.manualOverride !== undefined ? 'manual' : 'auto', {
        nonNullable: true,
      }),
      percent: new FormControl(formatPercentInput(this.editing?.percentOfIncome ?? 10), {
        nonNullable: true,
      }),
      amount: new FormControl(
        this.editing?.manualOverride !== undefined
          ? formatAmountInput(this.editing.manualOverride)
          : '',
        { nonNullable: true },
      ),
    },
    { validators: [(group) => this.validate(group)] },
  );

  protected readonly submitted = signal(false);
  protected readonly state = toSignal(this.form.events.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  /** Groupes proposés : ceux sans enveloppe, plus celui de l'enveloppe modifiée. */
  protected readonly groups = computed(() => {
    const available = new Set(this.budget.availableGroups().map((g) => g.id));
    return this.categories
      .expenseGroups()
      .filter((g) => available.has(g.id) || g.id === this.editing?.groupId);
  });

  protected readonly preview = computed(() => {
    const draft = this.draftFromState();
    const amount = draft ? envelopeAllocation({ ...draft, id: '' }, this.income) : 0;
    const base =
      this.incomeSource === 'reference' ? 'votre revenu de référence' : 'vos revenus du mois';
    return {
      amount,
      hint: this.income > 0 ? `soit ${formatPercent(ratio(amount, this.income))} de ${base}` : ' ',
    };
  });

  protected readonly incomeHint = computed(() =>
    this.state().mode === 'auto' && this.income === 0
      ? 'Aucun revenu de référence ni revenu ce mois-ci : le montant sera calculé dès qu’un revenu sera connu. Vous pouvez aussi saisir un montant fixe.'
      : null,
  );

  protected readonly errors = computed(() => {
    this.state();
    const show = this.submitted();
    return {
      group: show && this.form.hasError('group') ? 'Choisissez la catégorie suivie.' : null,
      percent:
        show && this.form.hasError('percent') ? 'Saisissez un pourcentage entre 0 et 100.' : null,
      amount:
        show && this.form.getError('amount') ? AMOUNT_MESSAGES[this.form.getError('amount')] : null,
    };
  });

  constructor() {
    // Passer d'un mode à l'autre conserve le montant équivalent.
    this.form.controls.mode.valueChanges.pipe(takeUntilDestroyed()).subscribe((mode) => {
      const { percent, amount } = this.form.getRawValue();
      if (mode === 'manual' && !amount) {
        const value = parsePercent(percent);
        if (value !== null) {
          this.form.controls.amount.setValue(
            formatAmountInput(Math.round((value / 100) * this.income)),
          );
        }
      } else if (mode === 'auto' && this.income > 0) {
        const cents = parseAmount(amount);
        if (cents !== null)
          this.form.controls.percent.setValue(formatPercentInput((cents / this.income) * 100));
      }
    });
  }

  protected submit(): void {
    this.submitted.set(true);
    const draft = this.draftFromState();
    if (this.form.invalid || !draft) return;
    if (this.editing) {
      this.budget.update(this.editing.id, draft);
      this.toasts.show('Enveloppe modifiée');
    } else {
      this.budget.add(draft);
      this.toasts.show('Enveloppe créée');
    }
    this.ref.close(true);
  }

  protected async delete(): Promise<void> {
    if (!this.editing) return;
    const name = this.categories.group(this.editing.groupId)?.name ?? 'cette enveloppe';
    const confirmed = await this.confirm.ask({
      title: 'Supprimer l’enveloppe ?',
      message: `L’enveloppe « ${name} » sera supprimée. Vos transactions ne sont pas modifiées.`,
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!confirmed) return;
    const removed = this.budget.remove(this.editing.id);
    this.ref.close(true);
    if (removed) {
      this.toasts.show('Enveloppe supprimée', {
        actionLabel: 'Annuler',
        action: () => this.budget.restore(removed),
      });
    }
  }

  private validate(group: AbstractControl): ValidationErrors | null {
    const { groupId, mode, percent, amount } = group.value as ReturnType<
      typeof this.form.getRawValue
    >;
    const errors: ValidationErrors = {};
    if (!groupId) errors['group'] = true;
    if (parsePercent(percent ?? '') === null && mode === 'auto') errors['percent'] = true;
    if (mode === 'manual') {
      const amountError = amountValidator(new FormControl(amount));
      if (amountError && !amountError['zero']) errors['amount'] = Object.keys(amountError)[0];
    }
    return Object.keys(errors).length ? errors : null;
  }

  /** Brouillon issu du formulaire, ou `null` s'il est incomplet. */
  private draftFromState(): EnvelopeDraft | null {
    const { groupId, mode, percent, amount } = this.state();
    const percentValue = parsePercent(percent);
    if (mode === 'manual') {
      const cents = parseAmount(amount);
      if (cents === null) return null;
      return {
        groupId,
        percentOfIncome:
          this.income > 0 ? Math.min(100, (cents / this.income) * 100) : (percentValue ?? 0),
        manualOverride: cents,
      };
    }
    if (percentValue === null) return null;
    return { groupId, percentOfIncome: percentValue };
  }
}
