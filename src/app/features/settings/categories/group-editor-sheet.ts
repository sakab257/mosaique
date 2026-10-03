import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { PALETTE, SWATCHES, SWATCH_LABELS } from '../../../core/data/palette';
import { SubcategoryDraft } from '../../../core/domain/catalog-ops';
import { CategoryGroup, CategoryKind, Id } from '../../../core/models';
import { CategoriesStore } from '../../../core/state/categories.store';
import { Button, IconButton } from '../../../shared/ui/button/button';
import { CategoryAvatar } from '../../../shared/ui/category-avatar/category-avatar';
import { ConfirmService } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../../shared/ui/icon/icon';
import {
  CATEGORY_ICONS,
  CATEGORY_ICON_LABELS,
  CategoryIconName,
  toIconName,
} from '../../../shared/ui/icon/icons';
import { SegmentOption, Segmented } from '../../../shared/ui/segmented/segmented';
import { Sheet } from '../../../shared/ui/sheet/sheet';
import { ToastService } from '../../../shared/ui/toast/toast.service';

export interface GroupEditorData {
  group?: CategoryGroup;
  /** Ouvre l'éditeur avec une nouvelle sous-catégorie prête à saisir. */
  addSubcategory?: boolean;
}

interface SubRow {
  key: number;
  id?: Id;
  name: string;
}

const KIND_OPTIONS: readonly SegmentOption<CategoryKind>[] = [
  { value: 'expense', label: 'Sorties d’argent' },
  { value: 'income', label: 'Entrées d’argent' },
];

let nextKey = 0;

