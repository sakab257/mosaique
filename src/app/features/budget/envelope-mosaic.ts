import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SEMANTIC } from '../../core/data/palette';
import { formatPercent } from '../../core/domain/money';
import { BudgetSummary } from '../../core/domain/budget';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { Icon } from '../../shared/ui/icon/icon';
import { IconNamePipe } from '../../shared/ui/icon/icon-name.pipe';
import { EnvelopeMenu } from './envelope-menu';
import { EnvelopeView } from './envelope-view';

/** Taille des tuiles selon le rang d'allocation : la plus grosse enveloppe occupe 2×2. */
const SPANS: readonly (readonly [number, number])[] = [
  [2, 2],
  [2, 1],
];
const VALUE_SIZES = ['text-[4rem]', 'text-[2.625rem]'];

/**
 * Mosaïque desktop : la surface d'une tuile suit le montant alloué, son remplissage la
 * part dépensée. Tuiles « Nouvelle enveloppe » et « Non alloué » en fin de grille.
 */
@Component({
  selector: 'app-envelope-mosaic',
  imports: [EnvelopeMenu, Icon, IconNamePipe, MoneyPipe],
  template: `
    <div class="flex flex-wrap items-baseline justify-between gap-3">
      <h2 class="text-[1.0625rem] font-semibold">Enveloppes</h2>
      <span class="text-xs text-faint">Surface = montant alloué · remplissage = dépensé</span>
    </div>
    <ul class="grid grid-flow-dense auto-rows-[172px] grid-cols-4 gap-2.5">
      @for (tile of tiles(); track tile.id) {
        <li
          class="relative min-w-0"
          [style.grid-column]="'span ' + tile.cols"
          [style.grid-row]="'span ' + tile.rows"
        >
          <div
            class="absolute inset-0 overflow-hidden rounded-tile border"
            [style.background]="mix(tile.stateColor, 6)"
            [style.border-color]="mix(tile.stateColor, tile.over ? 40 : 18)"
            aria-hidden="true"
          >
            <div
              class="absolute inset-x-0 bottom-0 border-t-2 transition-[height] duration-500"
              [style.height.%]="tile.fill"
              [style.background]="mix(tile.stateColor, 17)"
              [style.border-color]="tile.stateColor"
            ></div>
          </div>
          <div class="relative flex h-full flex-col p-4 pt-3.5 pr-3.5">
            <div class="flex items-center gap-2">
              <app-icon
                [name]="tile.icon | iconName"
                [size]="16"
                class="text-tint"
                [style.--tint]="tile.color"
              />
              <h3
                class="text-tint min-w-0 flex-1 truncate font-semibold"
                [style.--tint]="tile.color"
              >
                {{ tile.name }}
              </h3>
              <app-envelope-menu
                [name]="tile.name"
                variant="overlay"
                (edit)="edit.emit(tile)"
                (remove)="remove.emit(tile)"
              />
            </div>
            <div class="flex-1"></div>
            @if (tile.over) {
              <span
                class="mb-2 flex h-6 items-center gap-1 self-start rounded-full bg-expense px-2.5 text-xs font-semibold text-bg"
              >
                <app-icon name="error" [size]="14" />
                +{{ tile.overBy | money }}
              </span>
            }
            <p class="leading-none font-semibold tracking-[-0.04em]" [class]="tile.valueSize">
              {{ tile.percent }}
            </p>
            <p class="mt-2 text-xs text-ink-2">
              {{ tile.spent | money }}
              <span class="text-muted">sur {{ tile.allocated | money }}</span>
            </p>
            @if (tile.big) {
              <p class="mt-0.5 text-xs text-muted">
                {{ tile.share }} du revenu
                @if (!tile.over) {
                  · reste {{ tile.remaining | money }}
                }
              </p>
            }
          </div>
        </li>
      }
      @if (canCreate()) {
        <li>
          <button
            type="button"
            class="flex size-full flex-col items-start justify-between rounded-tile border border-dashed border-line-dashed p-4 text-left text-muted transition-colors hover:border-primary hover:text-primary-ink"
            (click)="create.emit()"
          >
            <span
              class="flex size-8.5 items-center justify-center rounded-control bg-primary/16 text-primary-soft"
            >
              <app-icon name="add" [size]="18" />
            </span>
            <span>
              <span class="block font-semibold text-ink">Nouvelle enveloppe</span>
              <span class="mt-0.5 block text-xs">Ajouter une tuile</span>
            </span>
          </button>
        </li>
      }
      <li
        class="col-span-2 flex flex-col justify-between rounded-tile border border-dashed border-line-dashed p-4"
      >
        <span class="flex items-center gap-2 font-medium text-muted">
          <app-icon name="layers" [size]="18" />
          Non alloué
        </span>
        <span>
          <span class="block text-[1.875rem] font-semibold tracking-tight">{{
            summary().unallocated | money
          }}</span>
          <span class="mt-1.5 block text-xs text-muted">{{ unallocatedLabel() }}</span>
        </span>
      </li>
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-3' },
})
export class EnvelopeMosaic {
  readonly envelopes = input.required<readonly EnvelopeView[]>();
  readonly summary = input.required<BudgetSummary>();
  readonly canCreate = input(true);
  readonly edit = output<EnvelopeView>();
  readonly remove = output<EnvelopeView>();
  readonly create = output();

  protected readonly tiles = computed(() =>
    [...this.envelopes()]
      .sort((a, b) => b.allocated - a.allocated)
      .map((e, i) => {
        const [cols, rows] = SPANS[i] ?? [1, 1];
        return {
          ...e,
          cols,
          rows,
          big: i === 0,
          valueSize: VALUE_SIZES[i] ?? 'text-[2rem]',
          fill: Math.min(e.consumed, 1) * 100,
          share: formatPercent(e.shareOfIncome),
          stateColor: e.over ? SEMANTIC.expense : e.color,
        };
      }),
  );

  protected readonly unallocatedLabel = computed(() => {
    const { unallocated, income } = this.summary();
    return income > 0
      ? `${formatPercent(unallocated / income)} du revenu, à répartir ou à épargner`
      : 'Définissez un revenu de référence pour répartir votre budget';
  });

  protected mix(color: string, percent: number): string {
    return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
  }
}
