import { Injectable, computed, inject } from '@angular/core';
import { Catalog, indexById } from '../domain/catalog';
import { createId } from '../domain/id';
import { compareByDateDesc } from '../domain/transaction-query';
import {
  TransactionDraft,
  addTransaction,
  removeTransaction,
  restoreTransaction,
  updateTransaction,
} from '../domain/transaction-ops';
import { Id, Transaction, TransactionType } from '../models';
import { AccountsStore } from './accounts.store';
import { AppStore } from './app-store';
import { CategoriesStore } from './categories.store';

@Injectable({ providedIn: 'root' })
export class TransactionsStore {
  private readonly app = inject(AppStore);
  private readonly accounts = inject(AccountsStore);
  private readonly categories = inject(CategoriesStore);

  readonly all = this.app.transactions;
  readonly byId = computed(() => indexById(this.all()));
  /** Toutes les transactions, de la plus récente à la plus ancienne. */
  readonly sorted = computed(() => [...this.all()].sort(compareByDateDesc));

  readonly catalog = computed<Catalog>(() => ({
    accounts: this.accounts.byId(),
    groups: this.categories.groupById(),
    subcategories: this.categories.subcategoryById(),
  }));

  add(draft: TransactionDraft): Transaction {
    const tx: Transaction = { ...draft, id: createId() };
    this.app.update((data) => addTransaction(data, tx));
    return tx;
  }

  update(id: Id, draft: TransactionDraft): void {
    this.app.update((data) => updateTransaction(data, id, draft));
  }

  /** Supprime et renvoie la transaction supprimée (pour pouvoir l'annuler). */
  remove(id: Id): Transaction | null {
    const { data, removed } = removeTransaction(this.app.data(), id);
    if (removed) this.app.replace(data);
    return removed;
  }

  restore(tx: Transaction): void {
    this.app.update((data) => restoreTransaction(data, tx));
  }

  /** Compte utilisé par la dernière transaction de ce type (pré-remplissage du formulaire). */
  lastAccountFor(type: TransactionType): Id | undefined {
    return this.sorted().find((tx) => tx.type === type)?.accountId;
  }
}
