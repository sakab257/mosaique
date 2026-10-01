import { AppData, Id, IsoDate, RecurringRule, Transaction } from '../models';
import { addDays, clampedDate, combineDateTime, dateOf, diffDays, splitIso, timeOf } from './dates';

/**
 * Calcul des occurrences d'une règle récurrente — fonctions pures, sans état.
 *
 * La n-ième occurrence est toujours calculée depuis la date de départ (jamais depuis
 * l'occurrence précédente) : une règle du 31 tombe le 30 avril puis à nouveau le 31 mai,
 * une règle du 29 février tombe le 28 les années non bissextiles.
 */

type Schedule = Pick<RecurringRule, 'frequency' | 'startDate'>;
type Bounded = Schedule & Pick<RecurringRule, 'endDate' | 'skippedDates'>;

export function nthOccurrence(rule: Schedule, n: number): IsoDate {
  const start = dateOf(rule.startDate);
  const { year, month, day } = splitIso(start);
  switch (rule.frequency) {
    case 'weekly':
      return addDays(start, 7 * n);
    case 'monthly': {
      const index = month - 1 + n;
      return clampedDate(year + Math.floor(index / 12), (index % 12) + 1, day);
    }
    case 'yearly':
      return clampedDate(year + n, month, day);
  }
}

/** Rang d'une occurrence légèrement antérieure à `from` : évite de tout parcourir depuis le départ. */
function lowerIndex(rule: Schedule, from: IsoDate): number {
  const start = dateOf(rule.startDate);
  if (from <= start) return 0;
  const a = splitIso(start);
  const b = splitIso(from);
  const estimate =
    rule.frequency === 'weekly'
      ? Math.floor(diffDays(start, from) / 7)
      : rule.frequency === 'monthly'
        ? (b.year - a.year) * 12 + (b.month - a.month)
        : b.year - a.year;
  return Math.max(0, estimate - 1);
}

/**
 * Occurrences comprises dans [from, to] (bornes incluses), limitées à la période de la
 * règle (départ → fin) et hors dates ignorées.
 */
export function occurrencesBetween(rule: Bounded, from: IsoDate, to: IsoDate): IsoDate[] {
  const start = dateOf(rule.startDate);
  const lower = from > start ? from : start;
  const upper = rule.endDate && rule.endDate < to ? rule.endDate : to;
  if (lower > upper) return [];
  const skipped = new Set(rule.skippedDates);
  const result: IsoDate[] = [];
  for (let n = lowerIndex(rule, lower); ; n++) {
    const date = nthOccurrence(rule, n);
    if (date > upper) break;
    if (date >= lower && !skipped.has(date)) result.push(date);
  }
  return result;
}

/** Première occurrence à partir de `from` inclus, ou `null` si la règle est terminée. */
export function nextOccurrence(rule: Bounded, from: IsoDate): IsoDate | null {
  const skipped = new Set(rule.skippedDates);
  const start = dateOf(rule.startDate);
  const lower = from > start ? from : start;
  for (let n = lowerIndex(rule, lower), guard = 0; guard < 5000; n++, guard++) {
    const date = nthOccurrence(rule, n);
    if (rule.endDate && date > rule.endDate) return null;
    if (date >= lower && !skipped.has(date)) return date;
  }
  return null;
}

const occurrenceKey = (ruleId: Id, date: IsoDate) => `${ruleId}|${date}`;

/** Transaction correspondant à une occurrence (date d'origine, heure de la règle). */
export function transactionFromRule(rule: RecurringRule, date: IsoDate, id: Id): Transaction {
  const tx: Transaction = {
    id,
    type: rule.type,
    amount: rule.amount,
    accountId: rule.accountId,
    date: combineDateTime(date, timeOf(rule.startDate)),
    note: rule.note,
    recurringRuleId: rule.id,
    occurrenceDate: date,
  };
  if (rule.type === 'transfer') {
    if (rule.toAccountId) tx.toAccountId = rule.toAccountId;
  } else {
    if (rule.groupId) tx.groupId = rule.groupId;
    if (rule.subcategoryId) tx.subcategoryId = rule.subcategoryId;
  }
  return tx;
}

/**
 * Crée, pour chaque règle active, toutes les occurrences manquantes entre la dernière
 * génération (ou le départ) et aujourd'hui inclus, avec leur date d'origine.
 *
 * Idempotent : la clé règle + date d'occurrence empêche tout doublon, et un second
 * appel le même jour renvoie exactement le même objet `data` (aucune écriture).
 */
export function generateDueTransactions(
  data: AppData,
  today: IsoDate,
  createId: () => Id,
): { data: AppData; created: Transaction[] } {
  const existing = new Set(
    data.transactions
      .filter((tx) => tx.recurringRuleId && tx.occurrenceDate)
      .map((tx) => occurrenceKey(tx.recurringRuleId!, tx.occurrenceDate!)),
  );
  const created: Transaction[] = [];
  let rulesChanged = false;

  const rules = data.rules.map((rule) => {
    if (!rule.active) return rule;
    const start = dateOf(rule.startDate);
    const until = rule.endDate && rule.endDate < today ? rule.endDate : today;
    if (until < start) return rule;
    if (rule.lastGeneratedDate && rule.lastGeneratedDate >= until) return rule;

    const from = rule.lastGeneratedDate ? addDays(rule.lastGeneratedDate, 1) : start;
    for (const date of occurrencesBetween(rule, from, until)) {
      const key = occurrenceKey(rule.id, date);
      if (existing.has(key)) continue;
      existing.add(key);
      created.push(transactionFromRule(rule, date, createId()));
    }
    rulesChanged = true;
    return { ...rule, lastGeneratedDate: until };
  });

  if (!rulesChanged) return { data, created };
  return { data: { ...data, rules, transactions: [...data.transactions, ...created] }, created };
}

export interface Occurrence {
  rule: RecurringRule;
  date: IsoDate;
}

/**
 * Occurrences futures (non encore générées) des règles actives, dans [from, to].
 * Elles ne sont jamais stockées : calculées à la volée pour « À venir ».
 */
export function pendingOccurrences(
  rules: readonly RecurringRule[],
  from: IsoDate,
  to: IsoDate,
): Occurrence[] {
  const result: Occurrence[] = [];
  for (const rule of rules) {
    if (!rule.active) continue;
    const afterGenerated = rule.lastGeneratedDate ? addDays(rule.lastGeneratedDate, 1) : from;
    const lower = afterGenerated > from ? afterGenerated : from;
    for (const date of occurrencesBetween(rule, lower, to)) result.push({ rule, date });
  }
  return result.sort((a, b) =>
    a.date === b.date ? a.rule.note.localeCompare(b.rule.note, 'fr') : a.date < b.date ? -1 : 1,
  );
}

/** Échéances des `days` prochains jours (à partir de demain). */
export function upcomingOccurrences(
  rules: readonly RecurringRule[],
  today: IsoDate,
  days = 30,
): Occurrence[] {
  return pendingOccurrences(rules, addDays(today, 1), addDays(today, days));
}
