import { BudgetEnvelope, Settings } from '../models';
import { dataWith, tx } from '../testing/fixtures';
import { budgetIncome, computeBudget, envelopeAllocation } from './budget';
import { indexById } from './catalog';

const groups = indexById(dataWith().groups);
const envelopes: BudgetEnvelope[] = [
  { id: 'e-logement', groupId: 'grp-logement', percentOfIncome: 31 },
  { id: 'e-alim', groupId: 'grp-alimentation', percentOfIncome: 15 },
  { id: 'e-loisirs', groupId: 'grp-loisirs', percentOfIncome: 5, manualOverride: 15000 },
];
const transactions = [
  tx({ type: 'income', amount: 280000, groupId: 'grp-revenus', date: '2026-08-01T09:00' }),
  tx({ amount: 85000, groupId: 'grp-logement', date: '2026-08-05T08:00' }),
  tx({ amount: 31240, groupId: 'grp-alimentation', date: '2026-08-20T10:00' }),
  tx({ amount: 18430, groupId: 'grp-loisirs', date: '2026-08-21T20:00' }),
  tx({ amount: 5000, groupId: 'grp-shopping', date: '2026-08-22T15:00' }),
  tx({ amount: 99900, groupId: 'grp-alimentation', date: '2026-07-31T10:00' }),
];
const withReference: Settings = { currency: 'EUR', monthlyIncomeReference: 280000 };

describe('budget par enveloppes', () => {
  it('montant = % × revenu, ou correction manuelle', () => {
    expect(envelopeAllocation(envelopes[0], 280000)).toBe(86800);
    expect(envelopeAllocation(envelopes[2], 280000)).toBe(15000);
    expect(envelopeAllocation({ id: 'x', groupId: 'g', percentOfIncome: 7.5 }, 333333)).toBe(25000);
  });

  it('revenu de référence prioritaire, sinon revenus réels du mois', () => {
    expect(budgetIncome(withReference, transactions, '2026-08')).toEqual({
      amount: 280000,
      source: 'reference',
    });
    expect(budgetIncome({ currency: 'EUR' }, transactions, '2026-08')).toEqual({
      amount: 280000,
      source: 'actual',
    });
    expect(budgetIncome({ currency: 'EUR' }, transactions, '2026-09').amount).toBe(0);
  });

  it('calcule alloué, dépensé, restant et % consommé par enveloppe', () => {
    const budget = computeBudget(envelopes, groups, withReference, transactions, '2026-08');
    const [logement, alim, loisirs] = budget.envelopes;
    expect(logement).toMatchObject({
      allocated: 86800,
      spent: 85000,
      remaining: 1800,
      over: false,
      mode: 'auto',
    });
    expect(alim).toMatchObject({ allocated: 42000, spent: 31240, remaining: 10760 });
    expect(alim.consumed).toBeCloseTo(0.7438, 3);
    expect(loisirs).toMatchObject({
      mode: 'manual',
      allocated: 15000,
      spent: 18430,
      remaining: -3430,
      over: true,
      overBy: 3430,
    });
    expect(logement.group?.name).toBe('Logement');
  });

  it('agrège le mois et calcule le non alloué (dépenses hors enveloppes exclues)', () => {
    const budget = computeBudget(envelopes, groups, withReference, transactions, '2026-08');
    expect(budget).toMatchObject({
      income: 280000,
      allocated: 86800 + 42000 + 15000,
      spent: 85000 + 31240 + 18430,
      remaining: 143800 - 134670,
      over: false,
      overBy: 0,
      unallocated: 280000 - 143800,
    });
    expect(budget.allocatedShare).toBeCloseTo(0.5136, 3);
  });

  it('signale le dépassement du budget total', () => {
    const tight: BudgetEnvelope[] = [{ id: 'e', groupId: 'grp-logement', percentOfIncome: 10 }];
    const budget = computeBudget(tight, groups, withReference, transactions, '2026-08');
    expect(budget).toMatchObject({ allocated: 28000, spent: 85000, over: true, overBy: 57000 });
  });

  it('enveloppe à 0 € avec dépenses : consommation infinie, sans division par zéro', () => {
    const zero: BudgetEnvelope[] = [{ id: 'z', groupId: 'grp-logement', percentOfIncome: 0 }];
    const [status] = computeBudget(zero, groups, withReference, transactions, '2026-08').envelopes;
    expect(status.consumed).toBe(Infinity);
    expect(status.over).toBe(true);
  });
});
