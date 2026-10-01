import {
  BudgetEnvelope,
  Cents,
  CategoryGroup,
  Id,
  MonthKey,
  Settings,
  Transaction,
} from '../models';
import { ratio } from './money';
import { expensesByGroup, monthTotals } from './stats';

export type IncomeSource = 'reference' | 'actual';

export interface EnvelopeStatus {
  envelope: BudgetEnvelope;
  group: CategoryGroup | undefined;
  /** `manual` : montant saisi ; `auto` : % du revenu. */
  mode: 'auto' | 'manual';
  allocated: Cents;
  spent: Cents;
  /** Négatif en cas de dépassement. */
  remaining: Cents;
  /** Part consommée (1 = 100 %). */
  consumed: number;
  over: boolean;
  overBy: Cents;
  /** Part du revenu que représente le montant alloué. */
  shareOfIncome: number;
}

export interface BudgetSummary {
  income: Cents;
  incomeSource: IncomeSource;
  envelopes: EnvelopeStatus[];
  allocated: Cents;
  spent: Cents;
  remaining: Cents;
  consumed: number;
  over: boolean;
  overBy: Cents;
  /** Revenu non réparti dans des enveloppes. */
  unallocated: Cents;
  allocatedShare: number;
}

/**
 * Revenu servant de base aux enveloppes : le revenu de référence des paramètres, ou à
 * défaut les revenus réellement perçus dans le mois.
 */
export function budgetIncome(
  settings: Settings,
  transactions: readonly Transaction[],
  month: MonthKey,
): { amount: Cents; source: IncomeSource } {
  if (settings.monthlyIncomeReference !== undefined) {
    return { amount: settings.monthlyIncomeReference, source: 'reference' };
  }
  return { amount: monthTotals(transactions, month).income, source: 'actual' };
}

/** Montant d'une enveloppe : correction manuelle si présente, sinon % × revenu. */
export function envelopeAllocation(envelope: BudgetEnvelope, income: Cents): Cents {
  return envelope.manualOverride ?? Math.round((envelope.percentOfIncome / 100) * income);
}

export function computeBudget(
  envelopes: readonly BudgetEnvelope[],
  groups: ReadonlyMap<Id, CategoryGroup>,
  settings: Settings,
  transactions: readonly Transaction[],
  month: MonthKey,
): BudgetSummary {
  const { amount: income, source } = budgetIncome(settings, transactions, month);
  const expenses = expensesByGroup(transactions, month);

  const statuses = envelopes.map<EnvelopeStatus>((envelope) => {
    const allocated = envelopeAllocation(envelope, income);
    const spent = expenses.get(envelope.groupId) ?? 0;
    const remaining = allocated - spent;
    return {
      envelope,
      group: groups.get(envelope.groupId),
      mode: envelope.manualOverride !== undefined ? 'manual' : 'auto',
      allocated,
      spent,
      remaining,
      consumed: allocated === 0 ? (spent > 0 ? Infinity : 0) : spent / allocated,
      over: spent > allocated,
      overBy: Math.max(spent - allocated, 0),
      shareOfIncome: ratio(allocated, income),
    };
  });

  const allocated = statuses.reduce((sum, s) => sum + s.allocated, 0);
  const spent = statuses.reduce((sum, s) => sum + s.spent, 0);
  return {
    income,
    incomeSource: source,
    envelopes: statuses,
    allocated,
    spent,
    remaining: allocated - spent,
    consumed: allocated === 0 ? 0 : spent / allocated,
    over: spent > allocated,
    overBy: Math.max(spent - allocated, 0),
    unallocated: Math.max(income - allocated, 0),
    allocatedShare: ratio(allocated, income),
  };
}
