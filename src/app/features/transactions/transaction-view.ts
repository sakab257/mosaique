import { PALETTE } from '../../core/data/palette';
import { Catalog } from '../../core/domain/catalog';
import { dateOf, timeOf } from '../../core/domain/dates';
import { SignDisplay } from '../../core/domain/money';
import { transactionTitle } from '../../core/domain/transaction-query';
import { Cents, IsoDate, Transaction, TransactionType } from '../../core/models';

/** Données d'affichage d'une transaction, calculées une fois pour les listes. */
export interface TransactionView {
  id: string;
  tx: Transaction;
  type: TransactionType;
  title: string;
  icon: string;
  color: string;
  /** Groupe, ou « Virement ». */
  category: string;
  /** Sous-catégorie, ou « Banque → Cash » pour un virement. */
  detail: string;
  account: string;
  amount: Cents;
  sign: SignDisplay;
  amountClass: string;
  recurring: boolean;
  date: IsoDate;
  time: string;
}

const AMOUNT_CLASSES: Record<TransactionType, string> = {
  expense: 'text-expense',
  income: 'text-income',
  transfer: 'text-ink-3',
};

export function toTransactionView(tx: Transaction, catalog: Catalog): TransactionView {
  const account = catalog.accounts.get(tx.accountId)?.name ?? 'Compte supprimé';
  const base = {
    id: tx.id,
    tx,
    type: tx.type,
    title: transactionTitle(tx, catalog),
    amountClass: AMOUNT_CLASSES[tx.type],
    recurring: !!tx.recurringRuleId,
    date: dateOf(tx.date),
    time: timeOf(tx.date),
  };

  if (tx.type === 'transfer') {
    const target = (tx.toAccountId && catalog.accounts.get(tx.toAccountId)?.name) ?? '—';
    const route = `${account} → ${target}`;
    return {
      ...base,
      icon: 'swap_horiz',
      color: PALETTE.violet,
      category: 'Virement',
      detail: route,
      account: route,
      amount: tx.amount,
      sign: 'never',
    };
  }

  const group = tx.groupId ? catalog.groups.get(tx.groupId) : undefined;
  const sub = tx.subcategoryId ? catalog.subcategories.get(tx.subcategoryId) : undefined;
  return {
    ...base,
    icon: sub?.icon ?? group?.icon ?? 'more_horiz',
    color: group?.color ?? PALETTE.slate,
    category: group?.name ?? 'Sans catégorie',
    detail: sub?.name ?? '',
    account,
    amount: tx.type === 'expense' ? -tx.amount : tx.amount,
    sign: 'always',
  };
}
