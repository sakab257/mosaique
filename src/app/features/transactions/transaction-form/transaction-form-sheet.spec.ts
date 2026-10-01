import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NOW } from '../../../core/services/clock.service';
import { AppStore } from '../../../core/state/app-store';
import { RecurringStore } from '../../../core/state/recurring.store';
import { TransactionsStore } from '../../../core/state/transactions.store';
import { RecurringRule } from '../../../core/models';
import { BROWSER_STORAGE } from '../../../core/storage/storage.service';
import { MemoryStorage } from '../../../core/testing/memory-storage';
import { tx } from '../../../core/testing/fixtures';
import { TransactionFormData, TransactionFormSheet } from './transaction-form-sheet';

registerLocaleData(localeFr);

describe('TransactionFormSheet', () => {
  let fixture: ComponentFixture<TransactionFormSheet>;
  let close: ReturnType<typeof vi.fn>;

  async function open(data: TransactionFormData = {}) {
    close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: BROWSER_STORAGE, useValue: new MemoryStorage() },
        { provide: NOW, useValue: () => new Date(2026, 7, 28, 18, 42) },
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        { provide: DialogRef, useValue: { close } },
        { provide: DIALOG_DATA, useValue: data },
      ],
    });
    if (data.transaction) {
      TestBed.inject(AppStore).update((d) => ({ ...d, transactions: [data.transaction!] }));
    }
    if (data.rule) {
      TestBed.inject(AppStore).update((d) => ({ ...d, rules: [data.rule!] }));
    }
    fixture = TestBed.createComponent(TransactionFormSheet);
    await fixture.whenStable();
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => el().textContent ?? '';
  const amountInput = () => el().querySelector<HTMLInputElement>('#tx-amount')!;
  const selects = () => [...el().querySelectorAll<HTMLSelectElement>('app-picker select')];

  async function type(input: HTMLInputElement, value: string) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function choose(select: HTMLSelectElement, value: string) {
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  async function submit() {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  async function pickType(label: string) {
    [...el().querySelectorAll<HTMLButtonElement>('[role="radio"]')]
      .find((b) => b.textContent?.trim() === label)!
      .click();
    await fixture.whenStable();
  }

  it('affiche les erreurs en français et ne crée rien si le formulaire est incomplet', async () => {
    await open();
    await submit();
    expect(text()).toContain('Saisissez un montant.');
    expect(text()).toContain('Choisissez une catégorie.');
    expect(TestBed.inject(TransactionsStore).all()).toHaveLength(0);
    expect(close).not.toHaveBeenCalled();
  });

  it('refuse un montant mal formé ou nul', async () => {
    await open();
    await type(amountInput(), '12,345');
    await submit();
    expect(text()).toContain('2 décimales au plus');
    await type(amountInput(), '0');
    expect(text()).toContain('supérieur à 0');
  });

  it('crée une dépense avec sa sous-catégorie', async () => {
    await open();
    await type(amountInput(), '54,3');
    await choose(selects()[1], 'grp-alimentation');
    [...el().querySelectorAll<HTMLButtonElement>('button[appChip]')]
      .find((b) => b.textContent?.trim() === 'Courses')!
      .click();
    await fixture.whenStable();
    await type(el().querySelector<HTMLInputElement>('[formControlName="note"]')!, ' Carrefour ');
    await submit();

    const [created] = TestBed.inject(TransactionsStore).all();
    expect(created).toMatchObject({
      type: 'expense',
      amount: 5430,
      accountId: 'acc-card',
      groupId: 'grp-alimentation',
      subcategoryId: 'sub-courses',
      date: '2026-08-28T18:42',
      note: 'Carrefour',
    });
    expect(close).toHaveBeenCalledWith(true);
  });

  it('ne propose que les catégories de revenus pour un revenu', async () => {
    await open();
    await pickType('Revenu');
    const options = [...selects()[1].options].map((o) => o.textContent?.trim());
    expect(options).toContain('Revenus');
    expect(options).not.toContain('Alimentation');
  });

  it('un virement exige deux comptes différents', async () => {
    await open();
    await pickType('Virement');
    await type(amountInput(), '100');
    const [from, to] = selects();
    await choose(from, 'acc-bank');
    await choose(to, 'acc-bank');
    await submit();
    expect(text()).toContain('doivent être différents');

    await choose(to, 'acc-cash');
    await submit();
    const [created] = TestBed.inject(TransactionsStore).all();
    expect(created).toMatchObject({
      type: 'transfer',
      accountId: 'acc-bank',
      toAccountId: 'acc-cash',
    });
    expect(created.groupId).toBeUndefined();
  });

  it('modifie une transaction existante sans changer son identifiant', async () => {
    const existing = tx({
      id: 'tx-edit',
      amount: 5430,
      note: 'Carrefour',
      date: '2026-08-20T10:15',
    });
    await open({ transaction: existing });
    expect(amountInput().value).toBe('54,30');
    expect(text()).toContain('Enregistrer les modifications');

    await type(amountInput(), '60');
    await submit();
    const all = TestBed.inject(TransactionsStore).all();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id: 'tx-edit', amount: 6000, date: '2026-08-20T10:15' });
  });

  describe('récurrence', () => {
    const toggleRecurrence = async () => {
      el().querySelector<HTMLButtonElement>('[role="switch"]')!.click();
      await fixture.whenStable();
    };
    const chip = async (label: string) => {
      [...el().querySelectorAll<HTMLButtonElement>('button[appChip]')]
        .find((b) => b.textContent?.trim() === label)!
        .click();
      await fixture.whenStable();
    };
    const dateInput = () => el().querySelector<HTMLInputElement>('[formControlName="date"]')!;

    it('crée la règle, affiche le résumé et rattrape les échéances passées', async () => {
      await open();
      await type(amountInput(), '850');
      await choose(selects()[1], 'grp-logement');
      await type(dateInput(), '2026-06-05');
      await toggleRecurrence();
      expect(text()).toContain('Se répète le 5 de chaque mois, sans fin.');
      expect(text()).toContain('Première échéance');

      await submit();
      const [rule] = TestBed.inject(RecurringStore).rules();
      expect(rule).toMatchObject({
        frequency: 'monthly',
        startDate: '2026-06-05T18:42',
        amount: 85000,
        lastGeneratedDate: '2026-08-28',
      });
      const generated = TestBed.inject(TransactionsStore).all();
      expect(generated.map((t) => t.occurrenceDate).sort()).toEqual([
        '2026-06-05',
        '2026-07-05',
        '2026-08-05',
      ]);
      expect(generated.every((t) => t.recurringRuleId === rule.id)).toBe(true);
    });

    it('hebdomadaire jusqu’à une date : résumé et validation de la fin', async () => {
      await open();
      await type(amountInput(), '12');
      await choose(selects()[1], 'grp-loisirs');
      await type(dateInput(), '2026-09-01');
      await toggleRecurrence();
      await chip('Chaque semaine');
      await chip('Jusqu’au…');
      await type(
        el().querySelector<HTMLInputElement>('[formControlName="endDate"]')!,
        '2026-08-01',
      );
      await submit();
      expect(text()).toContain('La date de fin doit être postérieure à la première échéance.');

      await type(
        el().querySelector<HTMLInputElement>('[formControlName="endDate"]')!,
        '2026-12-31',
      );
      expect(text()).toContain('Se répète chaque mardi, jusqu’au 31 décembre 2026.');
      await submit();
      expect(TestBed.inject(RecurringStore).rules()[0]).toMatchObject({
        frequency: 'weekly',
        endDate: '2026-12-31',
      });
      expect(TestBed.inject(TransactionsStore).all()).toHaveLength(0);
    });

    it('modifie une règle à partir de sa prochaine échéance, sans toucher l’historique', async () => {
      const rule: RecurringRule = {
        id: 'r-loyer',
        type: 'expense',
        amount: 85000,
        accountId: 'acc-bank',
        groupId: 'grp-logement',
        note: 'Loyer',
        frequency: 'monthly',
        startDate: '2026-06-05T08:00',
        active: true,
        lastGeneratedDate: '2026-08-28',
        skippedDates: [],
      };
      const past = tx({
        id: 'juillet',
        amount: 85000,
        recurringRuleId: 'r-loyer',
        occurrenceDate: '2026-07-05',
      });
      await open({ rule, transaction: undefined });
      TestBed.inject(AppStore).update((d) => ({ ...d, transactions: [past] }));
      expect(text()).toContain('Modifier la récurrence');
      expect(text()).toContain('Prochaine échéance');
      expect(dateInput().value).toBe('2026-09-05');
      expect(el().querySelector('[role="switch"]')).toBeNull();

      await type(amountInput(), '900');
      await submit();
      expect(TestBed.inject(RecurringStore).rules()[0]).toMatchObject({
        amount: 90000,
        startDate: '2026-09-05T08:00',
        lastGeneratedDate: '2026-08-28',
      });
      expect(TestBed.inject(TransactionsStore).all()).toEqual([past]);
    });
  });
});
