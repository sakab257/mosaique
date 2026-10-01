import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LayoutService } from '../../../core/services/layout.service';
import { IconButton } from '../button/button';
import { Icon } from '../icon/icon';

/**
 * Gabarit du contenu d'un sheet / d'une modale : poignée (mobile), titre, bouton Fermer,
 * puis le contenu projeté. À utiliser dans un composant ouvert par `SheetService`.
 */
@Component({
  selector: 'app-sheet',
  imports: [Icon, IconButton],
  template: `
    <header class="sticky top-0 z-10 bg-surface px-4 pb-2 pt-2 lg:px-6 lg:pt-6">
      @if (!layout.isDesktop()) {
        <div class="mx-auto mb-2 h-1 w-10 rounded-full bg-line-stronger" aria-hidden="true"></div>
      }
      <div class="flex items-center gap-3">
        <h2 class="min-w-0 flex-1 truncate text-lg font-semibold">{{ title() }}</h2>
        <button type="button" appIconButton="Fermer" variant="surface" size="lg" (click)="close()">
          <app-icon name="close" />
        </button>
      </div>
    </header>
    <div class="flex flex-col gap-4 px-4 pb-7 pt-2 lg:px-6 lg:pb-6">
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Sheet {
  readonly title = input.required<string>();

  protected readonly layout = inject(LayoutService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  close(): void {
    this.dialogRef?.close();
  }
}
