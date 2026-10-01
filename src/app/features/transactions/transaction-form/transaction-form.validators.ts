import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { isValidIsoDate } from '../../../core/domain/dates';
import { parseAmount } from '../../../core/domain/money';

/** Plafond de saisie : 10 millions d'euros. */
export const MAX_AMOUNT = 1_000_000_000;

export const amountValidator: ValidatorFn = (control: AbstractControl<string>) => {
  const value = (control.value ?? '').trim();
  if (!value) return { required: true };
  const cents = parseAmount(value);
  if (cents === null) return { format: true };
  if (cents === 0) return { zero: true };
  if (cents > MAX_AMOUNT) return { max: true };
  return null;
};

export const isoDateValidator: ValidatorFn = (control: AbstractControl<string>) =>
  isValidIsoDate(control.value ?? '') ? null : { date: true };

export const timeValidator: ValidatorFn = (control: AbstractControl<string>) =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(control.value ?? '') ? null : { time: true };

interface RulesValue {
  type: string;
  accountId: string;
  toAccountId: string;
  groupId: string;
}

/** Règles croisées : catégorie obligatoire hors virement ; deux comptes distincts pour un virement. */
export const transactionRulesValidator: ValidatorFn = (group: AbstractControl<RulesValue>) => {
  const { type, accountId, toAccountId, groupId } = group.value;
  const errors: ValidationErrors = {};
  if (type === 'transfer') {
    if (!toAccountId) errors['toAccountRequired'] = true;
    else if (toAccountId === accountId) errors['sameAccount'] = true;
  } else if (!groupId) {
    errors['groupRequired'] = true;
  }
  return Object.keys(errors).length ? errors : null;
};

export const AMOUNT_MESSAGES: Record<string, string> = {
  required: 'Saisissez un montant.',
  format: 'Montant invalide : chiffres uniquement, avec 2 décimales au plus.',
  zero: 'Le montant doit être supérieur à 0.',
  max: 'Le montant ne peut pas dépasser 10 000 000 €.',
};

interface RecurrenceValue {
  recur: boolean;
  endMode: 'never' | 'date';
  endDate: string;
  date: string;
}

/** Date de fin d'une récurrence : valide et postérieure (ou égale) à la première échéance. */
export const recurrenceValidator: ValidatorFn = (group: AbstractControl<RecurrenceValue>) => {
  const { recur, endMode, endDate, date } = group.value;
  if (!recur || endMode !== 'date') return null;
  if (!isValidIsoDate(endDate ?? '')) return { endDateInvalid: true };
  if (isValidIsoDate(date ?? '') && endDate < date) return { endBeforeStart: true };
  return null;
};
