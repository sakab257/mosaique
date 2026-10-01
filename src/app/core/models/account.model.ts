import { Cents, HexColor, Id } from './common';

export type AccountType = 'cash' | 'card' | 'bank';

export interface Account {
  id: Id;
  name: string;
  type: AccountType;
  /** Point de départ du calcul du solde (peut être négatif). */
  initialBalance: Cents;
  color: HexColor;
}

export const ACCOUNT_TYPES: readonly AccountType[] = ['cash', 'card', 'bank'];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Espèces',
  card: 'Carte',
  bank: 'Banque',
};

/** Libellé descriptif affiché sous le nom du compte. */
export const ACCOUNT_TYPE_DESCRIPTIONS: Record<AccountType, string> = {
  cash: 'Espèces',
  card: 'Carte de débit',
  bank: 'Compte courant',
};

export const ACCOUNT_TYPE_ICONS = {
  cash: 'account_balance_wallet',
  card: 'credit_card',
  bank: 'account_balance',
} as const satisfies Record<AccountType, string>;
