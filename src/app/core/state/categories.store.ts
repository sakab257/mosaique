import { Injectable, computed, inject } from '@angular/core';
import { indexById } from '../domain/catalog';
import {
  CategoryUsage,
  SubcategoryDraft,
  deleteGroup,
  groupUsage,
  saveGroup,
} from '../domain/catalog-ops';
import { createId } from '../domain/id';
import { CategoryGroup, CategoryKind, Id, Subcategory } from '../models';
import { AppStore } from './app-store';

@Injectable({ providedIn: 'root' })
export class CategoriesStore {
  private readonly app = inject(AppStore);

  readonly groups = this.app.groups;
  readonly subcategories = this.app.subcategories;

  readonly groupById = computed(() => indexById(this.groups()));
  readonly subcategoryById = computed(() => indexById(this.subcategories()));

  readonly subcategoriesByGroup = computed(() => {
    const map = new Map<Id, Subcategory[]>();
    for (const sub of this.subcategories()) {
      const list = map.get(sub.groupId);
      if (list) list.push(sub);
      else map.set(sub.groupId, [sub]);
    }
    return map;
  });

  readonly expenseGroups = computed(() => this.groups().filter((g) => g.kind === 'expense'));
  readonly incomeGroups = computed(() => this.groups().filter((g) => g.kind === 'income'));

  groupsOfKind(kind: CategoryKind): CategoryGroup[] {
    return kind === 'expense' ? this.expenseGroups() : this.incomeGroups();
  }

  group(id: Id | undefined | null): CategoryGroup | undefined {
    return id ? this.groupById().get(id) : undefined;
  }

  subcategoriesOf(groupId: Id | undefined | null): Subcategory[] {
    return groupId ? (this.subcategoriesByGroup().get(groupId) ?? []) : [];
  }

  /** Crée (sans `id`) ou met à jour un groupe avec la liste complète de ses sous-catégories. */
  saveGroup(group: Omit<CategoryGroup, 'id'> & { id?: Id }, subs: readonly SubcategoryDraft[]): Id {
    const id = group.id ?? createId();
    this.app.update((data) => saveGroup(data, { ...group, id }, subs, createId));
    return id;
  }

  usage(groupId: Id): CategoryUsage {
    return groupUsage(this.app.data(), groupId);
  }

  deleteGroup(groupId: Id): void {
    this.app.update((data) => deleteGroup(data, groupId));
  }
}
