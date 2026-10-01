import { Account } from './account.model';
import { BudgetEnvelope } from './budget.model';
import { CategoryGroup, Subcategory } from './category.model';
import { RecurringRule } from './recurring-rule.model';
import { Settings } from './settings.model';
import { Transaction } from './transaction.model';

/** Version du schéma persisté. À incrémenter avec une migration dans storage/migrations.ts. */
export const CURRENT_SCHEMA_VERSION = 1;

/** Racine de l'état de l'application, persistée telle quelle. */
export interface AppData {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  accounts: Account[];
  groups: CategoryGroup[];
  subcategories: Subcategory[];
  transactions: Transaction[];
  rules: RecurringRule[];
  envelopes: BudgetEnvelope[];
  settings: Settings;
}
