import { Injectable, computed, inject } from '@angular/core';
import { indexById } from '../domain/catalog';
import { addDays, monthBounds } from '../domain/dates';
import { createId } from '../domain/id';
import { nextOccurrence, pendingOccurrences, upcomingOccurrences } from '../domain/recurrence';
import {
  RuleDraft,
  addRule,
  attachRule,
  deleteRule,
  generatedCount,
  setRuleActive,
  updateRule,
} from '../domain/rule-ops';
import { Id, IsoDate, RecurringRule, Transaction } from '../models';
import { ClockService } from '../services/clock.service';
import { RecurrenceService } from '../services/recurrence.service';
import { AppStore } from './app-store';

@Injectable({ providedIn: 'root' })
export class RecurringStore {
  private readonly app = inject(AppStore);
  private readonly clock = inject(ClockService);
  private readonly recurrence = inject(RecurrenceService);

  readonly rules = this.app.rules;
  readonly byId = computed(() => indexById(this.rules()));
  readonly activeCount = computed(() => this.rules().filter((r) => r.active).length);

  /** Prochaine échéance de chaque règle (à partir de demain : aujourd'hui est déjà généré). */
  readonly nextDates = computed(() => {
    const tomorrow = addDays(this.clock.today(), 1);
    const map = new Map<Id, IsoDate | null>();
    for (const rule of this.rules()) {
      const from =
        rule.lastGeneratedDate && rule.lastGeneratedDate >= tomorrow
          ? addDays(rule.lastGeneratedDate, 1)
          : tomorrow;
      map.set(rule.id, nextOccurrence(rule, from));
    }
    return map;
  });

  /** Échéances des 30 prochains jours (calculées, jamais stockées). */
  readonly upcoming = computed(() => upcomingOccurrences(this.rules(), this.clock.today(), 30));

  /** Échéances restantes du mois en cours (après aujourd'hui). */
  readonly remainingThisMonth = computed(() => {
    const today = this.clock.today();
    const { end } = monthBounds(this.clock.currentMonth());
    return pendingOccurrences(this.rules(), addDays(today, 1), end);
  });

  /** Crée une règle puis génère immédiatement ses échéances passées. */
  add(draft: RuleDraft): { rule: RecurringRule; created: Transaction[] } {
    const id = createId();
    this.app.update((data) => addRule(data, id, draft));
    const created = this.recurrence.run();
    return { rule: this.byId().get(id)!, created };
  }

  /** Transforme une transaction existante en première échéance d'une nouvelle règle. */
  attachToTransaction(txId: Id, draft: RuleDraft): Transaction[] {
    this.app.update((data) => attachRule(data, txId, createId(), draft));
    return this.recurrence.run();
  }

  update(id: Id, draft: RuleDraft): Transaction[] {
    this.app.update((data) => updateRule(data, id, draft));
    return this.recurrence.run();
  }

  setActive(id: Id, active: boolean): void {
    this.app.update((data) => setRuleActive(data, id, active, this.clock.today()));
    this.recurrence.run();
  }

  remove(id: Id, keepTransactions: boolean): void {
    this.app.update((data) => deleteRule(data, id, keepTransactions));
  }

  generatedCount(id: Id): number {
    return generatedCount(this.app.data(), id);
  }
}
