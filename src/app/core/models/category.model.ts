import { HexColor, Id } from './common';

/** Un groupe classe soit des dépenses, soit des revenus. */
export type CategoryKind = 'expense' | 'income';

export interface CategoryGroup {
  id: Id;
  name: string;
  color: HexColor;
  /** Nom d'icône Material Symbols (voir shared/ui/icon/icons.ts). */
  icon: string;
  kind: CategoryKind;
}

export interface Subcategory {
  id: Id;
  groupId: Id;
  name: string;
  icon: string;
}
