import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconButton } from '../button/button';
import { Icon } from '../icon/icon';

/**
 * En-tête de page : titre (h1), bouton retour optionnel pour les sous-pages,
 * actions projetées à droite.
 */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink, Icon, IconButton],
  template: `
    @if (backLink(); as link) {
      <a [routerLink]="link" [appIconButton]="backLabel()" variant="outline" size="xl">
        <app-icon name="chevron_left" />
      </a>
    }
    <h1 class="min-w-0 flex-1 font-semibold" [class]="backLink() ? 'text-subpage' : 'text-page'">
      {{ title() }}
    </h1>
    <ng-content />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-11 items-center gap-3' },
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly backLink = input<string>();
  readonly backLabel = input('Retour aux paramètres');
}
