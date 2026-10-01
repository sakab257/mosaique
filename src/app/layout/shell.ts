import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AppStore } from '../core/state/app-store';
import { TransactionEditor } from '../features/transactions/transaction-editor.service';
import { Icon } from '../shared/ui/icon/icon';
import { ToastOutlet } from '../shared/ui/toast/toast-outlet';
import { BottomNav } from './bottom-nav';
import { Sidebar } from './sidebar';

/** Paramètre d'URL des raccourcis PWA ouvrant le formulaire d'ajout (`?ajout=1`). */
export const ADD_QUERY_PARAM = 'ajout';

/** Coquille responsive : sidebar ≥ 1024 px, barre basse en dessous. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Sidebar, BottomNav, Icon, ToastOutlet],
  template: `
    <a
      href="#contenu"
      class="sr-only z-50 rounded-control bg-primary-fill px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      Aller au contenu
    </a>

    <div class="lg:flex">
      <app-sidebar class="hidden lg:flex" (add)="editor.openCreate()" />

      <main
        id="contenu"
        tabindex="-1"
        class="min-w-0 flex-1 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+1.5rem)] outline-none lg:px-10 lg:pt-8 lg:pb-12"
      >
        <div class="flex max-w-content flex-col gap-4">
          @if (store.storageError(); as error) {
            <div
              role="alert"
              class="flex items-start gap-2.5 rounded-control bg-warning/12 px-3.5 py-3 text-caption text-warning"
            >
              <app-icon name="warning" [size]="18" />
              <span>{{ error }}</span>
            </div>
          }
          <router-outlet />
        </div>
      </main>
    </div>

    <app-bottom-nav class="lg:hidden" (add)="editor.openCreate()" />
    <app-toast-outlet />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-dvh' },
})
export class Shell {
  protected readonly store = inject(AppStore);
  protected readonly editor = inject(TransactionEditor);
  private readonly router = inject(Router);

  constructor() {
    // Raccourci « Nouvelle transaction » (manifeste PWA) : retire le paramètre puis ouvre le
    // formulaire, une fois la navigation terminée (le sheet se ferme à chaque navigation).
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (this.router.parseUrl(this.router.url).queryParamMap.get(ADD_QUERY_PARAM) !== '1')
          return;
        const cleaned = this.router.createUrlTree([], {
          queryParams: { [ADD_QUERY_PARAM]: null },
          queryParamsHandling: 'merge',
        });
        void this.router
          .navigateByUrl(cleaned, { replaceUrl: true })
          .then(() => this.editor.openCreate());
      });
  }
}