/** Création / modification d'un groupe : nom, type, couleur, icône et sous-catégories. */
@Component({
  selector: 'app-group-editor-sheet',
  imports: [Sheet, Segmented, CategoryAvatar, Icon, Button, IconButton],
  template: `
    <app-sheet [title]="editing ? 'Modifier le groupe' : 'Nouveau groupe'">
      <form class="flex flex-col gap-4" (submit)="save($event)" novalidate>
        <div class="flex items-center gap-3.5">
          <app-category-avatar [icon]="icon()" [color]="color()" size="xl" />
          <label
            class="min-w-0 flex-1 rounded-control border bg-surface-2 px-3.5 py-2.5 focus-within:border-primary/60"
            [class]="nameError() ? 'border-expense/60' : 'border-line-strong'"
          >
            <span class="block text-xs text-muted">Nom du groupe</span>
            <input
              #nameInput
              class="text-tint mt-0.5 block w-full bg-transparent font-semibold outline-none placeholder:font-normal placeholder:text-faint"
              [style.--tint]="color()"
              placeholder="Ex. : Animaux"
              maxlength="40"
              autocomplete="off"
              [value]="name()"
              [attr.aria-invalid]="nameError() ? true : null"
              (input)="name.set(nameInput.value)"
            />
          </label>
        </div>
        @if (nameError(); as message) {
          <p class="-mt-2 text-caption text-expense" role="alert">{{ message }}</p>
        }

        <app-segmented
          label="Type de catégorie"
          [options]="kindOptions"
          [value]="kind()"
          (valueChange)="kind.set($event!)"
        />

        <div class="flex flex-col gap-2.5">
          <span id="group-color-label" class="text-xs text-muted">Couleur</span>
          <div class="flex flex-wrap gap-3" role="radiogroup" aria-labelledby="group-color-label">
            @for (swatch of swatches; track swatch) {
              <button
                type="button"
                role="radio"
                class="size-7.5 rounded-full transition-shadow"
                [style.background]="swatch"
                [style.box-shadow]="
                  swatch === color() ? '0 0 0 3px #141519, 0 0 0 5px ' + swatch : 'none'
                "
                [attr.aria-checked]="swatch === color()"
                [attr.aria-label]="swatchLabels[swatch]"
                (click)="color.set(swatch)"
              ></button>
            }
          </div>
        </div>

        <div class="flex flex-col gap-2.5">
          <span id="group-icon-label" class="text-xs text-muted">Icône</span>
          <div class="grid grid-cols-6 gap-2" role="radiogroup" aria-labelledby="group-icon-label">
            @for (option of icons; track option) {
              @let on = option === icon();
              <button
                type="button"
                role="radio"
                class="flex h-11 items-center justify-center rounded-control border transition-colors"
                [class]="
                  on ? 'tint-selected' : 'border-line-strong bg-surface-2 text-muted hover:text-ink'
                "
                [style.--tint]="color()"
                [attr.aria-checked]="on"
                [attr.aria-label]="iconLabels[option]"
                [title]="iconLabels[option]"
                (click)="icon.set(option)"
              >
                <app-icon [name]="option" [size]="19" />
              </button>
            }
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-xs text-muted">Sous-catégories</span>
          <ul class="flex flex-col gap-px overflow-hidden rounded-field bg-line">
            @for (sub of subs(); track sub.key; let i = $index) {
              <li class="flex items-center gap-2 bg-surface-2 py-1.5 pr-1.5 pl-3.5">
                <input
                  #subInput
                  class="h-8 min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:font-normal placeholder:text-faint focus-visible:underline"
                  placeholder="Nom de la sous-catégorie"
                  maxlength="40"
                  autocomplete="off"
                  [attr.data-sub-key]="sub.key"
                  [attr.aria-label]="'Sous-catégorie ' + (i + 1)"
                  [value]="sub.name"
                  (input)="renameSub(sub.key, subInput.value)"
                />
                <button
                  type="button"
                  [appIconButton]="'Supprimer la sous-catégorie ' + (sub.name || i + 1)"
                  variant="danger"
                  (click)="removeSub(sub.key)"
                >
                  <app-icon name="delete" [size]="18" />
                </button>
              </li>
            }
            <li class="bg-surface-2">
              <button
                type="button"
                class="flex w-full items-center gap-2 px-3.5 py-3 font-medium text-primary-soft hover:text-primary-ink"
                (click)="addSub()"
              >
                <app-icon name="add" [size]="18" />
                Ajouter une sous-catégorie
              </button>
            </li>
          </ul>
        </div>

        <button type="submit" appButton size="lg" block>
          {{ editing ? 'Enregistrer' : 'Créer le groupe' }}
        </button>
        @if (editing) {
          <button type="button" appButton="danger-ghost" block class="-mt-2" (click)="delete()">
            Supprimer le groupe
          </button>
        }
      </form>
    </app-sheet>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupEditorSheet {
  private readonly data = inject<GroupEditorData | null>(DIALOG_DATA, { optional: true }) ?? {};
  private readonly ref = inject(DialogRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly categories = inject(CategoriesStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toasts = inject(ToastService);

  protected readonly editing = this.data.group ?? null;
  protected readonly kindOptions = KIND_OPTIONS;
  protected readonly swatches = SWATCHES;
  protected readonly swatchLabels = SWATCH_LABELS;
  protected readonly icons = CATEGORY_ICONS;
  protected readonly iconLabels = CATEGORY_ICON_LABELS;

  protected readonly name = signal(this.editing?.name ?? '');
  protected readonly kind = signal<CategoryKind>(this.editing?.kind ?? 'expense');
  protected readonly color = signal(this.editing?.color ?? PALETTE.mint);
  protected readonly icon = signal<CategoryIconName>(
    toIconName(this.editing?.icon, 'more_horiz') as CategoryIconName,
  );
  protected readonly subs = signal<SubRow[]>(
    this.categories
      .subcategoriesOf(this.editing?.id)
      .map((s) => ({ key: nextKey++, id: s.id, name: s.name })),
  );
  private readonly submitted = signal(false);

  protected readonly nameError = computed(() => {
    if (!this.submitted()) return null;
    const name = this.name().trim().toLocaleLowerCase('fr');
    if (!name) return 'Saisissez un nom de groupe.';
    const duplicate = this.categories
      .groups()
      .some((g) => g.id !== this.editing?.id && g.name.toLocaleLowerCase('fr') === name);
    return duplicate ? 'Un groupe porte déjà ce nom.' : null;
  });

  constructor() {
    if (this.data.addSubcategory) afterNextRender(() => this.addSub());
  }

  protected addSub(): void {
    const key = nextKey++;
    this.subs.update((list) => [...list, { key, name: '' }]);
    queueMicrotask(() =>
      this.host.nativeElement.querySelector<HTMLInputElement>(`[data-sub-key="${key}"]`)?.focus(),
    );
  }

  protected renameSub(key: number, name: string): void {
    this.subs.update((list) => list.map((s) => (s.key === key ? { ...s, name } : s)));
  }

  protected removeSub(key: number): void {
    this.subs.update((list) => list.filter((s) => s.key !== key));
  }

  /** Enregistre ; bloque l'envoi natif du formulaire (qui rechargerait la page). */
  protected save(event: SubmitEvent): void {
    event.preventDefault();
    this.submitted.set(true);
    if (this.nameError()) return;
    const subs: SubcategoryDraft[] = this.subs().map(({ id, name }) => ({ id, name }));
    this.categories.saveGroup(
      {
        id: this.editing?.id,
        name: this.name(),
        kind: this.kind(),
        color: this.color(),
        icon: this.icon(),
      },
      subs,
    );
    this.toasts.show(this.editing ? 'Groupe modifié' : 'Groupe créé');
    this.ref.close(true);
  }

  protected async delete(): Promise<void> {
    if (!this.editing) return;
    const usage = this.categories.usage(this.editing.id);
    const details = [
      usage.transactions &&
        `${usage.transactions} transaction${usage.transactions > 1 ? 's' : ''} passeront « Sans catégorie »`,
      usage.rules &&
        `${usage.rules} récurrence${usage.rules > 1 ? 's' : ''} perdront leur catégorie`,
      usage.envelopes && 'son enveloppe de budget sera supprimée',
    ].filter(Boolean);
    const confirmed = await this.confirm.ask({
      title: `Supprimer « ${this.editing.name} » ?`,
      message:
        'Le groupe et ses sous-catégories seront supprimés' +
        (details.length ? ` : ${details.join(', ')}.` : '.'),
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.categories.deleteGroup(this.editing.id);
    this.toasts.show('Groupe supprimé');
    this.ref.close(true);
  }
}
