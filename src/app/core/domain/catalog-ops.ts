import { Account, AppData, CategoryGroup, Id, Subcategory } from '../models';

/** Sous-catégorie saisie dans l'éditeur de groupe (sans identifiant si nouvelle). */
export interface SubcategoryDraft {
  id?: Id;
  name: string;
  icon?: string;
}

export interface CategoryUsage {
  transactions: number;
  rules: number;
  envelopes: number;
}

export function groupUsage(data: AppData, groupId: Id): CategoryUsage {
  return {
    transactions: data.transactions.filter((t) => t.groupId === groupId).length,
    rules: data.rules.filter((r) => r.groupId === groupId).length,
    envelopes: data.envelopes.filter((e) => e.groupId === groupId).length,
  };
}

/** Retire une sous-catégorie des transactions et règles qui l'utilisent. */
function clearSubcategories<T extends { subcategoryId?: Id }>(
  items: T[],
  ids: ReadonlySet<Id>,
): T[] {
  return items.map((item) => {
    if (!item.subcategoryId || !ids.has(item.subcategoryId)) return item;
    const { subcategoryId: _removed, ...rest } = item;
    return rest as T;
  });
}

/**
 * Crée ou met à jour un groupe et la liste complète de ses sous-catégories.
 * Les sous-catégories retirées de la liste sont supprimées (et détachées des transactions).
 */
export function saveGroup(
  data: AppData,
  group: CategoryGroup,
  subs: readonly SubcategoryDraft[],
  createId: () => Id,
): AppData {
  const exists = data.groups.some((g) => g.id === group.id);
  const previous = data.subcategories.filter((s) => s.groupId === group.id);
  const next: Subcategory[] = subs
    .map((s) => ({ ...s, name: s.name.trim() }))
    .filter((s) => s.name)
    .map((s) => ({
      id: s.id ?? createId(),
      groupId: group.id,
      name: s.name,
      icon: s.icon ?? previous.find((p) => p.id === s.id)?.icon ?? group.icon,
    }));
  const kept = new Set(next.map((s) => s.id));
  const removed = new Set(previous.filter((s) => !kept.has(s.id)).map((s) => s.id));
  const normalized = { ...group, name: group.name.trim() };

  return {
    ...data,
    groups: exists
      ? data.groups.map((g) => (g.id === group.id ? normalized : g))
      : [...data.groups, normalized],
    subcategories: [...data.subcategories.filter((s) => s.groupId !== group.id), ...next],
    transactions: clearSubcategories(data.transactions, removed),
    rules: clearSubcategories(data.rules, removed),
  };
}

/**
 * Supprime un groupe : ses sous-catégories et son enveloppe disparaissent, les
 * transactions et règles concernées deviennent « sans catégorie ».
 */
export function deleteGroup(data: AppData, groupId: Id): AppData {
  const detach = <T extends { groupId?: Id; subcategoryId?: Id }>(items: T[]): T[] =>
    items.map((item) => {
      if (item.groupId !== groupId) return item;
      const { groupId: _g, subcategoryId: _s, ...rest } = item;
      return rest as T;
    });
  return {
    ...data,
    groups: data.groups.filter((g) => g.id !== groupId),
    subcategories: data.subcategories.filter((s) => s.groupId !== groupId),
    envelopes: data.envelopes.filter((e) => e.groupId !== groupId),
    transactions: detach(data.transactions),
    rules: detach(data.rules),
  };
}

export function saveAccount(data: AppData, account: Account): AppData {
  const normalized = { ...account, name: account.name.trim() };
  return {
    ...data,
    accounts: data.accounts.some((a) => a.id === account.id)
      ? data.accounts.map((a) => (a.id === account.id ? normalized : a))
      : [...data.accounts, normalized],
  };
}

/** Nombre de transactions et de règles qui utilisent un compte (source ou destination). */
export function accountUsage(data: AppData, accountId: Id): number {
  const uses = (item: { accountId: Id; toAccountId?: Id }) =>
    item.accountId === accountId || item.toAccountId === accountId;
  return data.transactions.filter(uses).length + data.rules.filter(uses).length;
}

/**
 * Supprime un compte. Refusé s'il est encore utilisé ou s'il est le dernier compte :
 * on ne fait jamais disparaître de l'argent des soldes en silence.
 */
export function deleteAccount(
  data: AppData,
  accountId: Id,
): { data: AppData; error?: 'in-use' | 'last-account' } {
  if (data.accounts.length <= 1) return { data, error: 'last-account' };
  if (accountUsage(data, accountId) > 0) return { data, error: 'in-use' };
  return { data: { ...data, accounts: data.accounts.filter((a) => a.id !== accountId) } };
}
