import { AppData, Id, Transaction } from '../models';

/** Données saisies pour une transaction (sans identifiant). */
export type TransactionDraft = Omit<Transaction, 'id'>;

/**
 * Nettoie une transaction selon son type : un virement n'a pas de catégorie, une
 * dépense ou un revenu n'a pas de compte de destination, une sous-catégorie doit
 * appartenir au groupe choisi.
 */
export function normalizeTransaction(
  tx: Transaction,
  data: Pick<AppData, 'subcategories'>,
): Transaction {
  const { toAccountId, groupId, subcategoryId, recurringRuleId, occurrenceDate, ...base } = tx;
  const result: Transaction = { ...base, note: tx.note.trim() };
  if (tx.type === 'transfer') {
    if (toAccountId) result.toAccountId = toAccountId;
  } else if (groupId) {
    result.groupId = groupId;
    const sub = data.subcategories.find((s) => s.id === subcategoryId);
    if (sub && sub.groupId === groupId) result.subcategoryId = sub.id;
  }
  if (recurringRuleId) result.recurringRuleId = recurringRuleId;
  if (occurrenceDate) result.occurrenceDate = occurrenceDate;
  return result;
}

export function addTransaction(data: AppData, tx: Transaction): AppData {
  return { ...data, transactions: [...data.transactions, normalizeTransaction(tx, data)] };
}

/**
 * Remplace le contenu d'une transaction. Le lien vers sa règle d'origine est conservé :
 * modifier une transaction générée ne modifie pas la règle.
 */
export function updateTransaction(data: AppData, id: Id, draft: TransactionDraft): AppData {
  return {
    ...data,
    transactions: data.transactions.map((tx) =>
      tx.id === id
        ? normalizeTransaction(
            {
              ...draft,
              id,
              recurringRuleId: tx.recurringRuleId,
              occurrenceDate: tx.occurrenceDate,
            },
            data,
          )
        : tx,
    ),
  };
}

/**
 * Supprime une transaction. Si elle provient d'une règle récurrente, sa date d'occurrence
 * est ajoutée aux `skippedDates` de la règle pour qu'elle ne soit jamais recréée.
 */
export function removeTransaction(
  data: AppData,
  id: Id,
): { data: AppData; removed: Transaction | null } {
  const removed = data.transactions.find((tx) => tx.id === id) ?? null;
  if (!removed) return { data, removed };
  const { recurringRuleId, occurrenceDate } = removed;
  return {
    removed,
    data: {
      ...data,
      transactions: data.transactions.filter((tx) => tx.id !== id),
      rules:
        recurringRuleId && occurrenceDate
          ? data.rules.map((rule) =>
              rule.id === recurringRuleId && !rule.skippedDates.includes(occurrenceDate)
                ? { ...rule, skippedDates: [...rule.skippedDates, occurrenceDate].sort() }
                : rule,
            )
          : data.rules,
    },
  };
}

/** Annule une suppression : réinsère la transaction et retire la date ignorée de sa règle. */
export function restoreTransaction(data: AppData, tx: Transaction): AppData {
  if (data.transactions.some((t) => t.id === tx.id)) return data;
  const { recurringRuleId, occurrenceDate } = tx;
  return {
    ...data,
    transactions: [...data.transactions, tx],
    rules:
      recurringRuleId && occurrenceDate
        ? data.rules.map((rule) =>
            rule.id === recurringRuleId
              ? { ...rule, skippedDates: rule.skippedDates.filter((d) => d !== occurrenceDate) }
              : rule,
          )
        : data.rules,
  };
}
