import { RecurringRule } from '../models';
import { dataWith, tx } from '../testing/fixtures';
import {
  accountUsage,
  deleteAccount,
  deleteGroup,
  groupUsage,
  saveAccount,
  saveGroup,
} from './catalog-ops';

let n = 0;
const id = () => `new-${++n}`;

describe('opérations sur les catégories et les comptes', () => {
  it('crée un groupe avec ses sous-catégories (icône du groupe par défaut)', () => {
    const data = saveGroup(
      dataWith(),
      { id: 'grp-animaux', name: ' Animaux ', color: '#F472B6', icon: 'pets', kind: 'expense' },
      [{ name: 'Croquettes' }, { name: '  ' }, { name: 'Vétérinaire' }],
      id,
    );
    expect(data.groups.at(-1)).toMatchObject({ id: 'grp-animaux', name: 'Animaux' });
    expect(data.subcategories.filter((s) => s.groupId === 'grp-animaux')).toEqual([
      { id: 'new-1', groupId: 'grp-animaux', name: 'Croquettes', icon: 'pets' },
      { id: 'new-2', groupId: 'grp-animaux', name: 'Vétérinaire', icon: 'pets' },
    ]);
  });

  it('renomme, ajoute et retire des sous-catégories ; détache les transactions concernées', () => {
    const base = dataWith({
      transactions: [tx({ id: 'cine', groupId: 'grp-loisirs', subcategoryId: 'sub-cinema' })],
    });
    const loisirs = base.groups.find((g) => g.id === 'grp-loisirs')!;
    const data = saveGroup(
      base,
      { ...loisirs, color: '#A3E635' },
      [
        { id: 'sub-sorties', name: 'Sorties entre amis' },
        { id: 'sub-sport', name: 'Sport' },
        { name: 'Jeux' },
      ],
      id,
    );
    const subs = data.subcategories.filter((s) => s.groupId === 'grp-loisirs');
    expect(subs.map((s) => s.name)).toEqual(['Sorties entre amis', 'Sport', 'Jeux']);
    expect(subs[0].icon).toBe('local_bar');
    expect(data.groups.find((g) => g.id === 'grp-loisirs')!.color).toBe('#A3E635');
    expect(data.transactions[0].subcategoryId).toBeUndefined();
    expect(data.transactions[0].groupId).toBe('grp-loisirs');
  });

  it('supprimer un groupe le retire partout sans perdre les transactions', () => {
    const rule = { id: 'r', groupId: 'grp-loisirs', subcategoryId: 'sub-sport' } as RecurringRule;
    const base = dataWith({
      transactions: [
        tx({ id: 'cine', groupId: 'grp-loisirs', subcategoryId: 'sub-cinema' }),
        tx({ id: 'autre' }),
      ],
      rules: [rule],
      envelopes: [{ id: 'e', groupId: 'grp-loisirs', percentOfIncome: 5 }],
    });
    expect(groupUsage(base, 'grp-loisirs')).toEqual({ transactions: 1, rules: 1, envelopes: 1 });

    const data = deleteGroup(base, 'grp-loisirs');
    expect(data.groups.some((g) => g.id === 'grp-loisirs')).toBe(false);
    expect(data.subcategories.some((s) => s.groupId === 'grp-loisirs')).toBe(false);
    expect(data.envelopes).toEqual([]);
    expect(data.transactions).toHaveLength(2);
    expect(data.transactions[0].groupId).toBeUndefined();
    expect(data.transactions[0].subcategoryId).toBeUndefined();
    expect(data.rules[0].groupId).toBeUndefined();
  });

  it('crée et modifie un compte', () => {
    let data = saveAccount(dataWith(), {
      id: 'acc-livret',
      name: ' Livret A ',
      type: 'bank',
      initialBalance: 500000,
      color: '#4FC3F7',
    });
    expect(data.accounts.at(-1)).toMatchObject({ name: 'Livret A', initialBalance: 500000 });
    data = saveAccount(data, { ...data.accounts.at(-1)!, initialBalance: 450000 });
    expect(data.accounts).toHaveLength(4);
    expect(data.accounts.at(-1)!.initialBalance).toBe(450000);
  });

  it('refuse de supprimer un compte utilisé ou le dernier compte', () => {
    const base = dataWith({
      transactions: [tx({ type: 'transfer', accountId: 'acc-bank', toAccountId: 'acc-cash' })],
    });
    expect(accountUsage(base, 'acc-cash')).toBe(1);
    expect(deleteAccount(base, 'acc-cash').error).toBe('in-use');
    expect(deleteAccount(base, 'acc-card').data.accounts).toHaveLength(2);

    const single = dataWith({ accounts: [base.accounts[0]] });
    expect(deleteAccount(single, single.accounts[0].id).error).toBe('last-account');
  });
});
