import {
  Cents,
  Id,
  IsoDate,
  MonthKey,
  TRANSACTION_TYPE_LABELS,
  Transaction,
  TransactionType,
} from '../models';
import { Catalog } from './catalog';
import { dateOf, isInMonth } from './dates';
import { formatAmountInput } from './money';
import { signedAmount } from './stats';

export interface TransactionFilters {
  month: MonthKey;
  search: string;
  accountId: Id | null;
  groupId: Id | null;
  type: TransactionType | null;
}

/** Minuscules sans accents, pour une recherche tolérante (« cafe » trouve « Café »). */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Champs nécessaires au titre (transaction ou règle récurrente). */
export type Titled = Pick<Transaction, 'note' | 'subcategoryId' | 'groupId' | 'type'>;

/** Titre affiché : la note, sinon la sous-catégorie, sinon le groupe, sinon le type. */
export function transactionTitle(tx: Titled, catalog: Catalog): string {
  const note = tx.note.trim();
  if (note) return note;
  const sub = tx.subcategoryId ? catalog.subcategories.get(tx.subcategoryId) : undefined;
  if (sub) return sub.name;
  const group = tx.groupId ? catalog.groups.get(tx.groupId) : undefined;
  return group?.name ?? TRANSACTION_TYPE_LABELS[tx.type];
}

function searchableText(tx: Transaction, catalog: Catalog): string {
  return normalizeText(
    [
      tx.note,
      tx.groupId && catalog.groups.get(tx.groupId)?.name,
      tx.subcategoryId && catalog.subcategories.get(tx.subcategoryId)?.name,
      catalog.accounts.get(tx.accountId)?.name,
      tx.toAccountId && catalog.accounts.get(tx.toAccountId)?.name,
      TRANSACTION_TYPE_LABELS[tx.type],
      formatAmountInput(tx.amount),
    ]
      .filter(Boolean)
      .join(' '),
  );
}

export function matchesFilters(
  tx: Transaction,
  filters: TransactionFilters,
  catalog: Catalog,
): boolean {
  if (!isInMonth(tx.date, filters.month)) return false;
  if (filters.type && tx.type !== filters.type) return false;
  if (filters.groupId && tx.groupId !== filters.groupId) return false;
  if (
    filters.accountId &&
    tx.accountId !== filters.accountId &&
    tx.toAccountId !== filters.accountId
  ) {
    return false;
  }
  const terms = normalizeText(filters.search).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = searchableText(tx, catalog);
  return terms.every((term) => haystack.includes(term));
}

/** Tri antichronologique (date et heure), stable. */
export function compareByDateDesc(a: Transaction, b: Transaction): number {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}

export interface DayGroup {
  date: IsoDate;
  transactions: Transaction[];
  /** Solde du jour hors virements. */
  total: Cents;
}

/** Regroupe par jour, du plus récent au plus ancien. */
export function groupByDay(transactions: readonly Transaction[]): DayGroup[] {
  const groups = new Map<IsoDate, DayGroup>();
  for (const tx of [...transactions].sort(compareByDateDesc)) {
    const date = dateOf(tx.date);
    let group = groups.get(date);
    if (!group) {
      group = { date, transactions: [], total: 0 };
      groups.set(date, group);
    }
    group.transactions.push(tx);
    group.total += signedAmount(tx);
  }
  return [...groups.values()];
}
