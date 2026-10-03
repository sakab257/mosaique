import { TestBed } from '@angular/core/testing';
import { AccountsStore } from '../../core/state/accounts.store';
import { AppStore } from '../../core/state/app-store';
import { CategoriesStore } from '../../core/state/categories.store';
import { STORAGE_KEY } from '../../core/storage/storage.service';
import { openSheet } from '../../core/testing/sheet-harness';
import { AccountEditorSheet } from './accounts/account-editor-sheet';
import { GroupEditorSheet } from './categories/group-editor-sheet';
import { IncomeSheet } from './income-sheet';

/**
 * Régression : ces formulaires rechargeaient la page au lieu d'enregistrer (l'envoi natif
 * du <form> n'était pas intercepté). Chaque test vérifie que l'envoi est bloqué ET que la
 * donnée est bien écrite dans le stockage.
 */
describe('formulaires des paramètres', () => {
  const saved = (storage: Storage) => JSON.parse(storage.getItem(STORAGE_KEY)!);

  describe('compte', () => {
    it('crée un compte sans recharger la page', async () => {
      const sheet = await openSheet(AccountEditorSheet);
      const [name, balance] = sheet.el.querySelectorAll<HTMLInputElement>('input');
      await sheet.type(name, 'Livret A');
      await sheet.type(balance, '1 500,50');

      expect(await sheet.submit()).toBe(true);
      expect(TestBed.inject(AccountsStore).accounts().at(-1)).toMatchObject({
        name: 'Livret A',
        type: 'bank',
        initialBalance: 150050,
      });
      expect(saved(sheet.storage).accounts).toHaveLength(4);
      expect(sheet.close).toHaveBeenCalledWith(true);
    });

    it('modifie le solde initial (y compris négatif)', async () => {
      const bank = {
        id: 'acc-bank',
        name: 'Banque',
        type: 'bank' as const,
        initialBalance: 0,
        color: '#4FC3F7',
      };
      const sheet = await openSheet(AccountEditorSheet, { account: bank });
      const balance = sheet.el.querySelectorAll<HTMLInputElement>('input')[1];
      await sheet.type(balance, '-120');

      expect(await sheet.submit()).toBe(true);
      expect(TestBed.inject(AccountsStore).get('acc-bank')!.initialBalance).toBe(-12000);
      expect(
        saved(sheet.storage).accounts.find((a: { id: string }) => a.id === 'acc-bank')
          .initialBalance,
      ).toBe(-12000);
    });

    it('refuse un nom vide, sans recharger', async () => {
      const sheet = await openSheet(AccountEditorSheet);
      expect(await sheet.submit()).toBe(true);
      expect(sheet.text()).toContain('Saisissez un nom de compte.');
      expect(sheet.close).not.toHaveBeenCalled();
    });
  });

  describe('revenu mensuel de référence', () => {
    it('enregistre le revenu', async () => {
      const sheet = await openSheet(IncomeSheet);
      await sheet.type(sheet.el.querySelector('input')!, '2 800');

      expect(await sheet.submit()).toBe(true);
      expect(TestBed.inject(AppStore).settings().monthlyIncomeReference).toBe(280000);
      expect(saved(sheet.storage).settings.monthlyIncomeReference).toBe(280000);
    });

    it('affiche une erreur pour un montant invalide', async () => {
      const sheet = await openSheet(IncomeSheet);
      await sheet.type(sheet.el.querySelector('input')!, 'abc');
      expect(await sheet.submit()).toBe(true);
      expect(sheet.text()).toContain('Montant invalide');
      expect(TestBed.inject(AppStore).settings().monthlyIncomeReference).toBeUndefined();
    });
  });

  describe('groupe de catégories', () => {
    it('crée un groupe et ses sous-catégories', async () => {
      const sheet = await openSheet(GroupEditorSheet);
      await sheet.type(sheet.el.querySelector<HTMLInputElement>('input')!, 'Animaux');
      await sheet.click('Ajouter une sous-catégorie');
      const sub = sheet.el.querySelector<HTMLInputElement>('input[data-sub-key]')!;
      await sheet.type(sub, 'Vétérinaire');

      expect(await sheet.submit()).toBe(true);
      const categories = TestBed.inject(CategoriesStore);
      const group = categories.groups().find((g) => g.name === 'Animaux');
      expect(group).toBeDefined();
      expect(categories.subcategoriesOf(group!.id).map((s) => s.name)).toEqual(['Vétérinaire']);
      expect(saved(sheet.storage).groups.some((g: { name: string }) => g.name === 'Animaux')).toBe(
        true,
      );
    });
  });
});
