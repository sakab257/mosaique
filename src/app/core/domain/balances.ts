import { Account, Cents, Id, IsoDate, Transaction } from '../models';
import { dateOf } from './dates';

/**
 * Solde de chaque compte = solde initial + revenus − dépenses ± virements
 * (un virement débite le compte source et crédite le compte destination).
 * Avec `until`, seules les transactions datées de ce jour ou avant sont comptées
 * (une dépense saisie à l'avance n'entame pas le solde actuel).
 */
export function computeBalances(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
  until?: IsoDate,
): Map<Id, Cents> {
  const balances = new Map(accounts.map((a) => [a.id, a.initialBalance]));
  const add = (id: Id | undefined, delta: Cents) => {
    if (id !== undefined && balances.has(id)) balances.set(id, balances.get(id)! + delta);
  };
  for (const tx of transactions) {
    if (until && dateOf(tx.date) > until) continue;
    if (tx.type === 'income') add(tx.accountId, tx.amount);
    else if (tx.type === 'expense') add(tx.accountId, -tx.amount);
    else {
      add(tx.accountId, -tx.amount);
      add(tx.toAccountId, tx.amount);
    }
  }
  return balances;
}

export function sumBalances(balances: ReadonlyMap<Id, Cents>): Cents {
  let total = 0;
  for (const value of balances.values()) total += value;
  return total;
}
