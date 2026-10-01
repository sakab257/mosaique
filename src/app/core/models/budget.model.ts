import { Cents, Id } from './common';

export interface BudgetEnvelope {
  id: Id;
  /** Groupe de dépenses suivi par l'enveloppe. */
  groupId: Id;
  /** Part du revenu mensuel allouée (0–100). */
  percentOfIncome: number;
  /** Montant fixe saisi manuellement ; prioritaire sur le pourcentage quand défini. */
  manualOverride?: Cents;
}
