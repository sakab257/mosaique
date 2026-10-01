import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Button } from '../button/button';
import { Sheet } from '../sheet/sheet';
import { SheetService } from '../sheet/sheet.service';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` : action destructive, le focus initial va sur « Annuler ». */
  tone?: 'danger' | 'primary';
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [Sheet, Button],
  template: `
    <app-sheet [title]="data.title">
      <p class="leading-relaxed text-pretty text-ink-3">{{ data.message }}</p>
      <div class="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          appButton="secondary"
          size="lg"
          [attr.cdkFocusInitial]="danger ? '' : null"
          (click)="ref.close(false)"
        >
          {{ data.cancelLabel ?? 'Annuler' }}
        </button>
        <button
          type="button"
          [appButton]="danger ? 'danger' : 'primary'"
          size="lg"
          (click)="ref.close(true)"
        >
          {{ data.confirmLabel }}
        </button>
      </div>
    </app-sheet>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmOptions>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly danger = this.data.tone !== 'primary';
}

/** `await confirm.ask({...})` → true si l'utilisateur confirme. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly sheets = inject(SheetService);

  ask(options: ConfirmOptions): Promise<boolean> {
    const ref = this.sheets.open<ConfirmDialog, ConfirmOptions, boolean>(ConfirmDialog, {
      data: options,
      ariaLabel: options.title,
      width: '440px',
    });
    return firstValueFrom(ref.closed).then((result) => result === true);
  }
}
