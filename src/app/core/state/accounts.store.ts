import { Injectable, computed, inject } from '@angular/core';
import { computeBalances, sumBalances } from '../domain/balances';
import { indexById } from '../domain/catalog';
import { accountUsage, deleteAccount, saveAccount } from '../domain/catalog-ops';
import { createId } from '../domain/id';
import { Account, Cents, Id } from '../models';
import { ClockService } from '../services/clock.service';
import { AppStore } from './app-store';

@Injectable({ providedIn: 'root' })
export class AccountsStore {
  private readonly app = inject(AppStore);
  private readonly clock = inject(ClockService);

  readonly accounts = this.app.accounts;
  readonly byId = computed(() => indexById(this.accounts()));

  /** Soldes actuels : transactions datées d'aujourd'hui ou avant. */
  readonly balances = computed(() =>
    computeBalances(this.accounts(), this.app.transactions(), this.clock.today()),
  );
  readonly totalBalance = computed(() => sumBalances(this.balances()));

  balanceOf(id: Id): Cents {
    return this.balances().get(id) ?? 0;
  }

  get(id: Id | undefined | null): Account | undefined {
    return id ? this.byId().get(id) : undefined;
  }

  /** Crée (sans `id`) ou met à jour un compte. */
  save(account: Omit<Account, 'id'> & { id?: Id }): Id {
    const id = account.id ?? createId();
    this.app.update((data) => saveAccount(data, { ...account, id }));
    return id;
  }

  usage(id: Id): number {
    return accountUsage(this.app.data(), id);
  }

  /** Supprime un compte inutilisé ; renvoie la raison du refus le cas échéant. */
  delete(id: Id): 'in-use' | 'last-account' | null {
    const result = deleteAccount(this.app.data(), id);
    if (result.error) return result.error;
    this.app.replace(result.data);
    return null;
  }
}
