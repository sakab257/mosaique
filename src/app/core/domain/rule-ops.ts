import { AppData, Id, IsoDate, RecurringRule } from '../models';
import { addDays, dateOf, maxDate } from './dates';

/** Champs saisis d'une règle (l'état de génération est géré par l'application). */
export type RuleDraft = Omit<RecurringRule, 'id' | 'active' | 'lastGeneratedDate' | 'skippedDates'>;

/** Nettoie une règle selon son type (mêmes règles que pour une transaction). */
export function normalizeRule(
  rule: RecurringRule,
  data: Pick<AppData, 'subcategories'>,
): RecurringRule {
  const { toAccountId, groupId, subcategoryId, endDate, lastGeneratedDate, ...base } = rule;
  const result: RecurringRule = { ...base, note: rule.note.trim() };
  if (rule.type === 'transfer') {
    if (toAccountId) result.toAccountId = toAccountId;
  } else if (groupId) {
    result.groupId = groupId;
    const sub = data.subcategories.find((s) => s.id === subcategoryId);
    if (sub && sub.groupId === groupId) result.subcategoryId = sub.id;
  }
  if (endDate) result.endDate = endDate;
  if (lastGeneratedDate) result.lastGeneratedDate = lastGeneratedDate;
  return result;
}

export function addRule(data: AppData, id: Id, draft: RuleDraft): AppData {
  const rule: RecurringRule = { ...draft, id, active: true, skippedDates: [] };
  return { ...data, rules: [...data.rules, normalizeRule(rule, data)] };
}

/**
 * Modifie une règle. Seules les occurrences futures sont concernées : l'état de
 * génération et les dates ignorées sont conservés, les transactions déjà créées ne
 * sont pas touchées.
 */
export function updateRule(data: AppData, id: Id, draft: RuleDraft): AppData {
  return {
    ...data,
    rules: data.rules.map((rule) =>
      rule.id === id
        ? normalizeRule(
            {
              ...draft,
              id,
              active: rule.active,
              lastGeneratedDate: rule.lastGeneratedDate,
              skippedDates: rule.skippedDates,
            },
            data,
          )
        : rule,
    ),
  };
}

/**
 * Met en pause ou réactive une règle. L'historique est conservé ; à la reprise, les
 * échéances tombées pendant la pause ne sont pas rattrapées (seules celles à partir
 * d'aujourd'hui seront créées).
 */
export function setRuleActive(data: AppData, id: Id, active: boolean, today: IsoDate): AppData {
  return {
    ...data,
    rules: data.rules.map((rule) => {
      if (rule.id !== id || rule.active === active) return rule;
      if (!active) return { ...rule, active };
      // Tout ce qui précède aujourd'hui est considéré comme traité.
      const beforeStart = addDays(dateOf(rule.startDate), -1);
      const lastGeneratedDate = maxDate(rule.lastGeneratedDate ?? beforeStart, addDays(today, -1));
      return { ...rule, active, lastGeneratedDate };
    }),
  };
}

/**
 * Supprime une règle. Les transactions déjà générées sont soit conservées (elles
 * deviennent des transactions ordinaires), soit supprimées.
 */
export function deleteRule(data: AppData, id: Id, keepTransactions: boolean): AppData {
  return {
    ...data,
    rules: data.rules.filter((rule) => rule.id !== id),
    transactions: keepTransactions
      ? data.transactions.map((tx) => {
          if (tx.recurringRuleId !== id) return tx;
          const { recurringRuleId: _rule, occurrenceDate: _date, ...rest } = tx;
          return rest;
        })
      : data.transactions.filter((tx) => tx.recurringRuleId !== id),
  };
}

/**
 * Transforme une transaction existante en première échéance d'une nouvelle règle :
 * la transaction est rattachée à la règle et la génération reprend après sa date.
 */
export function attachRule(data: AppData, txId: Id, ruleId: Id, draft: RuleDraft): AppData {
  const tx = data.transactions.find((t) => t.id === txId);
  if (!tx) return data;
  const occurrenceDate = dateOf(draft.startDate);
  const rule: RecurringRule = {
    ...draft,
    id: ruleId,
    active: true,
    skippedDates: [],
    lastGeneratedDate: occurrenceDate,
  };
  return {
    ...data,
    rules: [...data.rules, normalizeRule(rule, data)],
    transactions: data.transactions.map((t) =>
      t.id === txId ? { ...t, recurringRuleId: ruleId, occurrenceDate } : t,
    ),
  };
}

/** Nombre de transactions déjà générées par une règle. */
export function generatedCount(data: Pick<AppData, 'transactions'>, ruleId: Id): number {
  return data.transactions.filter((tx) => tx.recurringRuleId === ruleId).length;
}
