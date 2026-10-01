import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Button } from '../button/button';
import { Sheet } from '../sheet/sheet';
import { SheetService } from '../sheet/sheet.service';

export interface Choice<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export interface ChoiceOptions<T extends string> {
  title: string;
  message?: string;
  choices: readonly Choice<T>[];
  initial: T;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
}

/** Boîte de dialogue à choix unique (cartes radio), puis confirmation. */
@Component({
  selector: 'app-choice-dialog',
  imports: [Sheet, Button],
  template: `
    <app-sheet [title]="data.title">
      @if (data.message) {
        <p class="leading-relaxed text-pretty text-ink-3">{{ data.message }}</p>
      }
      <div role="radiogroup" [attr.aria-label]="data.title" class="flex flex-col gap-2">
        @for (choice of data.choices; track choice.value) {
          @let on = selected() === choice.value;
          <button
            type="button"
            role="radio"
            class="flex items-start gap-3 rounded-control border px-3.5 py-3 text-left transition-colors"
            [class]="
              on
                ? 'border-primary/60 bg-primary/10'
                : 'border-line-strong bg-surface-2 hover:bg-surface-3'
            "
            [attr.aria-checked]="on"
            (click)="selected.set(choice.value)"
          >
            <span
              class="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2"
              [class]="on ? 'border-primary' : 'border-[#3A3B44]'"
              aria-hidden="true"
            >
              @if (on) {
                <span class="size-2 rounded-full bg-primary"></span>
              }
            </span>
            <span>
              <span class="block font-medium">{{ choice.label }}</span>
              @if (choice.description) {
                <span class="mt-0.5 block text-xs text-muted">{{ choice.description }}</span>
              }
            </span>
          </button>
        }
      </div>
      <div class="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" appButton="secondary" size="lg" (click)="ref.close(null)">
          Annuler
        </button>
        <button
          type="button"
          [appButton]="data.tone === 'primary' ? 'primary' : 'danger'"
          size="lg"
          (click)="ref.close(selected())"
        >
          {{ data.confirmLabel }}
        </button>
      </div>
    </app-sheet>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChoiceDialog<T extends string> {
  protected readonly data = inject<ChoiceOptions<T>>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<T | null>>(DialogRef);
  protected readonly selected = signal<T>(this.data.initial);
}

/** `await choices.choose({...})` → valeur choisie, ou `null` si annulé. */
@Injectable({ providedIn: 'root' })
export class ChoiceService {
  private readonly sheets = inject(SheetService);

  choose<T extends string>(options: ChoiceOptions<T>): Promise<T | null> {
    const ref = this.sheets.open<ChoiceDialog<T>, ChoiceOptions<T>, T | null>(ChoiceDialog, {
      data: options,
      ariaLabel: options.title,
      width: '480px',
    });
    return firstValueFrom(ref.closed).then((result) => result ?? null);
  }
}
