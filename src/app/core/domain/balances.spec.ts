import { dataWith, tx } from '../testing/fixtures';
import { computeBalances, sumBalances } from './balances';

describe('soldes des comptes', () => {
  const { accounts } = dataWith();

  it('partent du solde initial', () => {
    const balances = computeBalances(accounts, []);
    expect(Object.fromEntries(balances)).toEqual({
      'acc-cash': 20000,
      'acc-card': 150000,
      'acc-bank': 320000,
    });
  });

  it('solde = initial + revenus − dépenses', () => {
    const balances = computeBalances(accounts, [
      tx({ type: 'income', amount: 280000, accountId: 'acc-bank' }),
      tx({ type: 'expense', amount: 85000, accountId: 'acc-bank' }),
      tx({ type: 'expense', amount: 5430, accountId: 'acc-card' }),
    ]);
    expect(balances.get('acc-bank')).toBe(320000 + 280000 - 85000);
    expect(balances.get('acc-card')).toBe(150000 - 5430);
    expect(balances.get('acc-cash')).toBe(20000);
  });

  it('un virement débite la source, crédite la destination et laisse le total inchangé', () => {
    const transfer = tx({
      type: 'transfer',
      amount: 10000,
      accountId: 'acc-bank',
      toAccountId: 'acc-cash',
      groupId: undefined,
    });
    const before = sumBalances(computeBalances(accounts, []));
    const balances = computeBalances(accounts, [transfer]);
    expect(balances.get('acc-bank')).toBe(310000);
    expect(balances.get('acc-cash')).toBe(30000);
    expect(sumBalances(balances)).toBe(before);
  });

  it('ignore les transactions postérieures à la date donnée', () => {
    const balances = computeBalances(
      accounts,
      [
        tx({ amount: 1000, date: '2026-09-30T23:59' }),
        tx({ amount: 5000, date: '2026-10-01T00:00' }),
      ],
      '2026-09-30',
    );
    expect(balances.get('acc-card')).toBe(149000);
  });

  it('ignore les transactions vers un compte inconnu', () => {
    const balances = computeBalances(accounts, [tx({ accountId: 'acc-supprime' })]);
    expect(sumBalances(balances)).toBe(490000);
  });
});
