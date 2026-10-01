import { tx } from '../testing/fixtures';
import { UNCATEGORIZED, expensesByGroup, monthTotals, transactionsInMonth } from './stats';

describe('agrégats mensuels', () => {
  const transactions = [
    tx({ type: 'income', amount: 280000, groupId: 'grp-revenus', date: '2026-08-01T09:00' }),
    tx({ amount: 85000, groupId: 'grp-logement', date: '2026-08-05T08:00' }),
    tx({ amount: 5430, groupId: 'grp-alimentation', date: '2026-08-28T18:42' }),
    tx({ amount: 680, groupId: 'grp-alimentation', date: '2026-08-31T23:59' }),
    tx({ amount: 1200, groupId: undefined, date: '2026-08-12T10:00' }),
    tx({ type: 'transfer', amount: 10000, toAccountId: 'acc-cash', date: '2026-08-10T10:00' }),
    tx({ amount: 99999, groupId: 'grp-alimentation', date: '2026-09-01T00:00' }),
    tx({ amount: 99999, groupId: 'grp-alimentation', date: '2026-07-31T23:59' }),
  ];

  it('ne retient que les transactions du mois, bornes incluses', () => {
    expect(transactionsInMonth(transactions, '2026-08')).toHaveLength(6);
  });

  it('totalise revenus et dépenses, sans compter les virements', () => {
    expect(monthTotals(transactions, '2026-08')).toEqual({
      income: 280000,
      expense: 85000 + 5430 + 680 + 1200,
      net: 280000 - 92310,
      count: 6,
    });
  });

  it('renvoie des totaux nuls pour un mois vide', () => {
    expect(monthTotals(transactions, '2026-03')).toEqual({
      income: 0,
      expense: 0,
      net: 0,
      count: 0,
    });
  });

  it('répartit les dépenses par groupe, y compris sans catégorie', () => {
    const byGroup = expensesByGroup(transactions, '2026-08');
    expect(Object.fromEntries(byGroup)).toEqual({
      'grp-logement': 85000,
      'grp-alimentation': 6110,
      [UNCATEGORIZED]: 1200,
    });
  });
});
