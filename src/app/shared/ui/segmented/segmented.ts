import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  forwardRef,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PALETTE } from '../../../core/data/palette';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  /** Couleur de l'état sélectionné (violet par défaut). */
  color?: string;
}

/**
 * Sélecteur à segments (Dépense / Revenu / Virement, type de compte…).
 * Sémantique radiogroup : Tab entre dans le groupe, flèches pour changer de valeur.
 */
@Component({
  selector: 'app-segmented',
  imports: [Icon],
  template: `
    <div
      role="radiogroup"
      class="grid gap-1 rounded-control bg-sunken p-1"
      [style.grid-template-columns]="'repeat(' + options().length + ', minmax(0, 1fr))'"
      [attr.aria-label]="label()"
      (keydown)="onKeydown($event)"
    >
      @for (option of options(); track option.value) {
        @let selected = option.value === value();
        <button
          type="button"
          role="radio"
          class="flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-[9px] border border-transparent px-2 text-caption font-semibold transition-colors disabled:opacity-50"
          [class]="selected ? 'tint-selected border-transparent!' : 'text-muted hover:text-ink'"
          [style.--tint]="option.color ?? defaultColor"
          [attr.aria-checked]="selected"
          [tabindex]="selected || (!hasValue() && $first) ? 0 : -1"
          [disabled]="isDisabled()"
          (click)="select(option.value)"
          (blur)="onTouched()"
        >
          @if (option.icon) {
            <app-icon [name]="option.icon" [size]="16" />
          }
          <span class="truncate">{{ option.label }}</span>
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Segmented), multi: true },
  ],
})
export class Segmented<T extends string = string> implements ControlValueAccessor {
  readonly options = input.required<readonly SegmentOption<T>[]>();
  readonly value = model<T | null>(null);
  readonly label = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly defaultColor = PALETTE.violet;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly formDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());
  protected readonly hasValue = computed(() =>
    this.options().some((o) => o.value === this.value()),
  );

  private onChange: (value: T) => void = () => {};
  protected onTouched: () => void = () => {};

  protected select(value: T): void {
    if (value === this.value()) return;
    this.value.set(value);
    this.onChange(value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!delta) return;
    event.preventDefault();
    const options = this.options();
    const current = Math.max(
      0,
      options.findIndex((o) => o.value === this.value()),
    );
    const next = (current + delta + options.length) % options.length;
    this.select(options[next].value);
    this.host.nativeElement.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  }

  writeValue(value: T | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
  }
}
