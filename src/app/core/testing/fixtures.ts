import { createDefaultData } from '../data/defaults';
import { AppData, Transaction } from '../models';

let sequence = 0;

/** Transaction de test : dépense de 10 € sur la carte, le 28/08/2026, sauf surcharge. */
export function tx(overrides: Partial<Transaction> = {}): Transaction {
  sequence += 1;
  return {
    id: `tx-${sequence}`,
    type: 'expense',
    amount: 1000,
    accountId: 'acc-card',
    groupId: 'grp-alimentation',
    date: '2026-08-28T12:00',
    note: '',
    ...overrides,
  };
}

/** Données par défaut enrichies (soldes initiaux, transactions). */
export function dataWith(overrides: Partial<AppData> = {}): AppData {
  const data = createDefaultData();
  data.accounts = data.accounts.map((a) => ({
    ...a,
    initialBalance: { 'acc-cash': 20000, 'acc-card': 150000, 'acc-bank': 320000 }[a.id] ?? 0,
  }));
  return { ...data, ...overrides };
}
