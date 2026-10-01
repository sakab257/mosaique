import { Injectable, computed, inject } from '@angular/core';
import { computeBudget } from '../domain/budget';
import { createId } from '../domain/id';
import { BudgetEnvelope, Cents, Id, MonthKey } from '../models';
import { MonthService } from '../services/month.service';
import { AppStore } from './app-store';
import { CategoriesStore } from './categories.store';

export type EnvelopeDraft = Omit<BudgetEnvelope, 'id'>;

@Injectable({ providedIn: 'root' })
export class BudgetStore {
  private readonly app = inject(AppStore);
  private readonly categories = inject(CategoriesStore);
  private readonly months = inject(MonthService);

  readonly envelopes = this.app.envelopes;
  readonly settings = this.app.settings;

  /** Budget du mois sélectionné. */
  readonly summary = computed(() => this.forMonth(this.months.month()));

  /** Groupes de dépenses sans enveloppe (proposés à la création). */
  readonly availableGroups = computed(() => {
    const used = new Set(this.envelopes().map((e) => e.groupId));
    return this.categories.expenseGroups().filter((g) => !used.has(g.id));
  });

  forMonth(month: MonthKey) {
    return computeBudget(
      this.envelopes(),
      this.categories.groupById(),
      this.app.settings(),
      this.app.transactions(),
      month,
    );
  }

  add(draft: EnvelopeDraft): BudgetEnvelope {
    const envelope = { ...draft, id: createId() };
    this.app.update((data) => ({ ...data, envelopes: [...data.envelopes, envelope] }));
    return envelope;
  }

  update(id: Id, draft: EnvelopeDraft): void {
    this.app.update((data) => ({
      ...data,
      envelopes: data.envelopes.map((e) => (e.id === id ? { ...draft, id } : e)),
    }));
  }

  remove(id: Id): BudgetEnvelope | undefined {
    const removed = this.envelopes().find((e) => e.id === id);
    this.app.update((data) => ({ ...data, envelopes: data.envelopes.filter((e) => e.id !== id) }));
    return removed;
  }

  restore(envelope: BudgetEnvelope): void {
    this.app.update((data) =>
      data.envelopes.some((e) => e.id === envelope.id)
        ? data
        : { ...data, envelopes: [...data.envelopes, envelope] },
    );
  }

  setIncomeReference(amount: Cents | undefined): void {
    this.app.update((data) => {
      const { monthlyIncomeReference: _previous, ...rest } = data.settings;
      return {
        ...data,
        settings: amount === undefined ? rest : { ...rest, monthlyIncomeReference: amount },
      };
    });
  }
}
