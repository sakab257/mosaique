import { Account, CategoryGroup, Id, Subcategory } from '../models';

/** Index des référentiels, pour résoudre les identifiants d'une transaction. */
export interface Catalog {
  accounts: ReadonlyMap<Id, Account>;
  groups: ReadonlyMap<Id, CategoryGroup>;
  subcategories: ReadonlyMap<Id, Subcategory>;
}

export function indexById<T extends { id: Id }>(items: readonly T[]): ReadonlyMap<Id, T> {
  return new Map(items.map((item) => [item.id, item]));
}

export function buildCatalog(
  accounts: readonly Account[],
  groups: readonly CategoryGroup[],
  subcategories: readonly Subcategory[],
): Catalog {
  return {
    accounts: indexById(accounts),
    groups: indexById(groups),
    subcategories: indexById(subcategories),
  };
}
