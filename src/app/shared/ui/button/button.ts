import { Directive, booleanAttribute, computed, input } from '@angular/core';

export type ButtonVariant =
  'primary' | 'secondary' | 'outline' | 'link' | 'danger' | 'danger-ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors ' +
  'disabled:pointer-events-none disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary-fill text-ink hover:bg-primary',
  secondary: 'border border-switch-off bg-transparent font-medium text-ink hover:bg-surface-3',
  outline: 'border border-primary bg-transparent text-primary-ink hover:bg-primary/12',
  link: 'h-auto! p-0! font-medium text-primary-soft hover:text-primary-ink',
  danger: 'bg-expense text-bg hover:bg-expense/90',
  'danger-ghost': 'bg-transparent font-medium text-expense hover:bg-expense/10',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-control px-3 text-caption',
  md: 'h-10 rounded-control px-3.5',
  lg: 'h-13 rounded-field px-5 text-[0.9375rem]',
};

/**
 * Style de bouton appliqué à un `<button>` ou `<a>` natif (sémantique et clavier conservés).
 * `<button appButton>`, `<button appButton="secondary" size="lg" block>`.
 */
@Directive({
  selector: 'button[appButton], a[appButton]',
  host: { '[class]': 'classes()' },
})
export class Button {
  readonly variant = input<ButtonVariant, ButtonVariant | ''>('primary', {
    alias: 'appButton',
    transform: (value) => value || 'primary',
  });
  readonly size = input<ButtonSize>('md');
  readonly block = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(
    () =>
      `${BASE} ${VARIANTS[this.variant()]} ${SIZES[this.size()]} ${this.block() ? 'w-full' : ''}`,
  );
}

export type IconButtonVariant = 'ghost' | 'surface' | 'outline' | 'danger' | 'overlay';
export type IconButtonSize = 'sm' | 'md' | 'lg' | 'xl';

const ICON_VARIANTS: Record<IconButtonVariant, string> = {
  ghost: 'text-muted hover:bg-surface-3 hover:text-ink',
  surface: 'bg-surface-3 text-ink-3 hover:bg-surface-4 hover:text-ink',
  outline: 'border border-line-strong bg-surface text-ink hover:bg-surface-3',
  danger: 'text-expense/80 hover:bg-expense/14 hover:text-expense',
  overlay: 'bg-bg/35 text-ink-3 hover:bg-bg/60 hover:text-ink',
};

const ICON_SIZES: Record<IconButtonSize, string> = {
  sm: 'size-7 rounded-lg',
  md: 'size-8 rounded-lg',
  lg: 'size-9 rounded-item',
  xl: 'size-10 rounded-control',
};

/**
 * Bouton ne contenant qu'une icône. Le libellé accessible est obligatoire :
 * `<button appIconButton="Fermer"><app-icon name="close" /></button>`.
 */
@Directive({
  selector: 'button[appIconButton], a[appIconButton]',
  host: {
    '[class]': 'classes()',
    '[attr.aria-label]': 'label()',
    '[attr.title]': 'label()',
  },
})
export class IconButton {
  readonly label = input.required<string>({ alias: 'appIconButton' });
  readonly variant = input<IconButtonVariant>('ghost');
  readonly size = input<IconButtonSize>('md');

  protected readonly classes = computed(
    () =>
      'inline-flex shrink-0 items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-40 ' +
      `${ICON_VARIANTS[this.variant()]} ${ICON_SIZES[this.size()]}`,
  );
}
