import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  forwardRef,
  input,
  model,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Interrupteur (role="switch"). Utilisable seul (`[(checked)]`) ou dans un formulaire
 * réactif (`formControlName`).
 */
@Component({
  selector: 'app-toggle',
  template: `
    <button
      type="button"
      role="switch"
      class="relative block h-6 w-10 rounded-full transition-colors disabled:opacity-50"
      [class]="checked() ? 'bg-primary' : 'bg-switch-off'"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label() || null"
      [attr.aria-labelledby]="labelledBy() || null"
      [disabled]="isDisabled()"
      (click)="toggle()"
      (blur)="onTouched()"
    >
      <span
        class="absolute top-[3px] size-[18px] rounded-full bg-ink shadow-sm transition-[left] duration-200"
        [style.left.px]="checked() ? 19 : 3"
      ></span>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Toggle), multi: true }],
})
export class Toggle implements ControlValueAccessor {
  readonly checked = model(false);
  readonly label = input<string>();
  readonly labelledBy = input<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly formDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  private onChange: (value: boolean) => void = () => {};
  protected onTouched: () => void = () => {};

  protected toggle(): void {
    const next = !this.checked();
    this.checked.set(next);
    this.onChange(next);
  }

  writeValue(value: boolean | null): void {
    this.checked.set(!!value);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
  }
}
