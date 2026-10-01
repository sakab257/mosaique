import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Button } from '../shared/ui/button/button';
import { Icon } from '../shared/ui/icon/icon';
import { Logo } from './logo';
import { NAV_ITEMS } from './nav-items';

/** Navigation desktop (≥ 1024 px). */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, Icon, Button, Logo],
  template: `
    <a routerLink="/accueil" class="rounded-item px-2 py-1" aria-label="Mosaïque, accueil">
      <app-logo />
    </a>
    <button type="button" appButton size="lg" class="h-12! rounded-control!" (click)="add.emit()">
      <app-icon name="add" />
      Nouvelle transaction
    </button>
    <nav aria-label="Navigation principale" class="flex flex-col gap-1">
      @for (item of items; track item.path) {
        <a
          [routerLink]="item.path"
          queryParamsHandling="preserve"
          routerLinkActive="bg-primary/16 text-primary-ink!"
          ariaCurrentWhenActive="page"
          #rla="routerLinkActive"
          class="flex h-[42px] items-center gap-3 rounded-item px-3 font-medium text-muted transition-colors hover:text-ink"
        >
          <app-icon [name]="item.icon" [filled]="rla.isActive" />
          {{ item.label }}
        </a>
      }
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'sticky top-0 h-dvh w-sidebar shrink-0 flex-col gap-6 border-r border-divider bg-sidebar px-4 py-6',
  },
})
export class Sidebar {
  readonly add = output();
  protected readonly items = NAV_ITEMS;
}
