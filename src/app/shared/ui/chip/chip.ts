import { Directive, ElementRef, booleanAttribute, computed, inject, input } from '@angular/core';
import { PALETTE } from '../../../core/data/palette';

export type ChipSize = 'sm' | 'md' | 'lg';
export type ChipVariant = 'filled' | 'outline';

const SIZES: Record<ChipSize, string> = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-8 px-3 text-caption',
  lg: 'h-9 px-3 text-caption',
};

const IDLE: Record<ChipVariant, string> = {
  filled: 'border-transparent bg-surface-4 text-ink-3 hover:text-ink',
  outline: 'border-line-strong bg-surface text-ink-3 hover:bg-surface-3 hover:text-ink',
};

/**
 * Pastille arrondie. Sur un `<button>`, elle devient un bouton bascule (`aria-pressed`),
 * sauf avec `[toggle]="false"` (déclencheur de menu, par exemple). La couleur de
 * sélection suit `color` (couleur de catégorie, violet par défaut).
 */
@Directive({
  selector: 'button[appChip], span[appChip], a[appChip]',
  host: {
    '[class]': 'classes()',
    '[style.--tint]': 'color()',
    '[attr.aria-pressed]': 'isButton && toggle() ? selected() : null',
  },
})
export class Chip {
  readonly selected = input(false, { transform: booleanAttribute });
  readonly color = input<string>(PALETTE.violet);
  readonly size = input<ChipSize>('md');
  readonly variant = input<ChipVariant>('filled');
  readonly toggle = input(true, { transform: booleanAttribute });

  protected readonly isButton =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'BUTTON';

  protected readonly classes = computed(
    () =>
      'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-medium transition-colors ' +
      `${SIZES[this.size()]} ` +
      (this.selected() ? 'tint-selected' : IDLE[this.variant()]),
  );
}
