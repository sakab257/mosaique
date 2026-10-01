import { RecurringRule } from '../models';
import { dataWith, tx } from '../testing/fixtures';
import {
  addTransaction,
  removeTransaction,
  restoreTransaction,
  updateTransaction,
} from './transaction-ops';

const rule: RecurringRule = {
  id: 'rule-loyer',
  type: 'expense',
  amount: 85000,
  accountId: 'acc-bank',
  groupId: 'grp-logement',
  note: 'Loyer',
  frequency: 'monthly',
  startDate: '2026-01-05T08:00',
  active: true,
  lastGeneratedDate: '2026-08-05',
  skippedDates: [],
};

describe('mutations de transactions', () => {
  it('nettoie les champs incohérents avec le type', () => {
    const data = addTransaction(
      dataWith(),
      tx({
        id: 'v',
        type: 'transfer',
        accountId: 'acc-bank',
        toAccountId: 'acc-cash',
        note: '  Retrait  ',
      }),
    );
    expect(data.transactions[0]).toEqual({
      id: 'v',
      type: 'transfer',
      amount: 1000,
      accountId: 'acc-bank',
      toAccountId: 'acc-cash',
      date: '2026-08-28T12:00',
      note: 'Retrait',
    });
  });

  it('écarte une sous-catégorie qui n’appartient pas au groupe', () => {
    const data = addTransaction(
      dataWith(),
      tx({ groupId: 'grp-loisirs', subcategoryId: 'sub-courses' }),
    );
    expect(data.transactions[0].subcategoryId).toBeUndefined();
  });

  it('modifier une transaction générée conserve son lien avec la règle', () => {
    const generated = tx({ id: 'g', recurringRuleId: rule.id, occurrenceDate: '2026-08-05' });
    const data = updateTransaction(dataWith({ transactions: [generated], rules: [rule] }), 'g', {
      ...generated,
      amount: 90000,
      recurringRuleId: undefined,
      occurrenceDate: undefined,
    });
    expect(data.transactions[0]).toMatchObject({
      amount: 90000,
      recurringRuleId: rule.id,
      occurrenceDate: '2026-08-05',
    });
    expect(data.rules[0]).toBe(rule);
  });

  it('supprimer une transaction manuelle ne touche pas aux règles', () => {
    const manual = tx({ id: 'm' });
    const initial = dataWith({ transactions: [manual], rules: [rule] });
    const { data, removed } = removeTransaction(initial, 'm');
    expect(removed).toBe(manual);
    expect(data.transactions).toEqual([]);
    expect(data.rules).toBe(initial.rules);
  });

  it('supprimer une transaction générée ajoute sa date aux skippedDates', () => {
    const generated = tx({ id: 'g', recurringRuleId: rule.id, occurrenceDate: '2026-08-05' });
    const { data } = removeTransaction(dataWith({ transactions: [generated], rules: [rule] }), 'g');
    expect(data.rules[0].skippedDates).toEqual(['2026-08-05']);
  });

  it('annuler la suppression restaure la transaction et la date d’occurrence', () => {
    const generated = tx({ id: 'g', recurringRuleId: rule.id, occurrenceDate: '2026-08-05' });
    const initial = dataWith({ transactions: [generated], rules: [rule] });
    const { data, removed } = removeTransaction(initial, 'g');
    const restored = restoreTransaction(data, removed!);
    expect(restored.transactions).toEqual([generated]);
    expect(restored.rules[0].skippedDates).toEqual([]);
    expect(restoreTransaction(restored, removed!)).toBe(restored);
  });

  it('supprimer un identifiant inconnu ne change rien', () => {
    const initial = dataWith();
    expect(removeTransaction(initial, 'inconnu')).toEqual({ data: initial, removed: null });
  });
});
