import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  LOCALE_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { PALETTE, SEMANTIC } from '../../../core/data/palette';
import {
  addDays,
  clampedDate,
  combineDateTime,
  dateOf,
  dayOfWeek,
  isValidIsoDate,
  splitIso,
  timeOf,
} from '../../../core/domain/dates';
import { formatAmountInput, formatMoney, parseAmount } from '../../../core/domain/money';
import { nextOccurrence } from '../../../core/domain/recurrence';
import {
  WEEKDAYS,
  describeRecurrence,
  recurrenceDayLabel,
} from '../../../core/domain/recurrence-format';
import { RuleDraft } from '../../../core/domain/rule-ops';
import { TransactionDraft } from '../../../core/domain/transaction-ops';
import { transactionTitle } from '../../../core/domain/transaction-query';
import {
  ACCOUNT_TYPE_ICONS,
  Frequency,
  RecurringRule,
  Transaction,
  TransactionType,
} from '../../../core/models';
import { ClockService } from '../../../core/services/clock.service';
import { AccountsStore } from '../../../core/state/accounts.store';
import { CategoriesStore } from '../../../core/state/categories.store';
import { RecurringStore } from '../../../core/state/recurring.store';
import { TransactionsStore } from '../../../core/state/transactions.store';
import { formatDateLabel } from '../../../shared/pipes/date-label.pipe';
import { Button } from '../../../shared/ui/button/button';
import { Chip } from '../../../shared/ui/chip/chip';
import { ConfirmService } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../../shared/ui/icon/icon';
import { Picker, PickerOption } from '../../../shared/ui/picker/picker';
import { SegmentOption, Segmented } from '../../../shared/ui/segmented/segmented';
import { Sheet } from '../../../shared/ui/sheet/sheet';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { Toggle } from '../../../shared/ui/toggle/toggle';
import { RuleActions } from '../rule-actions.service';
import {
  AMOUNT_MESSAGES,
  amountValidator,
  isoDateValidator,
  recurrenceValidator,
  timeValidator,
  transactionRulesValidator,
} from './transaction-form.validators';

export interface TransactionFormData {
  /** Transaction à modifier. */
  transaction?: Transaction;
  /** Règle récurrente à modifier (même formulaire). */
  rule?: RecurringRule;
  /** Valeurs initiales d'une création. */
  preset?: Partial<TransactionDraft>;
  /** Création d'une règle : la récurrence est activée d'emblée. */
  recurring?: boolean;
  /** Ouvre l'édition d'une règle depuis une transaction générée. */
  onEditRule?: (rule: RecurringRule) => void;
}

type Mode = 'create' | 'edit' | 'create-rule' | 'edit-rule';

const TITLES: Record<Mode, string> = {
  create: 'Nouvelle transaction',
  edit: 'Modifier la transaction',
  'create-rule': 'Nouvelle récurrence',
  'edit-rule': 'Modifier la récurrence',
};

const TYPE_OPTIONS: readonly SegmentOption<TransactionType>[] = [
  { value: 'expense', label: 'Dépense', color: SEMANTIC.expense },
  { value: 'income', label: 'Revenu', color: SEMANTIC.income },
  { value: 'transfer', label: 'Virement', color: SEMANTIC.transfer },
];

const FREQUENCIES: readonly { value: Frequency; label: string }[] = [
  { value: 'weekly', label: 'Chaque semaine' },
  { value: 'monthly', label: 'Chaque mois' },
  { value: 'yearly', label: 'Chaque année' },
];

/** Lundi en premier. */
const WEEKDAY_OPTIONS = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
  value: String(d),
  label: WEEKDAYS[d].charAt(0).toUpperCase() + WEEKDAYS[d].slice(1),
}));
const MONTH_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: `Le ${i === 0 ? '1er' : i + 1} du mois`,
}));

const SIGNS: Record<TransactionType, string> = { expense: '−', income: '+', transfer: '' };
const AMOUNT_COLORS: Record<TransactionType, string> = {
  expense: 'text-expense',
  income: 'text-income',
  transfer: 'text-ink',
};

