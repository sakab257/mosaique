import { Injectable, inject } from '@angular/core';
import { transactionTitle } from '../../core/domain/transaction-query';
import { RecurringRule } from '../../core/models';
import { RecurringStore } from '../../core/state/recurring.store';
import { TransactionsStore } from '../../core/state/transactions.store';
import { ChoiceService } from '../../shared/ui/confirm-dialog/choice-dialog';
import { ConfirmService } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { ToastService } from '../../shared/ui/toast/toast.service';

/** Actions sur une règle partagées entre le formulaire et la liste des récurrences. */
@Injectable({ providedIn: 'root' })
export class RuleActions {
  private readonly recurring = inject(RecurringStore);
  private readonly transactions = inject(TransactionsStore);
  private readonly choices = inject(ChoiceService);
  private readonly confirm = inject(ConfirmService);
  private readonly toasts = inject(ToastService);

  title(rule: RecurringRule): string {
    return transactionTitle(rule, this.transactions.catalog());
  }

  toggleActive(rule: RecurringRule): void {
    this.recurring.setActive(rule.id, !rule.active);
    this.toasts.show(
      rule.active ? `« ${this.title(rule)} » mise en pause` : `« ${this.title(rule)} » réactivée`,
    );
  }

  /**
   * Supprime une règle en demandant s'il faut conserver les transactions déjà générées.
   * Renvoie `true` si la règle a été supprimée.
   */
  async delete(rule: RecurringRule): Promise<boolean> {
    const title = this.title(rule);
    const count = this.recurring.generatedCount(rule.id);
    let keep = true;
    if (count === 0) {
      const confirmed = await this.confirm.ask({
        title: 'Supprimer la récurrence ?',
        message: `« ${title} » ne créera plus de transactions.`,
        confirmLabel: 'Supprimer',
        tone: 'danger',
      });
      if (!confirmed) return false;
    } else {
      const plural = count > 1 ? 's' : '';
      const choice = await this.choices.choose<'keep' | 'delete'>({
        title: 'Supprimer la récurrence ?',
        message: `« ${title} » ne créera plus de transactions. Que faire des ${count} transaction${plural} déjà enregistrée${plural} ?`,
        choices: [
          {
            value: 'keep',
            label: `Conserver ${count > 1 ? `les ${count} transactions` : 'la transaction'}`,
            description: 'Elles restent dans l’historique, les soldes et les budgets.',
          },
          {
            value: 'delete',
            label: `Supprimer aussi ${count > 1 ? `les ${count} transactions` : 'la transaction'}`,
            description: 'Les soldes et budgets des mois concernés seront recalculés.',
          },
        ],
        initial: 'keep',
        confirmLabel: 'Supprimer la récurrence',
        tone: 'danger',
      });
      if (!choice) return false;
      keep = choice === 'keep';
    }
    this.recurring.remove(rule.id, keep);
    this.toasts.show('Récurrence supprimée');
    return true;
  }
}
