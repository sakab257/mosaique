import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CategoryGroup } from '../../../core/models';
import { CategoriesStore } from '../../../core/state/categories.store';
import { Button, IconButton } from '../../../shared/ui/button/button';
import { Card } from '../../../shared/ui/card/card';
import { CategoryAvatar } from '../../../shared/ui/category-avatar/category-avatar';
import { Chip } from '../../../shared/ui/chip/chip';
import { Icon } from '../../../shared/ui/icon/icon';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { SheetService } from '../../../shared/ui/sheet/sheet.service';
import { GroupEditorData, GroupEditorSheet } from './group-editor-sheet';

@Component({
  selector: 'app-categories-page',
  imports: [PageHeader, Card, CategoryAvatar, Chip, Icon, Button, IconButton],
  template: `
    <app-page-header title="Catégories" backLink="/parametres">
      <button type="button" appButton (click)="open()">
        <app-icon name="add" [size]="18" />
        Groupe
      </button>
    </app-page-header>
    <p class="text-caption text-muted">
      {{ summary() }}. Chaque groupe a son icône et sa couleur, reprises partout dans l’app.
    </p>

    <ul class="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] items-start gap-4">
      @for (row of rows(); track row.group.id) {
        <li>
          <app-card padding="sm">
            <div class="flex items-center gap-3">
              <app-category-avatar [icon]="row.group.icon" [color]="row.group.color" />
              <div class="min-w-0 flex-1">
                <h2
                  class="text-tint truncate text-[0.9375rem] font-semibold"
                  [style.--tint]="row.group.color"
                >
                  {{ row.group.name }}
                </h2>
                <p class="text-xs text-muted">
                  {{ row.count }}{{ row.group.kind === 'income' ? ' · entrées d’argent' : '' }}
                </p>
              </div>
              <button
                type="button"
                [appIconButton]="'Modifier le groupe ' + row.group.name"
                (click)="open(row.group)"
              >
                <app-icon name="edit" [size]="18" />
              </button>
            </div>
            <ul class="mt-3.5 flex flex-wrap gap-1.5">
              @for (sub of row.subs; track sub.id) {
                <li>
                  <span appChip class="text-ink-2!">{{ sub.name }}</span>
                </li>
              }
              <li>
                <button
                  type="button"
                  class="flex h-8 items-center gap-1 rounded-full border border-dashed border-line-stronger px-3 text-caption text-muted transition-colors hover:border-primary hover:text-primary-ink"
                  [attr.aria-label]="'Ajouter une sous-catégorie à ' + row.group.name"
                  (click)="open(row.group, true)"
                >
                  <app-icon name="add" [size]="16" />
                  Sous-catégorie
                </button>
              </li>
            </ul>
          </app-card>
        </li>
      }
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4' },
})
export default class CategoriesPage {
  private readonly categories = inject(CategoriesStore);
  private readonly sheets = inject(SheetService);

  protected readonly rows = computed(() =>
    [...this.categories.groups()]
      .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'expense' ? -1 : 1))
      .map((group) => {
        const subs = this.categories.subcategoriesOf(group.id);
        return {
          group,
          subs,
          count: `${subs.length} sous-catégorie${subs.length > 1 ? 's' : ''}`,
        };
      }),
  );

  protected readonly summary = computed(() => {
    const groups = this.categories.groups().length;
    const subs = this.categories.subcategories().length;
    return `${groups} groupe${groups > 1 ? 's' : ''} · ${subs} sous-catégorie${subs > 1 ? 's' : ''}`;
  });

  protected open(group?: CategoryGroup, addSubcategory = false): void {
    this.sheets.open<GroupEditorSheet, GroupEditorData>(GroupEditorSheet, {
      ariaLabel: group ? `Modifier le groupe ${group.name}` : 'Nouveau groupe',
      data: { group, addSubcategory },
    });
  }
}
