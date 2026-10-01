import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
} from '@angular/core';
import { IconName } from './icons';

/**
 * Icône Material Symbols Rounded (ligature). Purement décorative : le libellé
 * accessible est porté par l'élément parent (bouton avec aria-label, texte voisin).
 */
@Component({
  selector: 'app-icon',
  template: '{{ name() }}',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'material-symbols-rounded inline-flex shrink-0 items-center justify-center overflow-hidden leading-none',
    'aria-hidden': 'true',
    translate: 'no',
    '[style.font-size.px]': 'size()',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.font-variation-settings]': 'variation()',
  },
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  readonly filled = input(false, { transform: booleanAttribute });

  protected readonly variation = computed(
    () => `'FILL' ${this.filled() ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
  );
}