@Component({
  selector: 'app-transaction-form-sheet',
  imports: [ReactiveFormsModule, Sheet, Segmented, Picker, Chip, Icon, Button, Toggle],
  templateUrl: './transaction-form-sheet.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionFormSheet {
  private readonly data = inject<TransactionFormData | null>(DIALOG_DATA, { optional: true }) ?? {};
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly locale = inject(LOCALE_ID);
  private readonly transactions = inject(TransactionsStore);
  private readonly recurring = inject(RecurringStore);
  private readonly accounts = inject(AccountsStore);
  private readonly categories = inject(CategoriesStore);
  private readonly clock = inject(ClockService);
  private readonly confirm = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  private readonly ruleActions = inject(RuleActions);

  protected readonly editing = this.data.transaction ?? null;
  protected readonly editingRule = this.data.rule ?? null;
  protected readonly mode: Mode = this.editingRule
    ? 'edit-rule'
    : this.editing
      ? 'edit'
      : this.data.recurring
        ? 'create-rule'
        : 'create';
  protected readonly title = TITLES[this.mode];
  /** La récurrence est imposée (règle) : pas d'interrupteur. */
  protected readonly recurrenceLocked = this.mode === 'create-rule' || this.mode === 'edit-rule';
  /** Une transaction générée par une règle ne peut pas devenir elle-même récurrente. */
  protected readonly canRepeat = !this.editing?.recurringRuleId;
  /** Règle d'origine d'une transaction générée. */
  protected readonly sourceRule = this.editing?.recurringRuleId
    ? (this.recurring.byId().get(this.editing.recurringRuleId) ?? null)
    : null;

  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly frequencies = FREQUENCIES;
  protected readonly weekdayOptions = WEEKDAY_OPTIONS;
  protected readonly monthDayOptions = MONTH_DAY_OPTIONS;

  protected readonly form = this.createForm();
  private readonly controls = this.form.controls;
  protected readonly submitted = signal(false);

  /** Instantané des valeurs, rafraîchi à chaque changement (valeur, statut, touched). */
  protected readonly state = toSignal(this.form.events.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  protected readonly type = computed(() => this.state().type);
  protected readonly sign = computed(() => SIGNS[this.type()]);
  protected readonly amountClass = computed(() => AMOUNT_COLORS[this.type()]);
  protected readonly hasAmount = computed(() => this.state().amount.trim() !== '');
  protected readonly recur = computed(() => this.state().recur);

  protected readonly dateLabel = computed(() =>
    this.mode === 'edit-rule'
      ? 'Prochaine échéance'
      : this.recur()
        ? 'Première échéance'
        : 'Date et heure',
  );

  protected readonly accountOptions = computed<PickerOption[]>(() =>
    this.accounts.accounts().map((account) => ({
      value: account.id,
      label: account.name,
      icon: ACCOUNT_TYPE_ICONS[account.type],
      color: PALETTE.violet,
      hint: `Solde ${formatMoney(this.accounts.balanceOf(account.id))}`,
    })),
  );

  protected readonly groupOptions = computed<PickerOption[]>(() => {
    const kind = this.type() === 'income' ? 'income' : 'expense';
    return this.categories.groupsOfKind(kind).map((group) => ({
      value: group.id,
      label: group.name,
      icon: group.icon,
      color: group.color,
    }));
  });

  protected readonly selectedGroup = computed(() => this.categories.group(this.state().groupId));
  protected readonly subcategories = computed(() =>
    this.categories.subcategoriesOf(this.state().groupId),
  );

  /** Jour de récurrence dérivé de la date (valeur du sélecteur). */
  protected readonly recurrenceDay = computed(() => {
    const { date, frequency } = this.state();
    if (!isValidIsoDate(date)) return '';
    return frequency === 'weekly' ? String(dayOfWeek(date)) : String(splitIso(date).day);
  });

  protected readonly yearlyDayLabel = computed(() => {
    const { date } = this.state();
    if (!isValidIsoDate(date)) return '—';
    const label = recurrenceDayLabel('yearly', date).replace(/^le /, 'Le ');
    return label;
  });

  protected readonly summary = computed(() => {
    const { date, frequency, endMode, endDate } = this.state();
    if (!isValidIsoDate(date)) return null;
    const end = endMode === 'date' && isValidIsoDate(endDate) ? endDate : null;
    return describeRecurrence(frequency, date, end);
  });

  protected readonly errors = computed(() => {
    this.state();
    const submitted = this.submitted();
    const shown = (control: FormControl) => submitted || control.touched;
    const c = this.controls;
    const amountError = Object.keys(c.amount.errors ?? {})[0];
    return {
      amount: shown(c.amount) && amountError ? AMOUNT_MESSAGES[amountError] : null,
      account: shown(c.accountId) && c.accountId.invalid ? 'Choisissez un compte.' : null,
      group:
        shown(c.groupId) && this.form.hasError('groupRequired')
          ? 'Choisissez une catégorie.'
          : null,
      toAccount: !shown(c.toAccountId)
        ? null
        : this.form.hasError('toAccountRequired')
          ? 'Choisissez le compte de destination.'
          : this.form.hasError('sameAccount')
            ? 'Les comptes de départ et d’arrivée doivent être différents.'
            : null,
      date: shown(c.date) && c.date.invalid ? 'Saisissez une date valide.' : null,
      time: shown(c.time) && c.time.invalid ? 'Saisissez une heure valide.' : null,
      note: c.note.hasError('maxlength') ? 'La note ne peut pas dépasser 120 caractères.' : null,
      endDate: !(submitted || c.endDate.touched)
        ? null
        : this.form.hasError('endDateInvalid')
          ? 'Saisissez une date de fin valide.'
          : this.form.hasError('endBeforeStart')
            ? 'La date de fin doit être postérieure à la première échéance.'
            : null,
    };
  });

  protected readonly hasFieldErrors = computed(() => {
    const e = this.errors();
    return !!(e.account || e.group || e.toAccount || e.date || e.time || e.note || e.endDate);
  });

  protected readonly cta = computed(() => {
    if (this.mode === 'edit-rule') return 'Enregistrer la récurrence';
    if (this.mode === 'edit') return 'Enregistrer les modifications';
    if (this.mode === 'create-rule') return 'Ajouter la récurrence';
    return 'Ajouter la transaction';
  });

  constructor() {
    this.controls.type.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((type) => this.onTypeChange(type));
    this.controls.groupId.valueChanges.pipe(takeUntilDestroyed()).subscribe((groupId) => {
      const sub = this.categories.subcategoryById().get(this.controls.subcategoryId.value);
      if (sub && sub.groupId !== groupId) this.controls.subcategoryId.setValue('');
    });
  }

  protected toggleSubcategory(id: string): void {
    const control = this.controls.subcategoryId;
    control.setValue(control.value === id ? '' : id);
  }

  protected setFrequency(frequency: Frequency): void {
    this.controls.frequency.setValue(frequency);
  }

  protected setEndMode(mode: 'never' | 'date'): void {
    this.controls.endMode.setValue(mode);
  }

  /** Changer le jour de récurrence déplace la première échéance sur ce jour. */
  protected onRecurrenceDayChange(value: string): void {
    const { date, frequency } = this.form.getRawValue();
    if (!isValidIsoDate(date)) return;
    const target = Number(value);
    let next = date;
    if (frequency === 'weekly') {
      next = addDays(date, (target - dayOfWeek(date) + 7) % 7);
    } else {
      const { year, month } = splitIso(date);
      next = clampedDate(year, month, target);
    }
    this.controls.date.setValue(next);
  }

  protected formatAmount(): void {
    const cents = parseAmount(this.controls.amount.value);
    if (cents !== null && cents > 0) this.controls.amount.setValue(formatAmountInput(cents));
  }

  protected submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      queueMicrotask(() =>
        this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    const draft = this.toDraft();
    const recur = this.form.controls.recur.value;

    if (this.editingRule) {
      this.recurring.update(this.editingRule.id, this.toRuleDraft(draft));
      this.toasts.show('Récurrence modifiée');
    } else if (this.editing) {
      this.transactions.update(this.editing.id, draft);
      if (recur && this.canRepeat) {
        this.recurring.attachToTransaction(this.editing.id, this.toRuleDraft(draft));
        this.toasts.show('Transaction modifiée · récurrence créée');
      } else {
        this.toasts.show('Transaction modifiée');
      }
    } else if (recur) {
      const { rule, created } = this.recurring.add(this.toRuleDraft(draft));
      this.toasts.show(this.ruleCreatedMessage(rule, created.length));
    } else {
      this.transactions.add(draft);
      this.toasts.show('Transaction ajoutée');
    }
    this.ref.close(true);
  }

  protected editSourceRule(): void {
    if (!this.sourceRule) return;
    this.ref.close(false);
    this.data.onEditRule?.(this.sourceRule);
  }

  protected async delete(): Promise<void> {
    if (this.editingRule) {
      if (await this.ruleActions.delete(this.editingRule)) this.ref.close(true);
      return;
    }
    const tx = this.editing;
    if (!tx) return;
    const title = transactionTitle(tx, this.transactions.catalog());
    const confirmed = await this.confirm.ask({
      title: 'Supprimer la transaction ?',
      message:
        `« ${title} » sera supprimée.` +
        (tx.recurringRuleId ? ' Cette échéance ne sera pas recréée par sa récurrence.' : ''),
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!confirmed) return;
    const removed = this.transactions.remove(tx.id);
    this.ref.close(true);
    if (removed) {
      this.toasts.show('Transaction supprimée', {
        actionLabel: 'Annuler',
        action: () => this.transactions.restore(removed),
      });
    }
  }

  private createForm() {
    const rule = this.data.rule;
    const source: Partial<TransactionDraft> =
      rule ?? this.data.transaction ?? this.data.preset ?? {};
    const type = source.type ?? 'expense';
    const accounts = this.accounts.accounts();
    const defaultAccount =
      source.accountId ??
      this.transactions.lastAccountFor(type) ??
      accounts.find((a) => a.type === 'card')?.id ??
      accounts[0]?.id ??
      '';
    // Pour une règle, la date proposée est sa prochaine échéance (les échéances passées
    // ne sont pas modifiées).
    const today = this.clock.today();
    const dateTime = rule
      ? combineDateTime(
          nextOccurrence(rule, addDays(today, 1)) ?? dateOf(rule.startDate),
          timeOf(rule.startDate),
        )
      : (source.date ?? this.clock.nowDateTime());
    const { year } = splitIso(today);

    return new FormGroup(
      {
        type: new FormControl<TransactionType>(type, { nonNullable: true }),
        amount: new FormControl(source.amount ? formatAmountInput(source.amount) : '', {
          nonNullable: true,
          validators: [amountValidator],
        }),
        accountId: new FormControl(defaultAccount, {
          nonNullable: true,
          validators: [Validators.required],
        }),
        toAccountId: new FormControl(source.toAccountId ?? '', { nonNullable: true }),
        groupId: new FormControl(source.groupId ?? '', { nonNullable: true }),
        subcategoryId: new FormControl(source.subcategoryId ?? '', { nonNullable: true }),
        date: new FormControl(dateOf(dateTime), {
          nonNullable: true,
          validators: [isoDateValidator],
        }),
        time: new FormControl(timeOf(dateTime), { nonNullable: true, validators: [timeValidator] }),
        note: new FormControl(source.note ?? '', {
          nonNullable: true,
          validators: [Validators.maxLength(120)],
        }),
        recur: new FormControl(!!rule || !!this.data.recurring, { nonNullable: true }),
        frequency: new FormControl<Frequency>(rule?.frequency ?? 'monthly', { nonNullable: true }),
        endMode: new FormControl<'never' | 'date'>(rule?.endDate ? 'date' : 'never', {
          nonNullable: true,
        }),
        endDate: new FormControl(rule?.endDate ?? `${year}-12-31`, { nonNullable: true }),
      },
      { validators: [transactionRulesValidator, recurrenceValidator] },
    );
  }

  private onTypeChange(type: TransactionType): void {
    const c = this.controls;
    const group = this.categories.group(c.groupId.value);
    if (type === 'transfer') {
      if (!c.toAccountId.value) {
        const other = this.accounts.accounts().find((a) => a.id !== c.accountId.value);
        c.toAccountId.setValue(other?.id ?? '');
      }
    } else if (group && group.kind !== type) {
      c.groupId.setValue('');
      c.subcategoryId.setValue('');
    }
  }

  private toDraft(): TransactionDraft {
    const v = this.form.getRawValue();
    const transfer = v.type === 'transfer';
    return {
      type: v.type,
      amount: parseAmount(v.amount)!,
      accountId: v.accountId,
      toAccountId: transfer ? v.toAccountId : undefined,
      groupId: transfer ? undefined : v.groupId || undefined,
      subcategoryId: transfer ? undefined : v.subcategoryId || undefined,
      date: combineDateTime(v.date, v.time),
      note: v.note.trim(),
    };
  }

  private toRuleDraft(draft: TransactionDraft): RuleDraft {
    const v = this.form.getRawValue();
    return {
      type: draft.type,
      amount: draft.amount,
      accountId: draft.accountId,
      toAccountId: draft.toAccountId,
      groupId: draft.groupId,
      subcategoryId: draft.subcategoryId,
      note: draft.note,
      frequency: v.frequency,
      startDate: draft.date,
      endDate: v.endMode === 'date' ? v.endDate : undefined,
    };
  }

  private ruleCreatedMessage(rule: RecurringRule, created: number): string {
    if (created > 0) {
      return `Récurrence créée · ${created} transaction${created > 1 ? 's' : ''} enregistrée${created > 1 ? 's' : ''}`;
    }
    const next = nextOccurrence(rule, this.clock.today());
    return next
      ? `Récurrence créée · première échéance le ${formatDateLabel(next, 'short', this.locale)}`
      : 'Récurrence créée';
  }
}
