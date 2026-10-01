import { TestBed } from '@angular/core/testing';
import { RecurringRule } from '../models';
import { AppStore } from '../state/app-store';
import { BROWSER_STORAGE } from '../storage/storage.service';
import { MemoryStorage } from '../testing/memory-storage';
import { NOW } from './clock.service';
import { RecurrenceService } from './recurrence.service';

describe('RecurrenceService', () => {
  const rule: RecurringRule = {
    id: 'r-salaire',
    type: 'income',
    amount: 280000,
    accountId: 'acc-bank',
    groupId: 'grp-revenus',
    note: 'Salaire',
    frequency: 'monthly',
    startDate: '2026-07-01T09:00',
    active: true,
    skippedDates: [],
  };

  it('génère au démarrage puis au retour au premier plan, sans doublon', () => {
    let now = new Date(2026, 8, 30, 10, 0);
    TestBed.configureTestingModule({
      providers: [
        { provide: BROWSER_STORAGE, useValue: new MemoryStorage() },
        { provide: NOW, useValue: () => now },
      ],
    });
    const app = TestBed.inject(AppStore);
    app.update((d) => ({ ...d, rules: [rule] }));
    const service = TestBed.inject(RecurrenceService);

    service.start();
    expect(app.transactions().map((t) => t.occurrenceDate)).toEqual([
      '2026-07-01',
      '2026-08-01',
      '2026-09-01',
    ]);

    service.start(); // second démarrage : sans effet
    expect(app.transactions()).toHaveLength(3);

    now = new Date(2026, 9, 2, 8, 0); // l'onglet revient au premier plan deux jours plus tard
    document.dispatchEvent(new Event('visibilitychange'));
    expect(app.transactions().map((t) => t.occurrenceDate)).toContain('2026-10-01');
    expect(app.transactions()).toHaveLength(4);
  });
});
