import { dataWith, tx } from '../testing/fixtures';
import { buildCatalog } from './catalog';
import {
  TransactionFilters,
  groupByDay,
  matchesFilters,
  normalizeText,
  transactionTitle,
} from './transaction-query';

const data = dataWith();
const catalog = buildCatalog(data.accounts, data.groups, data.subcategories);
const filters = (overrides: Partial<TransactionFilters> = {}): TransactionFilters => ({
  month: '2026-08',
  search: '',
  accountId: null,
  groupId: null,
  type: null,
  ...overrides,
});

describe('requêtes sur les transactions', () => {
  it('normalizeText ignore casse et accents', () => {
    expect(normalizeText('  Café Crème ')).toBe('cafe creme');
  });

  describe('transactionTitle', () => {
    it('privilégie la note, puis la sous-catégorie, puis le groupe, puis le type', () => {
      expect(transactionTitle(tx({ note: 'Carrefour' }), catalog)).toBe('Carrefour');
      expect(transactionTitle(tx({ subcategoryId: 'sub-courses' }), catalog)).toBe('Courses');
      expect(transactionTitle(tx({}), catalog)).toBe('Alimentation');
      expect(
        transactionTitle(
          tx({ type: 'transfer', groupId: undefined, toAccountId: 'acc-cash' }),
          catalog,
        ),
      ).toBe('Virement');
    });
  });

  describe('matchesFilters', () => {
    const courses = tx({ note: 'Carrefour Market', subcategoryId: 'sub-courses', amount: 5430 });

    it('filtre par mois', () => {
      expect(matchesFilters(courses, filters(), catalog)).toBe(true);
      expect(matchesFilters(courses, filters({ month: '2026-09' }), catalog)).toBe(false);
    });

    it('recherche dans la note, la catégorie, le compte et le montant', () => {
      for (const search of [
        'carrefour',
        'COURSES',
        'alimentation',
        'carte',
        '54,30',
        'market carre',
      ]) {
        expect(matchesFilters(courses, filters({ search }), catalog), search).toBe(true);
      }
      expect(matchesFilters(courses, filters({ search: 'loyer' }), catalog)).toBe(false);
    });

    it('filtre par type et par catégorie', () => {
      expect(matchesFilters(courses, filters({ type: 'income' }), catalog)).toBe(false);
      expect(matchesFilters(courses, filters({ groupId: 'grp-alimentation' }), catalog)).toBe(true);
      expect(matchesFilters(courses, filters({ groupId: 'grp-loisirs' }), catalog)).toBe(false);
    });

    it('un virement correspond au filtre de ses deux comptes', () => {
      const transfer = tx({ type: 'transfer', accountId: 'acc-bank', toAccountId: 'acc-cash' });
      expect(matchesFilters(transfer, filters({ accountId: 'acc-bank' }), catalog)).toBe(true);
      expect(matchesFilters(transfer, filters({ accountId: 'acc-cash' }), catalog)).toBe(true);
      expect(matchesFilters(transfer, filters({ accountId: 'acc-card' }), catalog)).toBe(false);
    });
  });

  it('groupByDay trie par jour décroissant et totalise hors virements', () => {
    const days = groupByDay([
      tx({ id: 'a', date: '2026-08-27T07:00', amount: 8640 }),
      tx({ id: 'b', date: '2026-08-28T08:15', amount: 680 }),
      tx({ id: 'c', date: '2026-08-28T18:42', amount: 5430 }),
      tx({ id: 'd', date: '2026-08-27T11:00', type: 'income', amount: 3500 }),
      tx({
        id: 'e',
        date: '2026-08-27T12:00',
        type: 'transfer',
        toAccountId: 'acc-cash',
        amount: 10000,
      }),
    ]);
    expect(days.map((d) => d.date)).toEqual(['2026-08-28', '2026-08-27']);
    expect(days[0].transactions.map((t) => t.id)).toEqual(['c', 'b']);
    expect(days[0].total).toBe(-6110);
    expect(days[1].total).toBe(3500 - 8640);
  });
});
