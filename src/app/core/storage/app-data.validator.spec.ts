import { createDefaultData } from '../data/defaults';
import { AppData } from '../models';
import { parseAppData } from './app-data.validator';
import { InvalidDataError } from './errors';

const raw = (data: AppData) => JSON.parse(JSON.stringify(data)) as Record<string, unknown>;

function withTransaction(tx: Record<string, unknown>) {
  const doc = raw(createDefaultData());
  doc['transactions'] = [tx];
  return doc;
}

const validTx = {
  id: 't1',
  type: 'expense',
  amount: 5430,
  accountId: 'acc-card',
  groupId: 'grp-alimentation',
  date: '2026-08-28T18:42',
  note: 'Carrefour Market',
};

describe('parseAppData', () => {
  it('accepte les données par défaut', () => {
    const data = createDefaultData();
    expect(parseAppData(raw(data))).toEqual(data);
  });

  it('accepte une transaction valide et complète une date sans heure', () => {
    const data = parseAppData(withTransaction({ ...validTx, date: '2026-08-28' }));
    expect(data.transactions[0].date).toBe('2026-08-28T00:00');
  });

  it('n’introduit pas de clés undefined pour les champs optionnels', () => {
    const data = parseAppData(withTransaction(validTx));
    expect(Object.keys(data.transactions[0])).not.toContain('toAccountId');
  });

  it.each([
    ['montant négatif', { amount: -10 }],
    ['montant décimal', { amount: 12.5 }],
    ['type inconnu', { type: 'refund' }],
    ['date invalide', { date: '2026-02-30T10:00' }],
    ['compte inconnu', { accountId: 'nope' }],
    ['virement sans destination', { type: 'transfer' }],
  ])('rejette : %s', (_label, patch) => {
    expect(() => parseAppData(withTransaction({ ...validTx, ...patch }))).toThrow(InvalidDataError);
  });

  it('rejette une liste manquante avec un message en français', () => {
    const doc = raw(createDefaultData());
    delete doc['rules'];
    expect(() => parseAppData(doc)).toThrow('Données invalides (rules) : liste attendue.');
  });

  it('rejette une enveloppe hors bornes ou sur une catégorie inconnue', () => {
    const doc = raw(createDefaultData());
    doc['envelopes'] = [{ id: 'e1', groupId: 'grp-loisirs', percentOfIncome: 120 }];
    expect(() => parseAppData(doc)).toThrow(InvalidDataError);
    doc['envelopes'] = [{ id: 'e1', groupId: 'grp-inconnu', percentOfIncome: 5 }];
    expect(() => parseAppData(doc)).toThrow(/catégorie inconnue/);
  });
});
