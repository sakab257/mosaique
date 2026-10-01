import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SEMANTIC } from '../../../core/data/palette';

/**
 * Barre de progression (CSS). `value` est un ratio : 0,5 = 50 %. Au-delà de 1 la barre
 * reste pleine ; l'état de dépassement est signalé par la couleur, choisie par l'appelant.
 */
@Component({
  selector: 'app-progress-bar',
  template: `
    <div
      class="h-full rounded-full transition-[width] duration-500 ease-out"
      [style.width.%]="percent()"
      [style.background]="color()"
    ></div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block overflow-hidden rounded-full bg-surface-4',
    role: 'progressbar',
    'aria-valuemin': '0',
    '[attr.aria-valuenow]': 'valueNow()',
    '[attr.aria-valuetext]': 'valueNow() + " %"',
    '[attr.aria-label]': 'label()',
    '[style.height.px]': 'height()',
  },
})
export class ProgressBar {
  readonly value = input.required<number>();
  readonly label = input.required<string>();
  readonly color = input<string>(SEMANTIC.primary);
  readonly height = input(8);

  protected readonly percent = computed(() => Math.min(Math.max(this.value(), 0), 1) * 100);
  protected readonly valueNow = computed(() => Math.round(Math.max(this.value(), 0) * 100));
}
