import { Cents, Id, IsoDate, IsoDateTime } from './common';
import { TransactionType } from './transaction.model';

export type Frequency = 'weekly' | 'monthly' | 'yearly';

export interface RecurringRule {
  id: Id;
  type: TransactionType;
  amount: Cents;
  accountId: Id;
  toAccountId?: Id;
  groupId?: Id;
  subcategoryId?: Id;
  note: string;
  frequency: Frequency;
  /**
   * Première occurrence (date + heure). Le jour de récurrence en découle : jour de
   * la semaine (hebdo), quantième (mensuel) ou jour + mois (annuel).
   */
  startDate: IsoDateTime;
  /** Dernière occurrence possible, incluse. */
  endDate?: IsoDate;
  active: boolean;
  /** Dernier jour jusqu'auquel les occurrences ont été générées. */
  lastGeneratedDate?: IsoDate;
  /** Occurrences supprimées par l'utilisateur, à ne jamais recréer. */
  skippedDates: IsoDate[];
}

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Chaque semaine',
  monthly: 'Chaque mois',
  yearly: 'Chaque année',
};
