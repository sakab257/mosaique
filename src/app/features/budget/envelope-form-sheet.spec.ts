import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BudgetEnvelope } from '../../core/models';
import { NOW } from '../../core/services/clock.service';
import { AppStore } from '../../core/state/app-store';
import { BudgetStore } from '../../core/state/budget.store';
import { BROWSER_STORAGE } from '../../core/storage/storage.service';
import { MemoryStorage } from '../../core/testing/memory-storage';
import { EnvelopeFormData, EnvelopeFormSheet } from './envelope-form-sheet';

registerLocaleData(localeFr);

describe('EnvelopeFormSheet', () => {
  let fixture: ComponentFixture<EnvelopeFormSheet>;
  let close: ReturnType<typeof vi.fn>;

  async function open(data: EnvelopeFormData = {}, envelopes: BudgetEnvelope[] = []) {
    close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: BROWSER_STORAGE, useValue: new MemoryStorage() },
        { provide: NOW, useValue: () => new Date(2026, 8, 15, 12, 0) },
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        { provide: DialogRef, useValue: { close } },
        { provide: DIALOG_DATA, useValue: data },
      ],
    });
    TestBed.inject(AppStore).update((d) => ({
      ...d,
      envelopes,
      settings: { ...d.settings, monthlyIncomeReference: 280000 },
    }));
    fixture = TestBed.createComponent(EnvelopeFormSheet);
    await fixture.whenStable();
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/[  ]/g, ' ');
  const button = (label: string) =>
    [...el().querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.trim().includes(label),
    )!;
  async function click(label: string) {
    button(label).click();
    await fixture.whenStable();
  }
  async function type(name: string, value: string) {
    const input = el().querySelector<HTMLInputElement>(`[formControlName="${name}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }
  async function submit() {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('exige une catégorie', async () => {
    await open();
    await submit();
    expect(text()).toContain('Choisissez la catégorie suivie.');
    expect(TestBed.inject(BudgetStore).envelopes()).toEqual([]);
  });

  it('crée une enveloppe en % du revenu avec aperçu du montant', async () => {
    await open();
    await click('Alimentation');
    await type('percent', '15');
    expect(text()).toContain('420,00 €');
    expect(text()).toContain('soit 15 % de votre revenu de référence');
    await submit();
    expect(TestBed.inject(BudgetStore).envelopes()).toEqual([
      expect.objectContaining({ groupId: 'grp-alimentation', percentOfIncome: 15 }),
    ]);
    expect(TestBed.inject(BudgetStore).envelopes()[0].manualOverride).toBeUndefined();
    expect(close).toHaveBeenCalledWith(true);
  });

  it('bascule en montant fixe (correction manuelle)', async () => {
    await open();
    await click('Loisirs');
    await click('Montant fixe');
    await type('amount', '150');
    await submit();
    expect(TestBed.inject(BudgetStore).envelopes()[0]).toMatchObject({
      groupId: 'grp-loisirs',
      manualOverride: 15000,
    });
  });

  it('refuse un pourcentage hors bornes', async () => {
    await open();
    await click('Loisirs');
    await type('percent', '120');
    await submit();
    expect(text()).toContain('Saisissez un pourcentage entre 0 et 100.');
  });

  it('ne propose pas les catégories qui ont déjà une enveloppe', async () => {
    await open({}, [{ id: 'e1', groupId: 'grp-logement', percentOfIncome: 30 }]);
    expect(button('Logement')).toBeUndefined();
    expect(button('Alimentation')).toBeDefined();
  });
});
