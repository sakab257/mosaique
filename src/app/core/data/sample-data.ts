import { addMonths, clampedDate, combineDateTime, monthOf, splitIso } from '../domain/dates';
import { AppData, IsoDate, RecurringRule, Transaction } from '../models';
import { createDefaultData } from './defaults';

type Seed = readonly [
  day: number,
  time: string,
  note: string,
  groupId: string,
  subId: string,
  accountId: string,
  euros: number,
];

/** Dépenses courantes répétées chaque mois (jour, heure, libellé, catégorie, compte, montant). */
const MONTHLY_EXPENSES: readonly Seed[] = [
  [2, '18:20', 'Carrefour Market', 'grp-alimentation', 'sub-courses', 'acc-card', 62.4],
  [4, '08:10', 'Boulangerie Paul', 'grp-alimentation', 'sub-boulangerie', 'acc-cash', 6.8],
  [6, '20:45', 'Cinéma UGC', 'grp-loisirs', 'sub-cinema', 'acc-card', 24],
  [9, '18:05', 'Lidl', 'grp-alimentation', 'sub-courses', 'acc-card', 48.9],
  [11, '12:30', 'Le Petit Bistrot', 'grp-alimentation', 'sub-restaurant', 'acc-card', 38.5],
  [14, '11:00', 'Pharmacie', 'grp-sante', 'sub-pharmacie', 'acc-card', 18.9],
  [16, '18:40', 'Carrefour Market', 'grp-alimentation', 'sub-courses', 'acc-card', 71.2],
  [18, '22:10', 'Uber', 'grp-transport', 'sub-taxi', 'acc-card', 16.4],
  [20, '15:30', 'Zara', 'grp-shopping', 'sub-vetements', 'acc-card', 59.99],
  [23, '19:00', 'Bar Le Comptoir', 'grp-loisirs', 'sub-sorties', 'acc-cash', 21],
  [24, '18:15', 'Monoprix', 'grp-alimentation', 'sub-courses', 'acc-card', 54.3],
  [27, '09:00', 'Station Total', 'grp-transport', 'sub-carburant', 'acc-card', 45],
];

const RULES: readonly Omit<RecurringRule, 'startDate' | 'active' | 'skippedDates'>[] = [
  {
    id: 'sample-salaire',
    type: 'income',
    amount: 280000,
    accountId: 'acc-bank',
    groupId: 'grp-revenus',
    subcategoryId: 'sub-salaire',
    note: 'Salaire',
    frequency: 'monthly',
  },
  {
    id: 'sample-loyer',
    type: 'expense',
    amount: 85000,
    accountId: 'acc-bank',
    groupId: 'grp-logement',
    subcategoryId: 'sub-loyer',
    note: 'Loyer',
    frequency: 'monthly',
  },
  {
    id: 'sample-retrait',
    type: 'transfer',
    amount: 10000,
    accountId: 'acc-bank',
    toAccountId: 'acc-cash',
    note: 'Retrait espèces',
    frequency: 'monthly',
  },
  {
    id: 'sample-spotify',
    type: 'expense',
    amount: 1099,
    accountId: 'acc-card',
    groupId: 'grp-factures',
    subcategoryId: 'sub-abonnements',
    note: 'Spotify',
    frequency: 'monthly',
  },
  {
    id: 'sample-navigo',
    type: 'expense',
    amount: 8640,
    accountId: 'acc-bank',
    groupId: 'grp-transport',
    subcategoryId: 'sub-transports-en-commun',
    note: 'Navigo mensuel',
    frequency: 'monthly',
  },
  {
    id: 'sample-free',
    type: 'expense',
    amount: 1599,
    accountId: 'acc-bank',
    groupId: 'grp-factures',
    subcategoryId: 'sub-telephone',
    note: 'Free Mobile',
    frequency: 'monthly',
  },
  {
    id: 'sample-yoga',
    type: 'expense',
    amount: 1200,
    accountId: 'acc-card',
    groupId: 'grp-loisirs',
    subcategoryId: 'sub-sport',
    note: 'Cours de yoga',
    frequency: 'weekly',
  },
];

/** Jour de départ de chaque règle dans son premier mois. */
const RULE_DAYS: Record<string, [number, string]> = {
  'sample-salaire': [1, '09:00'],
  'sample-loyer': [5, '08:00'],
  'sample-retrait': [10, '10:00'],
  'sample-spotify': [12, '06:00'],
  'sample-navigo': [27, '07:00'],
  'sample-free': [29, '07:00'],
  'sample-yoga': [2, '19:00'],
};

/**
 * Jeu de données d'exemple réaliste sur les trois derniers mois, relatif à `today` :
 * soldes initiaux, dépenses courantes, règles récurrentes (leurs échéances sont créées
 * par la génération automatique), enveloppes et revenu de référence.
 */
export function createSampleData(today: IsoDate): AppData {
  const data = createDefaultData();
  const start = addMonths(monthOf(today), -2);
  data.accounts = data.accounts.map((a) => ({
    ...a,
    initialBalance: { 'acc-cash': 12000, 'acc-card': 220000, 'acc-bank': 210000 }[a.id] ?? 0,
  }));

  const transactions: Transaction[] = [];
  for (let m = 0; m < 3; m++) {
    const { year, month } = splitIso(`${addMonths(start, m)}-01`);
    for (const [day, time, note, groupId, subcategoryId, accountId, euros] of MONTHLY_EXPENSES) {
      const date = clampedDate(year, month, day);
      if (date > today) continue;
      transactions.push({
        id: `sample-${m}-${day}-${subcategoryId}`,
        type: 'expense',
        amount: Math.round(euros * 100) + m * 37,
        accountId,
        groupId,
        subcategoryId,
        date: combineDateTime(date, time),
        note,
      });
    }
  }

  const { year, month } = splitIso(`${start}-01`);
  data.transactions = transactions;
  data.rules = RULES.map((rule) => {
    const [day, time] = RULE_DAYS[rule.id];
    return {
      ...rule,
      startDate: combineDateTime(clampedDate(year, month, day), time),
      active: rule.id !== 'sample-yoga',
      skippedDates: [],
    };
  });
  data.envelopes = [
    { id: 'sample-env-logement', groupId: 'grp-logement', percentOfIncome: 31 },
    { id: 'sample-env-alimentation', groupId: 'grp-alimentation', percentOfIncome: 15 },
    { id: 'sample-env-transport', groupId: 'grp-transport', percentOfIncome: 6 },
    { id: 'sample-env-loisirs', groupId: 'grp-loisirs', percentOfIncome: 3 },
    {
      id: 'sample-env-factures',
      groupId: 'grp-factures',
      percentOfIncome: 2,
      manualOverride: 4000,
    },
  ];
  data.settings = { currency: 'EUR', monthlyIncomeReference: 280000 };
  return data;
}
