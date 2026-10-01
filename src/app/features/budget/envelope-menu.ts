import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconButton } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';

/** Bouton ⋮ d'une enveloppe : Modifier / Supprimer. */
@Component({
  selector: 'app-envelope-menu',
  imports: [CdkMenu, CdkMenuItem, CdkMenuTrigger, IconButton, Icon],
  template: `
    <button
      type="button"
      [appIconButton]="'Actions pour l’enveloppe ' + name()"
      [variant]="variant()"
      [cdkMenuTriggerFor]="menu"
    >
      <app-icon name="more_vert" [size]="18" />
    </button>
    <ng-template #menu>
      <div cdkMenu class="menu-panel">
        <button cdkMenuItem class="menu-item" (cdkMenuItemTriggered)="edit.emit()">
          <app-icon name="edit" [size]="18" />
          Modifier
        </button>
        <button
          cdkMenuItem
          class="menu-item menu-item--danger"
          (cdkMenuItemTriggered)="remove.emit()"
        >
          <app-icon name="delete" [size]="18" />
          Supprimer
        </button>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class EnvelopeMenu {
  readonly name = input.required<string>();
  readonly variant = input<'ghost' | 'overlay'>('ghost');
  readonly edit = output();
  readonly remove = output();
}
