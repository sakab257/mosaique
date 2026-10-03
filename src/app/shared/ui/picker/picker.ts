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
import { CategoryAvatar } from '../category-avatar/category-avatar';
import { Icon } from '../icon/icon';
import { IconNamePipe } from '../icon/icon-name.pipe';

export interface PickerOption {
  value: string;
  label: string;
  icon?: string;
  color?: string;
  /** Information secondaire (solde d'un compte…). */
  hint?: string;
}

let nextId = 0;

/**
 * Ligne de formulaire « Compte · Carte bancaire › » ouvrant le sélecteur natif du
 * système (roue sur iOS, liste sur Android et desktop). Le `<select>` couvre toute la
 * ligne de façon invisible : clavier, lecteurs d'écran et autocomplétion restent natifs.
 * `variant="card"` : carte compacte (Depuis / Vers d'un virement).
 */
@Component({
  selector: 'app-picker',
  imports: [CategoryAvatar, Icon, IconNamePipe],
  template: `
    @let option = selected();
    @if (variant() === 'row') {
      @if (option?.icon) {
        <app-category-avatar
          [icon]="option!.icon!"
          [color]="option!.color ?? defaultColor"
          size="sm"
        />
      } @else if (icon()) {
        <app-category-avatar [icon]="icon()!" [color]="neutralColor" size="sm" />
      }
      <span class="min-w-0 flex-1">
        <span class="block text-xs text-muted" [id]="labelId">{{ label() }}</span>
        <span
          class="block truncate font-medium"
          [class.text-faint]="!option"
          [style.color]="option && colorValue() ? option.color : null"
          [class.font-semibold]="option && colorValue()"
        >
          {{ option?.label ?? placeholder() }}
        </span>
      </span>
      <app-icon name="chevron_right" [size]="18" class="text-ghost" />
    } @else {
      <span class="block text-xs text-muted" [id]="labelId">{{ label() }}</span>
      <span class="mt-1.5 flex min-w-0 items-center gap-2 font-semibold">
        @if (option?.icon) {
          <app-icon [name]="option!.icon | iconName" [size]="18" class="text-primary-soft" />
        }
        <span class="truncate" [class.text-faint]="!option">{{
          option?.label ?? placeholder()
        }}</span>
      </span>
      @if (option?.hint) {
        <span class="mt-0.5 block truncate text-xs text-muted">{{ option!.hint }}</span>
      }
    }
    <select
      class="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
      [attr.aria-labelledby]="labelId"
      [attr.aria-invalid]="invalid() || null"
      [attr.aria-describedby]="describedBy() || null"
      [disabled]="isDisabled()"
      (change)="onSelect($event)"
      (blur)="onTouched()"
    >
      <!--
        Option d'attente toujours présente et explicitement sélectionnée tant qu'aucune
        valeur n'est choisie : sinon le navigateur sélectionne en silence la première option
        réelle, et la choisir ensuite ne déclenche aucun événement « change ».
        La sélection passe uniquement par [selected] sur chaque option (un [value] sur le
        <select> serait appliqué avant la création des options, donc sans effet).
      -->
      <option value="" disabled [selected]="!hasSelection()">{{ placeholder() }}</option>
      @for (opt of options(); track opt.value) {
        <option [value]="opt.value" [selected]="opt.value === value()">
          {{ opt.label }}{{ opt.hint ? ' · ' + opt.hint : '' }}
        </option>
      }
    </select>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses()',
  },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Picker), multi: true }],
})
export class Picker implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly options = input.required<readonly PickerOption[]>();
  readonly value = model<string | null>(null);
  readonly placeholder = input('Choisir');
  readonly icon = input<string>();
  readonly variant = input<'row' | 'card'>('row');
  /** Affiche le libellé sélectionné dans la couleur de l'option (catégories). */
  readonly colorValue = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly describedBy = input<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly labelId = `picker-label-${nextId++}`;
  protected readonly defaultColor = '#A29BFF';
  /** Icône d'attente, tant qu'aucune option n'est choisie. */
  protected readonly neutralColor = '#8B8D98';
  private readonly formDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());
  protected readonly selected = computed(() =>
    this.options().find((o) => o.value === this.value()),
  );
  /** Une option proposée correspond à la valeur (sinon l'option d'attente est sélectionnée). */
  protected readonly hasSelection = computed(() => this.selected() !== undefined);

  protected readonly hostClasses = computed(() =>
    this.variant() === 'row'
      ? 'relative flex items-center gap-3 bg-surface-2 px-3.5 py-3 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-primary'
      : 'relative block min-w-0 rounded-control border bg-surface p-3 focus-within:outline-2 focus-within:outline-primary ' +
        (this.invalid() ? 'border-expense/60' : 'border-line-strong'),
  );

  private onChange: (value: string | null) => void = () => {};
  protected onTouched: () => void = () => {};

  protected onSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value || null;
    this.value.set(value);
    this.onChange(value);
  }

  writeValue(value: string | null): void {
    this.value.set(value || null);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
  }
}
