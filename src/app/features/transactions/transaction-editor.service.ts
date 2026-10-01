import { Injectable, inject } from '@angular/core';
import { TransactionDraft } from '../../core/domain/transaction-ops';
import { RecurringRule, Transaction } from '../../core/models';
import { SheetService } from '../../shared/ui/sheet/sheet.service';
import type { TransactionFormData } from './transaction-form/transaction-form-sheet';

/**
 * Point d'entrée unique pour ouvrir le formulaire de transaction ou de règle récurrente
 * (bouton « + », sidebar, listes, états vides…). Le formulaire est chargé à la demande.
 */
@Injectable({ providedIn: 'root' })
export class TransactionEditor {
  private readonly sheets = inject(SheetService);

  openCreate(preset?: Partial<TransactionDraft>): Promise<void> {
    return this.open('Nouvelle transaction', { preset });
  }

  openEdit(transaction: Transaction): Promise<void> {
    return this.open('Modifier la transaction', {
      transaction,
      onEditRule: (rule) => void this.openEditRule(rule),
    });
  }

  openCreateRule(): Promise<void> {
    return this.open('Nouvelle récurrence', { recurring: true });
  }

  openEditRule(rule: RecurringRule): Promise<void> {
    return this.open('Modifier la récurrence', { rule });
  }

  private async open(ariaLabel: string, data: TransactionFormData): Promise<void> {
    const { TransactionFormSheet } = await import('./transaction-form/transaction-form-sheet');
    this.sheets.open(TransactionFormSheet, { ariaLabel, data });
  }
}
