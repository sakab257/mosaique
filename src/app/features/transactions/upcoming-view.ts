import { Catalog } from '../../core/domain/catalog';
import { Occurrence, transactionFromRule } from '../../core/domain/recurrence';
import { signedAmount } from '../../core/domain/stats';
import { Cents, RecurringRule } from '../../core/models';
import { TransactionView, toTransactionView } from './transaction-view';

/** Échéance future affichée (en grisé) dans « À venir » et « Prochaines échéances ». */
export interface UpcomingView extends TransactionView {
  rule: RecurringRule;
}

export function toUpcomingView(occurrence: Occurrence, catalog: Catalog): UpcomingView {
  const { rule, date } = occurrence;
  const tx = transactionFromRule(rule, date, `upcoming:${rule.id}:${date}`);
  return { ...toTransactionView(tx, catalog), rule };
}

/** Total signé des échéances, hors virements. */
export function upcomingTotal(occurrences: readonly Occurrence[]): Cents {
  return occurrences.reduce(
    (sum, { rule, date }) => sum + signedAmount(transactionFromRule(rule, date, '')),
    0,
  );
}
