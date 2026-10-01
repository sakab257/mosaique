import { Cents } from './common';

export interface Settings {
  /** Revenu de référence du calcul des enveloppes ; à défaut, revenus réels du mois. */
  monthlyIncomeReference?: Cents;
  currency: 'EUR';
}
