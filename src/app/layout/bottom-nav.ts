import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon } from '../shared/ui/icon/icon';
import { NAV_ITEMS } from './nav-items';

/** Barre de navigation mobile : Accueil · Transactions · [+] · Budget · Paramètres. */
@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive, Icon],
  template: `
    <nav aria-label="Navigation principale" class="grid h-full grid-cols-5 items-start px-1.5 pt-2">
      @for (item of items; track item.path) {
        @if ($index === 2) {
          <div class="flex justify-center">
            <button
              type="button"
              aria-label="Nouvelle transaction"
              class="-mt-6.5 flex size-14.5 items-center justify-center rounded-full border-4 border-bg bg-primary text-ink transition-colors hover:bg-primary-hover"
              (click)="add.emit()"
            >
              <app-icon name="add" [size]="28" />
            </button>
          </div>
        }
        <a
          [routerLink]="item.path"
          queryParamsHandling="preserve"
          routerLinkActive="text-primary-tab!"
          ariaCurrentWhenActive="page"
          #rla="routerLinkActive"
          class="flex h-12 flex-col items-center justify-center gap-1 rounded-item text-3xs font-medium text-muted"
        >
          <app-icon [name]="item.icon" [size]="24" [filled]="rla.isActive" />
          {{ item.label }}
        </a>
      }
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'fixed inset-x-0 bottom-0 z-30 h-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom))] border-t border-divider bg-sidebar pb-[env(safe-area-inset-bottom)]',
  },
})
export class BottomNav {
  readonly add = output();
  protected readonly items = NAV_ITEMS;
}
