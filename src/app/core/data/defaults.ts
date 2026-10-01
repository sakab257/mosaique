import { Account, AppData, CURRENT_SCHEMA_VERSION, CategoryGroup, Subcategory } from '../models';
import { PALETTE } from './palette';

export const DEFAULT_ACCOUNTS: readonly Account[] = [
  { id: 'acc-cash', name: 'Cash', type: 'cash', initialBalance: 0, color: PALETTE.mint },
  {
    id: 'acc-card',
    name: 'Carte bancaire',
    type: 'card',
    initialBalance: 0,
    color: PALETTE.violet,
  },
  { id: 'acc-bank', name: 'Banque', type: 'bank', initialBalance: 0, color: PALETTE.sky },
];

type GroupSeed = Omit<CategoryGroup, 'id'> & {
  key: string;
  subs: readonly (readonly [string, string, string])[];
};

/** Groupes par défaut : [clé, nom, icône] pour chaque sous-catégorie. */
const GROUP_SEEDS: readonly GroupSeed[] = [
  {
    key: 'alimentation',
    name: 'Alimentation',
    icon: 'shopping_cart',
    color: PALETTE.mint,
    kind: 'expense',
    subs: [
      ['courses', 'Courses', 'shopping_cart'],
      ['restaurant', 'Restaurant', 'restaurant'],
      ['boulangerie', 'Boulangerie', 'bakery_dining'],
    ],
  },
  {
    key: 'transport',
    name: 'Transport',
    icon: 'directions_bus',
    color: PALETTE.orange,
    kind: 'expense',
    subs: [
      ['transports-en-commun', 'Transports en commun', 'train'],
      ['carburant', 'Carburant', 'local_gas_station'],
      ['taxi', 'Taxi', 'local_taxi'],
    ],
  },
  {
    key: 'logement',
    name: 'Logement',
    icon: 'home',
    color: PALETTE.sky,
    kind: 'expense',
    subs: [
      ['loyer', 'Loyer', 'key'],
      ['assurance', 'Assurance', 'shield'],
      ['energie', 'Énergie', 'bolt'],
    ],
  },
  {
    key: 'loisirs',
    name: 'Loisirs',
    icon: 'confirmation_number',
    color: PALETTE.pink,
    kind: 'expense',
    subs: [
      ['cinema', 'Cinéma', 'movie'],
      ['sorties', 'Sorties', 'local_bar'],
      ['sport', 'Sport', 'fitness_center'],
    ],
  },
  {
    key: 'sante',
    name: 'Santé',
    icon: 'medical_services',
    color: PALETTE.lime,
    kind: 'expense',
    subs: [
      ['medecin', 'Médecin', 'medical_services'],
      ['pharmacie', 'Pharmacie', 'local_pharmacy'],
      ['mutuelle', 'Mutuelle', 'health_and_safety'],
    ],
  },
  {
    key: 'shopping',
    name: 'Shopping',
    icon: 'shopping_bag',
    color: PALETTE.violet,
    kind: 'expense',
    subs: [
      ['vetements', 'Vêtements', 'checkroom'],
      ['high-tech', 'High-tech', 'devices'],
      ['maison', 'Maison', 'chair'],
    ],
  },
  {
    key: 'factures',
    name: 'Factures',
    icon: 'receipt_long',
    color: PALETTE.yellow,
    kind: 'expense',
    subs: [
      ['telephone', 'Téléphone', 'smartphone'],
      ['internet', 'Internet', 'wifi'],
      ['abonnements', 'Abonnements', 'subscriptions'],
    ],
  },
  {
    key: 'autres',
    name: 'Autres',
    icon: 'more_horiz',
    color: PALETTE.slate,
    kind: 'expense',
    subs: [
      ['cadeaux', 'Cadeaux', 'redeem'],
      ['divers', 'Divers', 'more_horiz'],
    ],
  },
  {
    key: 'revenus',
    name: 'Revenus',
    icon: 'payments',
    color: PALETTE.green,
    kind: 'income',
    subs: [
      ['salaire', 'Salaire', 'work'],
      ['remboursement', 'Remboursement', 'payments'],
      ['autres-revenus', 'Autres revenus', 'savings'],
    ],
  },
];

export const DEFAULT_GROUPS: readonly CategoryGroup[] = GROUP_SEEDS.map(
  ({ key, subs: _subs, ...group }) => ({
    id: `grp-${key}`,
    ...group,
  }),
);

export const DEFAULT_SUBCATEGORIES: readonly Subcategory[] = GROUP_SEEDS.flatMap(({ key, subs }) =>
  subs.map(([subKey, name, icon]) => ({ id: `sub-${subKey}`, groupId: `grp-${key}`, name, icon })),
);

/** État initial d'une installation neuve (copie profonde : jamais de référence partagée). */
export function createDefaultData(): AppData {
  return structuredClone({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    accounts: [...DEFAULT_ACCOUNTS],
    groups: [...DEFAULT_GROUPS],
    subcategories: [...DEFAULT_SUBCATEGORIES],
    transactions: [],
    rules: [],
    envelopes: [],
    settings: { currency: 'EUR' },
  });
}
