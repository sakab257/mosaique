import { Cents, Id, IsoDate, IsoDateTime } from './common';

export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id: Id;
  type: TransactionType;
  /** Toujours positif. */
  amount: Cents;
  /** Compte débité (dépense, virement) ou crédité (revenu). */
  accountId: Id;
  /** Compte crédité d'un virement. */
  toAccountId?: Id;
  groupId?: Id;
  subcategoryId?: Id;
  date: IsoDateTime;
  /** Libellé libre, affiché comme titre de la transaction. */
  note: string;
  /** Règle récurrente ayant généré la transaction. */
  recurringRuleId?: Id;
  /**
   * Date d'occurrence de la règle qui a produit cette transaction. Forme avec
   * `recurringRuleId` la clé d'idempotence, stable même si l'utilisateur modifie
   * ensuite la date de la transaction.
   */
  occurrenceDate?: IsoDate;
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  expense: 'Dépense',
  income: 'Revenu',
  transfer: 'Virement',
};
