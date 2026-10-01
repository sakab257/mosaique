import { Cents, Id, MonthKey, Transaction } from '../models';
import { isInMonth } from './dates';

export interface MonthTotals {
  income: Cents;
  expense: Cents;
  /** Revenus − dépenses (les virements sont neutres). */
  net: Cents;
  count: number;
}

export function transactionsInMonth(
  transactions: readonly Transaction[],
  month: MonthKey,
): Transaction[] {
  return transactions.filter((tx) => isInMonth(tx.date, month));
}

/** Montant signé pour les totaux : + revenu, − dépense, 0 virement. */
export function signedAmount(tx: Transaction): Cents {
  return tx.type === 'income' ? tx.amount : tx.type === 'expense' ? -tx.amount : 0;
}

export function monthTotals(transactions: readonly Transaction[], month: MonthKey): MonthTotals {
  let income = 0;
  let expense = 0;
  let count = 0;
  for (const tx of transactions) {
    if (!isInMonth(tx.date, month)) continue;
    count += 1;
    if (tx.type === 'income') income += tx.amount;
    else if (tx.type === 'expense') expense += tx.amount;
  }
  return { income, expense, net: income - expense, count };
}

/** Clé des dépenses sans catégorie dans `expensesByGroup`. */
export const UNCATEGORIZED = '';

/** Dépenses du mois par groupe de catégorie (virements et revenus exclus). */
export function expensesByGroup(
  transactions: readonly Transaction[],
  month: MonthKey,
): Map<Id, Cents> {
  const totals = new Map<Id, Cents>();
  for (const tx of transactions) {
    if (tx.type !== 'expense' || !isInMonth(tx.date, month)) continue;
    const key = tx.groupId ?? UNCATEGORIZED;
    totals.set(key, (totals.get(key) ?? 0) + tx.amount);
  }
  return totals;
}
