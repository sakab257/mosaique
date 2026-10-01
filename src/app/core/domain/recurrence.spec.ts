import { AppData, RecurringRule } from '../models';
import { dataWith, tx } from '../testing/fixtures';
import {
  generateDueTransactions,
  nextOccurrence,
  nthOccurrence,
  occurrencesBetween,
  upcomingOccurrences,
} from './recurrence';
import { deleteRule, setRuleActive, updateRule } from './rule-ops';
import { removeTransaction } from './transaction-ops';

function rule(overrides: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: 'r-loyer',
    type: 'expense',
    amount: 85000,
    accountId: 'acc-bank',
    groupId: 'grp-logement',
    subcategoryId: 'sub-loyer',
    note: 'Loyer',
    frequency: 'monthly',
    startDate: '2026-01-05T08:00',
    active: true,
    skippedDates: [],
    ...overrides,
  };
}

let ids = 0;
const nextId = () => `gen-${++ids}`;
const generate = (data: AppData, today: string) => generateDueTransactions(data, today, nextId);
const dates = (data: AppData) => data.transactions.map((t) => t.occurrenceDate).sort();

describe('récurrences', () => {
  describe('calendrier', () => {
    it('hebdomadaire : tous les 7 jours', () => {
      const r = rule({ frequency: 'weekly', startDate: '2026-09-01T18:00' });
      expect([0, 1, 2, 5].map((n) => nthOccurrence(r, n))).toEqual([
        '2026-09-01',
        '2026-09-08',
        '2026-09-15',
        '2026-10-06',
      ]);
    });

    it('règle du 31 : dernier jour des mois courts, puis à nouveau le 31', () => {
      const r = rule({ startDate: '2026-01-31T09:00' });
      expect(occurrencesBetween(r, '2026-01-01', '2026-07-31')).toEqual([
        '2026-01-31',
        '2026-02-28',
        '2026-03-31',
        '2026-04-30',
        '2026-05-31',
        '2026-06-30',
        '2026-07-31',
      ]);
    });

    it('règle du 31 en année bissextile : 29 février', () => {
      expect(nthOccurrence(rule({ startDate: '2028-01-31' }), 1)).toBe('2028-02-29');
    });

    it('annuelle au 29 février : le 28 les années non bissextiles', () => {
      const r = rule({ frequency: 'yearly', startDate: '2024-02-29T10:00' });
      expect([0, 1, 2, 3, 4].map((n) => nthOccurrence(r, n))).toEqual([
        '2024-02-29',
        '2025-02-28',
        '2026-02-28',
        '2027-02-28',
        '2028-02-29',
      ]);
    });

    it('respecte la date de fin (incluse) et les dates ignorées', () => {
      const r = rule({ endDate: '2026-05-05', skippedDates: ['2026-03-05'] });
      expect(occurrencesBetween(r, '2026-01-01', '2026-12-31')).toEqual([
        '2026-01-05',
        '2026-02-05',
        '2026-04-05',
        '2026-05-05',
      ]);
    });

    it('nextOccurrence : prochaine échéance, ou null après la fin', () => {
      expect(nextOccurrence(rule(), '2026-09-06')).toBe('2026-10-05');
      expect(nextOccurrence(rule(), '2026-10-05')).toBe('2026-10-05');
      expect(nextOccurrence(rule({ skippedDates: ['2026-10-05'] }), '2026-09-06')).toBe(
        '2026-11-05',
      );
      expect(nextOccurrence(rule({ endDate: '2026-09-30' }), '2026-09-06')).toBeNull();
      expect(nextOccurrence(rule({ startDate: '2027-01-15' }), '2026-09-06')).toBe('2027-01-15');
    });
  });

  describe('génération automatique', () => {
    it('rattrape plusieurs mois avec les dates d’origine', () => {
      const data = dataWith({ rules: [rule({ lastGeneratedDate: '2026-06-05' })] });
      const { data: next, created } = generate(data, '2026-09-30');
      expect(created.map((t) => t.date)).toEqual([
        '2026-07-05T08:00',
        '2026-08-05T08:00',
        '2026-09-05T08:00',
      ]);
      expect(created[0]).toMatchObject({
        type: 'expense',
        amount: 85000,
        accountId: 'acc-bank',
        groupId: 'grp-logement',
        subcategoryId: 'sub-loyer',
        note: 'Loyer',
        recurringRuleId: 'r-loyer',
        occurrenceDate: '2026-07-05',
      });
      expect(next.rules[0].lastGeneratedDate).toBe('2026-09-30');
    });

    it('part de la date de départ à la première exécution, aujourd’hui inclus', () => {
      const data = dataWith({ rules: [rule({ startDate: '2026-08-05T08:00' })] });
      expect(dates(generate(data, '2026-10-05').data)).toEqual([
        '2026-08-05',
        '2026-09-05',
        '2026-10-05',
      ]);
    });

    it('est idempotente : un second appel ne crée rien et renvoie le même état', () => {
      const data = dataWith({ rules: [rule()] });
      const first = generate(data, '2026-09-30');
      expect(first.created).toHaveLength(9);
      const second = generate(first.data, '2026-09-30');
      expect(second.created).toEqual([]);
      expect(second.data).toBe(first.data);
    });

    it('ne crée jamais de doublon, même si l’état de génération est perdu', () => {
      const once = generate(dataWith({ rules: [rule()] }), '2026-09-30').data;
      const reset = {
        ...once,
        rules: once.rules.map((r) => ({ ...r, lastGeneratedDate: undefined })),
      };
      const again = generate(reset, '2026-09-30');
      expect(again.created).toEqual([]);
      expect(again.data.transactions).toHaveLength(9);
    });

    it('ne recrée pas une occurrence supprimée (skippedDates)', () => {
      const generated = generate(
        dataWith({ rules: [rule({ startDate: '2026-08-05' })] }),
        '2026-09-30',
      );
      const august = generated.data.transactions.find((t) => t.occurrenceDate === '2026-08-05')!;
      const { data } = removeTransaction(generated.data, august.id);
      expect(data.rules[0].skippedDates).toEqual(['2026-08-05']);

      const reset = {
        ...data,
        rules: data.rules.map((r) => ({ ...r, lastGeneratedDate: undefined })),
      };
      expect(dates(generate(reset, '2026-09-30').data)).toEqual(['2026-09-05']);
    });

    it('s’arrête à la date de fin', () => {
      const data = dataWith({ rules: [rule({ endDate: '2026-03-31' })] });
      const { data: next } = generate(data, '2026-09-30');
      expect(dates(next)).toEqual(['2026-01-05', '2026-02-05', '2026-03-05']);
      expect(next.rules[0].lastGeneratedDate).toBe('2026-03-31');
      expect(generate(next, '2026-12-31').data).toBe(next);
    });

    it('ignore une règle en pause et ne rattrape pas la pause à la reprise', () => {
      const paused = dataWith({
        rules: [rule({ active: false, lastGeneratedDate: '2026-06-05' })],
      });
      expect(generate(paused, '2026-09-30').data).toBe(paused);

      const resumed = setRuleActive(paused, 'r-loyer', true, '2026-09-30');
      expect(resumed.rules[0].lastGeneratedDate).toBe('2026-09-29');
      expect(generate(resumed, '2026-09-30').created).toEqual([]);
      expect(dates(generate(resumed, '2026-10-05').data)).toEqual(['2026-10-05']);
    });

    it('ne génère rien pour une règle qui démarre dans le futur', () => {
      const data = dataWith({ rules: [rule({ startDate: '2026-11-01' })] });
      expect(generate(data, '2026-09-30').data).toBe(data);
    });

    it('génère les virements sans catégorie', () => {
      const transfer = rule({
        id: 'r-retrait',
        type: 'transfer',
        toAccountId: 'acc-cash',
        startDate: '2026-09-10T10:00',
      });
      const [created] = generate(dataWith({ rules: [transfer] }), '2026-09-30').created;
      expect(created).toMatchObject({
        type: 'transfer',
        accountId: 'acc-bank',
        toAccountId: 'acc-cash',
      });
      expect(created.groupId).toBeUndefined();
    });
  });

  describe('modification et suppression de règle', () => {
    it('modifier une règle ne touche pas l’historique', () => {
      const { data } = generate(
        dataWith({ rules: [rule({ startDate: '2026-08-05' })] }),
        '2026-09-30',
      );
      const updated = updateRule(data, 'r-loyer', {
        ...data.rules[0],
        amount: 90000,
        startDate: '2026-10-05T08:00',
      });
      expect(updated.transactions.map((t) => t.amount)).toEqual([85000, 85000]);
      expect(updated.rules[0]).toMatchObject({ amount: 90000, lastGeneratedDate: '2026-09-30' });
      const { created } = generate(updated, '2026-10-05');
      expect(created.map((t) => t.amount)).toEqual([90000]);
    });

    it('supprimer une règle conserve ou supprime ses transactions', () => {
      const manual = tx({ id: 'manuelle' });
      const base = generate(
        dataWith({ rules: [rule({ startDate: '2026-08-05' })], transactions: [manual] }),
        '2026-09-30',
      ).data;

      const kept = deleteRule(base, 'r-loyer', true);
      expect(kept.rules).toEqual([]);
      expect(kept.transactions).toHaveLength(3);
      expect(kept.transactions.some((t) => t.recurringRuleId)).toBe(false);

      const removed = deleteRule(base, 'r-loyer', false);
      expect(removed.transactions).toEqual([manual]);
    });
  });

  describe('échéances à venir', () => {
    const rules = [
      rule({ lastGeneratedDate: '2026-09-30' }),
      rule({
        id: 'r-salaire',
        type: 'income',
        amount: 280000,
        note: 'Salaire',
        startDate: '2026-01-01T09:00',
        lastGeneratedDate: '2026-09-30',
      }),
      rule({
        id: 'r-yoga',
        note: 'Yoga',
        frequency: 'weekly',
        startDate: '2026-09-01T19:00',
        lastGeneratedDate: '2026-09-30',
      }),
      rule({ id: 'r-pause', note: 'Pause', active: false, startDate: '2026-01-10' }),
      rule({ id: 'r-fin', note: 'Fin', endDate: '2026-10-02', startDate: '2026-01-20' }),
    ];

    it('liste les 30 prochains jours, triées, sans les règles en pause ou terminées', () => {
      const upcoming = upcomingOccurrences(rules, '2026-09-30', 30);
      expect(upcoming.map((o) => `${o.date} ${o.rule.note}`)).toEqual([
        '2026-10-01 Salaire',
        '2026-10-05 Loyer',
        '2026-10-06 Yoga',
        '2026-10-13 Yoga',
        '2026-10-20 Yoga',
        '2026-10-27 Yoga',
      ]);
    });

    it('n’inclut ni aujourd’hui ni au-delà de 30 jours', () => {
      const upcoming = upcomingOccurrences([rule({ startDate: '2026-09-30' })], '2026-09-30', 30);
      expect(upcoming.map((o) => o.date)).toEqual(['2026-10-30']);
    });
  });
});
